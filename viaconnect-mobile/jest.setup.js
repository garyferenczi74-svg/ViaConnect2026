/* eslint-disable no-undef */
/**
 * ViaConnect GeneX360 — Jest Setup
 * Global mocks for React Native, Expo, and third-party SDKs.
 */

// ── Expo winter runtime polyfill for Jest ────────────────────────────────
// Expo SDK 55's winter runtime uses dynamic import() which Jest 30 blocks.
// Pre-define all globals that expo/src/winter/runtime.native.ts would install,
// so the lazy getters never fire.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  globalThis.__ExpoImportMetaRegistry = new Map();
}

// ── React Native Reanimated mock ─────────────────────────────────────────
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  const Text = require('react-native').Text;
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: (component) => component,
      addWhitelistedNativeProps: jest.fn(),
      addWhitelistedUIProps: jest.fn(),
    },
    useSharedValue: jest.fn((init) => ({ value: init })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    useDerivedValue: jest.fn((fn) => ({ value: fn() })),
    useAnimatedGestureHandler: jest.fn(),
    withTiming: jest.fn((val) => val),
    withSpring: jest.fn((val) => val),
    withRepeat: jest.fn((val) => val),
    withSequence: jest.fn((...vals) => vals[0]),
    withDelay: jest.fn((_, val) => val),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
      out: jest.fn(() => jest.fn()),
      in: jest.fn(() => jest.fn()),
      cubic: jest.fn(),
    },
    FadeIn: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
    FadeInUp: { duration: jest.fn(() => ({ delay: jest.fn(() => ({ springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) })), springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) })) },
    FadeInDown: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
    FadeInRight: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    Layout: { duration: jest.fn(() => ({})) },
  };
});

// ── Expo Haptics mock ────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

// ── Expo Blur mock ───────────────────────────────────────────────────────
jest.mock('expo-blur', () => {
  const View = require('react-native').View;
  return {
    BlurView: View,
  };
});

// ── Expo Router mock ─────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  Link: ({ children }) => children,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// ── RevenueCat mock ──────────────────────────────────────────────────────
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(() =>
      Promise.resolve({ customerInfo: { entitlements: { active: {} } } }),
    ),
    restorePurchases: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    getCustomerInfo: jest.fn(() =>
      Promise.resolve({ entitlements: { active: {} } }),
    ),
    setLogLevel: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { VERBOSE: 'VERBOSE' },
}));

jest.mock('react-native-purchases-ui', () => ({
  CustomerCenter: () => null,
}));

// ── Supabase mock (uses __mocks__/client.ts adjacent to source) ──────────

// ── Expo Secure Store mock ───────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// ── Expo Notifications mock ──────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// ── AsyncStorage mock ────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

// ── NativeWind / Tailwind mock (passthrough className) ───────────────────
jest.mock('nativewind', () => ({
  styled: (component) => component,
}));

// ── Expo WebBrowser mock ─────────────────────────────────────────────────
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// ── Expo Linking mock ────────────────────────────────────────────────────
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `exp://localhost:8081/${path}`),
  parse: jest.fn(),
}));

// ── Secure Session mock (uses __mocks__/secure-session.ts adjacent to source) ──

// ── Silence console warnings in tests ────────────────────────────────────
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated:') || args[0].includes('NativeWind'))
  ) {
    return;
  }
  originalWarn(...args);
};
