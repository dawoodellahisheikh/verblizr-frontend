/**
 * types.ts
 * ----------------------------------------------------------------------------
 * Central place for small shared types used across the Dashboard UI.
 * Import these wherever you need them to keep prop shapes consistent.
 *
 * Example:
 *   import type { LanguagePair, SessionSummary, TurnMode, TurnDirection } from './types';
 */

/** A → B language selection shown in LanguageChips and used by the engine. */
export type LanguagePair = {
  from: string; // e.g., 'English'
  to: string;   // e.g., 'Urdu'
};

/** Minimal session item rendered in RecentSessions. */
export type SessionSummary = {
  id: string;
  startedAt: string;           // ISO string
  durationSec: number;         // total seconds recorded
  pair: LanguagePair;          // languages for the session
  status: 'completed' | 'aborted';
};

/** Turn-taking mode (manual alternate vs auto language-ID driven). */
export type TurnMode = 'alternate' | 'autoByLanguage';

/** Current conversational direction used in status labels. */
export type TurnDirection = 'AtoB' | 'BtoA';

/** Utterance shape for the transcript modal (original + translated lines). */
export type Utterance = {
  id: string;   // stable id per utterance
  asr?: string; // original (speech-to-text)
  mt?: string;  // translated text
  lid?: string; // optional language-id tag for the ASR segment
};
