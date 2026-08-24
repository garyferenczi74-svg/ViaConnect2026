// Oura Cloud API endpoints and scopes. Secrets are read from Vercel env only.
// No client IDs or placeholders live in this file.

export const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize';
export const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token';
export const OURA_API_BASE = 'https://api.ouraring.com/v2';

export const OURA_SCOPES = [
  'email',
  'personal',
  'daily',
  'heartrate',
  'workout',
  'session',
] as const;

export function getOuraCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.OURA_CLIENT_ID?.trim();
  const clientSecret = process.env.OURA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getOuraRedirectUri(origin: string): string {
  return (
    process.env.OURA_REDIRECT_URI?.trim() ||
    `${origin.replace(/\/$/, '')}/api/integrations/oura/callback`
  );
}

export function isOuraConfigured(): boolean {
  return getOuraCreds() !== null && Boolean(process.env.WEARABLE_TOKEN_KEY?.trim());
}
