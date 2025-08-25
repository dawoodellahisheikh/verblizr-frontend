import {StyleSheet} from 'react-native';
import {colors, spacing, type} from '../theme';

export const g = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, marginBottom: spacing.md },
  title: { ...type.h2, color: colors.textPrimary },
  subtitle: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  // DES Added: Label style for form labels
  label: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  buttonPrimary: {
    backgroundColor: colors.black, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonPrimaryText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  buttonSecondary: {
    backgroundColor: colors.white, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.black,
  },
  buttonSecondaryText: { color: colors.black, fontSize: 18, fontWeight: '600' },
  buttonGhost: {
    backgroundColor: 'transparent', borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
  },
  buttonGhostText: { color: colors.textSecondary, fontSize: 16, fontWeight: '500' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white,
  },
});



