// Prompt 212: WHOOP Developer API v2 endpoints and scopes.
// Secrets and redirects are read from Vercel env only. Client IDs are never hardcoded.

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v2";

export const WHOOP_SCOPES = [
  "offline",
  "read:profile",
  "read:sleep",
  "read:recovery",
  "read:cycles",
  "read:workout",
  "read:body_measurement",
] as const;

export function getWhoopCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.WHOOP_CLIENT_ID?.trim();
  const clientSecret = process.env.WHOOP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getWhoopRedirectUri(origin: string): string {
  return (
    process.env.WHOOP_REDIRECT_URI?.trim() ||
    `${origin.replace(/\/$/, "")}/api/integrations/whoop/callback`
  );
}

export function isWhoopConfigured(): boolean {
  return getWhoopCreds() !== null && Boolean(process.env.WEARABLE_TOKEN_KEY?.trim());
}
