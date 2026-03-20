import { Platform } from 'react-native';

/** True when running in a web browser */
export const isWeb = Platform.OS === 'web';

/** True when running on iOS */
export const isIOS = Platform.OS === 'ios';

/** True when running on Android */
export const isAndroid = Platform.OS === 'android';

/** True when running on a native mobile platform */
export const isNative = isIOS || isAndroid;
