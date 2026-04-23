/// <reference types="chrome" />
/**
 * chrome.identity OAuth wrapper. Real flow lands when OAuth credentials are
 * provisioned in the follow-up prompt. Session-scoped token storage only.
 */

const CLIENT_ID = "marshall-extension";
const AUTH_URL_BASE = "https://via-connect2026.vercel.app/api/extension/oauth/authorize";
const TOKEN_URL = "https://via-connect2026.vercel.app/api/extension/oauth/token";

export async function launchOAuthFlow(): Promise<string | null> {
  const redirectUri = chrome.identity.getRedirectURL("marshall");
  const authUrl = `${AUTH_URL_BASE}?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=precheck`;
  return new Promise((resolve) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        resolve(null);
        return;
      }
      try {
        const url = new URL(responseUrl);
        const code = url.searchParams.get("code");
        if (!code) return resolve(null);
        const r = await fetch(TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        });
        const data = (await r.json()) as { accessToken?: string };
        if (!data.accessToken) return resolve(null);
        await chrome.storage.session.set({ marshallToken: data.accessToken });
        resolve(data.accessToken);
      } catch {
        resolve(null);
      }
    });
  });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.session.remove("marshallToken");
}
