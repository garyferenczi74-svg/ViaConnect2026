// Prompt #93 Phase 3: inline upgrade-prompt card used by FeatureGate when
// a feature resolves disabled with gate_behavior = 'upgrade_prompt'. Unlike
// UpgradePromptModal (which is triggered explicitly), this card renders in
// place where the locked feature would have lived.

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { FlagEvaluationReason } from '@/types/flags';
import { upgradePromptCopyForReason } from '@/lib/flags/upgrade-prompt-copy';

interface UpgradePromptCardProps {
  featureId: string;
  reason: FlagEvaluationReason;
  requiredTier?: number;
  compact?: boolean;
}

export function UpgradePromptCard({
  featureId,
  reason,
  requiredTier,
  compact = false,
}: UpgradePromptCardProps) {
  const copy = upgradePromptCopyForReason({ reason, requiredTier });
  const Icon = copy.icon;

  const padding = compact ? 'p-3' : 'p-5';
  const iconSize = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconStroke = compact ? 'h-4 w-4' : 'h-5 w-5';
  const heading = compact ? 'text-sm' : 'text-base';
  const description = compact ? 'text-xs' : 'text-sm';

  return (
    <div
      data-feature-id={featureId}
      data-feature-reason={reason}
      className={`rounded-2xl border border-white/[0.08] bg-[#1A2744]/80 backdrop-blur ${padding}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex ${iconSize} items-center justify-center rounded-xl bg-[#E8803A]/20 flex-none`}>
          <Icon className={`${iconStroke} text-[#E8803A]`} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${heading} font-semibold text-white`}>{copy.heading}</p>
          <p className={`${description} text-white/70 mt-1 leading-relaxed`}>{copy.description}</p>
          {copy.cta ? (
            <Link
              href={copy.cta.href}
              className={`inline-flex items-center gap-1.5 mt-3 rounded-xl bg-[#2DA5A0] text-[#0B1520] ${
                compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
              } font-semibold hover:bg-[#2DA5A0]/90`}
            >
              {copy.cta.label}
              <ArrowUpRight className={compact ? 'h-3 w-3' : 'h-4 w-4'} strokeWidth={1.5} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

