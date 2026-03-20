import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ViaConnect GeneX360',
  slug: 'viaconnect',
  scheme: 'viaconnect',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#111827',
  },
  ios: {
    bundleIdentifier: 'com.farmceutica.viaconnect',
    buildNumber: '1',
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        'ViaConnect uses the camera to scan supplement barcodes and GeneX360 kit QR codes.',
      NSFaceIDUsageDescription:
        'ViaConnect uses Face ID for secure biometric authentication.',
      NSPhotoLibraryUsageDescription:
        'ViaConnect accesses your photo library to upload lab result documents.',
      ITSAppUsesNonExemptEncryption: false,
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.farmceutica.viaconnect',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#111827',
    },
    permissions: [
      'CAMERA',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'VIBRATE',
      'RECEIVE_BOOT_COMPLETED',
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'ViaConnect needs camera access to scan barcodes and QR codes.',
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#224852',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Allow ViaConnect to use Face ID for secure login.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    newArchEnabled: true,
    eas: {
      projectId: '',
    },
    router: {
      origin: 'https://viaconnect.app',
    },
  },
  owner: 'farmceutica',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: '',
    fallbackToCacheTimeout: 0,
  },
});
