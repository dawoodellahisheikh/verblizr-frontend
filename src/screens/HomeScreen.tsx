// src/screens/HomeScreen.tsx
import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
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

/* -------------------- tiny helper: safe haptic (optional) -------------------- */
function triggerLightHaptic() {
  try {
    // lazy require keeps project running even if lib isn't installed
    // @ts-ignore
    const Haptics = require('react-native-haptic-feedback');
    Haptics?.default?.trigger?.('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  } catch {}
}

/* --------------------------------- Types --------------------------------- */
type IconSpec =
  | { lib: 'MaterialIcons'; name: string; size?: number }
  | { lib: 'Ionicons'; name: string; size?: number };

/* ----------------------------- Black Hero Card ------------------------------ */
type HeroProps = {
  title: string;
  subtitle?: string;
  icon?: IconSpec;
  onPress?: () => void;
  testID?: string;
};

const HeroCard = memo(function HeroCard({
  title,
  subtitle,
  icon,
  onPress,
  testID,
}: HeroProps) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const IconNode = useMemo(() => {
    if (!icon) return null;
    const sz = 28;
    if (icon.lib === 'MaterialIcons')
      return <Icon name={icon.name} size={sz} color={colors.brand} />;
    return <IonIcon name={icon.name as any} size={sz} color={colors.brand} />;
  }, [icon]);

  return (
    <AnimatedPressable
      testID={testID}
      onPress={() => {
        triggerLightHaptic();
        onPress?.();
      }}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      style={[aStyle, styles.hero]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.heroLeft}>
        <View style={styles.heroIconRing}>{IconNode}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.heroSub} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.9)" />
    </AnimatedPressable>
  );
});

/* -------------------------- Border-only Action Card ------------------------- */
type RowProps = {
  title: string;
  subtitle?: string;
  icon?: IconSpec;
  onPress?: () => void;
  testID?: string;
  filledRed?: boolean; // only for Logout
  bgColor?: string; // per-card background (optional)
  borderColor?: string; // per-card border (optional)
};

const ActionRow = memo(function ActionRow({
  title,
  subtitle,
  icon,
  onPress,
  testID,
  filledRed = false,
  bgColor,
  borderColor,
}: RowProps) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tint = filledRed
    ? '#FFFFFF'
    : title === 'Dashboard' ||
      title === 'Cards' ||
      title === 'Coming Soon' ||
      title === 'Profile' ||
      title === 'Billing'
    ? colors.brand
    : colors.black;

  const IconNode = useMemo(() => {
    if (!icon) return null;
    const sz = 22;
    if (icon.lib === 'MaterialIcons')
      return <Icon name={icon.name} size={sz} color={tint} />;
    return <IonIcon name={icon.name as any} size={sz} color={tint} />;
  }, [icon, tint]);

  // Use per-card colors (fallback to defaults). filledRed always wins.
  const baseBg = filledRed ? colors.brand : bgColor ?? '#FFFFFF';
  const baseBorder = filledRed ? colors.brand : borderColor ?? '#E5E7EB';

  return (
    <AnimatedPressable
      testID={testID}
      onPress={() => onPress?.()}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      android_ripple={
        onPress
          ? { color: filledRed ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }
          : undefined
      }
      style={[
        aStyle,
        styles.rowItem,
        { backgroundColor: baseBg, borderColor: baseBorder },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      {/* brand accent bar */}
      <View
        style={[
          styles.accentBar,
          filledRed
            ? { backgroundColor: 'rgba(255,255,255,0.6)' }
            : { backgroundColor: colors.brand },
        ]}
      />

      <View style={styles.left}>
        <View
          style={[
            styles.leadingIcon,
            filledRed
              ? { borderColor: 'rgba(255,255,255,0.45)' }
              : { borderColor: '#E5E7EB' },
          ]}
        >
          {IconNode}
        </View>
        <View style={styles.texts}>
          <Text
            style={[
              styles.title,
              filledRed ? { color: '#FFFFFF' } : { color: colors.black },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                filledRed
                  ? { color: 'rgba(255,255,255,0.9)' }
                  : { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Icon
        name="chevron-right"
        size={22}
        color={filledRed ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.28)'}
        style={{ marginLeft: spacing.sm }}
      />
    </AnimatedPressable>
  );
});

/* ----------------------------- small page helper ---------------------------- */
function chunk<T>(arr: T[], size = 2): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < arr.length; i += size) pages.push(arr.slice(i, i + size));
  return pages;
}

/* --------------------------------- Screen --------------------------------- */
const HomeScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Adaptive paddings + spacing
  const padH = width < 360 ? spacing.sm : spacing.md;
  const gap = width < 360 ? spacing.xs : spacing.sm;

  // Exact integer page width to avoid fractional pixel drift
  const pageWidth = Math.round(width - padH * 2);

  // Two columns per page: explicit gap via margins
  const colWidth = (pageWidth - gap) / 2;

  // Standard 2-up grid (non-carousel) — used in "More"
  const col2 = (width - padH * 2 - gap) / 2;



  // ---- Quick actions (2-up pages) ----
  type QuickAction = {
    key: string;
    title: string;
    subtitle?: string;
    icon: IconSpec;
    onPress: () => void;
    bgColor?: string;
    borderColor?: string;
  };

  const quickActions: QuickAction[] = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Insights & recent sessions',
      icon: { lib: 'MaterialIcons', name: 'dashboard' },
      onPress: () => nav.navigate('Dashboard'),
    },
    {
      key: 'profile',
      title: 'Profile',
      subtitle: 'Update profile information',
      icon: { lib: 'Ionicons', name: 'person-circle' }, // user icon
      onPress: () => nav.navigate('EditProfile' as any),
    },
    // add more quick actions here; they paginate 2 per page
  ];
  const qaPages = chunk(quickActions, 2);

  // ---- Payments (2-up pages) ----
  const paymentActions: QuickAction[] = [
    {
      key: 'billing',
      title: 'Billing',
      subtitle: 'Payment setup',
      icon: { lib: 'MaterialIcons', name: 'payment' },
      onPress: () => nav.navigate('Billing'),
      bgColor: '#F3F4F6', // ← light grey example
      borderColor: '#E5E7EB', // subtle border
    }, {
      key: 'invoices',
      title: 'Invoices',
      subtitle: 'View past payments',
      icon: { lib: 'MaterialIcons', name: 'science' },
      onPress: () => nav.navigate('PaymentHistory'),
      bgColor: '#F3F4F6',
    },
    {
      key: 'cards',
      title: 'Cards',
      subtitle: 'Saved payment methods',
      icon: { lib: 'MaterialIcons', name: 'credit-card' },
      onPress: () => nav.navigate('PaymentMethods'),
    },
    {
      key: 'test',
      title: 'Test A',
      subtitle: 'Try a test checkout',
      icon: { lib: 'MaterialIcons', name: 'science' },
      onPress: () => nav.navigate('FinalPayment'),
    },
    // add more payment actions here; they paginate 2 per page
  ];
  const paymentPages = chunk(paymentActions, 2);

  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <AppBackground>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top * 0.4, spacing.lg) },
          ]}
        >
          <Text style={styles.hTitle}>
            Welcome, {user?.name ?? user?.email ?? 'Guest'}!
          </Text>
          <Text style={styles.hSub}>Get started</Text>
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: padH }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Black hero CTA (single) */}
          <HeroCard
            title="Start Chat"
            subtitle="Begin conversation"
            icon={{ lib: 'Ionicons', name: 'chatbubble' }}
            onPress={() => nav.navigate('Dashboard')}
            testID="hero-start"
          />

          {/* Horizontal 2-up: Quick actions */}
          <Text style={styles.sectionLabel}>Quick actions</Text>
          <FlatList
            horizontal
            pagingEnabled
            snapToAlignment="start"
            decelerationRate="fast"
            snapToInterval={pageWidth + gap}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            keyExtractor={(_, i) => `qa-page-${i}`}
            data={qaPages}
            renderItem={({ item: page }) => (
              <View style={{ width: pageWidth }}>
                <View style={styles.gridRow}>
                  {/* left column */}
                  {page[0] ? (
                    <View style={{ width: colWidth, marginRight: gap }}>
                      <ActionRow
                        title={page[0].title}
                        subtitle={page[0].subtitle}
                        icon={page[0].icon}
                        onPress={page[0].onPress}
                        testID={`qa-${page[0].key}`}
                        bgColor={page[0].bgColor}
                        borderColor={page[0].borderColor}
                      />
                    </View>
                  ) : (
                    <View style={{ width: colWidth, marginRight: gap }} />
                  )}

                  {/* right column */}
                  {page[1] ? (
                    <View style={{ width: colWidth }}>
                      <ActionRow
                        title={page[1].title}
                        subtitle={page[1].subtitle}
                        icon={page[1].icon}
                        onPress={page[1].onPress}
                        testID={`qa-${page[1].key}`}
                        bgColor={page[1].bgColor}
                        borderColor={page[1].borderColor}
                      />
                    </View>
                  ) : (
                    <View style={{ width: colWidth }} />
                  )}
                </View>
              </View>
            )}
          />

          {/* Horizontal 2-up: Payments */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            Payments
          </Text>
          <FlatList
            horizontal
            pagingEnabled
            snapToAlignment="start"
            decelerationRate="fast"
            snapToInterval={pageWidth + gap}
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: gap }} />}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            keyExtractor={(_, i) => `pay-page-${i}`}
            data={paymentPages}
            renderItem={({ item: page }) => (
              <View style={{ width: pageWidth }}>
                <View style={styles.gridRow}>
                  {/* left column */}
                  {page[0] ? (
                    <View style={{ width: colWidth, marginRight: gap }}>
                      <ActionRow
                        title={page[0].title}
                        subtitle={page[0].subtitle}
                        icon={page[0].icon}
                        onPress={page[0].onPress}
                        testID={`pay-${page[0].key}`}
                        bgColor={page[0].bgColor}
                        borderColor={page[0].borderColor}
                      />
                    </View>
                  ) : (
                    <View style={{ width: colWidth, marginRight: gap }} />
                  )}

                  {/* right column */}
                  {page[1] ? (
                    <View style={{ width: colWidth }}>
                      <ActionRow
                        title={page[1].title}
                        subtitle={page[1].subtitle}
                        icon={page[1].icon}
                        onPress={page[1].onPress}
                        testID={`pay-${page[1].key}`}
                        bgColor={page[1].bgColor}
                        borderColor={page[1].borderColor}
                      />
                    </View>
                  ) : (
                    <View style={{ width: colWidth }} />
                  )}
                </View>
              </View>
            )}
          />

          {/* More (static 2-up grid; Logout filled red) */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            More
          </Text>
          <View style={styles.gridRow}>
            <View style={{ width: col2, marginRight: gap }}>
              <ActionRow
                title="Coming Soon"
                subtitle="New features on the way"
                icon={{ lib: 'MaterialIcons', name: 'new-releases' }}
                onPress={() => {}}
                testID="row-coming"
              />
            </View>
            <View style={{ width: col2 }}>
              <ActionRow
                title="Logout"
                subtitle="Sign out and return to login"
                icon={{ lib: 'MaterialIcons', name: 'logout' }}
                onPress={async () => {
                  // RootNavigator will automatically switch to AuthNavigator when auth state changes
                  await logout();
                }}
                filledRed
                testID="row-logout"
              />
            </View>
          </View>
        </ScrollView>
      </AppBackground>

      {/* Sticky Footer */}
      <Footer />
    </SafeAreaView>
  );
};

export default HomeScreen;

/* --------------------------------- Styles --------------------------------- */
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  hTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  hSub: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.9,
  },

  // Black hero
  hero: {
    backgroundColor: colors.black,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  heroIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280', // slate-500
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },

  // IMPORTANT: no space-between and no gap here — spacing handled by margins
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  rowItem: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1.5 },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: spacing.sm,
  },
  leadingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  texts: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.black,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
