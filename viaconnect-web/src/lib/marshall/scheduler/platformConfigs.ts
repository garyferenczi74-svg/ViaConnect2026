// Prompt #125 P3: Central OAuth + webhook config per platform.
//
// Each supported scheduler lists its OAuth endpoints, scope set, signing
// secret env var, and webhook URL. Env vars are read lazily at call time
// so tests can override with process.env without restarting the module.

import type { PlatformOAuthConfig } from './oauth';
import type { SchedulerPlatform } from './types';

export interface PlatformSigningConfig {
  platform: SchedulerPlatform;
  /** Env var holding the webhook signing secret; fetched at call time. */
  signingSecretEnvVar: string;
  /** Env var holding the OAuth client secret; fetched at call time. */
  clientSecretEnvVar: string;
  /** Minimum-necessary scope set per §4. */
  scopes: string[];
}

const APP_BASE_URL_ENV = 'NEXT_PUBLIC_APP_URL';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`env_missing:${name}`);
  return value;
}

function redirectUri(platform: SchedulerPlatform): string {
  const base = process.env[APP_BASE_URL_ENV] ?? 'https://via-connect2026.vercel.app';
  return `${base}/api/marshall/scheduler/oauth/callback/${platform}`;
}

export const PLATFORM_SIGNING: Record<SchedulerPlatform, PlatformSigningConfig> = {
  buffer: {
    platform: 'buffer',
    signingSecretEnvVar: 'BUFFER_WEBHOOK_SIGNING_SECRET',
    clientSecretEnvVar: 'BUFFER_OAUTH_CLIENT_SECRET',
    scopes: ['read:updates', 'read:profiles', 'write:updates'],
  },
  hootsuite: {
    platform: 'hootsuite',
    signingSecretEnvVar: 'HOOTSUITE_WEBHOOK_SIGNING_SECRET',
    clientSecretEnvVar: 'HOOTSUITE_OAUTH_CLIENT_SECRET',
    scopes: ['offline', 'read:own_account', 'read:messages', 'write:messages'],
  },
  later: {
    platform: 'later',
    signingSecretEnvVar: 'LATER_WEBHOOK_SIGNING_SECRET',
    clientSecretEnvVar: 'LATER_OAUTH_CLIENT_SECRET',
    scopes: ['read_posts', 'write_posts'],
  },
  sprout_social: {
    platform: 'sprout_social',
    signingSecretEnvVar: 'SPROUT_WEBHOOK_SIGNING_SECRET',
    clientSecretEnvVar: 'SPROUT_OAUTH_CLIENT_SECRET',
    scopes: ['publishing:read', 'publishing:write'],
  },
  planoly: {
    platform: 'planoly',
    signingSecretEnvVar: 'PLANOLY_WEBHOOK_SIGNING_SECRET',
    clientSecretEnvVar: 'PLANOLY_OAUTH_CLIENT_SECRET',
    scopes: ['read_posts'],
  },
};

const CLIENT_ID_ENV: Record<SchedulerPlatform, string> = {
  buffer: 'BUFFER_OAUTH_CLIENT_ID',
  hootsuite: 'HOOTSUITE_OAUTH_CLIENT_ID',
  later: 'LATER_OAUTH_CLIENT_ID',
  sprout_social: 'SPROUT_OAUTH_CLIENT_ID',
  planoly: 'PLANOLY_OAUTH_CLIENT_ID',
};

const OAUTH_ENDPOINTS: Record<SchedulerPlatform, { authorizationUrl: string; tokenUrl: string; revocationUrl?: string }> = {
  buffer: {
    authorizationUrl: 'https://bufferapp.com/oauth2/authorize',
    tokenUrl: 'https://api.bufferapp.com/1/oauth2/token.json',
    revocationUrl: 'https://api.bufferapp.com/1/oauth2/token',
  },
  hootsuite: {
    authorizationUrl: 'https://platform.hootsuite.com/oauth2/auth',
    tokenUrl: 'https://platform.hootsuite.com/oauth2/token',
  },
  later: {
    authorizationUrl: 'https://app.later.com/oauth/authorize',
    tokenUrl: 'https://app.later.com/oauth/token',
  },
  sprout_social: {
    authorizationUrl: 'https://api.sproutsocial.com/v1/oauth/authorize',
    tokenUrl: 'https://api.sproutsocial.com/v1/oauth/token',
  },
  planoly: {
    authorizationUrl: 'https://api.planoly.com/oauth/authorize',
    tokenUrl: 'https://api.planoly.com/oauth/token',
  },
};

export function getPlatformOAuthConfig(platform: SchedulerPlatform): PlatformOAuthConfig {
  const signing = PLATFORM_SIGNING[platform];
  const endpoints = OAUTH_ENDPOINTS[platform];
  return {
    platform,
    authorizationUrl: endpoints.authorizationUrl,
    tokenUrl: endpoints.tokenUrl,
    revocationUrl: endpoints.revocationUrl,
    clientId: requireEnv(CLIENT_ID_ENV[platform]),
    redirectUri: redirectUri(platform),
    scopes: signing.scopes,
  };
}

export function getClientSecret(platform: SchedulerPlatform): string {
  return requireEnv(PLATFORM_SIGNING[platform].clientSecretEnvVar);
}

export function getWebhookSigningSecret(platform: SchedulerPlatform): string {
  return requireEnv(PLATFORM_SIGNING[platform].signingSecretEnvVar);
}
