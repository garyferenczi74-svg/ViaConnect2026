/**
 * ViaConnect GeneX360 — Haptic Feedback Utilities
 *
 * Wraps expo-haptics for consistent haptic feedback across the app.
 * Gracefully degrades on web/unsupported platforms.
 */
import { Platform } from 'react-native';

async function getHaptics() {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-haptics');
  } catch {
    return null;
  }
}

/** Light tap — button presses, selections */
export async function hapticLight() {
  const Haptics = await getHaptics();
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — card expand, tab switch */
export async function hapticMedium() {
  const Haptics = await getHaptics();
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy tap — important actions */
export async function hapticHeavy() {
  const Haptics = await getHaptics();
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Success — token earn, achievement unlock, auth success */
export async function hapticSuccess() {
  const Haptics = await getHaptics();
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning — supplement check caution */
export async function hapticWarning() {
  const Haptics = await getHaptics();
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Error — failed action */
export async function hapticError() {
  const Haptics = await getHaptics();
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Selection tick — scrolling through list items */
export async function hapticSelection() {
  const Haptics = await getHaptics();
  Haptics?.selectionAsync();
}
