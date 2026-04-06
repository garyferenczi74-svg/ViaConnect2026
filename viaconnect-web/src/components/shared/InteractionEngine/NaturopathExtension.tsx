'use client';

import { Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import { CYP450Panel, OverrideControls } from './PractitionerExtension';
import type { Interaction } from './InteractionEngine';

function HerbalAlternatives({ alternatives }: { alternatives: string[] }) {
  if (!alternatives.length) return null;
  return (
    <div className="rounded-xl bg-[rgba(5,150,105,0.10)] border border-[rgba(5,150,105,0.20)] p-3">
      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Leaf className="w-3 h-3" strokeWidth={1.5} />
        Safer Herbal Alternatives
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {alternatives.map(alt => (
          <span key={alt} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(5,150,105,0.15)] text-emerald-400 border border-[rgba(5,150,105,0.30)]">
            {alt}
          </span>
        ))}
      </div>
      <p className="text-xs text-[rgba(255,255,255,0.45)] mt-2 leading-relaxed">
        These botanicals achieve a similar therapeutic effect with a more favorable interaction profile.
      </p>
    </div>
  );
}

function TCMContext({ tcmContext, constitutionalContraindications }: { tcmContext?: string; constitutionalContraindications?: string[] }) {
  if (!tcmContext && !constitutionalContraindications?.length) return null;
  return (
    <div className="rounded-xl bg-[#172542] p-3 space-y-2">
      <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide">
        TCM / Ayurvedic Context
      </p>
      {tcmContext && <p className="text-sm text-[rgba(255,255,255,0.60)] leading-relaxed">{tcmContext}</p>}
      {constitutionalContraindications && constitutionalContraindications.length > 0 && (
        <div>
          <p className="text-xs text-[rgba(255,255,255,0.35)] mb-1">Constitutional contraindications:</p>
          <div className="flex flex-wrap gap-1">
            {constitutionalContraindications.map(c => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-[rgba(217,119,6,0.12)] text-[#FBBF24] border border-[rgba(217,119,6,0.25)]">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HerbHerbMatrix({ interactions }: { interactions: { name: string; type: 'synergistic' | 'antagonistic' }[] }) {
  if (!interactions.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-2">
        Herb-Herb Interactions
      </p>
      <div className="space-y-1.5">
        {interactions.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.type === 'synergistic' ? 'bg-[rgba(139,92,246,0.80)]' : 'bg-[rgba(239,68,68,0.70)]'}`} />
            <span className="text-[rgba(255,255,255,0.60)]">{h.name}</span>
            <span className={`ml-auto font-medium ${h.type === 'synergistic' ? 'text-[#A78BFA]' : 'text-[#F87171]'}`}>
              {h.type === 'synergistic' ? 'Synergistic' : 'Antagonistic'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SynergyScore({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 70 ? '#A78BFA' : score >= 40 ? '#FBBF24' : '#F87171';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[rgba(255,255,255,0.40)]">Synergy score</span>
      <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{score}/100</span>
    </div>
  );
}

export function CardSection({ interaction, onOverride }: {
  interaction: Interaction;
  onOverride: (id: string, type: 'approve' | 'confirm_block', notes: string) => void;
}) {
  const enzymes = interaction.cypEnzymes ?? [];
  return (
    <div className="space-y-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
      {enzymes.length > 0 && <CYP450Panel enzymes={enzymes} />}
      {interaction.severity === 'major' && !interaction.overrideApproved && (
        <OverrideControls interactionId={interaction.id} onOverride={onOverride} />
      )}
      {interaction.herbalAlternatives && interaction.herbalAlternatives.length > 0 && (
        <HerbalAlternatives alternatives={interaction.herbalAlternatives} />
      )}
      <TCMContext tcmContext={interaction.tcmContext} constitutionalContraindications={interaction.constitutionalContraindications} />
      {interaction.herbHerbInteractions && interaction.herbHerbInteractions.length > 0 && (
        <HerbHerbMatrix interactions={interaction.herbHerbInteractions} />
      )}
      {interaction.severity === 'synergistic' && <SynergyScore score={interaction.synergyScore} />}
    </div>
  );
}
