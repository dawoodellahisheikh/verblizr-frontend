import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { LANGUAGES, type Language } from '../data/languages';
import { useVoiceSettings } from '../context/VoiceSettingsContext';
import { g } from '../styles/global';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageSelect'>;

/** Accept either a code string or a Language object and return code safely */
const toCode = (x: string | Language | null | undefined) =>
  typeof x === 'string' ? x : x && typeof x === 'object' ? x.code : '';

const labelFor = (codeLike: string | Language | null | undefined) => {
  const code = toCode(codeLike);
  return LANGUAGES.find(l => l.code === code)?.label ?? '';
};

const LanguageSelect: React.FC<Props> = ({ route, navigation }) => {
  const mode = route.params?.mode ?? 'from'; // 'from' | 'to'
  const insets = useSafeAreaInsets();
  const topPad = useMemo(() => insets.top + spacing.lg, [insets.top]);

  const { fromLang, toLang, setFromLang, setToLang, swap } = useVoiceSettings();

  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return LANGUAGES;
    return LANGUAGES.filter(
      l =>
        l.label.toLowerCase().includes(qq) || l.code.toLowerCase().includes(qq),
    );
  }, [q]);

  const currentCode = mode === 'from' ? fromLang : toLang;

  const onPick = (item: Language) => {
    if (mode === 'from') setFromLang(item.code);
    else setToLang(item.code);
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[g.screen, { backgroundColor: colors.bgSoft }]}
      edges={['top', 'bottom']}
    >
      {/* <StatusBar barStyle="dark-content" /> */}
      {/* Header row */}
      <View
        style={{
          paddingTop: topPad,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[g.title]}>
          {mode === 'from' ? 'From language' : 'To language'}
        </Text>

        {/* swap only when both selected and we're on the main screen; keep here for convenience */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={swap}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: '#F3F4F6',
          }}
        >
          <Text style={{ fontWeight: '700' }}>⇄</Text>
        </TouchableOpacity>

        {/* Close (X) */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            position: 'absolute',
            right: spacing.xl,
            top: topPad,
            padding: 8,
          }}
          accessibilityLabel="Close"
        >
          <Text style={{ fontSize: 20 }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.xl }}>
        <TextInput
          placeholder="Search language"
          value={q}
          onChangeText={setQ}
          style={[g.input, { marginBottom: spacing.md }]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
        }}
        renderItem={({ item }) => {
          const selected =
            item.code.toLowerCase() === toCode(currentCode).toLowerCase();
          return (
            <TouchableOpacity
              onPress={() => onPick(item)}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#EFEFEF',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 16 }}>{item.label}</Text>
              {selected && <Text style={{ color: '#2563EB' }}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View style={{ paddingTop: spacing.md }}>
            <Text style={[g.subtitle]}>
              Selected: {labelFor(currentCode) || '—'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default LanguageSelect;
