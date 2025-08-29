// src/screens/CheckoutScreen.tsx
import React, { useState } from 'react';
import { Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { g } from '../styles/global';
import { spacing, colors } from '../theme';
import { useWalletPay } from '../payments/wallet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { payWithApple, payWithGoogle } = useWalletPay();

  const tryCardPayment = async () => {
    setLoading(true);
    try {
      // TODO: Call your backend to confirm PaymentIntent with saved card
      // Simulating fail for demo:
      throw new Error('Card declined');
    } catch (err) {
      Alert.alert(
        'Card failed',
        'Your saved card could not be charged. Try Apple Pay or Google Pay.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplePay = async () => {
    try {
      const ok = await payWithApple();
      if (ok) {
        Alert.alert('Payment successful', 'Your Apple Pay transaction completed.');
        navigation.popToTop();
      }
    } catch (e) {
      Alert.alert('Apple Pay error', String(e));
    }
  };

  const handleGooglePay = async () => {
    try {
      const ok = await payWithGoogle();
      if (ok) {
        Alert.alert('Payment successful', 'Your Google Pay transaction completed.');
        navigation.popToTop();
      }
    } catch (e) {
      Alert.alert('Google Pay error', String(e));
    }
  };

  return (
    <SafeAreaView style={[g.screen, { padding: spacing.xl }]}>
      <Text style={[g.title, { marginBottom: spacing.lg }]}>Checkout</Text>
      <Text style={[g.subtitle, { marginBottom: spacing.xxl }]}>
        Complete your purchase
      </Text>

      <TouchableOpacity
        style={[g.buttonPrimary, { marginBottom: spacing.lg }]}
        onPress={tryCardPayment}
        disabled={loading}
      >
        <Text style={g.buttonPrimaryText}>
          {loading ? 'Processing…' : 'Pay with saved card'}
        </Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <TouchableOpacity
          style={[g.buttonSecondary, { marginBottom: spacing.md }]}
          onPress={handleApplePay}
        >
          <Text style={g.buttonSecondaryText}>Pay with Apple Pay</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[g.buttonSecondary, { marginBottom: spacing.md }]}
          onPress={handleGooglePay}
        >
          <Text style={g.buttonSecondaryText}>Pay with Google Pay</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={g.buttonGhost} onPress={() => navigation.goBack()}>
        <Text style={[g.buttonGhostText, { color: colors.textPrimary }]}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CheckoutScreen;