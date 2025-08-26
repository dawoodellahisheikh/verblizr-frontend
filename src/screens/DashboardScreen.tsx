// src/screens/DashboardScreen.tsx
// ----------------------------------------------------------------------------

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { g } from '../styles/global';
import { colors, spacing } from '../theme';

// DES Added: Import centralized background component and Footer
import { AppBackground, Footer } from '../components';

import {
  LanguageChips,
  TurnModeSwipe,
  RecordingControls,
  HealthRow,
  DurationCard,
  RecentSessions,
  TranscriptModal,
  ConfirmStopSheet,
} from './dashboardcomponents';

import type {
  RecentSessionSummary as SessionSummary,
  TranscriptUtterance as Utterance,
} from './dashboardcomponents';

import { ENDPOINTS } from './apis/keys';
import { useTurnInterpreter } from './hooks/useTurnInterpreter';

// Language picker sheet
import LanguagePickerSheet from './dashboardcomponents/LanguagePickerSheet';
import type { Language as LanguageDef } from '../data/languages';

// ---------- Optional native modules (guarded) ----------
let NetInfo: any = null;
let RNPermissions: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch {}
try {
  RNPermissions = require('react-native-permissions');
} catch {}

// ---------- Optional export libs (guarded) ----------
let RNHTML2PDF: any = null;
let RNShareLib: any = null;
try {
  const mod = require('react-native-html-to-pdf');
  RNHTML2PDF = mod?.default ?? mod;
} catch {}
try {
  const mod = require('react-native-share');
  RNShareLib = mod?.default ?? mod;
} catch {}

// ------------------------------ Helpers --------------------------------------

function transcriptToHTML(
  utterances: Utterance[],
  pair: { from: string; to: string },
) {
  const rows = utterances
    .map(
      (u, i) => `
        <div style="margin:8px 0;">
          <div style="font-weight:600;color:#111;">${
            i % 2 === 0 ? pair.from : pair.to
          }</div>
          <div style="color:#111;">${(u.asr || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</div>
          ${
            u.mt
              ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;">${u.mt
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')}</div>`
              : ''
          }
        </div>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/>
    <style>body{font-family:-apple-system,Inter,system-ui; padding:20px; color:#111}</style>
    </head><body><h1 style="font-size:18px;margin:0 0 12px;">Verblizr Transcript</h1>
    <div style="color:#6b7280;font-size:12px;margin-bottom:12px;">${pair.from} ↔ ${pair.to}</div>
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;">${rows}</div>
  </body></html>`;
}

// ---- Dummy transcript (for network/offline/demo) ----------------------------
function makeDummyTranscript(_fromLabel: string, _toLabel: string) {
  const lines = [
    {
      a: 'Hello, can you hear me?',
      b: 'جی ہاں، میں آپ کی آواز سن سکتا/سکتی ہوں۔',
    },
    {
      a: 'Great, I’d like to confirm our appointment for tomorrow.',
      b: 'بہت خوب، میں کل کی ملاقات کی تصدیق کرنا چاہوں گا/گی۔',
    },
    { a: 'Sure, 10 AM at the clinic.', b: 'ضرور، صبح دس بجے کلینک پر۔' },
    { a: 'Perfect, thank you!', b: 'بہت اچھا، شکریہ!' },
  ];
  const out: Utterance[] = [];
  lines.forEach((ln, i) => {
    out.push({ id: `utt_${i}_AtoB`, asr: ln.a, mt: ln.b, lid: 'A' });
    out.push({ id: `utt_${i}_BtoA`, asr: ln.b, mt: ln.a, lid: 'B' });
  });
  return out;
}

async function checkMicPermission(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  try {
    if (RNPermissions) {
      const { PERMISSIONS, check, request, RESULTS } = RNPermissions;
      const perm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.MICROPHONE
          : PERMISSIONS.ANDROID.RECORD_AUDIO;
      let status = await check(perm);
      if (status === RESULTS.DENIED) status = await request(perm);
      if (status === RESULTS.GRANTED) return 'granted';
      if (status === RESULTS.BLOCKED) return 'denied';
      return 'undetermined';
    }
  } catch {}
  return 'undetermined';
}

// Removed unused confirmAsync function

async function measureDownMbps(timeoutMs = 6000, bytes = 1_500_000) {
  const url = `https://speed.cloudflare.com/__down?bytes=${bytes}`;
  const start = Date.now();
  try {
    const controller = (global as any).AbortController
      ? new AbortController()
      : undefined;
    const to = setTimeout(() => controller?.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'GET',
      signal: controller?.signal,
      headers: { 'Cache-Control': 'no-store' },
    });
    await res.text();
    clearTimeout(to);
    const sec = Math.max(0.001, (Date.now() - start) / 1000);
    return (bytes * 8) / sec / 1_000_000;
  } catch {
    return 0;
  }
}
async function measureUpMbps(timeoutMs = 6000, bytes = 1_000_000) {
  const url = 'https://speed.cloudflare.com/__up';
  try {
    const payload = '0'.repeat(bytes);
    const start = Date.now();
    const controller = (global as any).AbortController
      ? new AbortController()
      : undefined;
    const to = setTimeout(() => controller?.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'POST',
      signal: controller?.signal,
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      body: payload,
    });
    await res.text().catch(() => {});
    clearTimeout(to);
    const sec = Math.max(0.001, (Date.now() - start) / 1000);
    return (bytes * 8) / sec / 1_000_000;
  } catch {
    return 0;
  }
}
async function measureSpeedBoth(timeoutMs = 6000) {
  const down = await measureDownMbps(timeoutMs);
  const up = await measureUpMbps(timeoutMs);
  return { down, up };
}

// ---- Mail fallback helper ----------------------------------------------------
async function openMailFallback(subject: string, body: string) {
  try {
    const can = await Linking.canOpenURL('mailto:');
    if (!can) {
      Alert.alert(
        'Export failed',
        Platform.OS === 'ios'
          ? 'Unable to open URL: mailto:. Add "mailto" to LSApplicationQueriesSchemes in your Info.plist (simulator), or use a device with a mail app configured.'
          : 'No email app is available. Please install and set up an email app on your device/emulator.',
      );
      return false;
    }
    const url = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    await Linking.openURL(url);
    return true;
  } catch (e: any) {
    Alert.alert('Export failed', e?.message || 'Could not open email app.');
    return false;
  }
}

// ------------------------------ Types ----------------------------------------
type TurnMode = 'alternate' | 'autoByLanguage';
type TurnDirection = 'AtoB' | 'BtoA';
type LanguagePair = { from: string; to: string };

// ------------------------------ Screen ---------------------------------------
export default function DashboardScreen() {
  // ---- Language pair & inline picker -------------------------------------
  const [pair, setPair] = useState<LanguagePair>({
    from: 'Language 1',
    to: 'Language 2',
  });
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null);

  // Placeholder helpers + validation
  const PLACEHOLDER_FROM = 'Language 1';
  const PLACEHOLDER_TO = 'Language 2';
  const isPlaceholder = (s?: string) =>
    !s || s === PLACEHOLDER_FROM || s === PLACEHOLDER_TO;

  const hasBoth = useMemo(
    () => !isPlaceholder(pair.from) && !isPlaceholder(pair.to),
    [pair.from, pair.to],
  );
  const missingSide = useMemo<'from' | 'to' | null>(() => {
    if (isPlaceholder(pair.from)) return 'from';
    if (isPlaceholder(pair.to)) return 'to';
    return null;
  }, [pair.from, pair.to]);

  // NEW: which chip should show error styling
  const [chipError, setChipError] = useState<'from' | 'to' | null>(null);

  // ---- Recording + timers ----
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [elapsedBaseSec, setElapsedBaseSec] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Turn-taking engine ----
  const [turnMode, setTurnMode] = useState<TurnMode>('alternate');
  const [turnStatus, setTurnStatus] = useState<{
    s: 'listening' | 'translating' | 'playing' | 'paused';
    dir: TurnDirection;
  }>({ s: 'listening', dir: 'AtoB' });

  const turn = useTurnInterpreter({
    wsUrl: Platform.select({
      ios: 'ws://localhost:8082',
      android: 'ws://10.0.2.2:8082',
    })!,
    fromLang: pair.from,
    toLang: pair.to,
    mode: turnMode === 'alternate' ? 'alternate' : 'auto-lid',
    onStatus: s => setTurnStatus(prev => ({ ...prev, s: s as 'paused' | 'listening' | 'translating' | 'playing' })), // keep dir
    onPartial: () => {},
    onFinal: () => {},
    onError: e => console.warn('Turn engine error', e?.message || e),
  });

  // ---- Health ----
  const [micPerm, setMicPerm] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined',
  );
  const [netState, setNetState] = useState<{
    isConnected: boolean | null;
    type: string;
  }>({
    isConnected: null,
    type: 'unknown',
  });
  const [speedDownMbps, setSpeedDownMbps] = useState<number | null>(null);
  const [speedUpMbps, setSpeedUpMbps] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const measuringRef = useRef(false);

  // ---- Recent + transcript modal ----
  const [recent, setRecent] = useState<SessionSummary[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  // Store the language pair for the currently viewed transcript
  const [transcriptPair, setTranscriptPair] = useState<LanguagePair>({ from: '', to: '' });

  // --- Exporting transcript ---
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportedIds, setExportedIds] = useState<Record<string, true>>({});
  // Reset chips back to placeholders after a session ends
  const resetLanguages = useCallback(() => {
    setPair({ from: PLACEHOLDER_FROM, to: PLACEHOLDER_TO });
    setChipError(null);
  }, []);

  // ---- Labels ----
  const statusLabel = useMemo(() => {
    if (!hasBoth) return 'Pick languages to start';
    const src = turnStatus.dir === 'AtoB' ? pair.from : pair.to;
    const tgt = turnStatus.dir === 'AtoB' ? pair.to : pair.from;
    if (!isRecording) return 'Tap to start conversation';
    if (isPaused) return 'Paused — tap Resume';
    if (turnStatus.s === 'listening') return `Listening in ${src}`;
    if (turnStatus.s === 'translating') return `Translating to ${tgt}`;
    if (turnStatus.s === 'playing') return `Speaking ${tgt}`;
    return '…';
  }, [hasBoth, turnStatus, pair, isRecording, isPaused]);

  // ---- Effects: perms + net ----
  useEffect(() => {
    (async () => setMicPerm(await checkMicPermission()))();
  }, []);
  useEffect(() => {
    if (!NetInfo) return;
    const unsub = NetInfo.addEventListener((state: any) =>
      setNetState({
        isConnected: !!state.isConnected,
        type: state.type || 'unknown',
      }),
    );
    NetInfo.fetch &&
      NetInfo.fetch().then((state: any) =>
        setNetState({
          isConnected: !!state.isConnected,
          type: state.type || 'unknown',
        }),
      );
    return () => {
      unsub && unsub();
    };
  }, []);

  // ---- Effects: timers ----
  useEffect(() => {
    if (isRecording && !isPaused && startedAt != null) {
      if (recTimer.current) clearInterval(recTimer.current);
      recTimer.current = setInterval(() => {
        const delta = Math.floor(
          (Date.now() - (startedAt ?? Date.now())) / 1000,
        );
        setRecordSec(elapsedBaseSec + delta);
      }, 1000);
    } else {
      if (recTimer.current) {
        clearInterval(recTimer.current);
        recTimer.current = null;
      }
    }
    return () => {
      if (recTimer.current) {
        clearInterval(recTimer.current);
        recTimer.current = null;
      }
    };
  }, [isRecording, isPaused, startedAt, elapsedBaseSec]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const run = async () => {
      if (netState.isConnected === false || measuringRef.current) {
        if (netState.isConnected === false) {
          setSpeedDownMbps(0);
          setSpeedUpMbps(0);
        }
        return;
      }
      measuringRef.current = true;
      setMeasuring(true);
      try {
        const { down, up } = await measureSpeedBoth();
        setSpeedDownMbps(down);
        setSpeedUpMbps(up);
      } finally {
        measuringRef.current = false;
        setMeasuring(false);
      }
    };
    if (netState.isConnected) {
      void run();
      const ms = isRecording && !isPaused ? 300000 : 600000;
      interval = setInterval(run, ms);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [netState.isConnected, isRecording, isPaused]);

  // ---- Actions: mic flow ----
  const onToggleMic = useCallback(async () => {
    // Guard: require both languages before first start
    if (!isRecording && !hasBoth) {
      setChipError(missingSide);
      if (missingSide) setPickerSide(missingSide);
      // optional auto-clear if they dismiss sheet without picking
      setTimeout(() => setChipError(null), 1500);
      return;
    }

    if (!isRecording) {
      const perm = await checkMicPermission();
      setMicPerm(perm);
      if (perm !== 'granted') {
        Alert.alert(
          'Microphone access needed',
          'Please enable microphone access in Settings to start a session.',
        );
        return;
      }
      await turn.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordSec(0);
      setElapsedBaseSec(0);
      setStartedAt(Date.now());
    } else {
      setConfirmVisible(true);
    }
  }, [isRecording, hasBoth, missingSide, turn]);

  const onConfirmStop = useCallback(async () => {
    setConfirmVisible(false);
    await turn.stop();
    const id = 's_' + Date.now().toString(36);
    setRecent(cur =>
      [
        {
          id,
          startedAt: new Date().toISOString(),
          durationSec: recordSec,
          pair,
          status: 'completed',
        },
        ...cur,
      ].slice(0, 15),
    );
    setIsRecording(false);
    setIsPaused(false);
    setStartedAt(null);
    setElapsedBaseSec(0);
    setRecordSec(0);
    // Reset chips so next tap requires explicit selection again
    resetLanguages();
  }, [recordSec, pair, turn, resetLanguages]);

  const onPause = useCallback(() => {
    if (!isRecording || isPaused) return;
    if (startedAt != null)
      setElapsedBaseSec(
        prev => prev + Math.floor((Date.now() - startedAt) / 1000),
      );
    setStartedAt(null);
    setIsPaused(true);
    void turn.pause();
  }, [isRecording, isPaused, startedAt, turn]);

  const onResume = useCallback(() => {
    if (!isRecording || !isPaused) return;
    setStartedAt(Date.now());
    setIsPaused(false);
    void turn.resume();
  }, [isRecording, isPaused, turn]);

  // ---- Actions: transcript (with dummy fallback) ----
  const onOpenTranscript = useCallback(
    async (sessionId: string) => {
      // Find the session to get the correct language pair
      const session = recent.find(s => s.id === sessionId);
      const sessionPair = session?.pair || { from: 'Language 1', to: 'Language 2' };
      
      // Store the session's language pair for the modal
      setTranscriptPair(sessionPair);
      
      const showFallback = (reason?: string) => {
        console.warn('Transcript fetch failed:', reason || '(unknown)');
        setUtterances(makeDummyTranscript(sessionPair.from, sessionPair.to));
        setShowTranscript(true);
      };

      try {
        const resp = await fetch(ENDPOINTS.session.transcript(sessionId));
        if (!resp.ok) return showFallback(`HTTP ${resp.status}`);

        const data = await resp.json().catch(() => null);
        const list = Array.isArray(data?.utterances) ? data.utterances : [];
        if (!list.length) return showFallback('empty payload');

        const mapped: Utterance[] = list.map((u: any, idx: number) => ({
          id: String(u.id ?? u.turnId ?? u.seq ?? `utt_${idx}`),
          asr: u.asr ?? '',
          mt: u.mt ?? '',
          lid: u.lid,
        }));

        setUtterances(mapped);
        setShowTranscript(true);
      } catch (e: any) {
        showFallback(e?.message || 'network error');
      }
    },
    [recent],
  );

  // ---- Export transcript (PDF if libs present, else mail fallback) ----------
  const onExportTranscript = useCallback(
    async (sessionId: string) => {
      setExportingId(sessionId);
      try {
        // Try to fetch real transcript
        let list: Utterance[] = [];
        try {
          const resp = await fetch(ENDPOINTS.session.transcript(sessionId));
          if (resp.ok) {
            const data = await resp.json();
            const raw = Array.isArray(data?.utterances) ? data.utterances : [];
            list = raw.map((u: any, idx: number) => ({
              id: String(u.id ?? u.turnId ?? u.seq ?? `utt_${idx}`),
              asr: u.asr ?? '',
              mt: u.mt ?? '',
              lid: u.lid,
            }));
          }
        } catch {}
        if (!list.length) list = makeDummyTranscript(pair.from, pair.to);

        const subject = `Verblizr Transcript (${pair.from} ↔ ${pair.to})`;

        // Preferred: generate PDF when libs are present
        if (typeof RNHTML2PDF?.convert === 'function') {
          const html = transcriptToHTML(list, pair);
          const { filePath } = await RNHTML2PDF.convert({
            html,
            fileName: `Verblizr_Transcript_${sessionId}`,
            directory: 'Documents',
          });
          if (!filePath) throw new Error('PDF generation failed');

          const url =
            Platform.OS === 'android' ? `file://${filePath}` : filePath;

          if (RNShareLib?.open) {
            await RNShareLib.open({
              title: subject,
              subject,
              url,
              type: 'application/pdf',
              failOnCancel: false,
            });
          } else {
            const { Share } = require('react-native');
            await Share.share({ url, title: subject, message: subject });
          }
        } else {
          // Fallback: open mail with transcript text
          const body = list
            .map(u => `• ${u.asr}${u.mt ? `\n  → ${u.mt}` : ''}`)
            .join('\n\n');
          const ok = await openMailFallback(subject, body);
          if (!ok) return false;
          Alert.alert(
            'Exported via Email',
            'Opened your email/share sheet with the transcript text.',
          );
        }

        setExportedIds(prev => ({ ...prev, [sessionId]: true }));
        return true;
      } catch (e: any) {
        Alert.alert('Export failed', e?.message || 'Unknown error');
        return false;
      } finally {
        setExportingId(null);
      }
    },
    [pair],
  );

  // Close picker if recording starts
  useEffect(() => {
    if (isRecording && pickerSide !== null) setPickerSide(null);
  }, [isRecording, pickerSide]);

  // ----------------------------- Render --------------------------------------
  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} />
      {/* DES Added: Use centralized AppBackground component for consistent theming */}
      <AppBackground>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.lg,
            paddingBottom: spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
        {/* Quick Start Card */}
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 20,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.lg,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 3,
            borderWidth: 1,
            borderColor: '#EEF0F3',
            overflow: 'hidden',
          }}
        >
          {/* Decorative blobs */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -50,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: 999,
              backgroundColor: '#eaf4edff',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -70,
              left: -80,
              width: 220,
              height: 220,
              borderRadius: 999,
              backgroundColor: '#FBFBFD',
            }}
          />

          {/* Status badge (top-right) */}
          {(() => {
            const badge = !isRecording
              ? {
                  label: 'Ready',
                  bg: '#F3F4F6',
                  border: '#E5E7EB',
                  text: colors.textSecondary,
                  dot: '#9CA3AF',
                }
              : isPaused
              ? {
                  label: 'Paused',
                  bg: '#FEF3C7',
                  border: '#FDE68A',
                  text: '#92400E',
                  dot: '#F59E0B',
                }
              : turnStatus.s === 'listening'
              ? {
                  label: 'Listening',
                  bg: '#ECFDF5',
                  border: '#A7F3D0',
                  text: '#065F46',
                  dot: '#10B981',
                }
              : turnStatus.s === 'translating'
              ? {
                  label: 'Translating',
                  bg: '#EFF6FF',
                  border: '#BFDBFE',
                  text: '#1D4ED8',
                  dot: '#3B82F6',
                }
              : turnStatus.s === 'playing'
              ? {
                  label: 'Speaking',
                  bg: '#EEF2FF',
                  border: '#C7D2FE',
                  text: '#4338CA',
                  dot: '#6366F1',
                }
              : {
                  label: 'Active',
                  bg: '#ECFDF5',
                  border: '#A7F3D0',
                  text: '#065F46',
                  dot: '#10B981',
                };

            return (
              <View style={{ position: 'absolute', top: 12, right: 12 }}>
                <View
                  style={{
                    backgroundColor: badge.bg,
                    borderColor: badge.border,
                    borderWidth: 1,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: badge.dot,
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: badge.text,
                    }}
                  >
                    {badge.label}
                  </Text>
                </View>
              </View>
            );
          })()}

          <Text style={[g.title, { marginBottom: spacing.xs }]}>
            Ready to translate
          </Text>
          <Text
            style={{ color: colors.textSecondary, marginBottom: spacing.md }}
          >
            Pick languages and start a live session.
          </Text>

          <LanguageChips
            from={pair.from}
            to={pair.to}
            onOpenPicker={setPickerSide}
            onSwap={() => setPair({ from: pair.to, to: pair.from })}
            disabled={isRecording}
            errorSide={chipError} // NEW
          />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: colors.textSecondary }}>Turn mode:</Text>
            <TurnModeSwipe
              value={turnMode}
              onChange={setTurnMode}
              disabled={isRecording}
            />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: '#F1F2F4',
              marginBottom: spacing.md,
              marginTop: 2,
            }}
          />

          <RecordingControls
            isRecording={isRecording}
            isPaused={isPaused}
            statusLabel={statusLabel}
            onToggleMic={onToggleMic}
            onPause={onPause}
            onResume={onResume}
            recordingDuration={recordSec}
            maxDuration={3600} // 1 hour session limit
          />
        </View>

        {/* Health */}
        <HealthRow
          micPerm={micPerm}
          ensureMic={() => checkMicPermission().then(setMicPerm)}
          netState={netState}
          speedUpMbps={speedUpMbps}
          speedDownMbps={speedDownMbps}
          measuring={measuring}
          onRefreshSpeed={async () => {
            setMeasuring(true);
            try {
              const { down, up } = await measureSpeedBoth();
              setSpeedDownMbps(down);
              setSpeedUpMbps(up);
            } finally {
              setMeasuring(false);
            }
          }}
        />

        {/* Duration */}
        <DurationCard seconds={recordSec} />

        {/* Recent Sessions */}
        <View style={{ marginTop: spacing.xl }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 6,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: colors.black,
                  marginRight: 10,
                }}
              />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: colors.textPrimary,
                }}
              >
                Recent sessions
              </Text>
            </View>
            <View
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 999,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {recent.length}
              </Text>
            </View>
          </View>

          <RecentSessions
            data={recent}
            httpBase={ENDPOINTS.HTTP_BASE}
            onOpenTranscript={onOpenTranscript}
            maxVisible={5}
            onExport={onExportTranscript}
            exportingId={exportingId}
            exportedIds={exportedIds}
          />
        </View>
        </ScrollView>
      </AppBackground>

      {/* Sticky footer */}
      <Footer />

      {/* Language Picker Sheet */}
      <LanguagePickerSheet
        visible={pickerSide !== null}
        title={pickerSide === 'from' ? 'From language' : 'To language'}
        selectedLabel={pickerSide === 'from' ? pair.from : pair.to}
        excludeLabel={pickerSide === 'from' ? pair.to : pair.from}
        onPick={(l: LanguageDef) => {
          if (pickerSide === 'from')
            setPair(prev => ({ ...prev, from: l.label }));
          else setPair(prev => ({ ...prev, to: l.label }));
          // clear the chip error after a successful pick
          setChipError(null);
        }}
        onClose={() => setPickerSide(null)}
      />

      {/* Confirm stop sheet */}
      <ConfirmStopSheet
        visible={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={onConfirmStop}
      />

      {/* Transcript modal */}
      <TranscriptModal
        visible={showTranscript}
        onClose={() => setShowTranscript(false)}
        utterances={utterances} // Pass the utterances state
        fromLabel={transcriptPair.from} // Use the stored transcript language pair
        toLabel={transcriptPair.to} // Use the stored transcript language pair
      />
    </SafeAreaView>
  );
}
