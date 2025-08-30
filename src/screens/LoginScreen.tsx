// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { LoginModal, RegisterModal } from '../components/auth';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { AppBackground } from '../components';
import Footer from '../components/Footer';

export default function LoginScreen() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <AppBackground>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* NOTE: transparent bg so gradient shows */}
      <SafeAreaView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        edges={['top', 'bottom']}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl + spacing.md,
          }}
        >
          {/* Logo with superscript */}
          <View style={{ marginTop: spacing.xs }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.textPrimary,
              }}
            >
              V<Text style={{ fontSize: 12, marginTop: -12 }}>1.0</Text>
            </Text>
            <View
              style={{
                height: 2,
                width: 24,
                backgroundColor: colors.black,
                marginTop: spacing.xs,
              }}
            />
          </View>

          {/* Headline & subcopy */}
          <View style={{ marginTop: spacing.xxl }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: colors.brand,
                lineHeight: 24,
              }}
            >
              Welcome {'\n'}to the all new
            </Text>
            <Image
              source={require('../assets/appfooter.png')}
              style={{ width: 180, height: 45, resizeMode: 'contain' }}
            />
            <Text style={{ marginTop: spacing.md, color: '#979797ff' }}>
              Next level of resolving communication{'\n'}gaps with the app.
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Primary actions */}
          <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setLoginOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: colors.black,
                  borderRadius: 14,
                  paddingVertical: spacing.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.white,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert('Soon', 'Quick login coming soon')}
                style={{
                  width: 54,
                  backgroundColor: colors.black,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Quick login"
              >
                <Image 
                  source={require('../assets/faceid.png')} 
                  style={{ width: 24, height: 24, tintColor: colors.white }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setRegisterOpen(true)}
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 14,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}
              >
                Become a client
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modals */}
        <LoginModal visible={loginOpen} onClose={() => setLoginOpen(false)} />
        <RegisterModal
          visible={registerOpen}
          onClose={() => setRegisterOpen(false)}
        />
        <Footer />
      </SafeAreaView>
    </AppBackground>
  );
}
