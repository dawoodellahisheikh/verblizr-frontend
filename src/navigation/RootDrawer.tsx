// import React from 'react';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import DrawerContent from './drawer/DrawerContent';
// import RootNavigator from './drawer/RootNavigator';

// // ✅ Added: to read device safe-area insets (for notch / status bar)
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const Drawer = createDrawerNavigator();

// export default function RootDrawer() {
//   // ✅ Added: get safe-area values (top, bottom, left, right)
//   // We will use `insets.top` to push the drawer content below the OS status bar
//   const insets = useSafeAreaInsets();

//   return (
//     <Drawer.Navigator
//       id="RootDrawer"
//       screenOptions={{
//         headerShown: false,
//         drawerType: 'front',
//         swipeEdgeWidth: 30,

//         /**
//          * ✅ Added: drawerStyle with safe-area padding
//          * This prevents the drawer from sliding under the OS status bar
//          * so Wi-Fi, battery, and time icons are not overlapping the drawer.
//          * We only apply top padding equal to the safe-area inset.
//          */
//         drawerStyle: {
//           // paddingTop: insets.top,
//           width: '80%',
//         },

//         // (Optional) You could also set sceneContainerStyle if needed for screen content:
//         // sceneContainerStyle: { paddingTop: insets.top },
//       }}
//       drawerContent={props => <DrawerContent {...props} />}
//     >
//       {/* Keep your entire app tree intact inside the drawer */}
//       <Drawer.Screen name="App" component={RootNavigator} />
//     </Drawer.Navigator>
//   );
// }

// // ~/verblizerRN/src/navigation/RootDrawer.tsx
// import React from 'react';
// import { createDrawerNavigator } from '@react-navigation/drawer';

// import DrawerContent from './drawer/DrawerContent';
// import RootNavigator from './drawer/RootNavigator';

// // ✅ Read device safe-area insets (requires <SafeAreaProvider> at the app root)
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// // (Optional) Theme colors. If you don’t use this, remove backgroundColor below or import your theme file.
// import { colors } from '../theme/colors';

// const Drawer = createDrawerNavigator();

// export default function RootDrawer() {
//   // ✅ Safe-area values: we’ll use top inset so drawer content doesn’t sit under the status bar
//   const insets = useSafeAreaInsets();

//   return (
//     <Drawer.Navigator
//       id="RootDrawer"
//       screenOptions={{
//         headerShown: false,
//         drawerType: 'front',
//         swipeEdgeWidth: 30,

//         /**
//          * ✅ Drawer container styling
//          * - paddingTop: ensures drawer UI sits below the visible status bar
//          * - width:      control overall drawer width (change '80%' to taste)
//          */
//         drawerStyle: {
//           // paddingTop: insets.top,
//           width: '80%',
//           // optional background if you use a theme:
//           backgroundColor: colors?.bg,
//         },
//       }}
//       drawerContent={props => <DrawerContent {...props} />}
//     >
//       {/* Keep your entire app tree intact inside the drawer */}
//       <Drawer.Screen name="App" component={RootNavigator} />
//     </Drawer.Navigator>
//   );
// }

// // ~/verblizerRN/src/navigation/RootDrawer.tsx
// import React from 'react';
// import { createDrawerNavigator } from '@react-navigation/drawer';
// import DrawerContent from './drawer/DrawerContent';
// import RootNavigator from './drawer/RootNavigator';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// // ✅ Added: control the native status bar
// import { StatusBar } from 'react-native';

// // (Optional) theme colors; remove if not using
// import { colors } from '../theme/colors';

// const Drawer = createDrawerNavigator();

// export default function RootDrawer() {
//   const insets = useSafeAreaInsets();

//   return (
//     <Drawer.Navigator
//       id="RootDrawer"
//       screenOptions={{
//         headerShown: false,
//         drawerType: 'front',
//         swipeEdgeWidth: 30,
//         drawerStyle: {
//           // paddingTop: insets.top,
//           width: '80%', // adjust if you want e.g. '70%'
//           backgroundColor: colors?.bg,
//         },
//       }}
//       /**
//        * ✅ NEW: Hide status bar when the drawer opens; show it when it closes.
//        * We use navigator-level events so no drawer context hooks are required.
//        */
//       screenListeners={{
//         drawerOpen: () => StatusBar.setHidden(true, 'fade'),
//         drawerClose: () => StatusBar.setHidden(false, 'fade'),
//       }}
//       drawerContent={props => <DrawerContent {...props} />}
//     >
//       <Drawer.Screen name="App" component={RootNavigator} />
//     </Drawer.Navigator>
//   );
// }

// src/navigation/RootNavigator.tsx
/* --------- Notes -----------
~/verblizerRN/src/navigation/RootDrawer.tsx
Creates the single Drawer.Navigator (id "RootDrawer").
Uses a custom drawerContent prop to render your own drawer UI via DrawerContent.
Adds one screen called App, which points to RootNavigator (your stack).
Styling:
drawerStyle.width controls how wide the drawer is (e.g. '80%').
drawerStyle.paddingTop uses safe‑area top inset so drawer items don’t sit under the status bar when it’s visible.

Why: Keeping the drawer as a shell and nesting a stack inside makes navigation simple and scalable. You only ever have one drawer; screens swap inside it.
--------- Notes End ----------- */

// src/navigation/RootDrawer.tsx
import React from 'react';
import { Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DrawerContent from './drawer/DrawerContent';
import RootNavigator from './drawer/RootNavigator';
import { useAuth } from '../context/AuthContext'; // DES Added: Import useAuth hook for logout functionality

// DES Added: Import screens needed for unified navigation
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterPersonal from '../screens/RegisterPersonal';
import RegisterPassword from '../screens/RegisterPassword';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// DES Added: Type definition for the unified navigation stack
export type UnifiedStackParamList = {
  Splash: undefined;
  Login: undefined;
  RegisterPersonal: undefined;
  RegisterPassword: { firstName: string; lastName: string; email: string; confirmEmail: string; phoneNumber: string };
  MainApp: undefined;
};

const Drawer = createDrawerNavigator();
const UnifiedStack = createNativeStackNavigator<UnifiedStackParamList>(); // DES Added: Single stack for all screens including auth with proper typing

// DES Added: Unified navigation stack that includes both auth and main app screens
function UnifiedStackNavigator() {
  const { token, loading } = useAuth(); // DES Added: Get auth state to determine initial route
  
  return (
    <UnifiedStack.Navigator 
      initialRouteName={loading ? "Splash" : (token ? "MainApp" : "Login")} // DES Added: Smart initial route based on auth state
      screenOptions={{ 
        headerShown: false,
        // DES Added: Consistent smooth slide animations for all screens
        animation: 'slide_from_right',
        animationDuration: 300, // Slightly longer for smoother feel
      }}
    >
      <UnifiedStack.Screen name="Splash" component={SplashScreen} />
      <UnifiedStack.Screen name="Login" component={LoginScreen} />
      <UnifiedStack.Screen name="RegisterPersonal" component={RegisterPersonal} />
      <UnifiedStack.Screen name="RegisterPassword" component={RegisterPassword} />
      {/* DES Added: Main app as a screen within the unified stack */}
      <UnifiedStack.Screen name="MainApp" component={MainAppWithDrawer} />
    </UnifiedStack.Navigator>
  );
}

// DES Added: Wrapper component for the main app with drawer
function MainAppWithDrawer() {
  const win = Dimensions.get('window');
  const drawerWidth = Math.min(320, Math.round(win.width * 0.82));
  const { logout } = useAuth(); // DES Added: Get logout function from AuthContext

  return (
    <Drawer.Navigator
      id="MainDrawer"
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEdgeWidth: 30,
        overlayColor: 'rgba(101, 101, 101, 0.36)',
        drawerStyle: {
          width: drawerWidth,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
        },
        sceneContainerStyle: {
          backgroundColor: '#FFFFFF',
        },
      }}
      screenListeners={{
        signOut: () => {
          logout(); // Call the logout function from AuthContext
        },
      }}
      drawerContent={props => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="App" component={RootNavigator} />
    </Drawer.Navigator>
  );
}

export default function RootDrawer() {
  // DES Modified: Now using unified navigation stack that handles both auth and main app
  // This allows smooth slide transitions between Login and Home screens
  console.log('RootDrawer - Using unified navigation for smooth transitions');
  
  return <UnifiedStackNavigator />;
}
