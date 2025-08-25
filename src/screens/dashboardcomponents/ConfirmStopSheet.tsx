/**
 * ConfirmStopSheet.tsx
 * ----------------------------------------------------------------------------
 * A bottom sheet-style confirmation modal for stopping a recording session.
 *
 * Tweaks in this version:
 *  - The sheet sits a bit ABOVE the very bottom edge for better reach & visuals.
 *  - Uses safe-area insets + extra margin to lift it (configurable via `liftPx`).
 *  - Adds a subtle grabber and comfortable padding.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

export default function ConfirmStopSheet({
  visible,
  onCancel,
  onConfirm,
  title = 'Stop session?',
  message = 'Do you want to stop and save this session?',
  confirmText = 'Finish & Save',
  cancelText = 'Keep recording',
  liftPx = 20, // extra lift above the bottom (in addition to safe inset)
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Additional space above bottom inset to raise the sheet */
  liftPx?: number;
}) {
  const insets = useSafeAreaInsets();
  const bottomLift = Math.max(insets.bottom, 10) + liftPx; // ensure some gap even without insets

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.25)',
        }}
      >
        <View
          style={{
            marginBottom: bottomLift,
            marginHorizontal: spacing.lg,
            backgroundColor: colors.white,
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 6,
          }}
        >
          {/* grabber */}
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View
              style={{
                width: 48,
                height: 5,
                borderRadius: 999,
                backgroundColor: '#E5E7EB',
              }}
            />
          </View>

          <View
            style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: colors.textPrimary,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
              {message}
            </Text>
          </View>

          {/* Actions */}
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
            }}
          >
            <TouchableOpacity
              onPress={onConfirm}
              accessibilityRole="button"
              style={{
                backgroundColor: colors.brand,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {confirmText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onCancel}
              accessibilityRole="button"
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {cancelText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
