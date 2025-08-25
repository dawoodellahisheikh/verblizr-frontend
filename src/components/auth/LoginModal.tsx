// src/components/auth/LoginModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, CommonActions } from '@react-navigation/native';

import { g } from '../../styles/global';
import { colors, spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../features/auth/api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
type FormValues = z.infer<typeof schema>;

type Props = { visible: boolean; onClose: () => void };

function extractAuth(res: any) {
  if (!res) return null;
  const token = res.token ?? res?.data?.token;
  const user = res.user ?? res?.data?.user;
  if (token) return { token, user };
  return null;
}

export default function LoginModal({ visible, onClose }: Props) {
  const navigation = useNavigation();
  const { login: authLogin } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      console.log('[LoginModal] Attempt login with object payload');
      let res: any;
      let auth = null;

      // 1) Try login(values)
      try {
        res = await (login as any)(values);
        console.log('[LoginModal] Response (object):', JSON.stringify(res));
        auth = extractAuth(res);
      } catch (eObj) {
        console.log(
          '[LoginModal] login(values) threw, will try fallback:',
          eObj,
        );
      }

      // 2) Fallback: login(email, password)
      if (!auth) {
        console.log('[LoginModal] Fallback to login(email, password)');
        res = await (login as any)(values.email, values.password);
        console.log('[LoginModal] Response (two args):', JSON.stringify(res));
        auth = extractAuth(res);
      }

      if (!auth) {
        console.log('[LoginModal] Bad login response:', res);
        throw new Error('Unexpected login response from server.');
      }

      // Set auth and navigate
      authLogin(auth.token, auth.user);
      onClose?.();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'MainApp' as never }],
        }),
      );
    } catch (e: any) {
      console.log('[LoginModal] Error:', e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Login failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        {/* Backdrop (tap to close) */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sheet */}
        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing.xl,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', flex: 1 }}>
              Log In
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[g.label, { marginBottom: spacing.xs }]}>Email</Text>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextInput
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[g.input]}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value ?? ''}
                placeholderTextColor="#9CA3AF"
              />
            )}
          />
          {!!errors.email && (
            <Text style={{ color: '#DC2626', marginTop: 6 }}>
              {errors.email.message}
            </Text>
          )}

          <Text
            style={[
              g.label,
              { marginTop: spacing.md, marginBottom: spacing.xs },
            ]}
          >
            Password
          </Text>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextInput
                placeholder="••••••••"
                secureTextEntry
                style={[g.input]}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                value={field.value ?? ''}
                placeholderTextColor="#9CA3AF"
              />
            )}
          />
          {!!errors.password && (
            <Text style={{ color: '#DC2626', marginTop: 6 }}>
              {errors.password.message}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            style={[
              g.buttonPrimary,
              {
                marginTop: spacing.lg,
                marginBottom: spacing.md,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={g.buttonPrimaryText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
