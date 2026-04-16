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
} as const;

/**
 * Check whether a feature flag is enabled.
 *
 * Resolution order:
 *   1. Environment variable (UPPER_SNAKE_CASE) — e.g. HANNAH_ULTRATHINK_ENABLED=true
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
