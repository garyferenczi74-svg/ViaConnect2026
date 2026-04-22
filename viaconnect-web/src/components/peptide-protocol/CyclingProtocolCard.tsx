'use client';

import { RotateCcw, ShieldAlert, FlaskConical } from 'lucide-react';

// ── Dark Theme Tokens ──
const DT = {
  cardBg:        'rgba(30, 48, 84, 0.45)',
  cardBgAlt:     'rgba(36, 59, 106, 0.45)',
  cardBgDeep:    'rgba(23, 37, 66, 0.45)',
  textPrimary:   '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textMuted:     'rgba(255,255,255,0.35)',
  borderSubtle:  'rgba(255,255,255,0.08)',
  borderDashed:  'rgba(255,255,255,0.2)',
  barTrack:      'rgba(255,255,255,0.08)',
} as const;

const TIER_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  tier3: { bg: 'rgba(239,68,68,0.15)', text: '#F87171', border: 'rgba(239,68,68,0.35)', label: 'Tier 3 · Research' },
  tier2: { bg: 'rgba(217,119,6,0.15)', text: '#F59E0B', border: 'rgba(217,119,6,0.35)', label: 'Tier 2 · HCP Required' },
  tier1: { bg: 'rgba(45,165,160,0.15)', text: '#2DA5A0', border: 'rgba(45,165,160,0.35)', label: 'Tier 1 · DTC' },
};

interface CyclingItem {
  peptide_name: string;
  delivery_form: string;
  dosage: string;
  frequency: string;
  cycle_on_weeks: number | null;
  cycle_off_weeks: number | null;
  timing: string[];
  requires_supervision: boolean;
  evidence_level: string;
}

function getCycleLabel(on: number | null, off: number | null): string {
  if (!on) return 'Continuous';
  if (off && off >= 60) return `${on} days on · ${Math.round(off / 30)} months off (2x/year)`;
  if (off && off >= 30) return `${on}w on · ${Math.round(off / 4)}mo off`;
  return `${on}w on · ${off ?? 4}w off`;
}

function getTierKey(requires_supervision: boolean, evidence_level: string): string {
  if (evidence_level === 'emerging' && requires_supervision) return 'tier3';
  if (requires_supervision) return 'tier2';
  return 'tier1';
}

export function CyclingProtocolCard({ items }: { items: CyclingItem[] }) {
  if (!items || items.length === 0) return null;

  const hasSupervision = items.some(i => i.requires_supervision);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h3 className="text-sm font-bold" style={{ color: DT.textPrimary }}>Cycling Protocol</h3>
      </div>

      {/* Supervision notice */}
      {hasSupervision && (
        <div
          className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.3)' }}
        >
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} strokeWidth={1.5} />
          <p className="text-xs" style={{ color: '#FCD34D' }}>
            <span className="font-semibold">Practitioner oversight required.</span> One or more peptides in this protocol require healthcare provider supervision.
          </p>
        </div>
      )}

      {/* Per-peptide cycling rows */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: `1px solid ${DT.borderSubtle}` }}
      >
        {items.map((item, i) => {
          const tierKey = getTierKey(item.requires_supervision, item.evidence_level);
          const tier = TIER_BADGE[tierKey];
          return (
            <div
              key={i}
              className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              style={{
                background: DT.cardBg,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: i < items.length - 1 ? `1px solid ${DT.borderSubtle}` : 'none',
              }}
            >
              {/* Peptide name + form */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: DT.textPrimary }}>{item.peptide_name}</p>
                  {item.requires_supervision && (
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FB923C' }} strokeWidth={1.5} />
                  )}
                  {item.evidence_level === 'emerging' && item.requires_supervision && (
                    <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F87171' }} strokeWidth={1.5} />
                  )}
                </div>
                <p className="text-xs" style={{ color: DT.textSecondary }}>{item.delivery_form} · {item.dosage} · {item.frequency}</p>
              </div>

              {/* Cycling schedule */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: DT.barTrack }}
                >
                  <RotateCcw className="w-3 h-3 text-[#2DA5A0]" strokeWidth={1.5} />
                  <span className="text-xs font-medium" style={{ color: DT.textPrimary }}>
                    {getCycleLabel(item.cycle_on_weeks, item.cycle_off_weeks)}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
                >
                  {tier.label}
                </span>
              </div>

              {/* Timing */}
              {item.timing?.length > 0 && (
                <div className="flex gap-1 flex-wrap sm:flex-shrink-0">
                  {item.timing.map(t => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ background: 'rgba(255,255,255,0.1)', color: DT.textSecondary }}
                    >
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
