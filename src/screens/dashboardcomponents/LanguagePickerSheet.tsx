// src/screens/dashboardcomponents/LanguagePickerSheet.tsx
/**
 * LanguagePickerSheet.tsx
 * ----------------------------------------------------------------------------
 * Bottom-sheet language picker (reused from your previous LanguagePairScreen).
 * Filters by code/label. Returns the full Language object on pick.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { LANGUAGES, type Language } from '../../data/languages';
import { g } from '../../styles/global';
import { colors, spacing } from '../../theme';

const SHEET_HEIGHT = Math.min(
  560,
  Math.round(Dimensions.get('window').height * 0.55),
);

export default function LanguagePickerSheet({
  visible,
  title,
  selectedLabel,
  onPick,
  onClose,
  excludeLabel, // optional: label to hide (the opposite chip)
}: {
  visible: boolean;
  title: string;
  selectedLabel?: string;
  onPick: (l: Language) => void;
  onClose: () => void;
  excludeLabel?: string;
}) {
  const [q, setQ] = useState('');

  // Resolve the currently selected code (to show ✓)
  const selectedCode = useMemo(() => {
    const found = LANGUAGES.find(l => l.label === selectedLabel);
    return found?.code;
  }, [selectedLabel]);

  // Resolve excludeLabel -> code (so we filter robustly by code)
  const excludeCode = useMemo(() => {
    if (!excludeLabel) return undefined;
    const found = LANGUAGES.find(
      l =>
        l.label === excludeLabel ||
        l.code.toLowerCase() === excludeLabel.toLowerCase(),
    );
    return found?.code;
  }, [excludeLabel]);

  // Base list (optionally exclude the "other" language), then search
  const data = useMemo(() => {
    const base = excludeCode
      ? LANGUAGES.filter(l => l.code !== excludeCode)
      : LANGUAGES;
    const s = q.trim().toLowerCase();
    if (!s) return base;
    return base.filter(
      l =>
        l.label.toLowerCase().includes(s) || l.code.toLowerCase().includes(s),
    );
  }, [q, excludeCode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            height: SHEET_HEIGHT,
            backgroundColor: colors.bgSoft,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl,
          }}
        >
          {/* header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text style={[g.title, { flex: 1 }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* search */}
          <TextInput
            placeholder="Search language"
            value={q}
            onChangeText={setQ}
            style={[g.input, { marginBottom: spacing.md }]}
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={false}
          />

          {/* list */}
          <FlatList
            data={data}
            keyExtractor={item => item.code}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.code === selectedCode;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#EFEFEF',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textPrimary }}>
                    {item.label}
                  </Text>
                  {selected ? (
                    <Text
                      style={{
                        fontSize: 22,
                        lineHeight: 22,
                        color: '#A4A4A4',
                        fontWeight: '800',
                        textShadowColor: 'rgba(0,0,0,0.1)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 1,
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
