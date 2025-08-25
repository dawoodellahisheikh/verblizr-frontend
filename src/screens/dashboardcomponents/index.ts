/**
 * src/screens/dashboardcomponents/index.ts
 * ----------------------------------------------------------------------------
 * Barrel file that re-exports all Dashboard UI components and a few useful
 * types so screens can import from a single path:
 *
 *   import {
 *     LanguageChips,
 *     TurnModeSwipe,
 *     RecordingControls,
 *     HealthRow,
 *     DurationCard,
 *     RecentSessions,
 *     TranscriptModal,
 *     ConfirmStopSheet,
 *   } from './dashboardcomponents';
 *
 * This file has no runtime logic; it simply forwards exports.
 */

export { default as LanguageChips } from './LanguageChips';
export { default as TurnModeSwipe } from './TurnModeSwipe';
export { default as MicButton } from './MicButton';
export { default as RecordingControls } from './RecordingControls';
export { default as HealthRow } from './HealthRow';
export { default as DurationCard } from './DurationCard';
export { default as RecentSessions } from './RecentSessions';
export { default as TranscriptModal } from './TranscriptModal';
export { default as ConfirmStopSheet } from './ConfirmStopSheet';


// Optional type re-exports for convenience
export type { SessionSummary as RecentSessionSummary } from './RecentSessions';
export type { Utterance as TranscriptUtterance } from './TranscriptModal';
export type { ConfirmStopSheetProps } from './ConfirmStopSheet';
export type { RecordingControlsProps } from './RecordingControls';
