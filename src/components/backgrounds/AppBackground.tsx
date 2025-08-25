// import React from 'react';
// import { StyleSheet, View } from 'react-native';
// // DES Added: Centralized gradient background component for consistent app theming
// // DES Added: Import colors directly to avoid import issues
// import { colors } from '../../theme/colors';

// // DES Added: Safe import with fallback for linear gradient
// let LinearGradient: any;
// try {
//   LinearGradient = require('react-native-linear-gradient').default;
//   // DES Added: Additional check to ensure LinearGradient is properly imported
//   if (!LinearGradient) {
//     console.warn('LinearGradient default import failed, trying named import');
//     const LinearGradientModule = require('react-native-linear-gradient');
//     LinearGradient = LinearGradientModule.LinearGradient || LinearGradientModule.default;
//   }
// } catch (error) {
//   console.warn('LinearGradient not available:', error.message);
//   LinearGradient = null;
// }

// interface AppBackgroundProps {
//   children: React.ReactNode;
//   style?: any;
// }

// /**
//  * DES Added: Centralized gradient background component with safe fallback
//  * This component provides the consistent gradient background used across the app.
//  * If LinearGradient fails, it falls back to a simple View with solid background.
//  */
// const AppBackground: React.FC<AppBackgroundProps> = ({ children, style }) => {
//   // DES Added: Use fallback View if LinearGradient is not available
//   if (!LinearGradient) {
//     console.log('Using fallback background - LinearGradient not available');
//     return (
//       <View style={[styles.fallbackBackground, style]}>
//         {children}
//       </View>
//     );
//   }

//   console.log('Using LinearGradient background');
//   return (
//     <LinearGradient
//       // DES Added: Use centralized gradient colors from theme
//       colors={colors.appGradient} // Grey to light grey to white for smooth footer merge
//       locations={colors.appGradientLocations} // Gradient positions: start grey, fade at 60%, pure white at bottom
//       style={[styles.gradientBackground, style]}
//     >
//       {children}
//     </LinearGradient>
//   );
// };

// const styles = StyleSheet.create({
//   // DES Added: Style for gradient background
//   gradientBackground: {
//     flex: 1, // Takes full available space
//   },
//   // DES Added: Fallback style when LinearGradient is not available
//   fallbackBackground: {
//     flex: 1,
//     backgroundColor: colors.bg, // Use solid background color as fallback
//   },
// });

// export default AppBackground;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors as themeColors } from '../../theme';

// Safe gradient import (works even if not installed/linked)
let LinearGradient: any = null;
try {
  const lg = require('react-native-linear-gradient');
  LinearGradient = lg.default ?? lg.LinearGradient ?? null;
} catch (err: any) {
  console.warn('LinearGradient not available:', err?.message ?? String(err));
}

// Fallbacks if your theme doesn’t define these
const gradientColors: string[] = (themeColors as any)?.appGradient ?? [
  (themeColors as any)?.bgSoft ?? '#F6F7F8',
  (themeColors as any)?.bg ?? '#FFFFFF',
];

const gradientLocations: number[] = (themeColors as any)
  ?.appGradientLocations ?? [0, 1];

type Props = { children?: React.ReactNode; style?: any };

export default function AppBackground({ children, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      {LinearGradient ? (
        <LinearGradient
          colors={gradientColors}
          locations={gradientLocations}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: (themeColors as any)?.bg ?? '#FFFFFF' },
          ]}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
