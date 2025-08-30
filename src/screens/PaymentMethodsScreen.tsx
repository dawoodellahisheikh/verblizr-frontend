import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { colors, spacing } from '../theme';
import { g } from '../styles/global';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  getPaymentMethods,
  setDefaultPaymentMethod as apiSetDefaultPM,
  deletePaymentMethod as apiDeletePM,
  requestSetupIntent,
} from '../features/billing/api';

// DES Added: Import centralized background component and Footer
import { AppBackground, Footer } from '../components';

// Icons
import FeatherIcon from 'react-native-vector-icons/Feather';
import MIcon from 'react-native-vector-icons/MaterialIcons';

import FAIcon from 'react-native-vector-icons/FontAwesome'; // <-- NEW: brand logos live here

import ContaclessIcon from '../assets/icons/contactless.svg';

type Props = NativeStackScreenProps<RootStackParamList, any>;

type PM = Awaited<ReturnType<typeof getPaymentMethods>>[number];

// --------- Brand utils ----------
const normalizeBrand = (b?: string) =>
  (b || '').toLowerCase().replace(/\s+/g, '_');

const brandTheme = (brand?: string) => {
  switch (normalizeBrand(brand)) {
    case 'visa':
      return { bg: '#1A1F71', fg: '#FFFFFF', sub: '#E5E7EB' };
    case 'mastercard':
      return { bg: '#000000', fg: '#FFFFFF', sub: '#D1D5DB' };
    case 'american_express':
    case 'amex':
      return { bg: '#2E77BC', fg: '#FFFFFF', sub: '#E5E7EB' };
    case 'discover':
      return { bg: '#F58220', fg: '#1F2937', sub: '#1F2937' };
    case 'maestro':
      return { bg: '#0A4982', fg: '#FFFFFF', sub: '#E5E7EB' };
    default:
      return { bg: '#111827', fg: '#FFFFFF', sub: '#D1D5DB' };
  }
};

/** BrandMark
 * Uses FontAwesome's "cc-*" icons for Visa/Mastercard/Amex/Discover.
 * Maestro is drawn with overlapping circles.
 */
const BrandMark = ({
  brand,
  size = 28,
  color = '#FFFFFF',
}: {
  brand?: string;
  size?: number;
  color?: string;
}) => {
  const b = normalizeBrand(brand);

  if (b === 'visa') return <FAIcon name="cc-visa" size={size} color={color} />;
  if (b === 'mastercard')
    return <FAIcon name="cc-mastercard" size={size} color={color} />;
  if (b === 'american_express' || b === 'amex')
    return <FAIcon name="cc-amex" size={size} color={color} />;
  if (b === 'discover')
    return <FAIcon name="cc-discover" size={size} color={color} />;

  // Maestro (custom mark)
  if (b === 'maestro') {
    const r = Math.round(size * 0.42);
    const d = r * 2;
    return (
      <View
        style={{
          width: d + r,
          height: d,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: d,
            height: d,
            borderRadius: r,
            backgroundColor: '#00A2E5',
            marginRight: -r * 0.6,
          }}
        />
        <View
          style={{
            width: d,
            height: d,
            borderRadius: r,
            backgroundColor: '#EB001B',
          }}
        />
      </View>
    );
  }

  // Fallback icon
  return <FAIcon name="credit-card" size={size} color={color} />;
};

const Badge = ({ label }: { label: string }) => (
  <View
    style={{
      backgroundColor: '#ECFDF5',
      borderColor: '#10B981',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    }}
  >
    <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '600' }}>
      {label}
    </Text>
  </View>
);

// ---------- Rows ----------
/** Premium card — ONLY for the default method */
const PremiumCardRow = ({
  pm,
  onDelete,
  working,
}: {
  pm: PM;
  onDelete: (id: string) => void;
  working?: boolean;
}) => {
  const exp = `${String(pm.expMonth).padStart(2, '0')}/${String(
    pm.expYear,
  ).slice(-2)}`;
  const theme = brandTheme(pm.brand);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }}
      >
        <View
          style={{
            backgroundColor: theme.bg,
            borderRadius: 16,
            padding: spacing.lg,
          }}
        >
          {/* subtle blobs */}
          <View
            style={{
              position: 'absolute',
              right: -30,
              top: -20,
              width: 140,
              height: 140,
              backgroundColor: '#ffffff20',
              borderRadius: 100,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: -50,
              bottom: -50,
              width: 180,
              height: 180,
              backgroundColor: '#00000020',
              borderRadius: 120,
            }}
          />

          {/* top row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <BrandMark brand={pm.brand} size={30} color={theme.fg} />
            <Badge label="Default" />
          </View>

          {/* chip + contactless */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.md,
            }}
          >
            {/* Chip */}
            <View
              style={{
                width: 38,
                height: 28,
                borderRadius: 6,
                backgroundColor: theme.sub,
                marginRight: spacing.xs,
              }}
            />
            {/* Contactless logo */}
            <ContaclessIcon width={34} height={30} fill={theme.sub} />
          </View>

          {/* number */}
          <View style={{ marginTop: spacing.lg }}>
            <Text
              style={{
                letterSpacing: 2,
                color: theme.fg,
                fontWeight: '700',
                fontSize: 18,
              }}
            >
              •••• •••• •••• {pm.last4}
            </Text>
          </View>

          {/* footer */}
          <View
            style={{
              marginTop: spacing.md,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: theme.sub, fontSize: 10, marginBottom: 2 }}>
                CARDHOLDER
              </Text>
              <Text style={{ color: theme.fg, fontWeight: '600' }}>
                Verblizr User
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.sub, fontSize: 10, marginBottom: 2 }}>
                EXPIRES
              </Text>
              <Text style={{ color: theme.fg, fontWeight: '700' }}>{exp}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* action: allow remove (cannot set default because it already is) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginTop: spacing.md,
        }}
      >
        <TouchableOpacity
          disabled={working}
          onPress={() => onDelete(pm.id)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            opacity: working ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FeatherIcon name="trash-2" size={16} color={colors.textPrimary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '700',
              marginLeft: 8,
            }}
          >
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Simple list row — for non-default methods */
const SimpleListRow = ({
  pm,
  onSetDefault,
  onDelete,
  working,
}: {
  pm: PM;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  working?: boolean;
}) => {
  const exp = `${String(pm.expMonth).padStart(2, '0')}/${String(
    pm.expYear,
  ).slice(-2)}`;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        marginBottom: spacing.md,
        backgroundColor: '#FFF',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <BrandMark brand={pm.brand} size={22} color={colors.textPrimary} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.textPrimary,
            }}
          >
            {pm.brand?.toUpperCase() || 'CARD'} •••• {pm.last4}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            Expires {exp}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: 12,
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          disabled={working}
          onPress={() => onSetDefault(pm.id)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: '#111827',
            opacity: working ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MIcon name="star" size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 8 }}>
            Set default
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={working}
          onPress={() => onDelete(pm.id)}
          style={{
            marginLeft: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            opacity: working ? 0.6 : 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FeatherIcon name="trash-2" size={16} color={colors.textPrimary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: '700',
              marginLeft: 8,
            }}
          >
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PaymentMethodScreen: React.FC<Props> = ({ navigation: _ }) => {
  const { confirmSetupIntent } = useStripe();
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingRow, setWorkingRow] = useState<string | null>(null);
  const [methods, setMethods] = useState<PM[]>([]);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardholder, setCardholder] = useState('');

  const hasMethods = useMemo(() => methods && methods.length > 0, [methods]);

  async function load() {
    try {
      setListLoading(true);
      const data = await getPaymentMethods();
      setMethods(data);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not load payment methods.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onSetDefault = async (id: string) => {
    try {
      setWorkingRow(id);
      await apiSetDefaultPM(id);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not set default card.');
    } finally {
      setWorkingRow(null);
    }
  };

  const onDelete = async (id: string) => {
    Alert.alert('Remove card?', 'You can add it again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            setWorkingRow(id);
            await apiDeletePM(id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not remove card.');
          } finally {
            setWorkingRow(null);
          }
        },
      },
    ]);
  };

  const onSaveNew = async () => {
    try {
      if (!cardComplete) {
        Alert.alert('Card details', 'Please enter complete card details.');
        return;
      }
      setSaving(true);

      // 1) Create SetupIntent on backend
      const { clientSecret } = await requestSetupIntent();

      // 2) Confirm on-device to save card
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: cardholder || undefined,
          },
        },
      });

      if (error) {
        Alert.alert('Payment error', error.message || 'Could not save card.');
        return;
      }

      // 3) Make newly saved card default
      const pmId = setupIntent?.paymentMethodId;
      if (pmId) {
        await apiSetDefaultPM(pmId);
      }

      // 4) Refresh list + reset form
      setCardholder('');
      setCardComplete(false);
      await load();

      Alert.alert('Card Saved', 'Your card is now saved for future charges.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not save card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[g.screen]} edges={['bottom']}>
      <AppBackground>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding' })}
          style={{ flex: 1 }}
          keyboardVerticalOffset={
            (Platform.select({ ios: 24, android: 0 }) as number) || 0
          }
        >
          <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
            {/* Header */}
            <Text style={[g.title, { marginBottom: 6 }]}>Payment methods</Text>
            <Text style={[g.subtitle, { marginBottom: spacing.lg }]}>
              We only charge after a conversation ends based on its duration.
              Add a card so payments run automatically.
            </Text>

            {/* Saved cards */}
            <Text style={[g.label, { marginBottom: spacing.sm }]}>
              Saved cards
            </Text>
            {listLoading ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator />
              </View>
            ) : hasMethods ? (
              <View style={{ marginBottom: spacing.lg }}>
                {methods.map(pm =>
                  pm.isDefault ? (
                    <PremiumCardRow
                      key={pm.id}
                      pm={pm}
                      onDelete={onDelete}
                      working={workingRow === pm.id}
                    />
                  ) : (
                    <SimpleListRow
                      key={pm.id}
                      pm={pm}
                      onSetDefault={onSetDefault}
                      onDelete={onDelete}
                      working={workingRow === pm.id}
                    />
                  ),
                )}
              </View>
            ) : (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: spacing.lg,
                }}
              >
                <Text style={{ color: '#6B7280' }}>
                  No cards yet. Add one below.
                </Text>
              </View>
            )}

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: '#E5E7EB',
                marginVertical: spacing.md,
              }}
            />

            {/* Add new card */}
            <Text style={[g.label, { marginBottom: spacing.xs }]}>
              Add a new card
            </Text>
            <TextInput
              placeholder="Name on card (optional)"
              value={cardholder}
              onChangeText={setCardholder}
              style={[g.input, { marginBottom: spacing.sm }]}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <View
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 8,
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

            <TouchableOpacity
              onPress={onSaveNew}
              disabled={saving || !cardComplete}
              style={[
                g.buttonPrimary,
                {
                  marginTop: spacing.md,
                  opacity: saving || !cardComplete ? 0.7 : 1,
                },
              ]}
            >
              <Text style={g.buttonPrimaryText}>
                {saving ? 'Saving…' : 'Save card'}
              </Text>
            </TouchableOpacity>

            {/* Footer note */}
            <Text
              style={{ fontSize: 12, color: '#6B7280', marginTop: spacing.md }}
            >
              Cards are saved securely by Stripe. You’ll be charged
              automatically when a conversation ends.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppBackground>
      {/* Sticky Footer */}
      <Footer />
    </SafeAreaView>
  );
};

export default PaymentMethodScreen;
