// src/screens/EditProfileScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { g } from '../styles/global';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

// Components
import { AppBackground, Footer } from '../components';

// DES Added > Import data for pickers
import { COUNTRIES, type Country } from '../data/countries';
import { TITLES, type Title } from '../data/titles';

// -------------------- Schemas --------------------
const profileSchema = z.object({
  title: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  company: z.string().optional(),
  about: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Old password is required (min 8 chars)'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your new password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;

// DES Added > Constants for modal sizing (same pattern as LanguagePairScreen)
const SHEET_HEIGHT = Math.min(
  560,
  Math.round(Dimensions.get('window').height * 0.55),
);

// DES Added > Generic picker component for titles and countries
type PickerProps<T> = {
  visible: boolean;
  title: string;
  data: T[];
  selectedCode?: string;
  onPick: (item: T) => void;
  onClose: () => void;
  searchPlaceholder: string;
};

// DES Added > Generic picker component following the same pattern as language picker
const GenericPicker = <T extends { code: string; label: string }>({
  visible,
  title,
  data,
  selectedCode,
  onPick,
  onClose,
  searchPlaceholder,
}: PickerProps<T>) => {
  const [q, setQ] = useState('');
  const filteredData = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query),
    );
  }, [q, data]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View
          style={{
            height: SHEET_HEIGHT,
            backgroundColor: '#F8F8F8',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xl,
          }}
        >
          {/* DES Added > Header with title and close button */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text style={[g.title, { flex: 1 }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* DES Added > Search input */}
          <TextInput
            placeholder={searchPlaceholder}
            value={q}
            onChangeText={setQ}
            style={[g.input, { marginBottom: spacing.md }]}
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={false}
          />

          {/* DES Added > List of options */}
          <FlatList
            data={filteredData}
            keyExtractor={item => item.code}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.code === selectedCode;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onPick(item);
                    onClose();
                  }}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#EFEFEF',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{item.label}</Text>
                  {/* DES Added > Checkmark for selected item */}
                  {selected ? (
                    <Text
                      style={{
                        fontSize: 22,
                        lineHeight: 22,
                        color: '#a4a4a4ff',
                        fontWeight: '800',
                        textShadowColor: 'rgba(0,0,0,0.1)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 1,
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

// DES Added > Two-column layout component for form fields
type TwoColumnFieldProps = {
  children: [React.ReactNode, React.ReactNode];
};

const TwoColumnField: React.FC<TwoColumnFieldProps> = ({ children }) => (
  <View
    style={{
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    }}
  >
    <View style={{ flex: 1 }}>{children[0]}</View>
    <View style={{ flex: 1 }}>{children[1]}</View>
  </View>
);

const TwoColumnField_Edited: React.FC<TwoColumnFieldProps> = ({ children }) => (
  <View
    style={{
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    }}
  >
    <View style={{ flex: 0 }}>{children[0]}</View>
    <View style={{ flex: 1 }}>{children[1]}</View>
  </View>
);

// -------------------- Screen --------------------
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, token, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // DES Added > State for picker modals
  const [showTitlePicker, setShowTitlePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // forms
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      title: (user as any)?.title || '',
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      email: (user as any)?.email || '',
      phone: (user as any)?.phone || '',
      address: (user as any)?.address || '',
      city: (user as any)?.city || '',
      state: (user as any)?.state || '',
      postalCode: (user as any)?.postalCode || '',
      country: (user as any)?.country || '',
      company: (user as any)?.company || '',
      about: (user as any)?.about || '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // -------------------- Handlers --------------------
  // DES Added > Helper functions for picker labels
  const getTitleLabel = (code?: string) =>
    TITLES.find(t => t.code === code)?.label ?? '';

  const getCountryLabel = (code?: string) =>
    COUNTRIES.find(c => c.code === code)?.label ?? '';

  const onUpdateProfile = async (data: ProfileFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      const result = await response.json();
      login(token!, result.user);

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update profile',
      );
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async (data: PasswordFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(
        'http://localhost:4000/api/auth/change-password',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
        },
      );

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      Alert.alert('Success', 'Password changed successfully');
      passwordForm.reset();
      setShowPasswordForm(false);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change password',
      );
    } finally {
      setLoading(false);
    }
  };

  // DES Added > Enhanced Field component that can handle both TextInput and TouchableOpacity for pickers
  const Field = ({
    label,
    placeholder,
    value,
    onChangeText,
    keyboardType,
    multiline,
    isPicker,
    onPickerPress,
  }: {
    label: string;
    placeholder?: string;
    value: string;
    onChangeText?: (t: string) => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
    multiline?: boolean;
    isPicker?: boolean;
    onPickerPress?: () => void;
  }) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[g.label, { marginBottom: 6 }]}>{label}</Text>
      {isPicker ? (
        // DES Added > Picker field (TouchableOpacity that looks like input)
        <TouchableOpacity
          style={[g.input, { justifyContent: 'center' }]}
          onPress={onPickerPress}
        >
          <Text style={{ color: value ? colors.textPrimary : '#9CA3AF' }}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>
      ) : (
        // DES Added > Regular text input field
        <TextInput
          placeholder={placeholder}
          style={[
            g.input,
            multiline && { height: 96, textAlignVertical: 'top' },
          ]}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          value={value}
          onChangeText={onChangeText}
        />
      )}
    </View>
  );

  // -------------------- Render --------------------
  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <AppBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding' })}
          keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 }) || 0}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}
              >
                <Icon name="arrow-left" size={20} color={colors.black} />
              </TouchableOpacity>
              <Text style={[g.title]}>Edit Profile</Text>
            </View>

            {/* Toggle buttons */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#e9e9e9ff',
                borderRadius: 12,
                padding: 6,
                marginBottom: spacing.lg,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowPasswordForm(false)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: 8,
                  backgroundColor: !showPasswordForm
                    ? colors.white
                    : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: !showPasswordForm ? colors.black : '#6B7280',
                  }}
                >
                  Profile Info
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowPasswordForm(true)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: 8,
                  backgroundColor: showPasswordForm
                    ? colors.white
                    : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontWeight: '600',
                    color: showPasswordForm ? colors.black : '#6B7280',
                  }}
                >
                  Change Password
                </Text>
              </TouchableOpacity>
            </View>

            {/* Profile form OR Password form */}
            {!showPasswordForm ? (
              // ---------------- DES Added > Updated Profile form with new layout ----------------
              <View>
                {/* DES Added > Title as a picker */}
                <Controller
                  control={profileForm.control}
                  name="title"
                  render={({ field: { onChange: _onChange, value } }) => (
                    <Field
                      label="Title"
                      placeholder="Select title"
                      value={getTitleLabel(value)}
                      isPicker
                      onPickerPress={() => setShowTitlePicker(true)}
                    />
                  )}
                />

                {/* DES Added > First Name and Last Name side by side */}
                <TwoColumnField>
                  <Controller
                    control={profileForm.control}
                    name="firstName"
                    render={({ field: { onChange: _onChange, value } }) => (
                      <>
                        <Field
                          label="First Name"
                          placeholder="First name"
                          value={value || ''}
                          onChangeText={_onChange}
                        />
                        {profileForm.formState.errors.firstName && (
                          <Text
                            style={{
                              color: '#DC2626',
                              marginTop: -8,
                              marginBottom: spacing.md,
                              fontSize: 12,
                            }}
                          >
                            {profileForm.formState.errors.firstName.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                  <Controller
                    control={profileForm.control}
                    name="lastName"
                    render={({ field: { onChange: _onChange, value } }) => (
                      <>
                        <Field
                          label="Last Name"
                          placeholder="Last name"
                          value={value || ''}
                          onChangeText={_onChange}
                        />
                        {profileForm.formState.errors.lastName && (
                          <Text
                            style={{
                              color: '#DC2626',
                              marginTop: -8,
                              marginBottom: spacing.md,
                              fontSize: 12,
                            }}
                          >
                            {profileForm.formState.errors.lastName.message}
                          </Text>
                        )}
                      </>
                    )}
                  />
                </TwoColumnField>

                {/* Email */}
                <Controller
                  control={profileForm.control}
                  name="email"
                  render={({ field: { onChange: _onChange, value } }) => (
                    <>
                      <Field
                        label="Email"
                        placeholder="Enter your email"
                        value={value || ''}
                        onChangeText={_onChange}
                        keyboardType="email-address"
                      />
                      {profileForm.formState.errors.email && (
                        <Text
                          style={{
                            color: '#DC2626',
                            marginTop: -8,
                            marginBottom: spacing.md,
                            fontSize: 12,
                          }}
                        >
                          {profileForm.formState.errors.email.message}
                        </Text>
                      )}
                    </>
                  )}
                />

                {/* Phone */}
                <Controller
                  control={profileForm.control}
                  name="phone"
                  render={({ field: { onChange: _onChange, value } }) => (
                    <Field
                      label="Phone"
                      placeholder="Enter your phone number"
                      value={value || ''}
                      onChangeText={_onChange}
                      keyboardType="phone-pad"
                    />
                  )}
                />

                {/* Address */}
                <Controller
                  control={profileForm.control}
                  name="address"
                  render={({ field: { onChange: _onChange, value } }) => (
                    <Field
                      label="Address"
                      placeholder="Street address"
                      value={value || ''}
                      onChangeText={onChange}
                      multiline
                    />
                  )}
                />

                {/* DES Added > City and State side by side */}
                <TwoColumnField>
                  <Controller
                    control={profileForm.control}
                    name="city"
                    render={({ field: { onChange, value } }) => (
                      <Field
                        label="City"
                        placeholder="City"
                        value={value || ''}
                        onChangeText={onChange}
                      />
                    )}
                  />
                  <Controller
                    control={profileForm.control}
                    name="state"
                    render={({ field: { onChange, value } }) => (
                      <Field
                        label="State / Province"
                        placeholder="State"
                        value={value || ''}
                        onChangeText={onChange}
                      />
                    )}
                  />
                </TwoColumnField>

                {/* DES Added > Postal Code and Country side by side */}
                <TwoColumnField_Edited>
                  <Controller
                    control={profileForm.control}
                    name="postalCode"
                    render={({ field: { onChange, value } }) => (
                      <Field
                        label="Postal Code"
                        placeholder="e.g. 12345"
                        value={value || ''}
                        onChangeText={onChange}
                      />
                    )}
                  />
                  <Controller
                    control={profileForm.control}
                    name="country"
                    render={({ field: { onChange, value } }) => (
                      <Field
                        label="Country"
                        placeholder="Select country"
                        value={getCountryLabel(value)}
                        isPicker
                        onPickerPress={() => setShowCountryPicker(true)}
                      />
                    )}
                  />
                </TwoColumnField_Edited>

                {/* Company */}
                <Controller
                  control={profileForm.control}
                  name="company"
                  render={({ field: { onChange, value } }) => (
                    <Field
                      label="Company"
                      placeholder="Company"
                      value={value || ''}
                      onChangeText={onChange}
                    />
                  )}
                />

                {/* About */}
                <Controller
                  control={profileForm.control}
                  name="about"
                  render={({ field: { onChange, value } }) => (
                    <Field
                      label="About"
                      placeholder="Tell us about yourself"
                      value={value || ''}
                      onChangeText={onChange}
                      multiline
                    />
                  )}
                />

                {/* Save button */}
                <TouchableOpacity
                  style={[
                    g.buttonPrimary,
                    { marginTop: spacing.xl },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={profileForm.handleSubmit(onUpdateProfile)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={g.buttonPrimaryText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // ---------------- Password form ----------------
              <View>
                {/* DES Added > Old Password - Direct TextInput implementation */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[g.label, { marginBottom: 6 }]}>
                    Old Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Enter your old password"
                      style={[g.input, { paddingRight: 40 }]}
                      secureTextEntry={!showCurrentPassword}
                      onChangeText={text => {
                        // DES Added > Manually update form value for better compatibility
                        passwordForm.setValue('currentPassword', text);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPassword(s => !s)}
                      style={{ position: 'absolute', right: 10, top: 14 }}
                    >
                      <Icon
                        name={showCurrentPassword ? 'eye-off' : 'eye'}
                        size={15}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordForm.formState.errors.currentPassword && (
                    <Text
                      style={{ color: '#DC2626', marginTop: 4, fontSize: 12 }}
                    >
                      {passwordForm.formState.errors.currentPassword.message}
                    </Text>
                  )}
                </View>

                {/* DES Added > New Password - Direct TextInput implementation */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[g.label, { marginBottom: 6 }]}>
                    New Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Enter your new password"
                      style={[g.input, { paddingRight: 40 }]}
                      secureTextEntry={!showNewPassword}
                      onChangeText={text => {
                        passwordForm.setValue('newPassword', text);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(s => !s)}
                      style={{ position: 'absolute', right: 10, top: 14 }}
                    >
                      <Icon
                        name={showNewPassword ? 'eye-off' : 'eye'}
                        size={15}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordForm.formState.errors.newPassword && (
                    <Text
                      style={{ color: '#DC2626', marginTop: 4, fontSize: 12 }}
                    >
                      {passwordForm.formState.errors.newPassword.message}
                    </Text>
                  )}
                </View>

                {/* DES Added > Confirm New Password - Direct TextInput implementation */}
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[g.label, { marginBottom: 6 }]}>
                    Confirm New Password
                  </Text>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      placeholder="Re-enter your new password"
                      style={[g.input, { paddingRight: 40 }]}
                      secureTextEntry={!showConfirmPassword}
                      onChangeText={text => {
                        passwordForm.setValue('confirmPassword', text);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(s => !s)}
                      style={{ position: 'absolute', right: 10, top: 14 }}
                    >
                      <Icon
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={15}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordForm.formState.errors.confirmPassword && (
                    <Text
                      style={{ color: '#DC2626', marginTop: 4, fontSize: 12 }}
                    >
                      {passwordForm.formState.errors.confirmPassword.message}
                    </Text>
                  )}
                </View>

                {/* DES Added > Submit button with improved form handling */}
                <TouchableOpacity
                  style={[
                    g.buttonPrimary,
                    { marginTop: spacing.xl },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    passwordForm.handleSubmit(onChangePassword)();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={g.buttonPrimaryText}>Change Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </AppBackground>
      <Footer />

      {/* DES Added > Title and Country pickers (same pattern as language pickers) */}
      <GenericPicker<Title>
        visible={showTitlePicker}
        title="Select Title"
        data={TITLES}
        selectedCode={profileForm.getValues('title')}
        onPick={title => profileForm.setValue('title', title.code)}
        onClose={() => setShowTitlePicker(false)}
        searchPlaceholder="Search titles"
      />

      <GenericPicker<Country>
        visible={showCountryPicker}
        title="Select Country"
        data={COUNTRIES}
        selectedCode={profileForm.getValues('country')}
        onPick={country => profileForm.setValue('country', country.code)}
        onClose={() => setShowCountryPicker(false)}
        searchPlaceholder="Search countries"
      />
    </SafeAreaView>
  );
};

export default EditProfileScreen;
