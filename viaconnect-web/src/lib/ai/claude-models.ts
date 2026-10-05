/**
 * Canonical Claude model IDs for new Anthropic Messages API calls.
 *
 * Verified 2026-10-05:
 * - https://docs.anthropic.com/en/docs/about-claude/model-deprecations
 * - https://docs.anthropic.com/en/docs/about-claude/models/overview
 * - https://docs.anthropic.com/en/docs/about-claude/models/model-ids-and-versions
 * - https://docs.anthropic.com/en/docs/about-claude/pricing
 *
 * Mapping applied by LM-00:
 * - Retired snapshot claude-sonnet-4-20250514 (retired 2026-06-15) → CLAUDE_SONNET.
 *   Anthropic's recommended replacement is still claude-sonnet-4-6, which is
 *   Active (not sooner than 2027-02-17). This hotfix does not jump to
 *   Sonnet 5.5.
 * - Unlisted claude-sonnet-4-6-20250514 → CLAUDE_SONNET. Dateless 4.6 IDs are
 *   the pinned snapshot; the dated form is not in the published list.
 * - Unlisted claude-opus-4-7-20250520 → CLAUDE_OPUS (claude-opus-4-7).
 * - Haiku 4.5 stays on the listed dated API ID. The alias claude-haiku-4-5
 *   resolves to the same snapshot. Retirement is not sooner than 2026-10-15.
 *   No newer Haiku ID is listed.
 *
 * Existing env overrides (KELSEY_MODEL, HANNAH_LAB_MODEL, ARNOLD_MODEL,
 * HANNAH_ULTRATHINK_MODEL, and similar) stay at their call sites.
 * Deno edge functions cannot import this module; they must copy CLAUDE_SONNET.
 */

/** Active Sonnet 4.6. Documented successor of retired Sonnet 4 (20250514). */
export const CLAUDE_SONNET = 'claude-sonnet-4-6' as const;

/**
 * Listed Claude API ID for Haiku 4.5. Still Active as of 2026-10-05.
 * Alias `claude-haiku-4-5` points at this snapshot.
 */
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001' as const;

/** Listed dateless Opus 4.7 ID. Active; not sooner than 2027-04-16. */
export const CLAUDE_OPUS = 'claude-opus-4-7' as const;
