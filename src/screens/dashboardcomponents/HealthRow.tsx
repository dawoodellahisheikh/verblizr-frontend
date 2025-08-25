/**
 * HealthRow.tsx
 * ----------------------------------------------------------------------------
 * A compact status row showing 3 pills:
 *   1) Microphone permission (tap to request/open settings)
 *   2) Network connectivity type (Wi-Fi / Data / Offline)
 *   3) Bandwidth snapshot: ↑ upload / ↓ download in Mbps (tap to refresh)
 *
 * This is a *presentational* component. It does not run speed tests or query
 * permissions by itself; the parent owns that logic and passes values + handlers.
 *
 * Props:
 * - micPerm: 'granted' | 'denied' | 'undetermined'
 * - ensureMic(): prompt/recheck mic permission when pill is tapped
 * - netState: { isConnected: boolean | null; type: string }
 * - speedUpMbps / speedDownMbps: number | null
 * - measuring: boolean (true while a test is in flight)
 * - onRefreshSpeed(): trigger a new speed test when the user taps Speed
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors } from '../../theme';

type Tone = 'good' | 'bad' | 'neutral';

function StatPill({
  label,
  value,
  tone = 'neutral',
  onPress,
  containerStyle,
}: {
  label: string;
  value: string;
  tone?: Tone;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}) {
  // Simple palette tuned for light theme
  const palette: Record<Tone, { bg: string; text: string; muted: string }> = {
    good: { bg: '#ECFDF5', text: '#065F46', muted: '#047857' },
    bad: { bg: '#FEE2E2', text: '#991B1B', muted: '#B91C1C' },
    neutral: { bg: '#F3F4F6', text: '#111827', muted: '#6B7280' },
  };

  const Comp: any = onPress ? TouchableOpacity : View;
  const c = palette[tone];

  return (
    <Comp
      onPress={onPress}
      style={[
        {
          flex: 1,
          backgroundColor: c.bg,
          borderRadius: 999,
          paddingVertical: 8,
          paddingHorizontal: 12,
        },
        containerStyle,
      ]}
    >
      <Text style={{ fontSize: 12, color: c.muted }}>{label}</Text>
      <Text style={{ fontSize: 13, color: c.text, fontWeight: '600' }}>
        {value}
      </Text>
    </Comp>
  );
}

export type HealthRowProps = {
  micPerm: 'granted' | 'denied' | 'undetermined';
  ensureMic: () => void | Promise<void>;
  netState: { isConnected: boolean | null; type: string };
  speedUpMbps: number | null;
  speedDownMbps: number | null;
  measuring: boolean;
  onRefreshSpeed: () => void;
};

function formatSpeed(
  up: number | null,
  down: number | null,
  measuring: boolean,
) {
  if (measuring || up == null || down == null) return '…';
  return `↑${up.toFixed(1)} ↓${down.toFixed(1)}`;
}

function deriveNetworkLabel(state: HealthRowProps['netState']) {
  if (state.isConnected === false) return 'Offline';
  if (state.type === 'wifi') return 'Wi-Fi';
  if (state.type === 'cellular') return 'Data';
  return 'Online';
}

function deriveSpeedTone(up: number | null, measuring: boolean): Tone {
  if (measuring || up == null) return 'neutral';
  // Heuristic: <5 Mbps upload feels risky for live streaming
  return up < 5 ? 'bad' : 'good';
}

function HealthRow({
  micPerm,
  ensureMic,
  netState,
  speedUpMbps,
  speedDownMbps,
  measuring,
  onRefreshSpeed,
}: HealthRowProps) {
  return (
    <View
      style={{ flexDirection: 'row', marginTop: 12, alignItems: 'stretch' }}
    >
      {/* Microphone permission */}
      <StatPill
        label="Mic"
        value={
          micPerm === 'granted'
            ? 'Allowed'
            : micPerm === 'denied'
            ? 'No access'
            : 'Check'
        }
        tone={
          micPerm === 'granted'
            ? 'good'
            : micPerm === 'denied'
            ? 'bad'
            : 'neutral'
        }
        onPress={ensureMic as any}
        containerStyle={{ flex: 0.9 }}
      />

      <View style={{ width: 8 }} />

      {/* Network connectivity */}
      <StatPill
        label="Network"
        value={deriveNetworkLabel(netState)}
        tone={netState.isConnected === false ? 'bad' : 'good'}
        containerStyle={{ flex: 0.9 }}
      />

      <View style={{ width: 8 }} />

      {/* Bandwidth snapshot (tap to refresh) */}
      <StatPill
        label="Speed"
        value={formatSpeed(speedUpMbps, speedDownMbps, measuring)}
        tone={deriveSpeedTone(speedUpMbps, measuring)}
        onPress={onRefreshSpeed}
        containerStyle={{ flex: 1.2, paddingHorizontal: 14 }}
      />
    </View>
  );
}

export default memo(HealthRow);
