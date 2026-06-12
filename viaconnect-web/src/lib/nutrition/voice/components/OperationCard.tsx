/**
 * Operation preview card per Prompt 170j §11.4 with severity left-4px rule
 * per Hannah's push-back to avoid alarm fatigue, plus the "Less sure"
 * medium-confidence chip per her §11.4 reframing.
 */

'use client';

import {
  Droplet,
  Edit3,
  Minus,
  Plus,
  Settings2,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { readMediumConfidenceThreshold } from '../feature-flags';
import { computeCumulativeImpact, formatImpactPreview } from '../apply/macro-impact';
import type { OperationKind, VoiceOperation } from '../types';

interface OperationCardProps {
  op: VoiceOperation;
  rejected: boolean;
  onToggleReject: () => void;
}

const ICON_BY_KIND: Record<OperationKind, LucideIcon> = {
  add_item: Plus,
  remove_item: Minus,
  modify_item_portion: Edit3,
  modify_item_cooking_method: Settings2,
  add_cooking_oil: Droplet,
  remove_cooking_oil: Droplet,
  change_meal_portion: Edit3,
  add_modifier: Sparkles,
  remove_modifier: Sparkles,
  modify_chain_customization: Settings2,
  undo_last: Undo2,
};

export function OperationCard({ op, rejected, onToggleReject }: OperationCardProps) {
  const Icon = ICON_BY_KIND[op.op_kind] ?? Edit3;
  const impact = computeCumulativeImpact([op]);
  const impactText = formatImpactPreview(impact);
  const mediumThreshold = readMediumConfidenceThreshold();
  const isMediumConfidence = op.confidence < mediumThreshold;

  return (
    <div
      className={`relative rounded-2xl border bg-[#1E3054]/55 backdrop-blur-md p-4 transition ${
        rejected ? 'border-white/5 opacity-40' : 'border-white/10'
      }`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: rejected ? 'rgba(255,255,255,0.1)' : '#2DA5A0',
      }}
    >
      <div className="flex items-start gap-3 pr-12">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2DA5A0]/20 text-[#2DA5A0]"
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium text-white ${rejected ? 'line-through' : ''}`}>
            {op.natural_language_preview}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/70">{impactText}</span>
            {isMediumConfidence && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#B75E18]/15 px-2 py-0.5 text-[11px] font-medium text-[#B75E18]"
                aria-label="Medium confidence, review carefully"
              >
                <Sparkles size={10} strokeWidth={1.5} aria-hidden="true" />
                Less sure
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleReject}
        aria-label={rejected ? 'Restore this operation' : 'Reject this operation'}
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <X size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
