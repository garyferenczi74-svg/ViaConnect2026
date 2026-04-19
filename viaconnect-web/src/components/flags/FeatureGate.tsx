// Prompt #93 Phase 3: server component flag wrapper.
//
// Usage:
//   <FeatureGate featureId="advanced_analytics">
//     <AnalyticsPanel />
//   </FeatureGate>
//
// Renders the children when the flag resolves enabled, otherwise renders per
// the feature's gate_behavior:
//   hide            → nothing (or optional fallback)
//   upgrade_prompt  → UpgradePromptCard (if showUpgradePrompt), else fallback
//   preview         → children dimmed with an overlay card
//   read_only       → children rendered but pointer-events disabled
//
// Server-only. No flicker because evaluation happens during render.

import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { evaluateFlagCached } from '@/lib/flags/cache';
import { UpgradePromptCard } from '@/components/pricing/UpgradePromptCard';

interface FeatureGateProps {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export async function FeatureGate({
  featureId,
  children,
  fallback,
  showUpgradePrompt = false,
}: FeatureGateProps) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const evaluation = await evaluateFlagCached(userId, featureId);

  if (evaluation.enabled) {
    return <>{children}</>;
  }

  switch (evaluation.gateBehavior) {
    case 'hide':
      return fallback ? <>{fallback}</> : null;

    case 'upgrade_prompt':
      if (showUpgradePrompt) {
        return (
          <UpgradePromptCard
            featureId={featureId}
            reason={evaluation.reason}
            requiredTier={evaluation.metadata?.requiredTier}
          />
        );
      }
      return fallback ? <>{fallback}</> : null;

    case 'preview':
      return (
        <div className="relative">
          <div className="pointer-events-none select-none opacity-50">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <UpgradePromptCard
              featureId={featureId}
              reason={evaluation.reason}
              requiredTier={evaluation.metadata?.requiredTier}
              compact
            />
          </div>
        </div>
      );

    case 'read_only':
      return (
        <div className="pointer-events-none cursor-not-allowed" aria-disabled>
          {children}
        </div>
      );

    default:
      return fallback ? <>{fallback}</> : null;
  }
}
