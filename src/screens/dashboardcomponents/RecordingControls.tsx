/**
 * RecordingControls.tsx
 * ----------------------------------------------------------------------------
 * Presentational controls for the recording area of the Dashboard.
 *
 * Big Mic button behavior:
 *  - Idle     → onToggleMic()  (Start)
 *  - Paused   → onResume()     (Resume)
 *  - Active   → onToggleMic()  (Stop)
 *
 * Also shows a Pause/Resume pill, and a status label that falls back to
 * "Listening…" when active & not paused.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import MicButton from './MicButton';
import WaveformVisualizer from './WaveformVisualizer';
import CircularProgress, { timeToProgress, getProgressColor } from './CircularProgress';

export type RecordingControlsProps = {
  isRecording: boolean;
  isPaused: boolean;
  statusLabel: string;
  onToggleMic: () => void; // start OR stop
  onPause: () => void;
  onResume: () => void;
  /** Current recording duration in seconds */
  recordingDuration?: number;
  /** Maximum session duration in seconds (default: 3600 = 1 hour) */
  maxDuration?: number;
};

export default function RecordingControls({
  isRecording,
  isPaused,
  statusLabel,
  onToggleMic,
  onPause,
  onResume,
  recordingDuration = 0,
  maxDuration = 3600, // 1 hour default
}: RecordingControlsProps) {

  const effectiveLabel = useMemo(() => {
    if (!isRecording) return statusLabel || 'Tap to start conversation';
    if (isPaused) return 'Paused — tap Resume';
    // Force Listening while recording (not paused)
    return 'Listening…';
  }, [isRecording, isPaused, statusLabel]);

  // Calculate progress for session duration
  const sessionProgress = useMemo(() => {
    return timeToProgress(recordingDuration, maxDuration);
  }, [recordingDuration, maxDuration]);

  const progressColor = useMemo(() => {
    return getProgressColor(sessionProgress);
  }, [sessionProgress]);

  return (
    <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
      {/* Mic button with circular progress indicator */}
      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Circular progress ring around mic button */}
        <CircularProgress
          progress={sessionProgress}
          size={130} // Slightly larger than mic button (108)
          strokeWidth={3}
          color={progressColor}
          backgroundColor="rgba(255, 255, 255, 0.3)"
          visible={isRecording}
          animated={true}
        />
        
        {/* Main mic button */}
        <MicButton
          active={isRecording}
          paused={isPaused}
          onPress={() => {
            if (!isRecording) onToggleMic();
            else if (isPaused) onResume();
            else onToggleMic(); // stop
          }}
        />
      </View>
      
      {/* Waveform visualization during active recording */}
      <View style={{ marginTop: spacing.xs, height: 50, justifyContent: 'center' }}>
        <WaveformVisualizer
          isActive={isRecording && !isPaused}
          barCount={5}
          height={40}
          color={colors.brand}
        />
      </View>

      <View
        style={{
          marginTop: spacing.sm,
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{ color: colors.textSecondary, fontSize: 13 }}
          numberOfLines={1}
        >
          {effectiveLabel}
        </Text>

        {isRecording && (
          <TouchableOpacity
            onPress={isPaused ? onResume : onPause}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: isPaused ? colors.black : '#F3F4F6',
            }}
          >
            <Text
              style={{
                color: isPaused ? '#fff' : colors.textPrimary,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
