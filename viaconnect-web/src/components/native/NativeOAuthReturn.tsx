"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  finishNativeOAuthReturn,
  parseNativeOAuthCallback,
} from "@/lib/auth/native-oauth";

async function closeSignInBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // The browser is already closed when the user dismissed it.
  }
}

async function onNativeOAuthUrl(url: string): Promise<void> {
  if (parseNativeOAuthCallback(url).status === "ignore") return;
  await closeSignInBrowser();
  const supabase = createClient();
  const outcome = await finishNativeOAuthReturn({
    url,
    storage: window.sessionStorage,
    exchangeCode: async (code) => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return { errorMessage: error ? "failed" : null };
    },
    setSession: async (tokens) => {
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      return { errorMessage: error ? "failed" : null };
    },
  });
  if (outcome.type === "message") {
    toast.error(outcome.message);
    return;
  }
  if (outcome.type === "navigate") {
    window.location.assign(outcome.path);
  }
}

export function NativeOAuthReturn() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removed = false;
    const listener = App.addListener("appUrlOpen", (event) => {
      void onNativeOAuthUrl(event.url);
    });
    void App.getLaunchUrl().then((launch) => {
      if (removed || !launch?.url) return;
      void onNativeOAuthUrl(launch.url);
    });
    return () => {
      removed = true;
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
