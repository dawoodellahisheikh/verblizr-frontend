/**
 * MicButton.tsx
 * ----------------------------------------------------------------------------
 * Round mic control with state-aware icon + animations.
 *
 * States & icons:
 *  - !active                 → Mic icon (idle breathing)
 *  - active && !paused       → Stop icon + red ripple waves + subtle inner pulse
 *  - active && paused        → Pause icon (no ripples, soft breathing)
 *
 * Props:
 *  - active?: boolean   // recording on/off (default false)
 *  - paused?: boolean   // paused state while recording (default false)
 *  - onPress: () => void
 *  - size?: number      // diameter of inner circle (default 108)
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme';

export default function MicButton({
  active = false,
  paused = false,
  onPress,
  size = 108,
}: {
  active?: boolean;
  paused?: boolean;
  onPress: () => void;
  size?: number;
}) {
  const ACTIVE_COLOR = '#EF4444';
  const containerSize = Math.round(size * 2);

  // ----- animations -----
  const pulseIdle = useRef(new Animated.Value(1)).current; // idle/paused breathing
  const pulseActive = useRef(new Animated.Value(1)).current; // subtle inner pulse while recording

  const RIPPLE_COUNT = 10;
  const rippleAnims = useRef(
    Array.from({ length: RIPPLE_COUNT }, () => new Animated.Value(0)),
  ).current;

  // track whether ripples should be running between loops
  const ripplesActive = active && !paused; // show ripples only while recording (not paused)
  const breathingActive = !active || paused; // breathe when idle or paused
  const ripplesActiveRef = useRef(ripplesActive);
  useEffect(() => {
    ripplesActiveRef.current = ripplesActive;
  }, [ripplesActive]);

  // Idle/paused breathing
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (breathingActive) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseIdle, {
            toValue: 1.08,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseIdle, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: true },
      );
      loop.start();
    } else {
      pulseIdle.stopAnimation();
      pulseIdle.setValue(1);
    }
    return () => {
      loop && loop.stop();
    };
  }, [breathingActive, pulseIdle]);

  // Subtle inner pulse while actively recording (helps indicate continuous activity)
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (ripplesActive) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseActive, {
            toValue: 1.04,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseActive, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      pulseActive.stopAnimation();
      pulseActive.setValue(1);
    }
    return () => {
      loop && loop.stop();
    };
  }, [ripplesActive, pulseActive]);

  // Reliable, continuous ripple cycles using recursive scheduling
  function startRippleCycle(v: Animated.Value, delayMs: number) {
    v.stopAnimation();
    v.setValue(0);
    const cycle = () => {
      if (!ripplesActiveRef.current) return;
      v.setValue(0);
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(v, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) cycle();
      });
    };
    cycle();
  }

  useEffect(() => {
    // start/stop ripples as state changes
    if (ripplesActive) {
      rippleAnims.forEach((v, idx) => startRippleCycle(v, idx * 300));
    } else {
      rippleAnims.forEach(v => {
        v.stopAnimation();
        v.setValue(0);
      });
    }
    return () => {
      rippleAnims.forEach(v => v.stopAnimation());
    };
  }, [ripplesActive, rippleAnims]);

  // ----- icons (pure Views, no deps) -----
  const MicIcon = () => (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.16,
          height: size * 0.22,
          borderRadius: size * 0.08,
          backgroundColor: '#fff',
        }}
      />
      <View
        style={{
          width: size * 0.04,
          height: size * 0.1,
          marginTop: 2,
          borderRadius: 2,
          backgroundColor: '#fff',
        }}
      />
      <View
        style={{
          width: size * 0.18,
          height: 2,
          marginTop: 2,
          borderRadius: 1,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );

  const StopIcon = () => (
    <View
      style={{
        width: size * 0.22,
        height: size * 0.22,
        borderRadius: 6,
        backgroundColor: '#fff',
      }}
    />
  );

  const PauseIcon = () => (
    <View style={{ flexDirection: 'row' }}>
      <View
        style={{
          width: size * 0.07,
          height: size * 0.22,
          borderRadius: 3,
          backgroundColor: '#fff',
          marginRight: size * 0.06,
        }}
      />
      <View
        style={{
          width: size * 0.07,
          height: size * 0.22,
          borderRadius: 3,
          backgroundColor: '#fff',
        }}
      />
    </View>
  );

  const bgColor = ripplesActive ? ACTIVE_COLOR : colors.black; // red when actively recording; black otherwise

  return (
    <Animated.View
      style={{ transform: [{ scale: breathingActive ? pulseIdle : 1 }] }}
    >
      <View
        style={{
          width: containerSize,
          height: containerSize,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ripples (recording only) */}
        {rippleAnims.map((v, i) => {
          const scale = v.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 2.6],
          });
          const opacity = v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0],
          });
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: 'rgba(239,68,68,0.65)',
                transform: [{ scale }],
                opacity,
              }}
            />
          );
        })}

        {/* Core button */}
        <Animated.View style={{ transform: [{ scale: pulseActive }] }}>
          <TouchableOpacity
            onPress={onPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={
              !active
                ? 'Start recording'
                : paused
                ? 'Resume recording'
                : 'Stop recording'
            }
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bgColor,
              shadowColor: '#000',
              shadowOpacity: 0.2,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            {!active ? <MicIcon /> : paused ? <PauseIcon /> : <StopIcon />}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
