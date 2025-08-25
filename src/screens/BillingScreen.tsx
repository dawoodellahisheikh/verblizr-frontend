// src/screens/BillingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { g } from '../styles/global';
import { colors, spacing } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

import { CardField, useStripe } from '@stripe/stripe-react-native';
import {
  requestSetupIntent,
  setDefaultPaymentMethod,
} from '../features/billing/api';

// DES Added: Import centralized background component and Footer
import { AppBackground, Footer } from '../components';

const schema = z.object({
  name: z.string().min(2, 'Enter cardholder name'),
  postal: z.string().min(3, 'Postal/ZIP required'),
  country: z.string().min(2, 'Country required'),
  addressLine1: z.string().min(3, 'Address line 1 required'),
});

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<RootStackParamList, 'Billing'>;

const BillingScreen: React.FC<Props> = ({ navigation }) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', postal: '', country: '', addressLine1: '' },
  });

  const { confirmSetupIntent } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);

  const onSubmit = async (values: FormValues) => {
    try {
      if (!cardComplete) {
        Alert.alert('Card details', 'Please enter complete card details.');
        return;
      }

      // 1) Ask backend for a SetupIntent client secret
      const { clientSecret } = await requestSetupIntent();

      // 2) Confirm on-device to save card to the Stripe Customer
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: values.name,
            address: {
              line1: values.addressLine1,
              postalCode: values.postal,
              country:
                values.country.length === 2
                  ? values.country.toUpperCase()
                  : undefined, // ISO-2 preferred
            },
          },
        },
      });

      if (error) {
        Alert.alert('Payment error', error.message || 'Could not save card.');
        return;
      }

      // 3) Make this the default PM for end-of-conversation charges
      const pmId = setupIntent?.paymentMethodId;
      if (pmId) {
        await setDefaultPaymentMethod(pmId);
      }

      Alert.alert('Card Saved', 'Your card is now saved for future charges.');
      navigation.goBack();
    } catch (e: any) {
      console.log('[BillingScreen] save-card failed:', e);
      Alert.alert('Error', e?.message || 'Could not save billing details.');
    }
  };

  const Input = ({
    label,
    error,
    children,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
  }) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[g.label, { marginBottom: spacing.xs }]}>{label}</Text>
      {children}
      {!!error && (
        <Text style={{ color: '#DC2626', marginTop: 6 }}>{error}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      {/* DES Added: Use centralized AppBackground component for consistent theming */}
      <AppBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding' })}
          keyboardVerticalOffset={
            (Platform.select({ ios: 24, android: 0 }) as number) || 0
          }
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing.xl }}
            keyboardShouldPersistTaps="handled"
          >
          <Text style={[g.title, { marginBottom: spacing.sm }]}>
            Card Details
          </Text>
          <Text style={[g.subtitle, { marginBottom: spacing.lg }]}>
            Add a payment method (you can skip and add later).
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input label="Name on card" error={errors.name?.message}>
                <TextInput
                  style={g.input}
                  placeholder="John Appleseed"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </Input>
            )}
          />

          <Text style={[g.label, { marginBottom: spacing.xs }]}>
            Card details
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 8,
              marginBottom: spacing.md,
            }}
          >
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{ textColor: '#111' }}
              style={{ width: '100%', height: 50 }}
              onCardChange={details => setCardComplete(!!details.complete)}
            />
            {!cardComplete && (
              <Text style={{ fontSize: 12, marginTop: 6, color: '#6B7280' }}>
                Enter full card number, expiry, and CVC.
              </Text>
            )}
          </View>

          <Controller
            control={control}
            name="addressLine1"
            render={({ field }) => (
              <Input
                label="Billing address"
                error={errors.addressLine1?.message}
              >
                <TextInput
                  style={g.input}
                  placeholder="123 Main St"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </Input>
            )}
          />

          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <Input label="Country" error={errors.country?.message}>
                <TextInput
                  style={g.input}
                  placeholder="United Kingdom"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </Input>
            )}
          />

          <Controller
            control={control}
            name="postal"
            render={({ field }) => (
              <Input label="Postal / ZIP" error={errors.postal?.message}>
                <TextInput
                  style={g.input}
                  placeholder="SW1A 1AA"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </Input>
            )}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || !cardComplete}
              style={[
                g.buttonPrimary,
                styles.saveBtn,
                { opacity: isSubmitting || !cardComplete ? 0.7 : 1 },
              ]}
            >
              <Text style={g.buttonPrimaryText}>
                {isSubmitting ? 'Saving…' : 'Save billing details'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.skipBtnSmall}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppBackground>
      {/* Sticky Footer */}
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {
    flex: 0.7,
    marginRight: spacing.md,
  },
  skipBtnSmall: {
    flex: 0.3,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipText: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textPrimary,
  },
});

export default BillingScreen;
