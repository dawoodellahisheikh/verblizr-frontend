// src/components/cards/GlassCircle.tsx
import React, { memo } from 'react';
import { View, Text, Platform, StyleSheet, Pressable } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { colors, spacing } from '../../theme';

type IconSpec =
  | { lib: 'MaterialIcons'; name: string; size?: number }
  | { lib: 'Ionicons'; name: string; size?: number };

type Props = {
  size: number; // diameter in px
  title: string;
  subtitle?: string;
  icon?: IconSpec;
  onPress?: () => void;
  testID?: string;
  filledRed?: boolean; // true only for Logout
  borderColor?: string; // default: #E5E7EB
  textTone?: 'brand' | 'black'; // title/icon color when not filledRed
};

const GlassCircle = memo(function GlassCircle({
  size,
  title,
  subtitle,
  icon,
  onPress,
  testID,
  filledRed = false,
  borderColor = '#E5E7EB',
  textTone = 'brand',
}: Props) {
  const scale = useSharedValue(1);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onIn = () => {
    scale.value = withTiming(0.97, { duration: 90 });
  };
  const onOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const diameter = Math.max(64, size);
  const iconSize =
    icon?.size ?? (diameter >= 140 ? 36 : diameter >= 110 ? 30 : 24);

  const iconColor = filledRed
    ? '#FFFFFF'
    : textTone === 'brand'
    ? colors.brand
    : colors.black;

  const titleColor = filledRed ? '#FFFFFF' : iconColor;
  const subColor = filledRed ? 'rgba(255,255,255,0.9)' : colors.textSecondary;

  // iOS: real blur; Android: light translucent fallback + (optional) blur
  const CircleSurface =
    Platform.OS === 'ios' ? (
      <BlurView
        style={[StyleSheet.absoluteFill, styles.blurMask]}
        blurType="light"
        blurAmount={16}
        reducedTransparencyFallbackColor="rgba(255,255,255,0.6)"
      />
    ) : (
      // Subtle translucent wash; Android blur support varies by device
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: filledRed
              ? 'transparent'
              : 'rgba(255,255,255,0.65)',
          },
        ]}
      />
    );

  return (
    <Animated.View style={[{ width: diameter, height: diameter }, aStyle]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        android_ripple={
          onPress
            ? {
                color: filledRed
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0,0,0,0.06)',
                radius: diameter / 2,
              }
            : undefined
        }
        style={[
          styles.circle,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            borderWidth: filledRed ? 0 : StyleSheet.hairlineWidth * 2,
            borderColor: filledRed ? 'transparent' : borderColor,
            backgroundColor: filledRed ? colors.brand : 'transparent',
            overflow: 'hidden',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
      >
        {/* surface */}
        {!filledRed && CircleSurface}

        {/* content */}
        <View style={styles.content}>
          {icon ? (
            <View style={{ marginBottom: spacing.xs }}>
              {icon.lib === 'MaterialIcons' ? (
                <Icon name={icon.name} size={iconSize} color={iconColor} />
              ) : (
                <IonIcon
                  name={icon.name as any}
                  size={iconSize}
                  color={iconColor}
                />
              )}
            </View>
          ) : null}

          <Text
            style={[
              styles.title,
              { color: titleColor, fontSize: diameter >= 140 ? 18 : 16 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[
                styles.sub,
                {
                  color: subColor,
                  fontSize: diameter >= 140 ? 13 : 12,
                },
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default GlassCircle;

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    // soft shadow to lift off background
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  blurMask: {
    borderRadius: 999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  sub: {
    marginTop: 2,
    textAlign: 'center',
  },
});
