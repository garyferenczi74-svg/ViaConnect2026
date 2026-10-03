"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint, Bell } from "lucide-react";
import {
  BIOMETRIC_LOCK_KEY,
  PUSH_OPT_IN_KEY,
  readOptIn,
  writeOptIn,
} from "@/lib/native/device-preferences";
import {
  disableNativePushOptIn,
  enableNativePushAfterDisclosure,
} from "@/lib/native/push-registration";

export function DeviceNativeSettings() {
  const [native, setNative] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState<"biometric" | "push" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const shell = Capacitor.isNativePlatform();
    setNative(shell);
    if (!shell) return;
    setBiometricOn(readOptIn(window.localStorage, BIOMETRIC_LOCK_KEY));
    setPushOn(readOptIn(window.localStorage, PUSH_OPT_IN_KEY));
  }, []);

  async function toggleBiometric() {
    setMessage(null);
    if (!native) return;
    if (biometricOn) {
      writeOptIn(window.localStorage, BIOMETRIC_LOCK_KEY, false);
      setBiometricOn(false);
      return;
    }
    setBusy("biometric");
    const { verifyAppLock } = await import("@/lib/native/biometric-lock");
    const result = await verifyAppLock();
    setBusy(null);
    if (result !== "ok") {
      writeOptIn(window.localStorage, BIOMETRIC_LOCK_KEY, false);
      setBiometricOn(false);
      setMessage(
        result === "unavailable"
          ? "Face ID or a fingerprint is not available on this device. You can keep signing in with your password."
          : "The check did not succeed. App lock stays off. Sign in with your password as usual.",
      );
      return;
    }
    writeOptIn(window.localStorage, BIOMETRIC_LOCK_KEY, true);
    setBiometricOn(true);
  }

  async function togglePush() {
    setMessage(null);
    if (!native) return;
    if (pushOn) {
      setBusy("push");
      await disableNativePushOptIn();
      setBusy(null);
      setPushOn(false);
      return;
    }
    setBusy("push");
    const result = await enableNativePushAfterDisclosure();
    setBusy(null);
    if (!result.ok) {
      setPushOn(false);
      setMessage(
        result.reason === "denied"
          ? "The system prompt was not allowed. Device alerts stay off."
          : "This device could not register yet. Alerts stay off until registration succeeds. Firebase and Apple push keys are added later by the team.",
      );
      return;
    }
    setPushOn(true);
  }

  return (
    <section className="mb-6 space-y-4" aria-labelledby="device-native-heading">
      <div>
        <h3 id="device-native-heading" className="text-base font-bold text-white">
          On this device
        </h3>
        <p className="mt-1 text-sm text-white/55">
          These controls are optional. They stay off until you turn them on.
        </p>
      </div>

      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">App lock</h4>
            <p className="mt-1 text-sm text-white/60">
              When this is on, ViaConnect asks for Face ID or your fingerprint each time you open or return to the app. ViaConnect does not store a face or fingerprint. If the check does not succeed, you sign in with your password.
            </p>
            {native ? (
              <button
                type="button"
                onClick={() => { void toggleBiometric(); }}
                disabled={busy !== null}
                className="mt-3 min-h-[44px] w-full rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-[#0B1120] disabled:opacity-50 sm:w-auto"
                aria-pressed={biometricOn}
              >
                {busy === "biometric" ? "Checking..." : biometricOn ? "Turn app lock off" : "Turn app lock on"}
              </button>
            ) : (
              <p className="mt-3 text-sm text-white/45">
                App lock is available in the iOS and Android app. This browser uses your password sign-in.
              </p>
            )}
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white">Device alerts</h4>
            <p className="mt-1 text-sm text-white/60">
              Device alerts are optional. If you turn them on, ViaConnect registers this phone so it can deliver order, shipping, and protocol alerts you enable below. This registration is not used to send promotions. You can deny the system prompt.
            </p>
            {native ? (
              <button
                type="button"
                onClick={() => { void togglePush(); }}
                disabled={busy !== null}
                className="mt-3 min-h-[44px] w-full rounded-xl border border-white/15 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
                aria-pressed={pushOn}
              >
                {busy === "push" ? "Working..." : pushOn ? "Turn device alerts off" : "Turn on device alerts"}
              </button>
            ) : (
              <p className="mt-3 text-sm text-white/45">
                Device alerts register from the iOS or Android app. Email preferences on this page still apply in the browser.
              </p>
            )}
          </div>
        </div>
      </article>

      {message ? (
        <p className="text-sm text-[#E8A87C]" role="status">{message}</p>
      ) : null}
    </section>
  );
}
