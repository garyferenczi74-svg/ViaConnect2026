import { useSubscription, type SubscriptionTier } from './useSubscription';

interface FeatureAccess {
  // Consumer features
  canViewFullGenetics: boolean;   // Gold+
  canUseSupplementTracker: boolean; // Gold+
  canEarnViaTokens: boolean;      // Gold+
  canUseAIAdvisor: boolean;       // Platinum+
  canUseInteractionChecker: boolean; // Platinum+
  canViewFullAnalytics: boolean;  // Platinum+
  doubleTokenEarning: boolean;    // Platinum+

  // Practitioner features
  canManagePatients: boolean;     // Practitioner
  canBuildProtocols: boolean;     // Practitioner
  canViewPracticeAnalytics: boolean; // Practitioner

  // General
  maxGeneticVariantsPreview: number; // Free=3, Gold+=unlimited
  tier: SubscriptionTier;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useEntitlements(): FeatureAccess {
  const { tier, isSubscribed, isLoading } = useSubscription();

  const isGoldPlus =
    tier === 'gold' || tier === 'platinum' || tier === 'practitioner';
  const isPlatinumPlus = tier === 'platinum' || tier === 'practitioner';
  const isPractitioner = tier === 'practitioner';

  return {
    canViewFullGenetics: isGoldPlus,
    canUseSupplementTracker: isGoldPlus,
    canEarnViaTokens: isGoldPlus,
    canUseAIAdvisor: isPlatinumPlus,
    canUseInteractionChecker: isPlatinumPlus,
    canViewFullAnalytics: isPlatinumPlus,
    doubleTokenEarning: isPlatinumPlus,

    canManagePatients: isPractitioner,
    canBuildProtocols: isPractitioner,
    canViewPracticeAnalytics: isPractitioner,

    maxGeneticVariantsPreview: isGoldPlus ? Infinity : 3,
    tier,
    isSubscribed,
    isLoading,
  };
}
