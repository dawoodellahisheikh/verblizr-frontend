// src/screens/LanguagePairScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  StatusBar,
  Dimensions,
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

import Footer from '../components/Footer';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguagePair'>;

type PickerProps = {
  visible: boolean;
  title: string;
  selectedCode?: string;
  onPick: (l: Language) => void;
  onClose: () => void;
};

const SHEET_HEIGHT = Math.min(
  560,
  Math.round(Dimensions.get('window').height * 0.55),
);

const LanguagePicker: React.FC<PickerProps> = ({
  visible,
  title,
  selectedCode,
  onPick,
  onClose,
}) => {
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return LANGUAGES;
    return LANGUAGES.filter(
      l =>
        l.label.toLowerCase().includes(s) || l.code.toLowerCase().includes(s),
    );
  }, [q]);

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
            backgroundColor: '#F8F8F8',
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
                  <Text style={{ fontSize: 16 }}>{item.label}</Text>

                  {/* Big glossy checkmark – no external libs */}
                  {selected ? (
                    <Text
                      style={{
                        fontSize: 22,
                        lineHeight: 22,
                        color: '#a4a4a4ff', // green
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
};

const LanguagePairScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  // const topPad = useMemo(() => insets.top + spacing.xl, [insets.top]);

  const { fromLang, toLang, setFromLang, setToLang } = useVoiceSettings();
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const labelFor = (code?: string) =>
    LANGUAGES.find(l => l.code === code)?.label ?? '';

  const swap = () => {
    const f = fromLang;
    setFromLang(toLang);
    setToLang(f);
  };

  return (
    <SafeAreaView style={[g.screen, { flex: 1 }]} edges={['top', 'bottom']}>
      {/* <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} /> */}

      {/* Main content fills the screen */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            padding: spacing.xl,
          }}
        >
          {/* header with close */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={[g.title, { flex: 1 }]}>Choose languages</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* From */}
          <Text style={[g.label, { marginBottom: spacing.xs }]}>From</Text>
          <TouchableOpacity
            style={[g.input, { justifyContent: 'center' }]}
            onPress={() => setShowFrom(true)}
          >
            <Text style={{ color: fromLang ? colors.textPrimary : '#9CA3AF' }}>
              {labelFor(fromLang) || 'Select language'}
            </Text>
          </TouchableOpacity>

          {/* tiny gap under From */}
          <View style={{ height: spacing.sm }} />

          {/* To */}
          <Text style={[g.label, { marginBottom: spacing.xs }]}>To</Text>
          <TouchableOpacity
            style={[g.input, { justifyContent: 'center' }]}
            onPress={() => setShowTo(true)}
          >
            <Text style={{ color: toLang ? colors.textPrimary : '#9CA3AF' }}>
              {labelFor(toLang) || 'Select language'}
            </Text>
          </TouchableOpacity>

          {/* actions: Swap + Done */}
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginTop: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={swap}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                ↔ Swap
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                flex: 2,
                paddingVertical: spacing.md,
                borderRadius: 8,
                backgroundColor: colors.black,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.white, fontWeight: '700' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sticky Footer at bottom */}
      <Footer />

      {/* Pickers (modals) can sit here; they won't affect layout height */}
      <LanguagePicker
        visible={showFrom}
        title="From language"
        selectedCode={fromLang}
        onPick={l => setFromLang(l.code)}
        onClose={() => setShowFrom(false)}
      />
      <LanguagePicker
        visible={showTo}
        title="To language"
        selectedCode={toLang}
        onPick={l => setToLang(l.code)}
        onClose={() => setShowTo(false)}
      />
    </SafeAreaView>
  );
};

export default LanguagePairScreen;
