// Feature flag registry for ViaConnect.
// All flags default to false unless overridden by environment variable
// or per-user override in Supabase (future: feature_flag_overrides table).

export interface FlagDef {
  readonly default: boolean;
  readonly description: string;
}

export const FLAG_REGISTRY: Record<string, FlagDef> = {
  // ── Hannah Ultrathink™ (Prompt #88) ──
  hannah_ultrathink_enabled: {
    default: false,
    description: 'Enable Hannah Ultrathink reasoning tier.',
  },
  hannah_ultrathink_auto_escalate: {
    default: false,
    description: 'Let the router auto-escalate complex queries to Ultrathink.',
  },
  hannah_avatar_enabled: {
    default: false,
    description: 'Show the "Talk to Hannah" avatar launcher.',
  },
  hannah_avatar_baa_confirmed: {
    default: false,
    description:
      'Flip to true only after Tavus BAA is signed AND user consents to PHI-in-avatar context.',
  },
  hannah_evidence_footer_enabled: {
    default: false,
    description: 'Render source citations under Ultrathink answers.',
  },

  // ── Nutrition Insights (Prompt #192) ──
  insights_hannah_surfacing: {
    default: false,
    description: 'Surface Gordon nutrition insights inside Hannah conversations.',
  },
  insights_helix_award: {
    default: false,
    description: 'Award Helix points for the first weekly insights digest review each ISO week.',
  },

  // ── Connected Sources / Hume Body Pod (Prompt #201) ──
  native_health_bridge: {
    default: false,
    description:
      'Native HealthKit / Health Connect connect controls in the Capacitor shell. Off until the native plugin ships.',
  },

  // ── Google Health API connector (Prompt #201b) ──
  google_health_connector: {
    default: false,
    description:
      'Google Health API web OAuth connector (Fitbit / Pixel Watch and others). Off until Google Cloud credentials are provisioned and the connector is verified in staging.',
  },

  // Store launch VIA-10. Off until Gary applies the consent migration and sets the env var.
  ai_third_party_consent_gate: {
    default: false,
    description:
      'Require a recorded agree choice before routes send personal data to third-party AI, and show the matching in-app disclosures. Set AI_THIRD_PARTY_CONSENT_GATE=true after the consent migration is applied.',
  },

  // Gary 2026-10-03: naturopath is a credential on the practitioner account.
  // Default off. Opening /naturopath/* also requires verification_status
  // verified. See src/lib/auth/naturopath-credential.ts.
  // Store support: Apple 5.1.1 (permission) and 5.1.3 (health data),
  // Google Play User Data / Data safety. Not a self-serve role grant.
  naturopath_credential_portal_access: {
    default: false,
    description:
      'Allow a practitioner with a verified naturopath credential to open /naturopath/*. Off until Gary sets NATUROPATH_CREDENTIAL_PORTAL_ACCESS=true. Unverified credentials never open the portal.',
  },

  // Store launch VIA-11. Registry default stays false (web-safe).
  // The Capacitor shell turns the system browser on unless
  // NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER is 0 or false.
  // See nativeSystemBrowserOAuthEnabled in src/lib/auth/native-oauth.ts.
  // Apple 4.8, Apple 5.1.1(vii), Google OAuth secure-browser policy.
  native_oauth_system_browser: {
    default: false,
    description:
      'On the Capacitor shell, open Google and Apple sign-in in the system browser and return through the app URL scheme. The shell defaults this on because in-WebView OAuth is blocked. Set NEXT_PUBLIC_NATIVE_OAUTH_SYSTEM_BROWSER=0 to use the in-WebView path. Web sign-in ignores this flag. This registry default stays false.',
  },
} as const;

/**
 * Check whether a feature flag is enabled.
 *
 * Resolution order:
 *   1. Environment variable (UPPER_SNAKE_CASE), e.g. HANNAH_ULTRATHINK_ENABLED=true
 *   2. Registry default (always false for new flags)
 *
 * `_userId` is accepted for future per-user overrides but currently unused.
 */
export function isFeatureEnabled(flag: string, _userId?: string): boolean {
  const envKey = flag.toUpperCase();
  const envVal = process.env[envKey];
  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }
  return FLAG_REGISTRY[flag]?.default ?? false;
}
