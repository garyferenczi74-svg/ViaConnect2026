import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FLAG_REGISTRY } from "@/lib/config/feature-flags";
import {
  NATIVE_APP_ID,
  NATIVE_OAUTH_REDIRECT_URL,
  OAUTH_MESSAGES,
  claimOAuthCallback,
  finishNativeOAuthReturn,
  isSafeInternalPath,
  nativeSystemBrowserOAuthEnabled,
  parseNativeOAuthCallback,
  startSocialOAuth,
  stashNativeOAuthNext,
  takeNativeOAuthNext,
  webOAuthRedirectUrl,
  type SocialOAuthClient,
} from "@/lib/auth/native-oauth";

const REPO = path.resolve(__dirname, "../../../..");

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(key: string) { return map.has(key) ? map.get(key) ?? null : null; },
    key() { return null; },
    removeItem(key: string) { map.delete(key); },
    setItem(key: string, value: string) { map.set(key, value); },
  };
}

function oauthClient(url: string | null, error: { message: string } | null = null): {
  client: SocialOAuthClient;
  calls: Array<{ provider: string; redirectTo: string; skipBrowserRedirect?: boolean }>;
} {
  const calls: Array<{ provider: string; redirectTo: string; skipBrowserRedirect?: boolean }> = [];
  return {
    calls,
    client: {
      signInWithOAuth: async (credentials) => {
        calls.push({
          provider: credentials.provider,
          redirectTo: credentials.options.redirectTo,
          skipBrowserRedirect: credentials.options.skipBrowserRedirect,
        });
        return { data: { url }, error };
      },
    },
  };
}

describe("native OAuth redirect URL", () => {
  it("uses the Capacitor app id as the custom scheme", () => {
    const config = readFileSync(path.join(REPO, "capacitor.config.ts"), "utf8");
    expect(config).toContain(`appId: '${NATIVE_APP_ID}'`);
    expect(NATIVE_OAUTH_REDIRECT_URL).toBe("com.farmceutica.viaconnect://auth/callback");
    expect(webOAuthRedirectUrl("https://viaconnectapp.com")).toBe(
      "https://viaconnectapp.com/api/auth/callback",
    );
    expect(webOAuthRedirectUrl("https://viaconnectapp.com/")).toBe(
      "https://viaconnectapp.com/api/auth/callback",
    );
  });

  it("registers that scheme on iOS and Android and does not add the Apple entitlement", () => {
    const plist = readFileSync(path.join(REPO, "ios/App/App/Info.plist"), "utf8");
    const manifest = readFileSync(path.join(REPO, "android/app/src/main/AndroidManifest.xml"), "utf8");
    const strings = readFileSync(path.join(REPO, "android/app/src/main/res/values/strings.xml"), "utf8");
    const entitlements = readFileSync(path.join(REPO, "ios/App/App/App.entitlements"), "utf8");
    expect(plist).toContain("<key>CFBundleURLTypes</key>");
    expect(plist).toContain(`<string>${NATIVE_APP_ID}</string>`);
    expect(manifest).toContain("android.intent.action.VIEW");
    expect(manifest).toContain("@string/custom_url_scheme");
    expect(manifest).toContain('android:host="auth"');
    expect(strings).toContain(`<string name="custom_url_scheme">${NATIVE_APP_ID}</string>`);
    expect(entitlements).not.toContain("applesignin");
  });
});

describe("native vs web OAuth branching", () => {
  it("keeps the web redirect inside the page", async () => {
    const opened: string[] = [];
    const { client, calls } = oauthClient("https://accounts.example/authorize");
    const result = await startSocialOAuth({
      provider: "google",
      origin: "https://viaconnectapp.com",
      isNative: false,
      flagEnv: "1",
      supabase: client,
      openSystemBrowser: async (url) => { opened.push(url); },
    });
    expect(result).toEqual({ ok: true });
    expect(opened).toEqual([]);
    expect(calls).toEqual([{
      provider: "google",
      redirectTo: "https://viaconnectapp.com/api/auth/callback",
      skipBrowserRedirect: undefined,
    }]);
  });

  it("opens the system browser on native by default", async () => {
    const opened: string[] = [];
    const storage = memoryStorage();
    const { client, calls } = oauthClient("https://accounts.example/authorize?provider=apple");
    const result = await startSocialOAuth({
      provider: "apple",
      origin: "https://viaconnectapp.com",
      isNative: true,
      flagEnv: undefined,
      nextPath: "/account",
      storage,
      supabase: client,
      openSystemBrowser: async (url) => { opened.push(url); },
    });
    expect(result).toEqual({ ok: true });
    expect(opened).toEqual(["https://accounts.example/authorize?provider=apple"]);
    expect(calls[0]).toEqual({
      provider: "apple",
      redirectTo: NATIVE_OAUTH_REDIRECT_URL,
      skipBrowserRedirect: true,
    });
    expect(takeNativeOAuthNext(storage)).toBe("/account");
  });

  it("uses the in-page redirect when the native flag is off", async () => {
    const opened: string[] = [];
    const { client, calls } = oauthClient("https://accounts.example/authorize");
    for (const flagEnv of ["0", "false", "off"]) {
      calls.length = 0;
      const result = await startSocialOAuth({
        provider: "google",
        origin: "https://www.viaconnectapp.com",
        isNative: true,
        flagEnv,
        supabase: client,
        openSystemBrowser: async (url) => { opened.push(url); },
      });
      expect(result).toEqual({ ok: true });
      expect(calls[0]?.skipBrowserRedirect).toBeUndefined();
      expect(calls[0]?.redirectTo).toBe("https://www.viaconnectapp.com/api/auth/callback");
    }
    expect(opened).toEqual([]);
  });

  it("does not open a non-https provider URL", async () => {
    const opened: string[] = [];
    const { client } = oauthClient("http://accounts.example/authorize");
    const result = await startSocialOAuth({
      provider: "google",
      origin: "https://viaconnectapp.com",
      isNative: true,
      flagEnv: undefined,
      supabase: client,
      openSystemBrowser: async (url) => { opened.push(url); },
    });
    expect(result).toEqual({ ok: false, message: OAUTH_MESSAGES.startFailed });
    expect(opened).toEqual([]);
  });

  it("reports a browser failure without the provider error text", async () => {
    const { client } = oauthClient("https://accounts.example/authorize", null);
    const result = await startSocialOAuth({
      provider: "google",
      origin: "https://viaconnectapp.com",
      isNative: true,
      flagEnv: "true",
      supabase: client,
      openSystemBrowser: async () => { throw new Error("plugin down"); },
    });
    expect(result).toEqual({ ok: false, message: OAUTH_MESSAGES.browserFailed });
  });
});

describe("native OAuth callback parser", () => {
  it("reads a PKCE code", () => {
    expect(parseNativeOAuthCallback(
      "com.farmceutica.viaconnect://auth/callback?code=abc123",
    )).toEqual({ status: "code", code: "abc123" });
  });

  it("maps cancel and failure to plain language", () => {
    expect(parseNativeOAuthCallback(
      "com.farmceutica.viaconnect://auth/callback?error=access_denied&error_description=raw",
    )).toEqual({ status: "error", message: OAUTH_MESSAGES.cancelled });
    expect(parseNativeOAuthCallback(
      "com.farmceutica.viaconnect://auth/callback?error=user_cancelled_authorize",
    ).status).toBe("error");
    expect(parseNativeOAuthCallback(
      "com.farmceutica.viaconnect://auth/callback#error=server_error&error_description=disallowed_useragent",
    )).toEqual({ status: "error", message: OAUTH_MESSAGES.failed });
  });

  it("reads hash tokens and ignores other URLs", () => {
    expect(parseNativeOAuthCallback(
      "com.farmceutica.viaconnect://auth/callback#access_token=aaa&refresh_token=bbb",
    )).toEqual({ status: "session", accessToken: "aaa", refreshToken: "bbb" });
    expect(parseNativeOAuthCallback("https://viaconnectapp.com/api/auth/callback?code=abc").status).toBe("ignore");
    expect(parseNativeOAuthCallback("com.farmceutica.viaconnect://other").status).toBe("ignore");
    expect(parseNativeOAuthCallback("not a url").status).toBe("ignore");
    expect(parseNativeOAuthCallback("com.farmceutica.viaconnect://auth/callback")).toEqual({
      status: "error",
      message: OAUTH_MESSAGES.incomplete,
    });
  });

  it("rejects external next paths", () => {
    expect(isSafeInternalPath("/dashboard")).toBe(true);
    expect(isSafeInternalPath("//evil.example")).toBe(false);
    expect(isSafeInternalPath("https://evil.example")).toBe(false);
    const storage = memoryStorage();
    stashNativeOAuthNext(storage, "https://evil.example");
    expect(takeNativeOAuthNext(storage)).toBeNull();
  });
});

describe("native OAuth return", () => {
  it("exchanges the code once and lands on the stashed path", async () => {
    const storage = memoryStorage();
    stashNativeOAuthNext(storage, "/pricing");
    const exchangeCode = vi.fn(async () => ({ errorMessage: null }));
    const url = "com.farmceutica.viaconnect://auth/callback?code=pkce";
    const first = await finishNativeOAuthReturn({
      url,
      storage,
      exchangeCode,
      setSession: async () => ({ errorMessage: null }),
    });
    const second = await finishNativeOAuthReturn({
      url,
      storage,
      exchangeCode,
      setSession: async () => ({ errorMessage: null }),
    });
    expect(first).toEqual({ type: "navigate", path: "/pricing" });
    expect(second).toEqual({ type: "duplicate" });
    expect(exchangeCode).toHaveBeenCalledTimes(1);
  });

  it("sends a finished session to /login so middleware can pick the role home", async () => {
    const storage = memoryStorage();
    const outcome = await finishNativeOAuthReturn({
      url: "com.farmceutica.viaconnect://auth/callback?code=pkce",
      storage,
      exchangeCode: async () => ({ errorMessage: null }),
      setSession: async () => ({ errorMessage: "unused" }),
    });
    expect(outcome).toEqual({ type: "navigate", path: "/login" });
  });

  it("does not surface a provider failure string", async () => {
    const outcome = await finishNativeOAuthReturn({
      url: "com.farmceutica.viaconnect://auth/callback?code=pkce",
      storage: memoryStorage(),
      exchangeCode: async () => ({ errorMessage: "invalid grant from supabase" }),
      setSession: async () => ({ errorMessage: null }),
    });
    expect(outcome).toEqual({ type: "message", message: OAUTH_MESSAGES.failed });
  });
});

describe("native OAuth flag", () => {
  it("defaults on only for the native shell", () => {
    expect(FLAG_REGISTRY.native_oauth_system_browser.default).toBe(false);
    expect(nativeSystemBrowserOAuthEnabled(false, undefined)).toBe(false);
    expect(nativeSystemBrowserOAuthEnabled(false, "1")).toBe(false);
    expect(nativeSystemBrowserOAuthEnabled(true, undefined)).toBe(true);
    expect(nativeSystemBrowserOAuthEnabled(true, "1")).toBe(true);
    expect(nativeSystemBrowserOAuthEnabled(true, "0")).toBe(false);
  });

  it("leaves signup on email and password and keeps Apple next to Google on login", () => {
    const login = readFileSync(path.join(REPO, "src/app/(auth)/login/page.tsx"), "utf8");
    const signup = readFileSync(path.join(REPO, "src/app/(auth)/signup/page.tsx"), "utf8");
    expect(login).toContain("SocialSignInButtons");
    expect(login).toContain("signInWithPassword");
    expect(login).not.toContain("skipBrowserRedirect");
    expect(signup).not.toContain("signInWithOAuth");
    expect(signup).not.toContain("SocialSignInButtons");
  });

  it("claims a callback URL only once", () => {
    const storage = memoryStorage();
    const url = "com.farmceutica.viaconnect://auth/callback?code=once";
    expect(claimOAuthCallback(storage, url)).toBe(true);
    expect(claimOAuthCallback(storage, url)).toBe(false);
  });
});
