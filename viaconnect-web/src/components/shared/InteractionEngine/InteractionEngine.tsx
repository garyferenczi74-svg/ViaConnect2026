'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Stethoscope, Leaf, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import type { InteractionMode, InteractionEngineProps } from './index';
import type { Severity } from './SeverityBadge';
import { SeverityBadge } from './SeverityBadge';
import { InteractionCard } from './InteractionCard';
import { Toolbar as PractitionerToolbar } from './PractitionerExtension';

export interface Interaction {
  id: string;
  severity: Severity;
  layer: string;
  medicationName: string;
  supplementName: string;
  mechanism: string;
  clinicalEffect: string;
  onsetTiming: string;
  mitigationStrategy: string;
  evidenceLevel: string;
  citations: string[];
  blockedFromProtocol: boolean;
  overrideApproved?: boolean;
  overrideBy?: string;
  overrideNotes?: string;
  cypEnzymes?: string[];
  herbalAlternatives?: string[];
  tcmContext?: string;
  constitutionalContraindications?: string[];
  herbHerbInteractions?: { name: string; type: 'synergistic' | 'antagonistic' }[];
  synergyScore?: number;
}

const HEADER_ICON: Record<InteractionMode, { Icon: React.ElementType; color: string; title: string }> = {
  consumer:     { Icon: ShieldAlert, color: '#2DA5A0', title: 'Medical & Herbal Interactions' },
  practitioner: { Icon: Stethoscope, color: '#2DA5A0', title: 'Clinical Interaction Report' },
  naturopath:   { Icon: Leaf,        color: '#34D399', title: 'Herb-Drug & Herb-Herb Interactions' },
};

export function InteractionEngine({ mode, userId, viewerUserId }: InteractionEngineProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadInteractions = useCallback(async () => {
    setLoading(true);
    try {
      // Load from medication_interactions table
      const { data: rawInteractions } = await supabase
        .from('medication_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('severity', { ascending: true });

      // Load overrides
      const { data: overrides } = await supabase
        .from('interaction_overrides')
        .select('*')
        .eq('patient_user_id', userId);

      const overrideMap = new Map((overrides ?? []).map((o: any) => [o.interaction_id, o]));

      const mapped: Interaction[] = (rawInteractions ?? []).map((r: any) => {
        const override = overrideMap.get(r.id) as any;
        return {
          id: r.id,
          severity: r.severity ?? 'minor',
          layer: r.layer ?? 'med_x_supplement',
          medicationName: r.medication_name ?? r.substance_a ?? 'Unknown',
          supplementName: r.supplement_name ?? r.substance_b ?? 'Unknown',
          mechanism: r.mechanism ?? '',
          clinicalEffect: r.clinical_effect ?? '',
          onsetTiming: r.onset_timing ?? '',
          mitigationStrategy: r.mitigation_strategy ?? r.recommendation ?? '',
          evidenceLevel: r.evidence_level ?? 'theoretical',
          citations: r.citations ?? [],
          blockedFromProtocol: r.blocked_from_protocol ?? (r.severity === 'major'),
          overrideApproved: override?.override_type === 'approve',
          overrideBy: override?.practitioner_user_id,
          overrideNotes: override?.clinical_notes,
          cypEnzymes: r.cyp_enzymes ?? [],
          herbalAlternatives: r.herbal_alternatives ?? [],
          tcmContext: r.tcm_context,
          constitutionalContraindications: r.constitutional_contraindications ?? [],
          herbHerbInteractions: r.herb_herb_interactions ?? [],
          synergyScore: r.synergy_score,
        };
      });

      setInteractions(mapped);
    } catch {
      // Silent — empty state
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { loadInteractions(); }, [loadInteractions]);

  const handleOverride = async (interactionId: string, type: 'approve' | 'confirm_block', notes: string) => {
    if (!viewerUserId) return;

    await supabase.from('interaction_overrides').insert({
      interaction_id: interactionId,
      patient_user_id: userId,
      practitioner_user_id: viewerUserId,
      override_type: type,
      clinical_notes: notes,
    });

    // Refresh
    await loadInteractions();
  };

  const counts = {
    major: interactions.filter(i => i.severity === 'major').length,
    moderate: interactions.filter(i => i.severity === 'moderate').length,
    minor: interactions.filter(i => i.severity === 'minor').length,
    synergistic: interactions.filter(i => i.severity === 'synergistic').length,
  };

  const header = HEADER_ICON[mode];
  const { Icon: HeaderIcon } = header;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 text-[#2DA5A0] animate-spin" strokeWidth={1.5} />
        <p className="text-sm text-[rgba(255,255,255,0.45)]">Loading interactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <HeaderIcon className="w-4 h-4" style={{ color: header.color }} strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-white">{header.title}</h2>
      </div>

      {/* Severity summary strip */}
      {interactions.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {counts.major > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[rgba(239,68,68,0.15)] text-[#F87171] border border-[rgba(239,68,68,0.30)]">
              {counts.major} Major
            </span>
          )}
          {counts.moderate > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.30)]">
              {counts.moderate} Moderate
            </span>
          )}
          {counts.minor > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.30)]">
              {counts.minor} Minor
            </span>
          )}
          {counts.synergistic > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-[rgba(139,92,246,0.15)] text-[#A78BFA] border border-[rgba(139,92,246,0.30)]">
              {counts.synergistic} Synergistic
            </span>
          )}
        </div>
      )}

      {/* Practitioner toolbar */}
      {mode === 'practitioner' && interactions.length > 0 && (
        <PractitionerToolbar interactionCount={interactions.length} patientId={userId} />
      )}

      {/* Empty state */}
      {interactions.length === 0 && (
        <div className="py-12 text-center space-y-3">
          <HeaderIcon className="w-10 h-10 mx-auto" style={{ color: 'rgba(255,255,255,0.20)' }} strokeWidth={1.5} />
          <p className="text-sm text-[rgba(255,255,255,0.45)]">
            {mode === 'consumer'
              ? 'No interactions detected. Add medications in your profile to check.'
              : 'No interactions found for this patient. Interactions appear when medications and supplements are both present.'}
          </p>
        </div>
      )}

      {/* Interaction cards */}
      <div className="space-y-3">
        {interactions.map(interaction => (
          <InteractionCard
            key={interaction.id}
            interaction={interaction}
            mode={mode}
            expanded={expandedId === interaction.id}
            onToggle={() => setExpandedId(expandedId === interaction.id ? null : interaction.id)}
            onOverride={handleOverride}
          />
        ))}
      </div>
    </div>
  );
}
