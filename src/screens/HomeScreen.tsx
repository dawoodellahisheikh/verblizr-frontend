// src/screens/HomeScreen.tsx — revamped layout + Start circle + inline Recent Sessions (keeps brand colors)
import React, { memo,useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  SectionList,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import { g } from '../styles/global';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../../App';
import { AppBackground, Footer } from '../components';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type IconSpec =
  | { lib: 'MaterialIcons'; name: string; size?: number }
  | { lib: 'Ionicons'; name: string; size?: number };

type Row = {
  key: string;
  title: string;
  subtitle?: string;
  icon?: IconSpec;
  onPress?: () => void;
  variant?: 'pill' | 'danger';
};

type SectionT = { title: string; data: Row[] };

function triggerLightHaptic() {
  try {
    // @ts-ignore
    const Haptics = require('react-native-haptic-feedback');
    Haptics?.default?.trigger?.('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {}
}

/* -------------------------- small color helpers -------------------------- */
function clamp(n: number, min = 0, max = 255) { return Math.max(min, Math.min(max, n)); }
function hexToRgbSafe(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}
function lighten(hex: string, amount = 0.35) {
  const rgb = hexToRgbSafe(hex);
  if (!rgb) return hex;
  const r = clamp(Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = clamp(Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = clamp(Math.round(rgb.b + (255 - rgb.b) * amount));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* --------------------------------- Shared types --------------------------------- */
export type Session = {
  id: string;
  whenISO: string;      // ISO date string
  title: string;        // e.g., "English ↔ Urdu"
  durationSec: number;  // 342
  costText?: string;    // optional precomputed (e.g., "£1.80")
};

/* --------------------------------- Sessions hook -------------------------------- */
function useRecentSessions() {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let AsyncStorage: any = null;
        try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}
        const KEYS = ['verblizr:sessions', '@sessions', 'sessions'];
        let parsed: any[] | null = null;
        if (AsyncStorage) {
          for (const k of KEYS) {
            const raw = await AsyncStorage.getItem(k);
            if (raw) { try { const p = JSON.parse(raw); if (Array.isArray(p)) { parsed = p; break; } } catch {} }
          }
        }
        const mapped: Session[] = (parsed ?? [
          { id: 'demo1', whenISO: new Date().toISOString(), title: 'English ↔ Urdu', durationSec: 342, costText: '£1.80' },
          { id: 'demo2', whenISO: new Date(Date.now() - 86400000).toISOString(), title: 'Arabic ↔ English', durationSec: 901, costText: '£4.50' },
        ]).map((s: any, i: number) => ({
          id: String(s.id ?? `demo-${i}`),
          whenISO: String(s.whenISO ?? s.dateISO ?? new Date().toISOString()),
          title: String(s.title ?? s.langPair ?? 'Session'),
          durationSec: Number(s.durationSec ?? s.duration ?? 0),
          costText: s.costText ?? s.costStr ?? undefined,
        }));
        if (alive) setItems(mapped.slice(0, 10));
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { items, loading };
}

/* --------------------------------- Inline top row -------------------------------- */
const StartAndRecentRow = memo(function StartAndRecentRow({
  onStart,
  onOpen,
}: { onStart: () => void; onOpen: (id: string) => void }) {
  const { items, loading } = useRecentSessions();

  // mini hero press animation
  const s = useSharedValue(1);
  const aStart = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <View style={styles.startRow}>
      {/* compact black hero on the left */}
      <AnimatedPressable
        onPress={() => { triggerLightHaptic(); onStart(); }}
        onPressIn={() => (s.value = withTiming(0.97, { duration: 100 }))}
        onPressOut={() => (s.value = withTiming(1, { duration: 150 }))}
        accessibilityRole="button"
        accessibilityLabel="Start Chat"
        style={[aStart, styles.startMini, Platform.OS === 'ios' ? styles.shadowMd : styles.elev5]}
      >
        <View style={styles.startMiniLeft}>
          <View style={styles.startIconBg}>
            <IonIcon name="mic" size={22} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.startMiniTitle} numberOfLines={1}>Mic</Text>
            <Text style={styles.startMiniSub} numberOfLines={1}>/</Text>
          </View>
        </View>
        <View style={styles.startArrow}>
          <Icon name="chevron-right" size={18} color="#FFFFFF" />
        </View>
      </AnimatedPressable>

      {/* recent sessions list on the right */}
      {!loading && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, marginLeft: spacing.md }}
          data={items}
          keyExtractor={(it) => it.id}
          ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => onOpen(item.id)} style={styles.sessChip}>
              <View style={styles.sessChipLeft}>
                <View style={styles.sessDot} />
                <Text numberOfLines={1} style={styles.sessChipTitle}>{item.title}</Text>
              </View>
              <View style={styles.sessChipRight}>
                <Text numberOfLines={1} style={styles.sessChipMeta}>
                  {formatDateShort(item.whenISO)} • {formatDuration(item.durationSec)}{item.costText ? ` • ${item.costText}` : ''}
                </Text>
                <View style={styles.sessChipArrow}><IonIcon name="chevron-forward" size={14} color="#FFFFFF" /></View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
});

/* ----------------------------- Pill (full‑width) ----------------------------- */
const PillRow = memo(function PillRow({ row }: { row: Row }) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: withTiming(pressed.value ? 0.06 : 0, { duration: 120 }) }));

  const brand = colors.brand;
  const brandLight = lighten(brand, 0.45);
  const brandMid = lighten(brand, 0.25);

  const LeftIcon = () => {
    if (!row.icon) return null;
    const sz = 20;
    const tint = row.variant === 'danger' ? '#FFFFFF' : brand;
    if (row.icon.lib === 'MaterialIcons') return <Icon name={row.icon.name} size={sz} color={tint} />;
    return <IonIcon name={row.icon.name as any} size={sz} color={tint} />;
  };

  if (row.variant === 'danger') {
    return (
      <AnimatedPressable
        onPress={row.onPress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 90 }); pressed.value = 1; }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); pressed.value = 0; }}
        style={[aStyle, styles.pillDanger, Platform.OS === 'ios' ? styles.shadowBrand : styles.elev3]}
        accessibilityRole="button"
        accessibilityLabel={row.title}
        accessibilityHint={row.subtitle}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayStyle, { backgroundColor: '#000' }]} />
        <View style={styles.pillLeft}>
          <View style={[styles.pillIconCircle, { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.28)' }]}>
            <LeftIcon />
          </View>
          <View style={styles.texts}>
            <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>{row.title}</Text>
            {row.subtitle ? <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.92)' }]} numberOfLines={2}>{row.subtitle}</Text> : null}
          </View>
        </View>
        <View style={[styles.pillArrow, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <IonIcon name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </AnimatedPressable>
    );
  }

  const Inner = (
    <AnimatedPressable
      onPress={row.onPress}
      onPressIn={() => { scale.value = withTiming(0.98, { duration: 90 }); pressed.value = 1; }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); pressed.value = 0; }}
      style={[aStyle, styles.pillBase, Platform.OS === 'ios' ? styles.shadowSoft : styles.elev2]}
      accessibilityRole="button"
      accessibilityLabel={row.title}
      accessibilityHint={row.subtitle}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, overlayStyle, { backgroundColor: '#000' }]} />
      <View style={styles.pillLeft}>
        <View style={[styles.pillIconCircle, { backgroundColor: `${brandLight}33`, borderColor: `${brandMid}66` }]}>
          <LeftIcon />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.black }]} numberOfLines={1}>{row.title}</Text>
          {row.subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>{row.subtitle}</Text> : null}
        </View>
      </View>
      <View style={[styles.pillArrow, { backgroundColor: 'rgba(16,24,40,0.9)' }]}>
        <IonIcon name="chevron-forward" size={18} color="#FFFFFF" />
      </View>
    </AnimatedPressable>
  );

  return (
    <LinearGradient colors={[brandLight, brandMid]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pillGradient}>{Inner}</LinearGradient>
  );
});

/* ----------------------------- Utilities ----------------------------- */
function formatDuration(total: number) {
  if (!total || total < 60) return `${Math.max(1, Math.round(total))}s`;
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}
function formatDateShort(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const yesterday = new Date(Date.now() - 86400000);
    const isYest = d.toDateString() === yesterday.toDateString();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (sameDay) return `Today • ${hh}:${mm}`;
    if (isYest) return `Yesterday • ${hh}:${mm}`;
    return `${d.getDate()}/${d.getMonth() + 1} • ${hh}:${mm}`;
  } catch { return '—'; }
}

/* --------------------------------- Screen --------------------------------- */
const HomeScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const sections: SectionT[] = [
    {
      title: 'Quick actions',
      data: [
        {
          key: 'dashboard',
          title: 'Dashboard',
          subtitle: 'Insights & recent sessions',
          icon: { lib: 'MaterialIcons', name: 'dashboard' },
          onPress: () => nav.navigate('Dashboard'),
          variant: 'pill',
        },
        {
          key: 'profile',
          title: 'Profile',
          subtitle: 'Update profile information',
          icon: { lib: 'Ionicons', name: 'person-circle' },
          onPress: () => nav.navigate('EditProfile' as any),
          variant: 'pill',
        },
      ],
    },
    {
      title: 'Payments',
      data: [
        {
          key: 'billing',
          title: 'Billing',
          subtitle: 'Payment setup',
          icon: { lib: 'MaterialIcons', name: 'payment' },
          onPress: () => nav.navigate('Billing'),
          variant: 'pill',
        },
        {
          key: 'invoices',
          title: 'Invoices',
          subtitle: 'View past payments',
          icon: { lib: 'MaterialIcons', name: 'receipt' },
          onPress: () => nav.navigate('PaymentHistory'),
          variant: 'pill',
        },
        {
          key: 'cards',
          title: 'Cards',
          subtitle: 'Saved payment methods',
          icon: { lib: 'MaterialIcons', name: 'credit-card' },
          onPress: () => nav.navigate('PaymentMethods'),
          variant: 'pill',
        },
      ],
    },
    {
      title: 'More',
      data: [
        {
          key: 'coming',
          title: 'Coming Soon',
          subtitle: 'New features on the way',
          icon: { lib: 'MaterialIcons', name: 'new-releases' },
          onPress: () => {},
          variant: 'pill',
        },
        {
          key: 'logout',
          title: 'Logout',
          subtitle: 'Sign out and return to login',
          icon: { lib: 'MaterialIcons', name: 'logout' },
          onPress: async () => { await logout(); },
          variant: 'danger',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <AppBackground>
        <View style={[styles.header, { paddingTop: Math.max(insets.top * 0.4, spacing.xs) }]}> 
          <Text style={styles.hTitle} numberOfLines={1}>Welcome, {user?.name ?? user?.email ?? 'Guest'}!</Text>
          <Text style={styles.hSub}>Get started</Text>
        </View>

        {/* Start circle + inline recent sessions in one row */}
        <StartAndRecentRow
          onStart={() => nav.navigate('Dashboard')}
          onOpen={(id) => nav.navigate('Sessions' as any, { id })}
        />

        {/* Stacked sections */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionLabel}>{section.title}</Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          SectionSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          renderItem={({ item }) => <PillRow row={item} />}
        />
      </AppBackground>
      <Footer />
    </SafeAreaView>
  );
};

export default HomeScreen;

/* --------------------------------- Styles --------------------------------- */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  hTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  hSub: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },

  /* Start + recent row */
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  // compact black hero (less wide)
  startMini: {
    flexShrink: 0,
    width: '42%',
    minWidth: 150,
    borderRadius: 18,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startMiniLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: spacing.sm },
  startIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  startMiniTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  startMiniSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 2 },
  startArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  // Pill styles
  pillGradient: { borderRadius: 20, padding: 2 },
  pillBase: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  pillDanger: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: colors.brand,
  },
  pillLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: spacing.sm },
  pillIconCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  pillArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  texts: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, color: colors.black },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.textSecondary },

  // shadow utilities (avoid inline Platform.select)
  shadowSoft: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14 },
  shadowMd: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 18 },
  shadowBrand: { shadowColor: colors.brand, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18 },
  elev2: { elevation: 2 },
  elev3: { elevation: 3 },
  elev5: { elevation: 5 },

  // Inline session chips (right side of start circle)
  sessChip: {
    width: 260,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
  },
  sessChipLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  sessChipRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessChipTitle: { marginLeft: spacing.sm, fontSize: 15, fontWeight: '800', color: colors.black, flexShrink: 1 },
  sessChipMeta: { fontSize: 12.5, color: colors.textSecondary, paddingRight: spacing.sm, maxWidth: 170 },
  sessChipArrow: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,24,40,0.9)' },

  // dots reused
  sessDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
});
