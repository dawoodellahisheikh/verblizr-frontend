// src/navigation/drawer/RootNavigator.tsx
// Handles the main app navigation stack.

import React, { useEffect } from 'react';
import { TouchableOpacity, StatusBar } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDrawerStatus } from '@react-navigation/drawer';

// Theme
import { colors } from '../../theme';

// Screens
// DES Removed: LoginScreen import since it's now in unified stack
// import LoginScreen from '../../screens/LoginScreen';
// DES Removed: SplashScreen import - it's now only used in AuthStack
// import SplashScreen from '../../screens/SplashScreen';
import DashboardScreen from '../../screens/DashboardScreen';
import HomeScreen from '../../screens/HomeScreen';
import RegisterPersonal from '../../screens/RegisterPersonal';
import RegisterPassword from '../../screens/RegisterPassword';
import BillingScreen from '../../screens/BillingScreen';
import PaymentMethodsScreen from '../../screens/PaymentMethodsScreen';
import FinalPaymentScreen from '../../screens/FinalPaymentScreen';
import LanguagePairScreen from '../../screens/LanguagePairScreen';
import CheckoutScreen from '../../screens/CheckoutScreen';
import EditProfileScreen from '../../screens/EditProfileScreen'; // DES Added: Import EditProfileScreen
import PaymentHistoryScreen from '../../screens/PaymentHistoryScreen'; // NEW: Import PaymentHistoryScreen
import InterpretationScreen from '../../screens/InterpretationScreen'; // NEW: Import InterpretationScreen

// SVG icon (no font linking issues)
import MenuIcon from '../../assets/icons/menu.svg';

export type RootStackParamList = {
  // DES Removed: LoginScreen route since it's now in unified stack
  // LoginScreen: undefined;
  // DES Removed: Splash from authenticated stack
  // Splash: undefined;
  Home: undefined;
  Dashboard: undefined;
  RegisterPersonal: undefined;
  // DES Added: Updated RegisterPassword route params to include new fields
  RegisterPassword: { firstName: string; lastName: string; email: string; confirmEmail: string; phoneNumber: string };
  Billing: undefined;
  PaymentMethods: undefined;
  Checkout: undefined;
  FinalPayment: { totalCents?: number } | undefined;
  LanguagePair: undefined;
  EditProfile: undefined; // DES Added: EditProfile route type
  PaymentHistory: undefined; // NEW: allows navigating to the invoice history screen
  Interpretation: undefined; // NEW: Live interpretation screen
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MenuButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 12 }}>
      <MenuIcon width={24} height={24} />
    </TouchableOpacity>
  );
}

/**
 * Small controller: hides status bar when the drawer is open, restores when closed.
 * This works here because RootNavigator is rendered INSIDE the Drawer.
 */

// ✅ Smooth (non-crashy) controller: uses 'slide' animation
function StatusBarOnDrawer() {
  const isOpen = useDrawerStatus() === 'open';

  useEffect(() => {
    // 'slide' feels smoother than 'fade', and no Reanimated needed
    StatusBar.setHidden(isOpen, 'slide');
    return () => {
      StatusBar.setHidden(false, 'slide');
    };
  }, [isOpen]);

  return null;
}

export default function RootNavigator() {
  return (
    <>
      {/* Keep this above the navigator so it always runs while inside the drawer */}
      <StatusBarOnDrawer />

      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          // DES Added: Ensure consistent animations across all screens
          animation: 'slide_from_right', // Consistent with typical stack navigation
          animationDuration: 250, // Smooth but not sluggish
        }}
      >
        {/* DES Removed: LoginScreen since it's now in unified stack */}
        {/* <Stack.Screen name="LoginScreen" component={LoginScreen} /> */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Dashboard',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Home',
            headerStyle: { backgroundColor: colors.bg },
            // DES Added: Ensure smooth transition animations for Home screen
            animation: 'slide_from_right',
            animationDuration: 250,
            headerLeft: () => (
              // Use parent navigator to open the drawer from a nested stack:
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />
        <Stack.Screen
          name="RegisterPersonal"
          component={RegisterPersonal}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Registration',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              // Use parent navigator to open the drawer from a nested stack:
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />

        <Stack.Screen name="RegisterPassword" component={RegisterPassword} />
        <Stack.Screen
          name="Billing"
          component={BillingScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Billing',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethodsScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Payment Methods',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />
        <Stack.Screen
          name="PaymentHistory"
          component={PaymentHistoryScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Payment History & Invoices',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton onPress={() => (navigation.getParent() as any)?.openDrawer?.()} />
            ),
          })}
        />

        <Stack.Screen name="FinalPayment" component={FinalPaymentScreen} />
        <Stack.Screen name="LanguagePair" component={LanguagePairScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        
        {/* NEW: Live Interpretation screen */}
        <Stack.Screen
          name="Interpretation"
          component={InterpretationScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Live Interpretation',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton onPress={() => (navigation.getParent() as any)?.openDrawer?.()} />
            ),
          })}
        />
        {/* DES Added: EditProfile screen with header */}
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Edit Profile',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <MenuButton
                onPress={() => (navigation.getParent() as any)?.openDrawer?.()}
              />
            ),
          })}
        />
      </Stack.Navigator>
    </>
  );
}
