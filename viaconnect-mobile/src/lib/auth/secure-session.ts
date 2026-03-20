import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'viaconnect_access_token';
const REFRESH_TOKEN_KEY = 'viaconnect_refresh_token';

/**
 * HIPAA-compliant session storage using expo-secure-store.
 * Tokens are stored in the device Keychain (iOS) / Keystore (Android).
 * Falls back to in-memory on web (SSR/web export).
 */

let memoryStore: Record<string, string> = {};
const isSecureStoreAvailable = Platform.OS !== 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(key, value);
  } else {
    memoryStore[key] = value;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(key);
  }
  return memoryStore[key] ?? null;
}

async function removeItem(key: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(key);
  } else {
    delete memoryStore[key];
  }
}

export const secureSession = {
  async saveTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, accessToken),
      setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async getTokens() {
    const [accessToken, refreshToken] = await Promise.all([
      getItem(ACCESS_TOKEN_KEY),
      getItem(REFRESH_TOKEN_KEY),
    ]);
    return { accessToken, refreshToken };
  },

  async clearTokens() {
    await Promise.all([
      removeItem(ACCESS_TOKEN_KEY),
      removeItem(REFRESH_TOKEN_KEY),
    ]);
    memoryStore = {};
  },
};

/**
 * Custom storage adapter for Supabase auth that uses SecureStore
 * instead of AsyncStorage for HIPAA compliance.
 */
export const supabaseSecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await removeItem(key);
  },
};
