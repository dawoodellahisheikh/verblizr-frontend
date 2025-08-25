import React from 'react';
import {View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {g} from '../styles/global';
// DES Added: Import colors and spacing directly to avoid import issues
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {registerUser} from '../features/auth/registerApi';
import {useAuth} from '../context/AuthContext';
// DES Added: Updated import to use unified navigation types
import type {UnifiedStackParamList} from '../navigation/RootDrawer';
// DES Added: Import AppBackground and Footer components for consistent UI
import AppBackground from '../components/backgrounds/AppBackground';
import Footer from '../components/Footer';
// DES Added: Import Ionicons for back button
import Icon from 'react-native-vector-icons/Ionicons';

const schema = z.object({
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string().min(8, 'Minimum 8 characters'),
}).refine((d) => d.password === d.confirm, {message: "Passwords don't match", path: ['confirm']});
type FormValues = z.infer<typeof schema>;

type RPRoute = RouteProp<UnifiedStackParamList, 'RegisterPassword'>;

const RegisterPassword: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<UnifiedStackParamList>>();
  const route = useRoute<RPRoute>();
  // DES Added: Destructure new fields from route params
  const {firstName, lastName, email, confirmEmail, phoneNumber} = route.params;
  const {login} = useAuth();

  const {control, handleSubmit, formState: {errors}} = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {password: '', confirm: ''},
  });

  // DES Added: Updated onCreate to include phone number and redirect to login instead of auto-login
  const onCreate = async (v: FormValues) => {
    try {
      const res = await registerUser({firstName, lastName, email, phoneNumber, password: v.password});
      // DES Added: Show success message and navigate to LoginScreen
      Alert.alert(
        'Registration Successful!', 
        'Your account has been created successfully. Please log in to continue.',
        [
          {
            text: 'OK',
            onPress: () => nav.navigate('Login')
          }
        ]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Registration failed';
      Alert.alert('Error', msg);
    }
  };

  // DES Added: Function to go back to RegisterPersonal
  const onGoBack = () => nav.goBack();

  // DES Added: Wrapped with AppBackground component for consistent gradient background
  return (
    <AppBackground>
      <SafeAreaView style={{flex: 1}} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl}} keyboardShouldPersistTaps="handled">
          {/* DES Added: Header with back button */}
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg}}>
            <TouchableOpacity onPress={onGoBack} style={{marginRight: spacing.md}}>
              <Icon name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[g.title, {flex: 1}]}>Set password</Text>
          </View>

          <View style={{marginTop: spacing.lg}}>
            {/* Password */}
            <Controller
              control={control}
              name="password"
              render={({field: {onChange, onBlur, value}}) => (
                <>
                  <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={g.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    returnKeyType="next"
                  />
                  {errors.password && <Text style={{color: '#DC2626', marginTop: 6}}>{errors.password.message}</Text>}
                </>
              )}
            />
            <View style={{height: spacing.md}} />

            {/* Confirm */}
            <Controller
              control={control}
              name="confirm"
              render={({field: {onChange, onBlur, value}}) => (
                <>
                  <TextInput
                    placeholder="Confirm password"
                    secureTextEntry
                    style={g.input}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    returnKeyType="done"
                  />
                  {errors.confirm && <Text style={{color: '#DC2626', marginTop: 6}}>{errors.confirm.message}</Text>}
                </>
              )}
            />

            <TouchableOpacity style={[g.buttonPrimary, {marginTop: spacing.xl}]} onPress={handleSubmit(onCreate)}>
              <Text style={g.buttonPrimaryText}>Create Account</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {/* DES Added: Footer component for consistent app branding */}
        <Footer />
      </SafeAreaView>
    </AppBackground>
  );
};

export default RegisterPassword;