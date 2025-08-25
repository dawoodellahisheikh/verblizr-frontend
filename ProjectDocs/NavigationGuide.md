# VerblizrRN — Navigation Architecture

> **Project roots**
>
> - **Frontend:** `~/verblizerRN`
> - **Backend:** `~/verblizr-backend` (not covered here)
>
> This document explains how navigation works in the React Native app, how the drawer and stacks are composed, and where to look when you want to change behavior.

---

## High‑Level Overview

```
The app uses **React Navigation** with a **single Drawer Navigator** at the top and a **Stack Navigator** inside it.

- **Top level:** `RootDrawer` (custom drawer with your own `DrawerContent`)
- **Inside the drawer:** `RootNavigator` (Native Stack) that hosts all screens
- **Providers:** `SafeAreaProvider`, `NavigationContainer`, Stripe/Auth/Voice providers wrap the app

```

index.js
└── <SafeAreaProvider>
└── <App>
└── (providers) StripeProvider → AuthProvider → VoiceSettingsProvider
└── <NavigationContainer>
└── <RootDrawer/> ← Drawer lives here
├── drawerContent: <DrawerContent/>
└── Screen "App": <RootNavigator/> ← Stack lives here

````

The **drawer** handles global navigation and branding; the **stack** switches between actual app screens like **Home**, **Billing**, **PaymentMethods**, **LanguagePair**, etc.

---

## Key Files & Responsibilities

### 1) `src/navigation/RootDrawer.tsx`

**Purpose:** Declares the single **Drawer Navigator** that wraps the entire app tree.

- **Custom drawer UI** via `drawerContent={(props) => <DrawerContent {...props} />}`
- **Safe‑area handling**: `paddingTop: insets.top` so content doesn’t sit under the status bar
- **Width control**: `drawerStyle.width = '80%'` (tweak to taste)
- **(Optional) StatusBar listeners**: you can listen for `drawerOpen`/`drawerClose` if needed

**Typical snippet (simplified):**

```tsx
const Drawer = createDrawerNavigator();

export default function RootDrawer() {
  const insets = useSafeAreaInsets();

  return (
    <Drawer.Navigator
      id="RootDrawer"
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEdgeWidth: 30,
        drawerStyle: {
          paddingTop: insets.top,
          width: '80%',
          backgroundColor: colors?.bg,
        },
      }}
      drawerContent={props => <DrawerContent {...props} />}
    >
      <Drawer.Screen name="App" component={RootNavigator} />
    </Drawer.Navigator>
  );
}
````

### 2) `src/navigation/drawer/RootNavigator.tsx`

**Purpose:** Hosts the **Native Stack** for your app screens.

- Screens include: `Splash`, `Login`, `Home`, `RegisterPersonal`, `RegisterPassword`, `Billing`, `PaymentMethods`, `FinalPayment`, `LanguagePair`, `Checkout`.
- The **burger menu** in `Home` opens the drawer via `navigation.getParent()?.openDrawer()` because the stack is _nested_ inside the drawer.

**Status bar behavior (current):**

- A tiny component `StatusBarOnDrawer` uses `useDrawerStatus()` to **hide the status bar** with a `'slide'` animation **while the drawer is open**, and restores it when closed.

**Typical snippet (simplified):**

```tsx
function StatusBarOnDrawer() {
  const isOpen = useDrawerStatus() === 'open';

  useEffect(() => {
    StatusBar.setHidden(isOpen, 'slide');
    return () => StatusBar.setHidden(false, 'slide');
  }, [isOpen]);

  return null;
}

export default function RootNavigator() {
  return (
    <>
      <StatusBarOnDrawer />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: 'Home',
            headerStyle: { backgroundColor: colors.bg },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.getParent()?.openDrawer()}
                style={{ paddingHorizontal: 12 }}
              >
                <MenuIcon width={24} height={24} />
              </TouchableOpacity>
            ),
          })}
        />
        {/* ...other screens */}
      </Stack.Navigator>
    </>
  );
}
```

### 3) `src/navigation/drawer/DrawerContent.tsx`

**Purpose:** Renders your **custom drawer UI** (profile, nav items, actions).

- You can define items as actions like:
  - `navigate` → go to a screen in the stack
  - `link` → open an external URL
  - `event` → fire custom app logic (e.g., `toggleTheme`, `signOut`)
  - `divider` → visual separation only

**Notes:**

- Keep this component pure UI (no status‑bar side effects).
- If you want different sections or badges, add them here.
- Styling should match the theme set in `src/theme` and `src/styles/global.ts`.

### 4) `App.tsx` and `index.js`

**Purpose:** Wrap the app with global providers and the Navigation container.

- `index.js` registers the app and wraps it with **`SafeAreaProvider`** (required for `useSafeAreaInsets()` to work).
- `App.tsx` typically contains `StripeProvider`, `AuthProvider`, `VoiceSettingsProvider`, and **`NavigationContainer`** that hosts `<RootDrawer/>`.

**Minimal structure:**

```tsx
// index.js
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';
import { name as appName } from './app.json';

const Root = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

AppRegistry.registerComponent(appName, () => Root);
```

```tsx
// App.tsx (simplified)
export default function App() {
  return (
    <StripeProvider publishableKey="pk_test_...">
      <AuthProvider>
        <VoiceSettingsProvider>
          <NavigationContainer>
            <RootDrawer />
          </NavigationContainer>
        </VoiceSettingsProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
```

---

## Navigation Flow (Mermaid Diagram)

```mermaid
flowchart LR
  A[index.js<br/>SafeAreaProvider] --> B(App.tsx)
  B --> C(NavigationContainer)
  C --> D(RootDrawer : DrawerNavigator)
  D -->|drawerContent| E(DrawerContent : custom UI)
  D -->|Screen "App"| F(RootNavigator : Native Stack)
  F --> G[Splash]
  F --> H[Login]
  F --> I[Home]
  F --> J[RegisterPersonal]
  F --> K[RegisterPassword]
  F --> L[Billing]
  F --> M[PaymentMethods]
  F --> N[FinalPayment]
  F --> O[LanguagePair]
  F --> P[Checkout]
```

---

## Common Tasks & Where to Edit

- **Add a new screen:** create the component under `src/screens/`, then register it in `RootNavigator.tsx` with `<Stack.Screen name="YourScreen" component={YourScreen} />`. Add a drawer item in `DrawerContent.tsx` if you want it in the side menu.
- **Change drawer width:** edit `drawerStyle.width` in `RootDrawer.tsx` (e.g., `'70%'`).
- **Hide status bar with drawer:** handled in `RootNavigator.tsx` by `StatusBarOnDrawer` using `useDrawerStatus()` and `'slide'` animation.
- **Open drawer from any stack screen:** use `navigation.getParent()?.openDrawer()` inside screen options or component code.
- **Top padding under status bar:** `paddingTop: insets.top` in `RootDrawer.tsx` ensures the drawer content doesn’t collide with the status bar when visible.

---

## Gotchas & Tips

- **Safe area context:** Ensure `index.js` wraps the app in `<SafeAreaProvider>`; otherwise `useSafeAreaInsets()` will throw.
- **Screen‑level `<StatusBar>`**: Avoid placing `<StatusBar>` inside screens if you want drawer‑driven status‑bar behavior. Screen-level StatusBars can override global settings.
- **Nested navigation:** Opening the drawer from stack screens requires `navigation.getParent()?.openDrawer()` because the stack is nested inside the drawer.
- **Cache when changing nav:** If you hit odd behavior after editing navigation, run `npx react-native start --reset-cache`.

---

## Quick Commands

```bash
# From the frontend root
cd ~/verblizerRN

# Start Metro (with cache clear for nav changes)
npx react-native start --reset-cache
```
