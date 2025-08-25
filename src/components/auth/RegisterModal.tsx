// src/components/auth/RegisterModal.tsx
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
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { g } from '../../styles/global';
import { colors, spacing } from '../../theme';

// --- Schema with title + confirmEmail ---
const schema = z
  .object({
    title: z.string().min(2, 'Required'),
    firstName: z.string().min(2, 'Required'),
    lastName: z.string().min(2, 'Required'),
    email: z.string().email('Enter a valid email'),
    confirmEmail: z.string().email('Confirm your email'),
    password: z.string().min(8, 'Minimum 8 characters'),
    confirm: z.string().min(8, 'Confirm your password'),
  })
  .refine(d => d.email === d.confirmEmail, {
    path: ['confirmEmail'],
    message: 'Emails do not match',
  })
  .refine(d => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;
type Props = { visible: boolean; onClose: () => void };

export default function RegisterModal({ visible, onClose }: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      firstName: '',
      lastName: '',
      email: '',
      confirmEmail: '',
      password: '',
      confirm: '',
    },
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (_values: FormValues) => {
    try {
      setLoading(true);
      // TODO: call your real register API
      await new Promise(r => setTimeout(r, 900));
      Alert.alert('Success', 'Account created. You can log in now.');
      onClose();
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  // Reusable input renderer
  const input = (
    label: string,
    name: keyof FormValues,
    props?: Partial<React.ComponentProps<typeof TextInput>>,
    containerStyle?: object,
  ) => (
    <View style={[{ flex: 1 }, containerStyle]}>
      <Text
        style={[g.label, { marginTop: spacing.md, marginBottom: spacing.xs }]}
      >
        {label}
      </Text>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <TextInput
            style={[g.input]}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            value={(field.value as string) ?? ''}
            {...props}
          />
        )}
      />
      {!!errors[name] && (
        <Text style={{ color: '#DC2626', marginTop: 6 }}>
          {(errors as any)[name]?.message}
        </Text>
      )}
    </View>
  );

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
        {/* backdrop */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.white,
            padding: spacing.xl,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', flex: 1 }}>
              Become a client
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            {input(
              'Title',
              'title',
              { placeholder: 'Mr / Ms / Dr', autoCapitalize: 'words' },
              { flex: undefined },
            )}

            {/* First + Last in a row */}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {input('First name', 'firstName', {
                placeholder: 'Jane',
                autoCapitalize: 'words',
              })}
              {input('Last name', 'lastName', {
                placeholder: 'Doe',
                autoCapitalize: 'words',
              })}
            </View>

            {/* Email + Confirm Email */}
            {input('Email', 'email', {
              placeholder: 'you@example.com',
              autoCapitalize: 'none',
              autoCorrect: false,
              keyboardType: 'email-address',
            })}
            {input('Confirm email', 'confirmEmail', {
              placeholder: 'you@example.com',
              autoCapitalize: 'none',
              autoCorrect: false,
              keyboardType: 'email-address',
            })}

            {/* Password + Confirm */}
            {input('Password', 'password', {
              placeholder: '••••••••',
              secureTextEntry: true,
            })}
            {input('Confirm password', 'confirm', {
              placeholder: '••••••••',
              secureTextEntry: true,
            })}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={[
                g.buttonPrimary,
                {
                  marginTop: spacing.lg,
                  backgroundColor: '#EF4444',
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={g.buttonPrimaryText}>Create account</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
