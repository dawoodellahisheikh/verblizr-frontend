/**
 * useTurnInterpreter.ts
 * ----------------------------------------------------------------------------
 * Minimal client hook for a realtime turn interpreter over WebSocket.
 *
 * What this does:
 * - Manages a WS connection and session lifecycle (start / pause / resume / stop).
 * - Streams audio frames you feed via `pushPCM(frame)` to the server.
 * - (Optional) Simple client-side VAD to mark utterance boundaries.
 * - Surfaces server events:
 *     • onPartial(text)
 *     • onFinal({ asr, mt, lid? })
 *     • onStatus(statusString)  // "listening" | "translating" | "playing" | "paused" | etc.
 *     • onError(error)
 *
 * What this does NOT do:
 * - It does not record audio itself (no native deps). Pair it with any recorder and call `pushPCM()`.
 * - It does not play TTS audio live (server may send a URL; you can handle in onFinal/onStatus).
 *
 * Client → Server minimal protocol (JSON):
 *   { type: "start", sessionId, from, to, mode, sampleRate }
 *   { type: "audio", pcm16: "<base64>", samples: <int> }   // repeat as you feed frames
 *   { type: "vad", event: "begin" | "end" }                // optional, if client VAD enabled
 *   { type: "pause" } | { type: "resume" } | { type: "stop" }
 *
 * Server → Client minimal protocol (JSON):
 *   { type: "status", status: "listening"|"translating"|"playing"|"paused", dir?: "AtoB"|"BtoA" }
 *   { type: "partial", text }
 *   { type: "final", asr, mt, lid? }                       // end of utterance
 *   { type: "error", message }
 *
 * Usage from a screen:
 *   const it = useTurnInterpreter({
 *     wsUrl, fromLang: 'en', toLang: 'ur', mode: 'alternate',
 *     onPartial: setPartial,
 *     onFinal: (u) => setLastFinal(u),
 *     onStatus: setStatusText,
 *   });
 *   await it.start();
 *   it.pushPCM(float32Frame); // call repeatedly from your recorder callback
 *   await it.pause(); await it.resume(); await it.stop();
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'alternate' | 'auto-lid';

export type UseTurnInterpreterOptions = {
  /** ws://host:port for the realtime backend */
  wsUrl: string;
  /** ISO/lc code labels you want to send (e.g., 'en','ur') */
  fromLang: string;
  toLang: string;
  /** 'alternate' manual turn-taking, or 'auto-lid' where server (or client) picks direction by LID */
  mode: Mode;
  /** Optional: client-side VAD (utterance endpointing). Defaults on with 450ms silence threshold. */
  vad?: {
    enabled?: boolean;
    silenceMs?: number;    // how long of continuous silence ends an utterance
    startMs?: number;      // how long of continuous speech starts an utterance
    energyThreshold?: number; // 0..1 average magnitude threshold for speech
    minUtteranceMs?: number;  // ignore very tiny bursts
  };
  /** Sample rate of incoming PCM frames you will push (Hz). Default 16000. */
  sampleRate?: number;
  /** Event hooks */
  onPartial?: (text: string) => void;
  onFinal?: (u: { asr?: string; mt?: string; lid?: string }) => void;
  onStatus?: (s: string) => void;
  onError?: (e: Error) => void;
};

export type UseTurnInterpreter = {
  /** True while a session is running on the WS (between start/stop). */
  isRecording: boolean;
  /** True if the session is currently paused client-side. */
  isPaused: boolean;
  /** Begin WS session. Reconnect-safe; idempotent while connected. */
  start: () => Promise<void>;
  /** Gracefully end the session and close the socket. */
  stop: () => Promise<void>;
  /** Pause (client-side). Still connected but we ignore frames and notify server. */
  pause: () => Promise<void>;
  /** Resume after a pause. */
  resume: () => Promise<void>;
  /**
   * Feed raw audio as Float32 PCM in the *same* sampleRate you configured (default 16k).
   * This will:
   *   - (optional) run a simple energy-based VAD to produce begin/end events
   *   - convert to PCM16LE and send in base64 JSON chunks over the WS
   */
  pushPCM: (frame: Float32Array) => void;
};

export function useTurnInterpreter(opts: UseTurnInterpreterOptions): UseTurnInterpreter {
  const {
    wsUrl,
    fromLang,
    toLang,
    mode,
    sampleRate = 16000,
    vad = { enabled: true, silenceMs: 450, startMs: 120, energyThreshold: 0.015, minUtteranceMs: 280 },
    onPartial,
    onFinal,
    onStatus,
    onError,
  } = opts;

  // ---- Public state ----
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // ---- Internal refs ----
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);
  const closingRef = useRef(false);
  const queueRef = useRef<string[]>([]); // outbound JSON message queue while not open
  const sessionIdRef = useRef<string>('');
  const statusRef = useRef(onStatus);
  const partialRef = useRef(onPartial);
  const finalRef = useRef(onFinal);
  const errorRef = useRef(onError);

  // VAD state
  const vadEnabled = vad?.enabled !== false;
  const silenceMs = vad?.silenceMs ?? 450;
  const startMs = vad?.startMs ?? 120;
  const energyThreshold = vad?.energyThreshold ?? 0.015;
  const minUtteranceMs = vad?.minUtteranceMs ?? 280;

  const speakingRef = useRef(false);
  const speechAccumMsRef = useRef(0);
  const silenceAccumMsRef = useRef(0);
  const utteranceDurMsRef = useRef(0);

  // Cache callbacks in refs to avoid re-binding WS handlers
  useEffect(() => { statusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { partialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { finalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  // ---- Helpers: encoding & send ----
  function float32ToPCM16LE(frame: Float32Array): Uint8Array {
    const out = new Int16Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      let s = Math.max(-1, Math.min(1, frame[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return new Uint8Array(out.buffer);
  }

function u8ToBase64(u8: Uint8Array): string {
  // Prefer the RN/global btoa if it exists
  const btoaFn = (globalThis as any)?.btoa;
  if (typeof btoaFn === 'function') {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoaFn(s);
  }

  // Pure TypeScript fallback: bytes → base64 (no deps)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;

  for (; i + 2 < u8.length; i += 3) {
    const n = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    out +=
      chars[(n >> 18) & 63] +
      chars[(n >> 12) & 63] +
      chars[(n >> 6) & 63] +
      chars[n & 63];
  }

  // Handle remainder + padding
  if (i < u8.length) {
    const a = u8[i];
    const b = i + 1 < u8.length ? u8[i + 1] : 0;
    const n = (a << 16) | (b << 8);
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63];
    out += i + 1 < u8.length ? chars[(n >> 6) & 63] : '=';
    out += '=';
  }
  return out;
}


  const sendJSON = useCallback((obj: any) => {
    const msg = JSON.stringify(obj);
    if (connectedRef.current && wsRef.current && wsRef.current.readyState === 1) {
      try { wsRef.current.send(msg); } catch {}
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const flushQueue = useCallback(() => {
    if (!connectedRef.current || !wsRef.current) return;
    while (queueRef.current.length) {
      const msg = queueRef.current.shift()!;
      try { wsRef.current.send(msg); } catch {}
    }
  }, []);

  // ---- VAD processing on incoming frame ----
  function processVADAndMaybeEmit(frame: Float32Array) {
    if (!vadEnabled) return;
    // crude energy: mean absolute value
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += Math.abs(frame[i]);
    const energy = sum / frame.length;

    const frameMs = (frame.length / sampleRate) * 1000;
    utteranceDurMsRef.current += frameMs;

    if (energy >= energyThreshold) {
      // speech
      speechAccumMsRef.current += frameMs;
      silenceAccumMsRef.current = 0;

      if (!speakingRef.current && speechAccumMsRef.current >= startMs) {
        speakingRef.current = true;
        utteranceDurMsRef.current = 0;
        sendJSON({ type: 'vad', event: 'begin' });
      }
    } else {
      // silence
      silenceAccumMsRef.current += frameMs;
      speechAccumMsRef.current = 0;

      if (speakingRef.current && silenceAccumMsRef.current >= silenceMs) {
        // End utterance if it was long enough to be meaningful
        if (utteranceDurMsRef.current >= minUtteranceMs) {
          sendJSON({ type: 'vad', event: 'end' });
        }
        speakingRef.current = false;
        utteranceDurMsRef.current = 0;
        silenceAccumMsRef.current = 0;
      }
    }
  }

  // ---- Public API ------------------------------------------------------------
  const start = useCallback(async () => {
    if (isRecording) return;

    closingRef.current = false;
    sessionIdRef.current = 's_' + Date.now().toString(36);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      connectedRef.current = true;
      setIsRecording(true);
      setIsPaused(false);
      flushQueue();

      // Announce session
      sendJSON({
        type: 'start',
        sessionId: sessionIdRef.current,
        from: fromLang,
        to: toLang,
        mode,
        sampleRate,
        clientVad: !!vadEnabled,
      });

      statusRef.current?.('listening');
    };

    ws.onmessage = (ev: any) => {
      try {
        const msg = JSON.parse(typeof ev?.data === 'string' ? ev.data : '');
        switch (msg?.type) {
          case 'status':
            statusRef.current?.(String(msg.status || ''));
            break;
          case 'partial':
            partialRef.current?.(String(msg.text || ''));
            break;
          case 'final':
            finalRef.current?.({
              asr: msg.asr ?? '',
              mt: msg.mt ?? '',
              lid: msg.lid,
            });
            break;
          case 'error':
            errorRef.current?.(new Error(String(msg.message || 'Server error')));
            break;
        }
      } catch {
        // ignore non-JSON or unexpected frames
      }
    };

    ws.onerror = (_e) => {
      errorRef.current?.(new Error('WebSocket error'));
    };

    ws.onclose = () => {
      connectedRef.current = false;
      wsRef.current = null;
      setIsRecording(false);
      if (!closingRef.current) {
        // unexpected close
        statusRef.current?.('paused');
      }
    };
  }, [isRecording, wsUrl, fromLang, toLang, mode, sampleRate, vadEnabled, flushQueue, sendJSON]);

  const stop = useCallback(async () => {
    closingRef.current = true;
    try {
      sendJSON({ type: 'stop' });
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
    connectedRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
  }, [sendJSON]);

  const pause = useCallback(async () => {
    if (!isRecording || isPaused) return;
    setIsPaused(true);
    sendJSON({ type: 'pause' });
    statusRef.current?.('paused');
  }, [isRecording, isPaused, sendJSON]);

  const resume = useCallback(async () => {
    if (!isRecording || !isPaused) return;
    setIsPaused(false);
    sendJSON({ type: 'resume' });
    statusRef.current?.('listening');
  }, [isRecording, isPaused, sendJSON]);

  const pushPCM = useCallback((frame: Float32Array) => {
    if (!isRecording || isPaused) return;
    if (!connectedRef.current) return;

    // Basic VAD (optional)
    processVADAndMaybeEmit(frame);

    // Encode and send
    const u8 = float32ToPCM16LE(frame);
    const b64 = u8ToBase64(u8);

    sendJSON({ type: 'audio', pcm16: b64, samples: frame.length });
  }, [isRecording, isPaused, sampleRate, sendJSON]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  return useMemo(
    () => ({ isRecording, isPaused, start, stop, pause, resume, pushPCM }),
    [isRecording, isPaused, start, stop, pause, resume, pushPCM]
  );
}

export default useTurnInterpreter;
