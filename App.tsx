// App.tsx
/* --------- Notes -----------
Hosts app‑wide providers (e.g. StripeProvider, AuthProvider, VoiceSettingsProvider) and the NavigationContainer.
Inside the container we mount RootDrawer.
This means the drawer is the "shell" for everything in the app
Putting the drawer at the top lets any screen open/close it and ensures one consistent sidebar across the app.
--------- Notes End ----------- */

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider } from './src/context/AuthContext';
import { VoiceSettingsProvider } from './src/context/VoiceSettingsContext';
import RootDrawer from './src/navigation/RootDrawer';
import { getStripePublishableKey } from './src/screens/apis/keys';

// Export navigation types for use in other components
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  RegisterPersonal: undefined;
  RegisterPassword: { firstName: string; lastName: string; email: string };
  Billing: undefined;
  PaymentMethods: undefined;
  Checkout: undefined;
  FinalPayment: { totalCents?: number } | undefined;
  LanguagePair: undefined;
  Dashboard: undefined;
  EditProfile: undefined;
  PaymentHistory: undefined;
  LanguageSelect: undefined;
};

export default function App() {
  return (
    <StripeProvider publishableKey={getStripePublishableKey()}>
      <AuthProvider>
        <VoiceSettingsProvider>
          <NavigationContainer>
            <RootDrawer />
          </NavigationContainer>
        </VoiceSettingsProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
