// Prompt #93 Phase 3: pure copy helper for the UpgradePromptCard.
//
// Extracted from the card component so the mapping can be unit-tested
// without needing JSX compilation in Vitest. When a new
// FlagEvaluationReason is added, update the switch below AND update the
// exhaustive test in tests/flag-upgrade-card.test.ts so the new reason
// never silently falls through to the default copy.

import { Clock, CalendarDays, Lock, Shield, UsersRound, type LucideIcon } from 'lucide-react';
import type { FlagEvaluationReason } from '@/types/flags';
import { tierLevelToId, type TierLevel } from '@/types/pricing';

const TIER_DISPLAY: Record<string, string> = {
  free: 'Free',
  gold: 'Gold',
  platinum: 'Platinum',
  platinum_family: 'Platinum+ Family',
};

export interface UpgradePromptCopy {
  icon: LucideIcon;
  heading: string;
  description: string;
  cta: { label: string; href: string } | null;
}

export function upgradePromptCopyForReason(params: {
  reason: FlagEvaluationReason;
  requiredTier?: number;
}): UpgradePromptCopy {
  const { reason, requiredTier } = params;
  const tierName = requiredTier !== undefined
    ? TIER_DISPLAY[tierLevelToId(requiredTier as TierLevel)]
    : 'a higher tier';

  switch (reason) {
    case 'tier_insufficient':
      return {
        icon: Lock,
        heading: `Upgrade to ${tierName}`,
        description: `This feature is part of the ${tierName} membership.`,
        cta: { label: `Upgrade to ${tierName}`, href: '/pricing' },
      };
    case 'requires_family_tier':
      return {
        icon: UsersRound,
        heading: 'Platinum+ Family only',
        description: 'This feature is available on Platinum+ Family memberships.',
        cta: { label: 'Explore Family plans', href: '/pricing?focus=family' },
      };
    case 'requires_genex360':
      return {
        icon: Shield,
        heading: 'GeneX360 purchase required',
        description: 'Unlock this by adding GeneX360 genetic data to your account.',
        cta: { label: 'Order GeneX360', href: '/shop/genex360' },
      };
    case 'launch_phase_not_active':
      return {
        icon: CalendarDays,
        heading: 'Coming soon',
        description: 'This feature is part of an upcoming launch phase; check back after the scheduled activation.',
        cta: null,
      };
    case 'launch_phase_paused':
      return {
        icon: Clock,
        heading: 'Temporarily paused',
        description: 'This feature is paused during a launch adjustment; it will return shortly.',
        cta: null,
      };
    case 'rollout_percentage_excluded':
    case 'not_in_rollout_cohort':
      return {
        icon: Clock,
        heading: 'Rolling out soon',
        description: 'We are rolling this out gradually; it will become available on your account soon.',
        cta: null,
      };
    case 'internal_only_restriction':
      return {
        icon: Shield,
        heading: 'Internal preview',
        description: 'This feature is currently limited to internal staff.',
        cta: null,
      };
    case 'opt_in_not_granted':
      return {
        icon: Clock,
        heading: 'Opt-in required',
        description: 'Turn on early access to try this feature.',
        cta: { label: 'Manage early access', href: '/account/early-access' },
      };
    case 'kill_switch_engaged':
    case 'feature_not_active':
    case 'feature_not_found':
    case 'enabled_normally':
    default:
      return {
        icon: Lock,
        heading: 'Unavailable',
        description: 'This feature is not available right now.',
        cta: null,
      };
  }
}
