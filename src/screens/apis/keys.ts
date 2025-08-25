// src/screens/apis/keys.ts
// Central place for non-secret config, endpoints, and feature flags.
// ⚠️ Do NOT put real API secrets in the app bundle. Keep secrets on the server.

import { Platform } from 'react-native';

/** Host helpers (simulator/emulator friendly) */
const WS_HOST   = Platform.select({ ios: 'localhost', android: '10.0.2.2' })!;
const HTTP_HOST = WS_HOST;

/** Endpoints */
export const ENDPOINTS = {
  WS_URL:  `ws://${WS_HOST}:8082`,                 // websocket for live audio
  HTTP_BASE: `http://${HTTP_HOST}:8083`,           // static session files
  session: {
    transcript: (sessionId: string) =>
      `http://${HTTP_HOST}:8083/sessions/${sessionId}/transcript.json`,
    interpretedMp3: (sessionId: string) =>
      `http://${HTTP_HOST}:8083/sessions/${sessionId}/interpreted_session.mp3`,
    ttsUtterance: (sessionId: string, utteranceId: string) =>
      `http://${HTTP_HOST}:8083/sessions/${sessionId}/u_${utteranceId}.mp3`,
  },
} as const;

/** Public keys (safe to ship). Keep empty until you really need them. */
export const PUBLIC_KEYS: {
  SENTRY_DSN?: string;
  AMPLITUDE_API_KEY?: string;
  [k: string]: string | undefined;
} = {
  // SENTRY_DSN: '',
  // AMPLITUDE_API_KEY: '',
};

/** Feature flags to toggle UI/flows without code surgery */
export const FEATURE = {
  interpretedPlayback: true,
  transcriptModal: true,
  speedTests: true,
  autoLID: true,
} as const;

/**
 * If you want build-time env (e.g., .env), use react-native-config
 * and map values into PUBLIC_KEYS/ENDPOINTS here so the rest of the app
 * only imports from this file.
 *
 * Example:
 *   import Config from 'react-native-config';
 *   export const OPENAI_PROXY_URL = Config.OPENAI_PROXY_URL;
 *
 * For real secrets (OpenAI keys, S3 creds, etc), keep them on your backend.
 */
