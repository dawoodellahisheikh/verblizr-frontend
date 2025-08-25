// // App.tsx
// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import {createNativeStackNavigator} from '@react-navigation/native-stack';
// import {AuthProvider} from './src/context/AuthContext';
// import SplashScreen from './src/screens/SplashScreen';
// import LoginScreen from './src/screens/LoginScreen';
// import HomeScreen from './src/screens/HomeScreen';
// import RegisterPersonal from './src/screens/RegisterPersonal';
// import RegisterPassword from './src/screens/RegisterPassword';
// import BillingScreen from './src/screens/BillingScreen';
// import FinalPaymentScreen from './src/screens/FinalPaymentScreen'; // 👈 NEW
// import { StripeProvider } from '@stripe/stripe-react-native';
// import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
// import {VoiceSettingsProvider} from './src/context/VoiceSettingsContext';
// // import LanguageSelect from './src/screens/LanguageSelect';

// import LanguagePairScreen from './src/screens/LanguagePairScreen';

// export type RootStackParamList = {
//   Splash: undefined;
//   Login: undefined;
//   Home: undefined;
//   RegisterPersonal: undefined;
//   RegisterPassword: { firstName: string; lastName: string; email: string };
//   Billing: undefined;
//   PaymentMethods: undefined; // 👈 NEW
//   Checkout: undefined;         // (if you kept it)
//   FinalPayment: { totalCents?: number } | undefined; // 👈 NEW
//   LanguagePair: undefined; // 👈 add this
// };

// const Stack = createNativeStackNavigator<RootStackParamList>();

// export default function App() {
//   return (
//     <StripeProvider publishableKey="pk_test_51RuZcMF1SXqiudm2W8Jsq2WGbCNziUiUW46Ls5rinv7Lcr2E3BjZrHJKWfTLJkfm28th7ZRDnWzUdJjL9sBtcxqE00VMMozFFQ">
//       <AuthProvider>
//         <VoiceSettingsProvider>{/* ⬅️ add this */}
//           <NavigationContainer>
//             <Stack.Navigator initialRouteName="Splash" screenOptions={{headerShown: false}}>
//               <Stack.Screen name="Splash" component={SplashScreen} />
//               <Stack.Screen name="Login" component={LoginScreen} />
//               <Stack.Screen name="Home" component={HomeScreen} />
//               <Stack.Screen name="RegisterPersonal" component={RegisterPersonal} />
//               <Stack.Screen name="RegisterPassword" component={RegisterPassword} />
//               <Stack.Screen name="Billing" component={BillingScreen} />
//               <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
//               <Stack.Screen name="FinalPayment" component={FinalPaymentScreen} />
//               <Stack.Screen name="LanguagePair" component={LanguagePairScreen} />
//             </Stack.Navigator>
//           </NavigationContainer>
//         </VoiceSettingsProvider>
//       </AuthProvider>
//     </StripeProvider>
//   );
// }

// // App.tsx
// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import { StripeProvider } from '@stripe/stripe-react-native';
// import { AuthProvider } from './src/context/AuthContext';
// import { VoiceSettingsProvider } from './src/context/VoiceSettingsContext';

// // Stack-only screens
// import SplashScreen from './src/screens/SplashScreen';
// import LoginScreen from './src/screens/LoginScreen';
// import RegisterPersonal from './src/screens/RegisterPersonal';
// import RegisterPassword from './src/screens/RegisterPassword';
// import FinalPaymentScreen from './src/screens/FinalPaymentScreen';

// // Drawer (contains Home, Billing, PaymentMethods, LanguagePair)
// import DrawerNavigator from './src/navigation/DrawerNavigator';

// export type RootStackParamList = {
//   Splash: undefined;
//   Login: undefined;
//   Home: undefined; // now renders DrawerNavigator
//   RegisterPersonal: undefined;
//   RegisterPassword: { firstName: string; lastName: string; email: string };
//   FinalPayment: { totalCents?: number } | undefined;
// };

// const Stack = createNativeStackNavigator<RootStackParamList>();

// export default function App() {
//   return (
//     <StripeProvider publishableKey="pk_test_51RuZcMF1SXqiudm2W8Jsq2WGbCNziUiUW46Ls5rinv7Lcr2E3BjZrHJKWfTLJkfm28th7ZRDnWzUdJjL9sBtcxqE00VMMozFFQ">
//       <AuthProvider>
//         <VoiceSettingsProvider>
//           <NavigationContainer>
//             <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
//               <Stack.Screen name="Splash" component={SplashScreen} />
//               <Stack.Screen name="Login" component={LoginScreen} />
//               {/* Home now mounts the Drawer */}
//               <Stack.Screen name="Home" component={DrawerNavigator} />
//               <Stack.Screen name="RegisterPersonal" component={RegisterPersonal} />

//               <Stack.Screen
//                 name="RegisterPassword"
//                 component={RegisterPassword}
//               />
//               {/* Keep flows that should appear above the Drawer here */}
//               <Stack.Screen name="FinalPayment" component={FinalPaymentScreen} />
//             </Stack.Navigator>
//           </NavigationContainer>
//         </VoiceSettingsProvider>
//       </AuthProvider>
//     </StripeProvider>
//   );
// }

// App.tsx
/* --------- Notes -----------
Hosts app‑wide providers (e.g. StripeProvider, AuthProvider, VoiceSettingsProvider) and the NavigationContainer.
Inside the container we mount RootDrawer.
This means the drawer is the “shell” for everything in the app
Putting the drawer at the top lets any screen open/close it and ensures one consistent sidebar across the app.
--------- Notes End ----------- */


import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';

import { AuthProvider } from './src/context/AuthContext';
import { VoiceSettingsProvider } from './src/context/VoiceSettingsContext';
import RootDrawer from './src/navigation/RootDrawer';

// ✅ Added: SafeAreaProvider so useSafeAreaInsets() has context
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey="pk_test_51RuZcMF1SXqiudm2W8Jsq2WGbCNziUiUW46Ls5rinv7Lcr2E3BjZrHJKWfTLJkfm28th7ZRDnWzUdJjL9sBtcxqE00VMMozFFQ">
        <AuthProvider>
          <VoiceSettingsProvider>
            <NavigationContainer>
              <RootDrawer />
            </NavigationContainer>
          </VoiceSettingsProvider>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
