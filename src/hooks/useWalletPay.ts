import {useState} from 'react';
import {Platform} from 'react-native';

/**
 * Temporary stub for Apple/Google Pay.
 * We’ll replace this with real Stripe Platform Pay later.
 */
export function useWalletPay() {
  const [isPaying, setIsPaying] = useState(false);

  // very rough “supported” flag for UI; Stripe will give us a real check later
  const supported = Platform.select({ ios: true, android: true }) as boolean;

  /**
   * Pretend to process a wallet payment.
   * Replace with Stripe Platform Pay flow when backend is ready.
   */
  const pay = async (totalCents: number) => {
    setIsPaying(true);
    try {
      // simulate network
      await new Promise(res => setTimeout(res, 800));
      // return success
      return { ok: true };
    } finally {
      setIsPaying(false);
    }
  };

  return { pay, isPaying, supported };
}