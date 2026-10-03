"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  OAUTH_MESSAGES,
  startSocialOAuth,
  type SocialProvider,
} from "@/lib/auth/native-oauth";

const buttonClass =
  "h-10 min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-50";

export function SocialSignInButtons({ nextPath }: { nextPath?: string | null }) {
  const [pending, setPending] = useState(false);

  async function onProvider(provider: SocialProvider) {
    const isNative = Capacitor.isNativePlatform();
    if (pending) return;
    if (isNative) setPending(true);
    try {
      const supabase = createClient();
      const result = await startSocialOAuth({
        provider,
        origin: window.location.origin,
        isNative,
        flagEnv: process.env.NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER,
        nextPath,
        storage: window.sessionStorage,
        supabase: {
          signInWithOAuth: (credentials) => supabase.auth.signInWithOAuth(credentials),
        },
        openSystemBrowser: async (url) => {
          await Browser.open({ url });
        },
      });
      if (!result.ok) toast.error(result.message);
    } catch {
      toast.error(OAUTH_MESSAGES.startFailed);
    } finally {
      if (isNative) setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-gray-500">Or continue with</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { void onProvider("google"); }}
          disabled={pending}
          className={buttonClass}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => { void onProvider("apple"); }}
          disabled={pending}
          className={buttonClass}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.41-3.74 4.25z" />
          </svg>
          Apple
        </button>
      </div>
    </>
  );
}
