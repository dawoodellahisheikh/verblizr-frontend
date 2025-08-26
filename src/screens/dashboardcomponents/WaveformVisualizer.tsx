/**
 * WaveformVisualizer.tsx
 * ----------------------------------------------------------------------------
 * Real-time waveform visualization component for audio recording feedback.
 * 
 * Features:
 * - Animated bars that respond to audio input levels
 * - Smooth enter/exit animations
 * - Configurable bar count and styling
 * - Performance optimized with React.memo
 * 
 * Props:
 * - isActive: boolean - Whether to show active waveform animation
 * - audioLevel: number - Current audio input level (0-1)
 * - barCount: number - Number of waveform bars (default: 5)
 * - height: number - Height of the waveform container (default: 40)
 * - color: string - Color of the waveform bars
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Easing } from 'react-native';
import { colors } from '../../theme';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface WaveformVisualizerProps {
  /** Whether the waveform should be active/animated */
  isActive: boolean;
  /** Current audio input level (0-1) */
  audioLevel?: number;
  /** Number of waveform bars */
  barCount?: number;
  /** Height of the waveform container */
  height?: number;
  /** Color of the waveform bars */
  color?: string;
  /** Width of each bar */
  barWidth?: number;
  /** Spacing between bars */
  barSpacing?: number;
}

// =============================================================================
// WAVEFORM BAR COMPONENT
// =============================================================================

interface WaveformBarProps {
  animatedValue: Animated.Value;
  height: number;
  width: number;
  color: string;
  delay: number;
  isActive: boolean;
}

const WaveformBar: React.FC<WaveformBarProps> = React.memo(({ 
  animatedValue, 
  height, 
  width, 
  color, 
  delay, 
  isActive 
}) => {
  useEffect(() => {
    if (isActive) {
      // Create continuous animation loop
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 300 + Math.random() * 200, // Randomize duration for natural effect
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
            delay,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.2,
            duration: 300 + Math.random() * 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      );
      
      animation.start();
      return () => animation.stop();
    } else {
      // Animate to rest state
      Animated.timing(animatedValue, {
        toValue: 0.1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [isActive, animatedValue, delay]);

  const animatedHeight = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.1, height],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        width,
        height: animatedHeight,
        backgroundColor: color,
        borderRadius: width / 2,
        alignSelf: 'flex-end',
      }}
    />
  );
});

WaveformBar.displayName = 'WaveformBar';

// =============================================================================
// MAIN WAVEFORM VISUALIZER COMPONENT
// =============================================================================

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive,
  barCount = 5,
  height = 40,
  color = colors.brand || '#EF4444',
  barWidth = 3,
  barSpacing = 4,
}) => {
  // Create animated values for each bar
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.1))
  ).current;

  // Container animation for enter/exit
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(0.8)).current;

  // Animate container visibility
  useEffect(() => {
    if (isActive) {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(containerScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 0.8,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, containerOpacity, containerScale]);

  // Calculate total width for centering
  const totalWidth = useMemo(() => {
    return (barCount * barWidth) + ((barCount - 1) * barSpacing);
  }, [barCount, barWidth, barSpacing]);

  // Generate bars with staggered delays
  const bars = useMemo(() => {
    return animatedValues.map((animatedValue, index) => {
      const delay = index * 50; // Stagger animation start times
      
      return (
        <WaveformBar
          key={index}
          animatedValue={animatedValue}
          height={height}
          width={barWidth}
          color={color}
          delay={delay}
          isActive={isActive}
        />
      );
    });
  }, [animatedValues, height, barWidth, color, isActive]);

  // Don't render if not active (performance optimization)
  if (!isActive) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: containerOpacity,
        transform: [{ scale: containerScale }],
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: height + 10, // Add padding for visual breathing room
        width: totalWidth,
        alignSelf: 'center',
      }}
    >
      {bars.map((bar, index) => (
        <View key={index} style={{ marginRight: index < bars.length - 1 ? barSpacing : 0 }}>
          {bar}
        </View>
      ))}
    </Animated.View>
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert audio level (0-1) to visual intensity
 * @param audioLevel - Raw audio level from microphone
 * @returns Normalized intensity for visual feedback
 */
export function normalizeAudioLevel(audioLevel: number): number {
  // Apply logarithmic scaling for more natural visual response
  const clamped = Math.max(0, Math.min(1, audioLevel));
  return Math.pow(clamped, 0.5); // Square root for better visual mapping
}

/**
 * Generate random waveform data for testing/demo purposes
 * @param barCount - Number of bars to generate data for
 * @returns Array of normalized values (0-1)
 */
export function generateMockWaveformData(barCount: number): number[] {
  return Array.from({ length: barCount }, () => Math.random());
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

export const WaveformPresets = {
  /** Compact waveform for small spaces */
  compact: {
    barCount: 3,
    height: 24,
    barWidth: 2,
    barSpacing: 3,
  },
  
  /** Default balanced waveform */
  default: {
    barCount: 5,
    height: 40,
    barWidth: 3,
    barSpacing: 4,
  },
  
  /** Large waveform for prominent display */
  large: {
    barCount: 7,
    height: 60,
    barWidth: 4,
    barSpacing: 5,
  },
  
  /** Minimal single bar indicator */
  minimal: {
    barCount: 1,
    height: 20,
    barWidth: 4,
    barSpacing: 0,
  },
} as const;

export default React.memo(WaveformVisualizer);