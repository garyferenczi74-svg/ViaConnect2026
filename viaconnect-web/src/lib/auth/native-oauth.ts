// Native Google and Apple sign-in for the Capacitor shell.
//
// Google's OAuth policy requires a secure browser. The embedded WebView
// returns disallowed_useragent. Apple 4.8 requires an equivalent login
// next to Google. Apple 5.1.1(vii) requires a visible Safari view, not a
// hidden one. On iOS, @capacitor/browser presents SFSafariViewController.
// On Android it presents a Chrome Custom Tab.
//
// The web path is unchanged: signInWithOAuth redirects inside the page to
// /api/auth/callback. The Sign in with Apple entitlement is not used,
// because this is the Supabase web provider, not AuthenticationServices.

export const NATIVE_APP_ID = "com.farmceutica.viaconnect";

export const NATIVE_OAUTH_REDIRECT_URL = `${NATIVE_APP_ID}://auth/callback`;

export const NATIVE_OAUTH_HANDLED_KEY = "viaconnect.native-oauth.handled";

export const NATIVE_OAUTH_NEXT_KEY = "viaconnect.native-oauth.next";

export const OAUTH_MESSAGES = {
  cancelled: "Sign-in was cancelled. You can try again.",
  failed: "Google or Apple could not finish sign-in. Try again, or use email and password.",
  startFailed: "Google or Apple could not start sign-in. Try again, or use email and password.",
  browserFailed: "The sign-in page could not open. Try again, or use email and password.",
  incomplete: "Sign-in did not finish. Try again, or use email and password.",
} as const;

export type SocialProvider = "google" | "apple";

export interface SocialOAuthClient {
  signInWithOAuth(credentials: {
    provider: SocialProvider;
    options: {
      redirectTo: string;
      skipBrowserRedirect?: boolean;
    };
  }): Promise<{
    data: { url: string | null };
    error: { message: string } | null;
  }>;
}

export type OAuthCallbackParse =
  | { status: "code"; code: string }
  | { status: "session"; accessToken: string; refreshToken: string }
  | { status: "error"; message: string }
  | { status: "ignore" };

export type OAuthReturnOutcome =
  | { type: "ignore" }
  | { type: "duplicate" }
  | { type: "message"; message: string }
  | { type: "navigate"; path: string };

const CANCELLED_ERRORS = new Set([
  "access_denied",
  "cancelled",
  "canceled",
  "user_cancelled",
  "user_canceled",
  "user_cancelled_authorize",
  "user_canceled_authorize",
]);

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function webOAuthRedirectUrl(origin: string): string {
  const trimmed = origin.replace(/\/+$/, "");
  return `${trimmed}/api/auth/callback`;
}

/**
 * On a native shell the system browser is the default, because the WebView
 * path is rejected by Google. Web always stays on the in-page redirect.
 * `0` or `false` turns the native path off. The registry default in
 * feature-flags.ts stays false so a server check does not enable this.
 */
export function nativeSystemBrowserOAuthEnabled(
  isNative: boolean,
  envValue: string | undefined,
): boolean {
  if (!isNative) return false;
  const normalized = envValue?.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "off") return false;
  return true;
}

export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (path.includes("://")) return false;
  return true;
}

export function stashNativeOAuthNext(
  storage: Pick<Storage, "setItem" | "removeItem">,
  nextPath: string | null,
): void {
  try {
    if (nextPath && isSafeInternalPath(nextPath)) {
      storage.setItem(NATIVE_OAUTH_NEXT_KEY, nextPath);
      return;
    }
    storage.removeItem(NATIVE_OAUTH_NEXT_KEY);
  } catch {
    // Session storage can be unavailable. Sign-in still proceeds.
  }
}

export function takeNativeOAuthNext(
  storage: Pick<Storage, "getItem" | "removeItem">,
): string | null {
  try {
    const value = storage.getItem(NATIVE_OAUTH_NEXT_KEY);
    storage.removeItem(NATIVE_OAUTH_NEXT_KEY);
    if (value && isSafeInternalPath(value)) return value;
    return null;
  } catch {
    return null;
  }
}

export function claimOAuthCallback(
  storage: Pick<Storage, "getItem" | "setItem">,
  url: string,
): boolean {
  try {
    if (storage.getItem(NATIVE_OAUTH_HANDLED_KEY) === url) return false;
    storage.setItem(NATIVE_OAUTH_HANDLED_KEY, url);
    return true;
  } catch {
    return true;
  }
}

function paramsFromHash(url: URL): URLSearchParams {
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  return new URLSearchParams(hash);
}

function messageForOAuthError(errorCode: string): string {
  if (CANCELLED_ERRORS.has(errorCode.trim().toLowerCase())) {
    return OAUTH_MESSAGES.cancelled;
  }
  return OAUTH_MESSAGES.failed;
}

function isAppScheme(url: URL): boolean {
  return url.protocol === `${NATIVE_APP_ID}:`;
}

export function parseNativeOAuthCallback(rawUrl: string): OAuthCallbackParse {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { status: "ignore" };
  }
  if (!isAppScheme(url)) return { status: "ignore" };

  const query = url.searchParams;
  const hash = paramsFromHash(url);
  const error = query.get("error") ?? hash.get("error");
  if (error) {
    return { status: "error", message: messageForOAuthError(error) };
  }

  const code = query.get("code") ?? hash.get("code");
  if (code) return { status: "code", code };

  const accessToken = hash.get("access_token") ?? query.get("access_token");
  const refreshToken = hash.get("refresh_token") ?? query.get("refresh_token");
  if (accessToken && refreshToken) {
    return { status: "session", accessToken, refreshToken };
  }

  const callbackPath = url.host === "auth" && url.pathname.startsWith("/callback");
  if (callbackPath) return { status: "error", message: OAUTH_MESSAGES.incomplete };
  return { status: "ignore" };
}

export async function startSocialOAuth(input: {
  provider: SocialProvider;
  origin: string;
  isNative: boolean;
  flagEnv: string | undefined;
  nextPath?: string | null;
  storage?: KeyValueStorage;
  supabase: SocialOAuthClient;
  openSystemBrowser: (url: string) => Promise<void>;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const native = nativeSystemBrowserOAuthEnabled(input.isNative, input.flagEnv);
  if (native && input.storage) {
    stashNativeOAuthNext(input.storage, input.nextPath ?? null);
  }
  const redirectTo = native
    ? NATIVE_OAUTH_REDIRECT_URL
    : webOAuthRedirectUrl(input.origin);

  let data: { url: string | null };
  let error: { message: string } | null;
  try {
    const result = await input.supabase.signInWithOAuth({
      provider: input.provider,
      options: native
        ? { redirectTo, skipBrowserRedirect: true }
        : { redirectTo },
    });
    data = result.data;
    error = result.error;
  } catch {
    return { ok: false, message: OAUTH_MESSAGES.startFailed };
  }

  if (error) return { ok: false, message: OAUTH_MESSAGES.startFailed };
  if (!native) return { ok: true };

  if (!data.url || !data.url.startsWith("https://")) {
    return { ok: false, message: OAUTH_MESSAGES.startFailed };
  }
  try {
    await input.openSystemBrowser(data.url);
  } catch {
    return { ok: false, message: OAUTH_MESSAGES.browserFailed };
  }
  return { ok: true };
}

export async function finishNativeOAuthReturn(input: {
  url: string;
  storage: KeyValueStorage;
  exchangeCode: (code: string) => Promise<{ errorMessage: string | null }>;
  setSession: (tokens: { accessToken: string; refreshToken: string }) => Promise<{ errorMessage: string | null }>;
}): Promise<OAuthReturnOutcome> {
  const parsed = parseNativeOAuthCallback(input.url);
  if (parsed.status === "ignore") return { type: "ignore" };
  if (!claimOAuthCallback(input.storage, input.url)) return { type: "duplicate" };

  if (parsed.status === "error") {
    return { type: "message", message: parsed.message };
  }

  if (parsed.status === "code") {
    let exchange: { errorMessage: string | null };
    try {
      exchange = await input.exchangeCode(parsed.code);
    } catch {
      return { type: "message", message: OAUTH_MESSAGES.failed };
    }
    if (exchange.errorMessage) return { type: "message", message: OAUTH_MESSAGES.failed };
    const next = takeNativeOAuthNext(input.storage);
    return { type: "navigate", path: next ?? "/login" };
  }

  let session: { errorMessage: string | null };
  try {
    session = await input.setSession({
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    });
  } catch {
    return { type: "message", message: OAUTH_MESSAGES.failed };
  }
  if (session.errorMessage) return { type: "message", message: OAUTH_MESSAGES.failed };
  const next = takeNativeOAuthNext(input.storage);
  return { type: "navigate", path: next ?? "/login" };
}
