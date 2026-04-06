'use client';

import { ChevronDown, ChevronUp, Lock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SeverityBadge, EvidenceBadge } from './SeverityBadge';
import type { Severity } from './SeverityBadge';
import type { InteractionMode } from './index';
import type { Interaction } from './InteractionEngine';
import * as PractitionerExt from './PractitionerExtension';
import * as NaturopathExt from './NaturopathExtension';

const SEVERITY_COLOR: Record<Severity, string> = {
  major: '#F87171', moderate: '#F59E0B', minor: '#2DA5A0', synergistic: '#A78BFA',
};
const SEVERITY_BORDER: Record<Severity, string> = {
  major: 'rgba(239,68,68,0.25)', moderate: 'rgba(245,158,11,0.25)',
  minor: 'rgba(45,165,160,0.20)', synergistic: 'rgba(139,92,246,0.25)',
};
const LAYER_LABEL: Record<string, string> = {
  med_x_supplement: 'Medication x Supplement',
  med_x_farmceutica: 'Medication x FarmCeutica Product',
  med_x_allergy: 'Medication x Allergy',
};

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">{value}</p>
    </div>
  );
}

interface InteractionCardProps {
  interaction: Interaction;
  mode: InteractionMode;
  expanded: boolean;
  onToggle: () => void;
  onOverride: (id: string, type: 'approve' | 'confirm_block', notes: string) => void;
}

export function InteractionCard({ interaction, mode, expanded, onToggle, onOverride }: InteractionCardProps) {
  const sev = interaction.severity as Severity;

  return (
    <div
      className="rounded-2xl bg-[#1E3054] overflow-hidden transition-all"
      style={{ border: `1px solid ${SEVERITY_BORDER[sev]}` }}
    >
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className="w-1 shrink-0" style={{ background: SEVERITY_COLOR[sev] }} />

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <SeverityBadge severity={sev} />
              <p className="text-sm font-semibold text-white mt-1.5">
                {interaction.medicationName} x {interaction.supplementName}
              </p>
              <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">
                {LAYER_LABEL[interaction.layer] ?? interaction.layer}
              </p>
            </div>
            <button onClick={onToggle} className="shrink-0 mt-1">
              {expanded
                ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />
                : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />}
            </button>
          </div>

          {/* Blocked badge (consumer) */}
          {mode === 'consumer' && interaction.blockedFromProtocol && !interaction.overrideApproved && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#F87171]">
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              Blocked from protocol. Requires practitioner approval
            </div>
          )}

          {/* Override approved */}
          {interaction.overrideApproved && (
            <div className="mt-2 text-xs text-[#34D399] flex items-center gap-1">
              <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
              Approved by practitioner
              {interaction.overrideNotes && ` — "${interaction.overrideNotes}"`}
            </div>
          )}

          {/* Expanded panel */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-3">
                  <Field label="Mechanism" value={interaction.mechanism} />
                  <Field label="Clinical effect" value={interaction.clinicalEffect} />
                  <Field label="Onset timing" value={interaction.onsetTiming} />
                  <Field label="Mitigation" value={interaction.mitigationStrategy} />
                  {interaction.evidenceLevel && <EvidenceBadge level={interaction.evidenceLevel} />}

                  {interaction.citations && interaction.citations.length > 0 && (
                    <div>
                      <p className="text-xs text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">Citations</p>
                      {interaction.citations.map((c, i) => (
                        <p key={i} className="text-xs text-[#2DA5A0] truncate">{c}</p>
                      ))}
                    </div>
                  )}

                  {/* Practitioner extension */}
                  {mode === 'practitioner' && (
                    <PractitionerExt.CardSection interaction={interaction} onOverride={onOverride} />
                  )}

                  {/* Naturopath extension */}
                  {mode === 'naturopath' && (
                    <NaturopathExt.CardSection interaction={interaction} onOverride={onOverride} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
