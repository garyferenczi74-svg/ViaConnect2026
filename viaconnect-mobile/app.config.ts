import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ViaConnect',
  slug: 'viaconnect',
  scheme: 'viaconnect',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#224852',
  },
  ios: {
    bundleIdentifier: 'com.farmceutica.viaconnect',
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: 'Scan your GENEX360 test kit barcode',
      NSFaceIDUsageDescription: 'Secure login with Face ID',
    },
  },
  android: {
    package: 'com.farmceutica.viaconnect',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#224852',
    },
    permissions: ['CAMERA', 'USE_BIOMETRIC', 'RECEIVE_BOOT_COMPLETED'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    ['expo-camera', { cameraPermission: 'Scan GENEX360 barcode' }],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#224852',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
