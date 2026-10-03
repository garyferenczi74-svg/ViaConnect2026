"use client";

import { useCallback, useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BIOMETRIC_LOCK_KEY, readOptIn } from "@/lib/native/device-preferences";
import { refreshNativePushIfOptedIn } from "@/lib/native/push-registration";
import { verifyAppLock } from "@/lib/native/biometric-lock";

export function BiometricLockGate() {
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    setBusy(true);
    setNote(null);
    const result = await verifyAppLock();
    setBusy(false);
    if (result === "ok") {
      setLocked(false);
      return;
    }
    setNote(
      result === "unavailable"
        ? "Face ID or a fingerprint is not available. Sign in with your password."
        : "That check did not succeed. Sign in with your password.",
    );
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void refreshNativePushIfOptedIn();
    if (!readOptIn(window.localStorage, BIOMETRIC_LOCK_KEY)) return;
    setLocked(true);
    void unlock();

    const handle = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      if (!readOptIn(window.localStorage, BIOMETRIC_LOCK_KEY)) return;
      setLocked(true);
      void unlock();
    });
    return () => {
      void handle.then((listener) => listener.remove());
    };
  }, [unlock]);

  async function usePassword() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1120] p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="app-lock-title">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1E3054] p-6 text-white">
        <div className="mb-3 flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} aria-hidden />
          <h2 id="app-lock-title" className="text-lg font-semibold">Unlock ViaConnect</h2>
        </div>
        <p className="text-sm text-white/65">
          Confirm with Face ID or your fingerprint. If that does not work, use your password.
        </p>
        {note ? <p className="mt-3 text-sm text-[#E8A87C]" role="status">{note}</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => { void unlock(); }}
            disabled={busy}
            className="min-h-[44px] flex-1 rounded-xl bg-[#2DA5A0] text-sm font-semibold text-[#0B1120] disabled:opacity-50"
          >
            {busy ? "Waiting..." : "Unlock"}
          </button>
          <button
            type="button"
            onClick={() => { void usePassword(); }}
            className="min-h-[44px] flex-1 rounded-xl border border-white/15 text-sm text-white/85"
          >
            Use password
          </button>
        </div>
      </div>
    </div>
  );
}
