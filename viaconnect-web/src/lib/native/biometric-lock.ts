import { Capacitor } from "@capacitor/core";

export type BiometricVerifyResult = "ok" | "unavailable" | "failed";

/**
 * Face ID or fingerprint only. useFallback is false so a failed check
 * returns to the existing password sign-in instead of the device passcode.
 * Never call this on web: the plugin's web build reports success without a check.
 */
export async function verifyAppLock(): Promise<BiometricVerifyResult> {
  if (!Capacitor.isNativePlatform()) return "unavailable";
  const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
  const available = await NativeBiometric.isAvailable({ useFallback: false });
  if (!available.isAvailable) return "unavailable";
  try {
    await NativeBiometric.verifyIdentity({
      reason: "Unlock ViaConnect",
      title: "Unlock ViaConnect",
      subtitle: "Confirm it is you",
      description: "Use Face ID or your fingerprint.",
      negativeButtonText: "Use password",
      useFallback: false,
      maxAttempts: 3,
    });
    return "ok";
  } catch {
    return "failed";
  }
}
