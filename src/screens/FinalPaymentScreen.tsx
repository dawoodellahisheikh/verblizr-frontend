import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {useWalletPay} from '../hooks/useWalletPay';
import {g} from '../styles/global';
import {spacing} from '../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'FinalPayment'>;

const FinalPaymentScreen: React.FC = () => {
  const nav = useNavigation<NavProp>();
  const route = useRoute();
  const {totalCents = 499} = (route.params as {totalCents?: number}) || {};
  const {pay, isPaying} = useWalletPay();

  const onPay = async () => {
    try {
      await pay(totalCents);
      Alert.alert('Success', 'Payment completed successfully!');
      nav.navigate('Home');
    } catch {
      Alert.alert('Error', 'Payment failed or was cancelled.');
    }
  };

  return (
    <View style={[g.screen, styles.center]}>
      <Text style={g.title}>Final Payment</Text>
      <Text style={g.subtitle}>Total: £{(totalCents / 100).toFixed(2)}</Text>

      <TouchableOpacity
        style={[g.buttonPrimary, styles.btn]}
        onPress={onPay}
        disabled={isPaying}
      >
        <Text style={g.buttonPrimaryText}>
          {isPaying ? 'Processing…' : 'Pay with Apple / Google Pay'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={g.buttonGhost}
        onPress={() => nav.goBack()}
      >
        <Text style={g.buttonGhostText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  btn: {marginTop: spacing.lg, alignSelf: 'stretch'},
});

export default FinalPaymentScreen;