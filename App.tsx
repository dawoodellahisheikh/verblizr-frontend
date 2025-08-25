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
import { StripeProvider } from '@stripe/stripe-react-native';

import { AuthProvider } from './src/context/AuthContext';
import { VoiceSettingsProvider } from './src/context/VoiceSettingsContext';
import RootDrawer from './src/navigation/RootDrawer';

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
    <StripeProvider publishableKey="pk_test_51RuZcMF1SXqiudm2W8Jsq2WGbCNziUiUW46Ls5rinv7Lcr2E3BjZrHJKWfTLJkfm28th7ZRDnWzUdJjL9sBtcxqE00VMMozFFQ">
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
