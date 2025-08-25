// ~/verblizerRN/index.js
//Registers the app and (as we set up) wraps the whole tree with SafeAreaProvider so anything using safe‑area (like the drawer padding) has context.

import 'react-native-gesture-handler'; // must be FIRST
import 'react-native-reanimated'; // ensures Worklets init

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// ✅ Added: SafeAreaProvider at the absolute top of the tree
// This provides safe-area context for useSafeAreaInsets() and <SafeAreaView/>
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Root wraps <App/> with SafeAreaProvider so any screen or navigator
 * can safely read notch/status-bar insets without crashing.
 */
const Root = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

AppRegistry.registerComponent(appName, () => Root);
