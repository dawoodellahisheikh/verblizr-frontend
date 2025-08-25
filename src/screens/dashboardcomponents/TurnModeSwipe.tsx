// src/screens/dashboardcomponents/TurnModeSwipe.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../../theme';

export type TurnMode = 'alternate' | 'autoByLanguage';

export default function TurnModeSwipe({
  value,
  onChange,
  disabled = false,
}: {
  value: TurnMode;
  onChange: (v: TurnMode) => void;
  disabled?: boolean;
}) {
  const anim = useRef(
    new Animated.Value(value === 'alternate' ? 0 : 1),
  ).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value === 'alternate' ? 0 : 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const trackW = 180;
  const trackH = 36;
  const pad = 3;
  const thumbW = trackW / 2 - pad * 2;
  const left = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [pad, trackW / 2 + pad],
  });

  const switchTo = (v: TurnMode) => {
    if (disabled) return;
    if (v !== value) onChange(v);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onPanResponderRelease: (_e, g) => {
        if (disabled) return;
        const next =
          g.vx > 0.1 || g.dx > 20
            ? 'autoByLanguage'
            : g.vx < -0.1 || g.dx < -20
            ? 'alternate'
            : value === 'alternate'
            ? 'autoByLanguage'
            : 'alternate';
        switchTo(next);
      },
    }),
  ).current;

  return (
    <View
      style={{
        width: trackW,
        height: trackH,
        backgroundColor: colors.bgSoft,
        borderRadius: 999,
        padding: pad,
        opacity: disabled ? 0.5 : 1, // dim when disabled
      }}
      accessibilityRole="switch"
      accessibilityState={{ disabled }}
      {...(!disabled ? responder.panHandlers : {})}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: pad,
          bottom: pad,
          left,
          width: thumbW,
          backgroundColor: colors.white,
          borderRadius: 999,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          activeOpacity={disabled ? 1 : 0.7}
          onPress={() => switchTo('alternate')}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            height: trackH - pad * 2,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color:
                value === 'alternate'
                  ? colors.textPrimary
                  : colors.textSecondary,
            }}
          >
            Alternate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={disabled ? 1 : 0.7}
          onPress={() => switchTo('autoByLanguage')}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            height: trackH - pad * 2,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color:
                value === 'autoByLanguage'
                  ? colors.textPrimary
                  : colors.textSecondary,
            }}
          >
            Auto
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
