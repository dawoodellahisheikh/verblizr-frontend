import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { g } from '../styles/global';
// DES Added: Import colors and spacing directly to avoid import issues
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
// DES Added: Updated import to use unified navigation types
import type { UnifiedStackParamList } from '../navigation/RootDrawer';
// DES Added: Import AppBackground and Footer components for consistent UI
import AppBackground from '../components/backgrounds/AppBackground';
import Footer from '../components/Footer';
// DES Added: Import Ionicons for back button
import Icon from 'react-native-vector-icons/Ionicons';

// DES Added: Updated schema to include confirmEmail and phoneNumber validation
const schema = z
  .object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    confirmEmail: z.string().email('Enter a valid email'),
    phoneNumber: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(/^[+]?[(]?[0-9\s\-().]{10,}$/, 'Enter a valid phone number'),
  })
  .refine(data => data.email === data.confirmEmail, {
    message: "Emails don't match",
    path: ['confirmEmail'],
  });
type FormValues = z.infer<typeof schema>;

const RegisterPersonal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NativeStackNavigationProp<UnifiedStackParamList>>();
  // DES Added: Updated default values to include new fields
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      confirmEmail: '',
      phoneNumber: '',
    },
  });

  const onNext = (v: FormValues) => nav.navigate('RegisterPassword', v as any);

  // DES Added: Function to go back to LoginScreen
  const onGoBack = () => nav.navigate('Login');

  // DES Added: Wrapped with AppBackground component for consistent gradient background
  return (
    <AppBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              padding: spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* DES Added: Header with back button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <TouchableOpacity
                onPress={onGoBack}
                style={{ marginRight: spacing.md }}
              >
                <Icon name="arrow-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[g.title, { flex: 1 }]}>Create account</Text>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              {/* First name */}
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      placeholder="First name"
                      style={g.input}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      returnKeyType="next"
                    />
                    {errors.firstName && (
                      <Text style={{ color: '#DC2626', marginTop: 6 }}>
                        {errors.firstName.message}
                      </Text>
                    )}
                  </>
                )}
              />
              <View style={{ height: spacing.md }} />

              {/* Last name */}
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      placeholder="Last name"
                      style={g.input}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      returnKeyType="next"
                    />
                    {errors.lastName && (
                      <Text style={{ color: '#DC2626', marginTop: 6 }}>
                        {errors.lastName.message}
                      </Text>
                    )}
                  </>
                )}
              />
              <View style={{ height: spacing.md }} />

              {/* Email */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      placeholder="Email"
                      style={g.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      returnKeyType="next"
                    />
                    {errors.email && (
                      <Text style={{ color: '#DC2626', marginTop: 6 }}>
                        {errors.email.message}
                      </Text>
                    )}
                  </>
                )}
              />
              <View style={{ height: spacing.md }} />

              {/* DES Added: Confirm Email field for email validation */}
              <Controller
                control={control}
                name="confirmEmail"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      placeholder="Confirm Email"
                      style={g.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      returnKeyType="next"
                    />
                    {errors.confirmEmail && (
                      <Text style={{ color: '#DC2626', marginTop: 6 }}>
                        {errors.confirmEmail.message}
                      </Text>
                    )}
                  </>
                )}
              />
              <View style={{ height: spacing.md }} />

              {/* DES Added: Phone Number field with proper validation */}
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <>
                    <TextInput
                      placeholder="Phone Number"
                      style={g.input}
                      keyboardType="phone-pad"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      returnKeyType="done"
                    />
                    {errors.phoneNumber && (
                      <Text style={{ color: '#DC2626', marginTop: 6 }}>
                        {errors.phoneNumber.message}
                      </Text>
                    )}
                  </>
                )}
              />

              <TouchableOpacity
                style={[g.buttonPrimary, { marginTop: spacing.xl }]}
                onPress={handleSubmit(onNext)}
              >
                <Text style={g.buttonPrimaryText}>Next</Text>
              </TouchableOpacity>

              {/* DES Added: Link to go back to login */}
              <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
                <TouchableOpacity onPress={onGoBack}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: spacing.md,
                    }}
                  >
                    Already have an account?{' '}
                    <Text style={{ color: colors.brand, fontWeight: '600' }}>
                      Sign in
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {/* DES Added: Footer component for consistent app branding */}
        <Footer />
      </SafeAreaView>
    </AppBackground>
  );
};

export default RegisterPersonal;
