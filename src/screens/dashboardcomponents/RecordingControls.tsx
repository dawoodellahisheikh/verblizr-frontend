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

export type RecordingControlsProps = {
  isRecording: boolean;
  isPaused: boolean;
  statusLabel: string;
  onToggleMic: () => void; // start OR stop
  onPause: () => void;
  onResume: () => void;
  size?: number;
};

export default function RecordingControls({
  isRecording,
  isPaused,
  statusLabel,
  onToggleMic,
  onPause,
  onResume,
  size = 108,
}: RecordingControlsProps) {
  const onMicPress = () => {
    if (!isRecording) return onToggleMic();
    if (isPaused) return onResume();
    return onToggleMic();
  };

  const effectiveLabel = useMemo(() => {
    if (!isRecording) return statusLabel || 'Tap to start conversation';
    if (isPaused) return 'Paused — tap Resume';
    // Force Listening while recording (not paused)
    return 'Listening…';
  }, [isRecording, isPaused, statusLabel]);

  return (
    <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
      <MicButton
        active={isRecording}
        paused={isPaused}
        onPress={() => {
          if (!isRecording) onToggleMic();
          else if (isPaused) onResume();
          else onToggleMic(); // stop
        }}
      />

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
