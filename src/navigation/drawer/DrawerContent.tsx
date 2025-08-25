// src/navigation/drawer/DrawerContent.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  Image,
} from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, s, spacing } from '../../theme';
import { drawerItems } from './DrawerConfig';

// ----- Type guard: vector-icon descriptor vs SVG React component -----
function isVectorIcon(
  icon: unknown,
): icon is { lib: 'Ionicons' | 'Feather' | 'MaterialIcons'; name: string } {
  return (
    !!icon &&
    typeof icon === 'object' &&
    'lib' in (icon as any) &&
    'name' in (icon as any)
  );
}

// ----- Helper: get deepest active route name from nested state -----
function getDeepActiveRouteName(state: any): string {
  try {
    if (!state || typeof state !== 'object') return '';
    let s = state;
    while (s?.routes && s.index != null) {
      const route = s.routes[s.index];
      if (!route) break;
      if (route.state) {
        s = route.state; // keep drilling
      } else {
        return route.name ?? '';
      }
    }
    const r = s?.routes?.[s.index ?? 0];
    return r?.name ?? '';
  } catch {
    return '';
  }
}

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const insets = useSafeAreaInsets();

  // Deep active route for nested stacks (Drawer -> "App" -> Stack)
  const currentRouteName = useMemo(() => {
    const navState = navigation.getState?.() ?? props.state;
    return getDeepActiveRouteName(navState);
  }, [navigation, props.state]);

  const renderIcon = (item: (typeof drawerItems)[number], active: boolean) => {
    if (!item.icon) return null;

    const iconColours = active
      ? colors.brand ?? '#000000ff'
      : colors.black ?? '#000000ff';

    if (isVectorIcon(item.icon)) {
      const { lib, name } = item.icon;
      const VectorIcon =
        lib === 'Ionicons'
          ? require('react-native-vector-icons/Ionicons').default
          : lib === 'Feather'
          ? require('react-native-vector-icons/Feather').default
          : require('react-native-vector-icons/MaterialIcons').default;

      return <VectorIcon name={name} size={22} fill={iconColours} />;
    }

    // SVG component case
    if (typeof item.icon === 'function') {
      const SvgIcon = item.icon as React.ComponentType<
        import('react-native-svg').SvgProps
      >;
      // prefer stroke fill neutrality; many svgs honor `fill`
      // return <SvgIcon width={22} height={22} fill={tint} />;
      return <SvgIcon width={22} height={22} fill={iconColours} />;
    }

    return null;
  };

  const handlePress = (item: (typeof drawerItems)[number]) => {
    const action = item.action;

    switch (action.type) {
      case 'navigate': {
        navigation.navigate(
          'App' as never,
          {
            screen: action.routeName,
            params: action.params,
          } as never,
        );
        requestAnimationFrame(() => navigation.closeDrawer());
        break;
      }
      case 'link': {
        Linking.openURL(action.url).catch(err => {
          console.warn('[Drawer] Failed to open URL:', err);
        });
        requestAnimationFrame(() => navigation.closeDrawer());
        break;
      }
      case 'event': {
        if (action.key === 'signOut') {
          Alert.alert(
            'Sign out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                  try {
                    navigation.emit({ type: 'signOut' as any });
                  } catch {}
                  requestAnimationFrame(() => navigation.closeDrawer());
                },
              },
            ],
            { cancelable: true },
          );
        } else {
          try {
            navigation.emit({ type: action.key as any });
          } catch (e) {
            console.warn('[Drawer] Unknown event:', action.key, e);
          }
          requestAnimationFrame(() => navigation.closeDrawer());
        }
        break;
      }
      case 'divider': {
        // no-op
        break;
      }
      default:
        break;
    }
  };

  const isItemActive = (item: (typeof drawerItems)[number]) => {
    if (item.action.type !== 'navigate') return false;
    return currentRouteName === item.action.routeName;
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        },
      ]}
    >
      {/* Minimal header */}
      {/* <View style={styles.header}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.brandLogo}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>VERBLIZR</Text>
          <Text style={styles.headerSubtitle}>COMMUNICATE TOGETHER</Text>
        </View>
        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>v1.0.0</Text>
        </View>
      </View> */}

      <View style={styles.header}>
        <Image
          source={require('../../assets/appfooter.png')}
          style={styles.brandLogoWider}
          resizeMode="cover"
        />

        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>v1.0.0</Text>
        </View>
      </View>

      <View style={styles.hairline} />

      {/* Menu */}
      <ScrollView
        contentContainerStyle={{ paddingVertical: spacing.sm }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {drawerItems
          .filter(i => i.visible !== false)
          .map(item => {
            if (item.action.type === 'divider') {
              return <View key={item.id} style={styles.sectionDivider} />;
            }

            const active = isItemActive(item);

            return (
              <Pressable
                key={item.id}
                onPress={() => handlePress(item)}
                android_ripple={{ color: '#00000012', borderless: false }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.rowPressed,
                ]}
              >
                {active && <View style={styles.activeBar} />}
                <View style={styles.iconWrap}>{renderIcon(item, active)}</View>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
      </ScrollView>

      {/* Footer (very light) */}
      {/* <View style={styles.hairline} /> */}
      <View style={styles.footer}>
        <View style={styles.linksRow}>
          <Pressable
            onPress={() => Linking.openURL('https://verblizr.com/privacy')}
          >
            <Text style={styles.linkText}>Contact</Text>
          </Pressable>
          <View style={styles.dot} />
          <Pressable
            onPress={() => Linking.openURL('https://verblizr.com/terms')}
          >
            <Text style={styles.linkText}>Terms</Text>
          </Pressable>
          <View style={styles.dot} />
          <Pressable
            onPress={() => Linking.openURL('https://verblizr.com/terms')}
          >
            <Text style={styles.linkText}>Privacy</Text>
          </Pressable>
        </View>
        <View style={styles.hairline} />
        <Text style={styles.copyText}>
          © {new Date().getFullYear()} Verblizr
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shell
  container: {
    flex: 1,
    backgroundColor: colors.bg ?? '#FFFFFF',
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 39,
    height: 39,
    marginRight: spacing.md,
    borderRadius: 20, // full circle
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  brandLogoWider: {
    width: 150,
    height: 30,
    marginRight: spacing.md,
    marginLeft: 15,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.black ?? '#0B0B0B',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  versionPill: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginLeft: 'auto',
    marginTop: 7,
  },
  versionPillText: {
    fontSize: 11,
    color: '#112720ff',
    fontWeight: '700',
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e9e9e9',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },

  // Menu rows
  row: {
    minHeight: 39,
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginVertical: 2,
    position: 'relative',
    overflow: Platform.select({ ios: 'visible', android: 'hidden' }) as any,
  },
  rowActive: {
    backgroundColor: '#efefefff',
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.brand ?? '#e3e3e3',
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  label: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '600',
  },
  labelActive: {
    color: colors.black ?? '#000000',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'rgba(249, 249, 249, 1)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(221, 221, 221, 1)',
    height: 63,
    marginBottom: spacing.sm,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: 13,
    color: '#4e4e4eff',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(216, 216, 216, 1)',
    marginHorizontal: spacing.sm,
  },
  copyText: {
    fontSize: 12,
    color: 'rgba(183, 183, 183, 1)',
    marginTop: spacing.xs,
  },
});
