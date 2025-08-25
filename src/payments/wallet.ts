import {useState, useCallback} from 'react';
import {Platform} from 'react-native';
import {
  isApplePaySupported,
  presentApplePay,
  confirmApplePayPayment,
  isGooglePaySupported,
  presentGooglePay,
  confirmGooglePayPayment,
} from '@stripe/stripe-react-native';

export function useWalletPay() {
  const [loading, setLoading] = useState(false);

  const payWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') return false;
    const supported = await isApplePaySupported();
    if (!supported) return false;

    setLoading(true);
    try {
      const {error} = await presentApplePay({
        cartItems: [{label: 'Conversation', amount: '5.00'}],
        country: 'GB',
        currency: 'GBP',
      });
      if (error) throw error;
      // confirm payment on backend later
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const payWithGoogle = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    const supported = await isGooglePaySupported();
    if (!supported) return false;

    setLoading(true);
    try {
      const {error} = await presentGooglePay({
        currencyCode: 'GBP',
        amount: 500,
      });
      if (error) throw error;
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {payWithApple, payWithGoogle, loading};
}