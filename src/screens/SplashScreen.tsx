import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, motion } from '../theme';
import { g } from '../styles/global';
import type { NativeStackScreenProps } from '@react-navigation/native-stack'; // DES Added back: Need navigation props
import { useAuth } from '../context/AuthContext';

// DES Added back: Type for navigation within AuthStack
type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  RegisterPersonal: undefined;
  RegisterPassword: { firstName: string; lastName: string; email: string };
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { token, loading } = useAuth();

  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: motion.dur.base,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        ...motion.spring,
        useNativeDriver: true,
      }),
    ]).start();

    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: motion.dur.fast,
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: motion.dur.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }, motion.delay.base);

    // DES Added back: Navigation logic for non-authenticated users
    let t2: NodeJS.Timeout | undefined;
    if (!loading) {
      t2 = setTimeout(() => {
        // If we're in the AuthStack and not loading, navigate to Login
        // (If user has token, RootDrawer will show authenticated app instead)
        navigation.replace('Login');
      }, motion.delay.handoff);
    }

    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [
    loading,
    token,
    navigation,
    logoOpacity,
    logoScale,
    titleOpacity,
    titleY,
  ]);

  return (
    <LinearGradient colors={colors.splashGradient} style={[g.screen, g.center]}>
      {/* <StatusBar barStyle="dark-content" backgroundColor={colors.bgSoft} /> */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        <Image
          source={require('../assets/logo.png')}
          style={g.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        <Text style={g.title}>VERBLIZR</Text>
        <Text style={g.subtitle}>COMMUNICATE TOGETHER.</Text>
      </Animated.View>
    </LinearGradient>
  );
};

export default SplashScreen;
