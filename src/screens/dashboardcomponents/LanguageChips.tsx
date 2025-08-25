/**
 * LanguageChips.tsx
 * ----------------------------------------------------------------------------
 * From / Swap / To chips row.
 * Adds soft-red error styling + subtle shake when `errorSide` is "from" or "to".
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../theme';

type Props = {
  from: string;
  to: string;
  disabled?: boolean;
  onOpenPicker: (side: 'from' | 'to') => void;
  onSwap: () => void;
  errorSide?: 'from' | 'to' | null; // NEW
  style?: StyleProp<ViewStyle>;
};

export default function LanguageChips({
  from,
  to,
  disabled,
  onOpenPicker,
  onSwap,
  errorSide,
  style,
}: Props) {
  const shakeFrom = useRef(new Animated.Value(0)).current;
  const shakeTo = useRef(new Animated.Value(0)).current;

  // simple shake anim when errorSide toggles
  useEffect(() => {
    const run = (v: Animated.Value) => {
      v.setValue(0);
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: -1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
    };
    if (errorSide === 'from') run(shakeFrom);
    if (errorSide === 'to') run(shakeTo);
  }, [errorSide, shakeFrom, shakeTo]);

  const chipBase = {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  } as const;

  const chipTextBase = {
    fontWeight: '700' as const,
    color: colors.textPrimary,
  };

  const errorChip = {
    borderColor: '#FCA5A5', // red-300
    backgroundColor: '#FEF2F2', // red-50
  };
  const errorText = { color: '#991B1B' };

  const shakeToPx = (v: Animated.Value) =>
    v.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        style,
      ]}
    >
      {/* FROM */}
      <Animated.View
        style={{ transform: [{ translateX: shakeToPx(shakeFrom) }] }}
      >
        <TouchableOpacity
          onPress={() => onOpenPicker('from')}
          disabled={disabled}
          style={[
            chipBase,
            { marginRight: spacing.sm, opacity: disabled ? 0.6 : 1 },
            errorSide === 'from' && errorChip,
          ]}
        >
          <Text style={[chipTextBase, errorSide === 'from' && errorText]}>
            {from || 'Language 1'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* SWAP */}
      <TouchableOpacity
        onPress={onSwap}
        disabled={disabled}
        style={{
          borderRadius: 999,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          backgroundColor: '#F9FAFB',
          marginRight: spacing.sm,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: '700', color: colors.textPrimary }}>↔</Text>
      </TouchableOpacity>

      {/* TO */}
      <Animated.View
        style={{ transform: [{ translateX: shakeToPx(shakeTo) }] }}
      >
        <TouchableOpacity
          onPress={() => onOpenPicker('to')}
          disabled={disabled}
          style={[
            chipBase,
            { opacity: disabled ? 0.6 : 1 },
            errorSide === 'to' && errorChip,
          ]}
        >
          <Text style={[chipTextBase, errorSide === 'to' && errorText]}>
            {to || 'Language 2'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
