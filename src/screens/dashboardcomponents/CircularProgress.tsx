/**
 * CircularProgress.tsx
 * ----------------------------------------------------------------------------
 * Circular progress indicator component for showing session duration or progress.
 * 
 * Features:
 * - Smooth animated progress updates
 * - Customizable colors and stroke width
 * - Optional gradient support
 * - Performance optimized with native driver where possible
 * 
 * Props:
 * - progress: number (0-1) - Current progress value
 * - size: number - Diameter of the circle
 * - strokeWidth: number - Width of the progress stroke
 * - color: string - Color of the progress stroke
 * - backgroundColor: string - Color of the background stroke
 * - animated: boolean - Whether to animate progress changes
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface CircularProgressProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Diameter of the circle */
  size: number;
  /** Width of the progress stroke */
  strokeWidth?: number;
  /** Color of the progress stroke */
  color?: string;
  /** Color of the background stroke */
  backgroundColor?: string;
  /** Whether to animate progress changes */
  animated?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Whether to show the progress (for enter/exit animations) */
  visible?: boolean;
}

// =============================================================================
// ANIMATED SVG CIRCLE COMPONENT
// =============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// =============================================================================
// MAIN CIRCULAR PROGRESS COMPONENT
// =============================================================================

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size,
  strokeWidth = 3,
  color = '#EF4444',
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  animated = true,
  animationDuration = 300,
  visible = true,
}) => {
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animated values
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const visibilityOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const visibilityScale = useRef(new Animated.Value(visible ? 1 : 0.8)).current;

  // Update progress animation
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: animationDuration,
        useNativeDriver: false, // SVG properties don't support native driver
      }).start();
    } else {
      animatedProgress.setValue(progress);
    }
  }, [progress, animated, animationDuration, animatedProgress]);

  // Handle visibility animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(visibilityOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(visibilityScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(visibilityOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(visibilityScale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, visibilityOpacity, visibilityScale]);

  // Calculate stroke dash offset for progress
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: visibilityOpacity,
        transform: [{ scale: visibilityScale }],
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`} // Start from top
          />
        </Svg>
      </View>
    </Animated.View>
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert time duration to progress value (0-1)
 * @param currentSeconds - Current elapsed time in seconds
 * @param maxSeconds - Maximum duration in seconds
 * @returns Progress value between 0 and 1
 */
export function timeToProgress(currentSeconds: number, maxSeconds: number): number {
  if (maxSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, currentSeconds / maxSeconds));
}

/**
 * Format seconds to MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress color based on time remaining
 * @param progress - Current progress (0-1)
 * @returns Color string for the progress indicator
 */
export function getProgressColor(progress: number): string {
  if (progress < 0.7) return '#10B981'; // Green - plenty of time
  if (progress < 0.9) return '#F59E0B'; // Yellow - warning
  return '#EF4444'; // Red - almost done
}

export default React.memo(CircularProgress);