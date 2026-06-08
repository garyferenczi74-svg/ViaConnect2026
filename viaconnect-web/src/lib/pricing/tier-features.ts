// Canonical membership tier feature bullets. Single source of truth shared by
// every public surface that lists plan features: the /pricing PricingTierGrid
// and the post-CAQ Choose Your Plan grid in onboarding. Holding the copy here
// means the two surfaces cannot drift apart (Prompt 177j follow-up: reconcile
// the onboarding bullets to the cleared /pricing copy, dropping the stale
// "ViaTokens" wording in favor of the canonical "Helix Rewards" branding).
//
// The membership_tiers table stays the source of truth for prices, names, and
// the tier set; this module holds only the per-tier feature copy the table
// does not store.
export const TIER_FEATURES: Record<string, string[]> = {
  free: [
    'CAQ assessment',
    'Basic Bio Optimization Score (72% confidence)',
    'Static protocol recommendation',
    'Shop at MSRP',
    'Research Hub (read only)',
    'Annual CAQ reassessment',
  ],
  gold: [
    'Everything in Free',
    'Unlimited Hannah interactions',
    'Dynamic Bio Optimization Score tracking',
    '40 day automatic reassessment',
    'Lab data integration (86% confidence)',
    'Nutrition logging with AI analysis',
    'Supplement adherence tracking',
    'Wearable integration (1 device)',
    'Helix Rewards earning and redemption',
    'Subscription discount, 10% off MSRP',
    'Priority email support',
  ],
  platinum: [
    'Everything in Gold',
    'GeneX360 genetic data integration',
    '96% confidence recommendations',
    'Genetic variant explorer',
    'Flagship SKU protocol recommendations',
    'Multiple wearable integration',
    'Practitioner integration',
    'Priority Hannah response times',
    'Advanced analytics and predictive modeling',
    'Subscription discount, 15% off MSRP',
    'Helix Rewards Platinum tier (5x multiplier)',
  ],
  platinum_family: [
    'Everything in Platinum for up to 2 adults',
    'Family Wellness Dashboard',
    'Family protocol coordination',
    'Family health history tracking',
    'Quarterly family wellness consultations',
    '25% family GeneX360 discount',
    'Sproutables product integration',
    'Family Helix Rewards pool',
    'Family shared billing',
    'Dedicated family account manager',
  ],
};
