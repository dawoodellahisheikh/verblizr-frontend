import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // DES Added: Import for safe area handling
// DES Added: Import colors and spacing directly to avoid import issues
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function Footer() {
  const insets = useSafeAreaInsets(); // DES Added: Get safe area insets for bottom spacing

  return (
    <View
      style={[
        styles.footerContainer,
        {
          paddingBottom: Math.max(insets.bottom, 8), // DES Added: Reduced minimum padding from 10px to 8px for more compact footer
          marginBottom: -insets.bottom, // DES Added: Pull the footer down to screen edge
        }
      ]}
    >
      <View style={styles.footerContent}>
        <Image
          source={require('../assets/appfooter.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    borderTopColor: '#EEE',
    backgroundColor: colors.white,
  },
  footerContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl, // DES Added: Reduced from spacing.xl (24px) to spacing.lg (16px) to reduce footer width
    paddingVertical: spacing.md, // DES Added: Reduced from spacing.md (12px) to spacing.sm (8px) to reduce footer height
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 80, // DES Added: Reduced from 80px to 70px for more compact footer
    height: 18, // DES Added: Reduced from 20px to 18px to maintain aspect ratio
  },
  copyrightText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 7,
  },
});
