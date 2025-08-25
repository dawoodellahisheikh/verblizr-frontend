// import React from 'react';
// import {
//   View,
//   Text,
//   Image,
//   TextInput,
//   TouchableOpacity,
//   ActivityIndicator,
//   StatusBar,
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   Dimensions,
//   RefreshControl,
//   Animated,
//   Easing,
// } from 'react-native';
// import {
//   SafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';
// import { useForm, Controller } from 'react-hook-form';
// import { z } from 'zod';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useNavigation } from '@react-navigation/native';
// import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// import { g } from '../styles/global';
// import { colors, spacing } from '../theme';
// import type { RootStackParamList } from '../../App';
// import { useAuth } from '../context/AuthContext';
// import { login } from '../features/auth/api';

// import Footer from '../components/Footer';

// const { width } = Dimensions.get('window');

// const schema = z.object({
//   email: z.string().email('Enter a valid email'),
//   password: z.string().min(8, 'Minimum 8 characters'),
// });
// type FormValues = z.infer<typeof schema>;

// const LoginScreen: React.FC = () => {
//   const insets = useSafeAreaInsets();
//   const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
//   const { login: authLogin } = useAuth();

//   const [loading, setLoading] = React.useState(false);
//   const [focusedInput, setFocusedInput] = React.useState<string | null>(null);
//   const [refreshing, setRefreshing] = React.useState(false);

//   // Animation values for floating elements
//   const floatAnim1 = React.useRef(new Animated.Value(0)).current;
//   const floatAnim2 = React.useRef(new Animated.Value(0)).current;

//   React.useEffect(() => {
//     // Create continuous bounce animation for the first floating element
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(floatAnim1, {
//           toValue: 1,
//           duration: 3000,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//         Animated.timing(floatAnim1, {
//           toValue: 0,
//           duration: 3000,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();

//     // Create slightly different bounce animation for the second floating element
//     Animated.loop(
//       Animated.sequence([
//         Animated.timing(floatAnim2, {
//           toValue: 1,
//           duration: 3500,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//           delay: 500,
//         }),
//         Animated.timing(floatAnim2, {
//           toValue: 0,
//           duration: 3500,
//           easing: Easing.inOut(Easing.ease),
//           useNativeDriver: true,
//         }),
//       ]),
//     ).start();
//   }, []);

//   // Interpolate animation values to vertical movement
//   const translateY1 = floatAnim1.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0, 30],
//   });

//   const translateY2 = floatAnim2.interpolate({
//     inputRange: [0, 1],
//     outputRange: [0, -40],
//   });

//   const {
//     control,
//     handleSubmit,
//     formState: { errors },
//     reset,
//     setValue,
//   } = useForm<FormValues>({
//     resolver: zodResolver(schema),
//     defaultValues: { email: '', password: '' },
//   });

//   // Pull to refresh handler
//   const onRefresh = React.useCallback(async () => {
//     setRefreshing(true);

//     // Clear form
//     reset();
//     setValue('email', '');
//     setValue('password', '');

//     // Clear focused input
//     setFocusedInput(null);

//     // Simulate refresh delay for smooth UX
//     setTimeout(() => {
//       setRefreshing(false);
//     }, 1000);
//   }, [reset, setValue]);

//   const onSubmit = async (values: FormValues) => {
//     try {
//       console.log('Login - Starting login process with:', values.email); // DES Added: Debug logging
//       setLoading(true);
//       const res = await login(values);
//       console.log('Login - API response received:', {
//         hasToken: !!res.token,
//         user: res.user,
//       }); // DES Added: Debug logging
//       authLogin(res.token, res.user);
//       console.log('Login - authLogin called, should trigger re-render'); // DES Added: Debug logging

//       // DES Added: Add proper navigation with slide animation after successful login
//       // Small delay to ensure auth state is updated, then navigate with animation
//       setTimeout(() => {
//         nav.reset({
//           index: 0,
//           routes: [{ name: 'MainApp' }], // DES Modified: Navigate to MainApp which contains the drawer
//         });
//       }, 100); // Small delay ensures auth state is properly set
//     } catch (e: any) {
//       console.log('Login - Error occurred:', e); // DES Added: Debug logging
//       const msg = e?.response?.data?.message ?? 'Login failed';
//       Alert.alert('Error', msg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const styles = {
//     container: {
//       flex: 1,
//       backgroundColor: '#f0f0f0ff',
//     },
//     backgroundGradient: {
//       position: 'absolute' as const,
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       // Beautiful grey gradient
//       backgroundColor: '#ffffffff',
//     },
//     gradientOverlay: {
//       position: 'absolute' as const,
//       top: 0,
//       left: 0,
//       right: 0,
//       bottom: 0,
//       // Simulating a gradient with multiple layers
//     },
//     gradientLayer1: {
//       position: 'absolute' as const,
//       top: 0,
//       left: 0,
//       right: 0,
//       height: '30%',
//       backgroundColor: '#efefefff',
//       opacity: 0.8,
//     },
//     gradientLayer2: {
//       position: 'absolute' as const,
//       top: '20%',
//       left: 0,
//       right: 0,
//       height: '40%',
//       backgroundColor: '#efefefff',
//       opacity: 0.6,
//     },
//     gradientLayer3: {
//       position: 'absolute' as const,
//       top: '50%',
//       left: 0,
//       right: 0,
//       height: '50%',
//       backgroundColor: '#efefefff',
//       opacity: 0.4,
//     },
//     // Animated background elements
//     floatingElement1: {
//       position: 'absolute' as const,
//       right: -100,
//       width: 300,
//       height: 300,
//       borderRadius: 150,
//       backgroundColor: colors.black || colors.brand,
//       opacity: 0.03,
//     },
//     floatingElement2: {
//       position: 'absolute' as const,
//       top: 520,
//       left: -150,
//       width: 400,
//       height: 400,
//       borderRadius: 200,
//       backgroundColor: colors.black || colors.brand,
//       opacity: 0.03,
//     },
//     scrollContainer: {
//       flexGrow: 1,
//     },
//     contentContainer: {
//       flex: 1,
//       paddingHorizontal: 24,
//       justifyContent: 'center' as const,
//       minHeight: '100%',
//     },
//     headerSection: {
//       alignItems: 'center' as const,
//       marginBottom: 48,
//     },
//     logoContainer: {
//       marginBottom: 20,
//       alignItems: 'center' as const,
//     },
//     logo: {
//       width: 90,
//       height: 90,
//       borderRadius: 40, // makes it a circle
//       backgroundColor: 'transparent', // ensure no background
//     },
//     welcomeText: {
//       fontSize: 32,
//       fontWeight: '300' as const,
//       color: '#0F172A',
//       textAlign: 'center' as const,
//       letterSpacing: -0.5,
//       marginBottom: 8,
//     },
//     subtitleText: {
//       fontSize: 16,
//       color: '#000000ff',
//       textAlign: 'center' as const,
//       fontWeight: '400' as const,
//       letterSpacing: 0.2,
//     },
//     formSection: {
//       gap: 20,
//       marginBottom: 32,
//     },
//     inputContainer: {
//       position: 'relative' as const,
//     },
//     inputWrapper: {
//       position: 'relative' as const,
//     },
//     input: {
//       height: 56,
//       backgroundColor: 'rgba(255, 255, 255, 0.9)',
//       borderWidth: 1,
//       borderColor: 'rgba(230, 230, 230, 1)',
//       borderRadius: 16,
//       paddingHorizontal: 20,
//       fontSize: 16,
//       color: '#0F172A',
//       fontWeight: '400' as const,
//       // Enhanced shadow for visibility
//       shadowColor: '#1E293B',
//       shadowOffset: { width: 0, height: 4 },
//       shadowOpacity: 0.1,
//       shadowRadius: 8,
//       elevation: 4,
//     },
//     inputFocused: {
//       borderColor: colors.brand || colors.black,
//       backgroundColor: 'rgba(255, 255, 255, 0.95)',
//       shadowColor: colors.brand || colors.black,
//       shadowOffset: { width: 0, height: 0 },
//       shadowOpacity: 0.2,
//       shadowRadius: 16,
//       elevation: 6,
//     },
//     inputLabel: {
//       position: 'absolute' as const,
//       left: 20,
//       color: '#bbbbbbff',
//       fontSize: 14,
//       fontWeight: '500' as const,
//       backgroundColor: 'rgba(255, 255, 255, 0.9)',
//       paddingHorizontal: 6,
//       zIndex: 1,
//     },
//     inputLabelFocused: {
//       top: -8,
//       fontSize: 12,
//       color: colors.brand || colors.black,
//       backgroundColor: 'rgba(255, 255, 255, 0.95)',
//       borderRadius: 5,
//       fontWeight: '600' as const,
//     },
//     inputLabelUnfocused: {
//       top: 20,
//     },
//     errorText: {
//       color: colors.brand || '#EF4444',
//       fontSize: 14,
//       marginTop: 8,
//       marginLeft: 4,
//       fontWeight: '400' as const,
//     },
//     loginButton: {
//       height: 56,
//       backgroundColor: colors.black || colors.black,
//       borderRadius: 16,
//       justifyContent: 'center' as const,
//       alignItems: 'center' as const,
//       marginTop: 8,
//       shadowColor: colors.black || colors.black,
//       shadowOffset: { width: 0, height: 8 },
//       shadowOpacity: 0.3,
//       shadowRadius: 16,
//       elevation: 8,
//     },
//     loginButtonDisabled: {
//       opacity: 0.6,
//       shadowOpacity: 0.1,
//     },
//     buttonText: {
//       fontSize: 17,
//       fontWeight: '600' as const,
//       color: '#FFFFFF',
//       letterSpacing: 0.2,
//     },
//     linksSection: {
//       alignItems: 'center' as const,
//       gap: 16,
//       marginTop: 15,
//     },
//     linkText: {
//       fontSize: 16,
//       color: '#1E293B',
//       textAlign: 'center' as const,
//       fontWeight: '500' as const,
//     },
//     linkHighlight: {
//       color: colors.brand || colors.black,
//       fontWeight: '600' as const,
//     },
//     forgotPasswordLink: {
//       color: '#8e8e8eff',
//       fontSize: 15,
//       fontWeight: '400' as const,
//     },
//     spacer: {
//       height: 60,
//     },
//   };

//   const isInputFocused = (inputName: string) => focusedInput === inputName;
//   const hasValue = (value: string) => value && value.length > 0;

//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
//       <StatusBar barStyle="dark-content" backgroundColor="#FAFBFC" />

//       {/* Background Elements */}
//       <View style={styles.backgroundGradient}>
//         {/* Animated Floating Elements */}
//         <Animated.View
//           style={[
//             styles.floatingElement1,
//             { transform: [{ translateY: translateY1 }] },
//           ]}
//         />
//         <Animated.View
//           style={[
//             styles.floatingElement2,
//             { transform: [{ translateY: translateY2 }] },
//           ]}
//         />
//       </View>

//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={{ flex: 1 }}
//       >
//         <ScrollView
//           contentContainerStyle={styles.scrollContainer}
//           keyboardShouldPersistTaps="handled"
//           showsVerticalScrollIndicator={false}
//           refreshControl={
//             <RefreshControl
//               refreshing={refreshing}
//               onRefresh={onRefresh}
//               tintColor={colors.black || '#374151'}
//               colors={[colors.black || '#374151']}
//               progressBackgroundColor="#FFFFFF"
//               title="Pull to refresh"
//               titleColor={colors.black || '#374151'}
//             />
//           }
//         >
//           <View style={styles.contentContainer}>
//             {/* Header Section */}
//             <View style={styles.headerSection}>
//               <View style={styles.logoContainer}>
//                 <Image
//                   source={require('../assets/logo.png')}
//                   style={styles.logo}
//                   resizeMode="contain"
//                 />
//               </View>
//               <Text style={styles.welcomeText}>Welcome back</Text>
//               <Text style={styles.subtitleText}>
//                 Enter your credentials to continue
//               </Text>
//             </View>

//             {/* Form Section */}
//             <View style={styles.formSection}>
//               {/* Email Input */}
//               <Controller
//                 control={control}
//                 name="email"
//                 render={({ field: { onChange, onBlur, value } }) => (
//                   <View style={styles.inputContainer}>
//                     <View style={styles.inputWrapper}>
//                       <Text
//                         style={[
//                           styles.inputLabel,
//                           isInputFocused('email') || hasValue(value)
//                             ? styles.inputLabelFocused
//                             : styles.inputLabelUnfocused,
//                         ]}
//                       >
//                         Email
//                       </Text>
//                       <TextInput
//                         style={[
//                           styles.input,
//                           isInputFocused('email') && styles.inputFocused,
//                           errors.email && { borderColor: '#EF4444' },
//                         ]}
//                         autoCapitalize="none"
//                         keyboardType="email-address"
//                         onBlur={() => {
//                           onBlur();
//                           setFocusedInput(null);
//                         }}
//                         onFocus={() => setFocusedInput('email')}
//                         onChangeText={onChange}
//                         value={value}
//                         placeholderTextColor="transparent"
//                       />
//                     </View>
//                     {errors.email && (
//                       <Text style={styles.errorText}>
//                         {errors.email.message}
//                       </Text>
//                     )}
//                   </View>
//                 )}
//               />

//               {/* Password Input */}
//               <Controller
//                 control={control}
//                 name="password"
//                 render={({ field: { onChange, onBlur, value } }) => (
//                   <View style={styles.inputContainer}>
//                     <View style={styles.inputWrapper}>
//                       <Text
//                         style={[
//                           styles.inputLabel,
//                           isInputFocused('password') || hasValue(value)
//                             ? styles.inputLabelFocused
//                             : styles.inputLabelUnfocused,
//                         ]}
//                       >
//                         Password
//                       </Text>
//                       <TextInput
//                         style={[
//                           styles.input,
//                           isInputFocused('password') && styles.inputFocused,
//                           errors.password && { borderColor: '#EF4444' },
//                         ]}
//                         secureTextEntry
//                         onBlur={() => {
//                           onBlur();
//                           setFocusedInput(null);
//                         }}
//                         onFocus={() => setFocusedInput('password')}
//                         onChangeText={onChange}
//                         value={value}
//                         placeholderTextColor="transparent"
//                       />
//                     </View>
//                     {errors.password && (
//                       <Text style={styles.errorText}>
//                         {errors.password.message}
//                       </Text>
//                     )}
//                   </View>
//                 )}
//               />

//               {/* Login Button */}
//               <TouchableOpacity
//                 style={[
//                   styles.loginButton,
//                   loading && styles.loginButtonDisabled,
//                 ]}
//                 onPress={handleSubmit(onSubmit)}
//                 disabled={loading}
//                 activeOpacity={0.9}
//               >
//                 {loading ? (
//                   <ActivityIndicator color="#FFFFFF" size="small" />
//                 ) : (
//                   <Text style={styles.buttonText}>Continue</Text>
//                 )}
//               </TouchableOpacity>
//             </View>

//             {/* Links Section */}
//             <View style={styles.linksSection}>
//               <TouchableOpacity
//                 onPress={() => nav.navigate('RegisterPersonal')}
//               >
//                 <Text style={styles.linkText}>
//                   Don't have an account?{' '}
//                   <Text style={styles.linkHighlight}>Sign up</Text>
//                 </Text>
//               </TouchableOpacity>

//               <TouchableOpacity>
//                 <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
//               </TouchableOpacity>
//             </View>

//             <View style={styles.spacer} />
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* Footer */}
//       <Footer />
//     </SafeAreaView>
//   );
// };

// export default LoginScreen;

// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { LoginModal, RegisterModal } from '../components/auth';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';
import { AppBackground } from '../components';
import Footer from '../components/Footer';

export default function LoginScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <AppBackground>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* NOTE: transparent bg so gradient shows */}
      <SafeAreaView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        edges={['top', 'bottom']}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl + insets.top,
          }}
        >
          {/* Logo with superscript */}
          <View style={{ marginTop: spacing.xs }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.textPrimary,
              }}
            >
              V<Text style={{ fontSize: 12, marginTop: -12 }}>1.0</Text>
            </Text>
            <View
              style={{
                height: 2,
                width: 24,
                backgroundColor: colors.black,
                marginTop: spacing.xs,
              }}
            />
          </View>

          {/* Headline & subcopy */}
          <View style={{ marginTop: spacing.xxl }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.brand,
                lineHeight: 24,
              }}
            >
              Welcome {'\n'}to the all new
            </Text>
            <Image
              source={require('../assets/appfooter.png')}
              style={{ width: 180, height: 45, resizeMode: 'contain' }}
            />
            <Text style={{ marginTop: spacing.md, color: '#979797ff' }}>
              Next level of resolving communication{'\n'}gaps with the app.
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Primary actions */}
          <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setLoginOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.black,
                  borderRadius: 14,
                  paddingVertical: spacing.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert('Soon', 'Quick login coming soon')}
                style={{
                  width: 54,
                  backgroundColor: colors.black,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Quick login"
              >
                <Text style={{ color: colors.white, fontSize: 18 }}>◎</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setRegisterOpen(true)}
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 14,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}
              >
                Become a client
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modals */}
        <LoginModal visible={loginOpen} onClose={() => setLoginOpen(false)} />
        <RegisterModal
          visible={registerOpen}
          onClose={() => setRegisterOpen(false)}
        />
        <Footer />
      </SafeAreaView>
    </AppBackground>
  );
}
