// src/screens/dashboardcomponents/TranscriptModal.tsx
// ----------------------------------------------------------------------------
// Bottom-sheet modal to display a session transcript.
// - If `utterances` is empty/undefined, shows a built-in DEMO list.
// - Renders each utterance with Original (ASR) and Translated (MT) text.
// - Shows *actual* selected language names in the header legend.
// - Backwards compatible: you can still override labels via fromLabel/toLabel.

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { g } from '../../styles/global';
import { colors, spacing } from '../../theme';
import type { Language as LanguageDef } from '../../data/languages';

export type Utterance = {
  id: string;
  asr?: string; // Original text (ASR)
  mt?: string; // Translated text (MT)
  lid?: string; // (optional) language id detected
};

export type TranscriptModalProps = {
  visible: boolean;
  onClose: () => void;
  utterances?: Utterance[];
  /**
   * Pass the currently selected languages from Dashboard.
   * If provided, these names will be used in the header legend and per-card labels.
   */
  fromLang?: LanguageDef | null;
  toLang?: LanguageDef | null;
  /** Optional manual overrides (takes precedence if provided) */
  fromLabel?: string;
  toLabel?: string;
};

const SHEET_HEIGHT = Math.min(
  640,
  Math.round(Dimensions.get('window').height * 0.75),
);

// --- Demo transcript shown when no data provided ---
const DEMO_UTTS: Utterance[] = [
  {
    id: 'demo-1',
    asr: 'Hello, can you hear me?',
    mt: 'جی ہاں، میں آپ کی آواز سن سکتا/سکتی ہوں۔',
    lid: 'en',
  },
  {
    id: 'demo-2',
    asr: 'I need to schedule an appointment for tomorrow.',
    mt: 'مجھے کل کے لئے ایک اپائنٹمنٹ طے کرنا ہے۔',
    lid: 'en',
  },
  {
    id: 'demo-3',
    asr: 'ٹھیک ہے، آپ کو کس وقت مناسب ہے؟',
    mt: 'Okay, what time works for you?',
    lid: 'ur',
  },
  {
    id: 'demo-4',
    asr: 'Around 3 PM would be great.',
    mt: 'تین بجے کے قریب بہتر رہے گا۔',
    lid: 'en',
  },
  {
    id: 'demo-5',
    asr: 'Please bring your ID and previous reports.',
    mt: 'براہِ کرم اپنی شناختی دستاویز اور پچھلی رپورٹس ساتھ لائیں۔',
    lid: 'en',
  },
];

export default function TranscriptModal({
  visible,
  onClose,
  utterances,
  fromLang,
  toLang,
  fromLabel,
  toLabel,
}: TranscriptModalProps) {
  // Prefer explicit label props, else derive from language names, else sensible defaults.
  const resolvedFromLabel = fromLabel ?? fromLang?.label ?? 'Original';
  const resolvedToLabel = toLabel ?? toLang?.label ?? 'Translated';

  const list = useMemo<Utterance[]>(
    () =>
      Array.isArray(utterances) && utterances.length ? utterances : DEMO_UTTS,
    [utterances],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            height: SHEET_HEIGHT,
            backgroundColor: colors.white,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl,
            borderWidth: 1,
            borderColor: '#EEF0F3',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <Text style={[g.title, { flex: 1 }]}>Session transcript</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close transcript"
            >
              <Text style={{ fontSize: 22, color: colors.textPrimary }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Subheader: count + legend using real language names */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                backgroundColor: '#F3F4F6',
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {list.length} utterance{list.length === 1 ? '' : 's'}
              </Text>
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: '#D1D5DB',
                    marginRight: 6,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {resolvedFromLabel}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: '#A7F3D0',
                    marginRight: 6,
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {resolvedToLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* List */}
          <FlatList
            data={list}
            keyExtractor={it => it.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: spacing.sm,
                  borderWidth: 1,
                  borderColor: '#EEF0F3',
                }}
              >
                {/* Original / ASR */}
                {!!item.asr && (
                  <View style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      {resolvedFromLabel}
                    </Text>
                    <Text style={{ color: colors.textPrimary }}>
                      {item.asr}
                    </Text>
                  </View>
                )}

                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: '#ECEFF3',
                    marginVertical: 6,
                  }}
                />

                {/* Translated / MT */}
                {!!item.mt && (
                  <View>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      {resolvedToLabel}
                    </Text>
                    <Text style={{ color: colors.textPrimary }}>{item.mt}</Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={{ paddingVertical: spacing.lg }}>
                <Text style={{ color: colors.textSecondary }}>
                  No transcript available.
                </Text>
              </View>
            }
          />

          {/* Tiny bottom spacer for swipe affordance */}
          <View
            style={{
              alignSelf: 'center',
              width: 44,
              height: 5,
              borderRadius: 999,
              backgroundColor: '#E5E7EB',
              marginTop: spacing.sm,
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
