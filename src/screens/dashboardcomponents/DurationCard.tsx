/**
 * DurationCard.tsx
 * ----------------------------------------------------------------------------
 * Displays the current session duration (MM:SS) and a simple progress bar
 * toward a target length (default 60 minutes). This is purely presentational.
 *
 * Props:
 * - seconds: number               // elapsed seconds for the current session
 * - targetSeconds?: number        // goal/scale for the progress bar (default 3600s)
 *
 * Usage:
 *   <DurationCard seconds={recordSec} targetSeconds={3600} />
 */

import React, { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from '../../theme';

/** Internal thin progress bar to visualize ratio 0..1 */
function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ height: 10, backgroundColor: '#EAEAEA', borderRadius: 999 }}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: 10,
          backgroundColor: colors.black,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

export type DurationCardProps = {
  /** Elapsed seconds in the current session. */
  seconds: number;
  /** Target duration in seconds (progress bar max). Defaults to 3600 (60m). */
  targetSeconds?: number;
};

function toClock(secs: number) {
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function DurationCard({ seconds, targetSeconds = 3600 }: DurationCardProps) {
  // Compute progress ratio; clamp to [0,1] to avoid overflow visuals
  const ratio = useMemo(() => {
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    return Math.max(0, Math.min(1, seconds / targetSeconds));
  }, [seconds, targetSeconds]);

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: spacing.lg,
        marginTop: spacing.lg,
        // subtle elevation/shadow; tweak per your design system
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
    >
      {/* Title + pill clock */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Text
          style={{ fontWeight: '700', fontSize: 16, color: colors.textPrimary }}
        >
          Duration
        </Text>
        <View
          style={{
            marginLeft: 8,
            backgroundColor: '#F3F4F6',
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderRadius: 999,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {toClock(seconds)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <ProgressBar ratio={ratio} />

      {/* Caption */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          Session progress
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {Math.round(ratio * 100)}%
        </Text>
      </View>
    </View>
  );
}

export default memo(DurationCard);
