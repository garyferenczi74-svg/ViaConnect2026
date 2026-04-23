import type { CapacitorConfig } from '@capacitor/cli';

// ViaConnect GeneX360 — Capacitor shell for iOS + Google Play Store.
// Strategy: hosted-web shell. The native app loads
// https://viaconnectapp.com in a Capacitor WebView so auth, Hannah AI,
// and all SSR routes work exactly as they do in production. The
// `webDir` pointer is a minimum-viable offline fallback; for a proper
// offline experience in a future iteration, add a static export and
// service worker.
//
// Bundle identifier `com.farmceutica.viaconnect` is chosen to match
// the parent entity (FarmCeutica Wellness LLC) rather than the product
// name because App Store rules tie bundles to developer accounts.
// Change BEFORE first `npx cap add ios` run if the store listing uses
// a different developer entity.

const config: CapacitorConfig = {
  appId: 'com.farmceutica.viaconnect',
  appName: 'ViaConnect',
  webDir: 'public',
  server: {
    url: 'https://viaconnectapp.com',
    androidScheme: 'https',
    allowNavigation: [
      'viaconnectapp.com',
      '*.viaconnectapp.com',
      'nnhkcufyqjojdbvdrpky.supabase.co',
    ],
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'ViaConnect',
    backgroundColor: '#0B1120',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B1120',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0B1120',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B1120',
      overlaysWebView: true,
    },
    App: {
      // Deep-link scheme handled per-platform in native manifests;
      // this is just the Capacitor stub.
    },
  },
};

export default config;
