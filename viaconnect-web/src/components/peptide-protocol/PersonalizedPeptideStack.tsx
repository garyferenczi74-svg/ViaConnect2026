'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, FlaskConical, Activity, ChevronDown, ChevronUp,
  ShieldAlert, RotateCcw, AlertTriangle, Clock, Layers
} from 'lucide-react';
import { CyclingProtocolCard } from './CyclingProtocolCard';

// ── Types ──

interface StackItem {
  name: string;
  form: string;
  category: string;
  tier: number;
  requiresSupervision: boolean;
  indication: string;
  cycleOn: string;
  cycleOff: string;
  cycleNote?: string;
  matchedPatterns: string[];
  rank: number;
  isRUO?: boolean;
  isSolo?: boolean;
}

interface Protocol {
  items: StackItem[];
  detected_patterns: string[];
  rationale: string;
  supervision_required: boolean;
  confidence_tier: string;
  generated_at: string;
}

const PATTERN_LABELS: Record<string, string> = {
  hpa_axis: 'HPA Axis Dysregulation',
  neuroinflammation: 'Neuroinflammation',
  gut_brain_axis: 'Gut-Brain Axis',
  metabolic_dysregulation: 'Metabolic Dysregulation',
  tissue_repair: 'Tissue Repair',
  immune_dysregulation: 'Immune Dysregulation',
  hormonal_imbalance: 'Hormonal Imbalance',
  circadian_sleep: 'Circadian / Sleep',
  circadian_disruption: 'Circadian / Sleep',
  longevity_aging: 'Longevity / Aging',
  autonomic_dysregulation: 'Autonomic Dysregulation',
};

// ── Main Component ──

export function PersonalizedPeptideStack({ userId }: { userId?: string } = {}) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadProtocol = useCallback(async () => {
    try {
      const res = await fetch('/api/ultrathink/peptide-stack');
      const json = await res.json();
      if (json.protocol) setProtocol(json.protocol);
    } catch (e: any) {
      setFetchError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProtocol(); }, [loadProtocol]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/ultrathink/peptide-stack', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Generation failed');
      setProtocol(json.protocol);
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const items: StackItem[] = protocol?.items || [];
  const patterns: string[] = protocol?.detected_patterns || [];

  return (
    <div className="space-y-4">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] px-3 py-1.5 rounded-full text-xs font-semibold border border-[rgba(45,165,160,0.30)]">
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
            Ultrathink™ AI
          </div>
          {protocol && (
            <span className="text-xs text-[#2DA5A0] font-medium bg-[rgba(45,165,160,0.10)] px-2.5 py-1 rounded-full border border-[rgba(45,165,160,0.20)]">
              {protocol.confidence_tier || 'Tier 1. CAQ Analysis'}
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
            bg-gradient-to-r from-[#1A2744] to-[#2DA5A0] text-white
            border border-[rgba(45,165,160,0.40)]
            hover:from-[#2DA5A0] hover:to-[#1A2744] transition-all duration-300
            shadow-lg shadow-[rgba(45,165,160,0.15)]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <><Activity className="w-4 h-4 animate-pulse" strokeWidth={1.5} />Analyzing...</>
          ) : (
            <><FlaskConical className="w-4 h-4" strokeWidth={1.5} />
              {protocol ? 'Regenerate Protocol' : 'Generate Your Protocol'}</>
          )}
        </button>
      </div>

      <p className="text-sm text-[rgba(255,255,255,0.45)]">AI-powered personalized peptide protocol by Ultrathink™</p>

      {/* ── ERRORS ── */}
      {fetchError && (
        <div className="rounded-xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] p-3 text-sm text-[#F87171]">
          Failed to load protocol: {fetchError}
        </div>
      )}
      {generateError && (
        <div className="rounded-xl bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] p-3 text-sm text-[#F87171]">
          Generation error: {generateError}
        </div>
      )}

      {/* ── GENERATING ── */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <Activity className="w-8 h-8 text-[#2DA5A0] animate-pulse" strokeWidth={1.5} />
            <p className="text-sm text-[rgba(255,255,255,0.55)] font-medium">Analyzing your CAQ patterns...</p>
            <p className="text-xs text-[rgba(255,255,255,0.35)]">Building your personalized peptide stack</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EMPTY STATE ── */}
      {!loading && !generating && !protocol && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-4 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] border border-[rgba(45,165,160,0.30)] flex items-center justify-center shadow-lg">
            <FlaskConical className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Your personalized protocol is ready to generate</p>
            <p className="text-sm text-[rgba(255,255,255,0.45)] mt-1 max-w-sm">
              Ultrathink™ AI will analyze your health profile and recommend a peptide stack tailored specifically to you.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-[#1A2744] to-[#2DA5A0] text-white
              border border-[rgba(45,165,160,0.40)]
              hover:from-[#2DA5A0] hover:to-[#1A2744] transition-all duration-300
              shadow-lg shadow-[rgba(45,165,160,0.15)]"
          >
            Generate My Protocol
          </button>
        </motion.div>
      )}

      {/* ── RESULTS ── */}
      <AnimatePresence>
        {!generating && protocol && items.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Pattern badges */}
            {patterns.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Sparkles className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
                <span className="text-[10px] text-[rgba(255,255,255,0.45)] font-medium">CAQ patterns:</span>
                {patterns.map(p => (
                  <span key={p} className="text-[10px] bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.70)] px-2 py-0.5 rounded-full font-medium whitespace-nowrap border border-[rgba(255,255,255,0.12)]">
                    {PATTERN_LABELS[p] || p}
                  </span>
                ))}
              </div>
            )}

            {/* Rationale */}
            <div className="rounded-2xl border border-[rgba(45,165,160,0.20)] bg-gradient-to-br from-[rgba(45,165,160,0.08)] to-[rgba(26,39,68,0.60)] p-4 text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">
              {protocol.rationale}
            </div>

            {/* Supervision warning */}
            {protocol.supervision_required && (
              <div className="flex items-start gap-2 rounded-xl bg-[rgba(183,94,24,0.10)] border border-[rgba(183,94,24,0.25)] p-3">
                <ShieldAlert className="w-4 h-4 text-[#FB923C] mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="text-sm text-[rgba(251,146,60,0.85)]">
                  One or more peptides in this protocol require practitioner oversight.
                </p>
              </div>
            )}

            {/* RUO warning */}
            {items.some(i => i.isRUO) && (
              <div className="flex items-start gap-2 rounded-xl bg-[rgba(217,119,6,0.10)] border border-[rgba(217,119,6,0.25)] p-3">
                <AlertTriangle className="w-4 h-4 text-[#FBBF24] mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="text-sm text-[rgba(251,191,36,0.85)]">
                  This protocol includes investigational compounds (Research Use Only). Physician oversight required.
                </p>
              </div>
            )}

            {/* Stack cards */}
            <div className="space-y-3">
              {items.map((item, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] overflow-hidden hover:border-[rgba(255,255,255,0.15)] transition-all"
                  >
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{item.rank}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">{item.name}</span>
                          {/* Tier badge */}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            item.tier === 1 ? 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border-[rgba(45,165,160,0.35)]' :
                            item.tier === 2 ? 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.35)]' :
                            'bg-[rgba(239,68,68,0.15)] text-[#F87171] border-[rgba(239,68,68,0.35)]'
                          }`}>
                            {item.tier === 1 ? 'Tier 1. DTC' : item.tier === 2 ? 'Tier 2. HCP' : 'Tier 3. Research'}
                          </span>
                          {item.requiresSupervision && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(183,94,24,0.15)] text-[#FB923C] border border-[rgba(183,94,24,0.35)] font-medium">
                              <ShieldAlert className="w-3 h-3" strokeWidth={1.5} />Supervision
                            </span>
                          )}
                          {item.isRUO && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(217,119,6,0.15)] text-[#FBBF24] border border-[rgba(217,119,6,0.35)] font-medium">
                              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />RUO
                            </span>
                          )}
                          {item.isSolo && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.15)] text-[#F87171] border border-[rgba(239,68,68,0.35)] font-medium">
                              <Layers className="w-3 h-3" strokeWidth={1.5} />Solo Protocol
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-[rgba(255,255,255,0.45)]">
                          <span>{item.form}</span><span>·</span>
                          <span>{item.category}</span><span>·</span>
                          <span className="text-[#2DA5A0]">{item.cycleOn} on / {item.cycleOff === 'None' ? 'continuous' : item.cycleOff + ' off'}</span>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />
                          : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
                            <div className="pt-3">
                              <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">Mechanism / Indication</p>
                              <p className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">{item.indication}</p>
                            </div>
                            {item.cycleNote && (
                              <div className="flex items-start gap-2 rounded-lg bg-[#172542] p-3">
                                <RotateCcw className="w-3.5 h-3.5 text-[rgba(45,165,160,0.70)] mt-0.5 shrink-0" strokeWidth={1.5} />
                                <p className="text-xs text-[rgba(255,255,255,0.50)]">{item.cycleNote}</p>
                              </div>
                            )}
                            {item.matchedPatterns?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">Matched Patterns</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.matchedPatterns.map(p => (
                                    <span key={p} className="text-xs bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.55)] px-2 py-0.5 rounded-full border border-[rgba(255,255,255,0.10)]">
                                      {PATTERN_LABELS[p] || p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Cycling Protocol (already dark from #43e) */}
            <CyclingProtocolCard items={items.map(i => ({
              peptide_name: i.name, delivery_form: i.form, dosage: '', frequency: '',
              cycle_on_weeks: null, cycle_off_weeks: null, timing: [],
              requires_supervision: i.requiresSupervision, evidence_level: i.tier >= 3 ? 'emerging' : 'established',
            }))} />

            {/* Timestamp */}
            <p className="text-xs text-center text-[rgba(255,255,255,0.30)] pt-2">
              Generated {new Date(protocol.generated_at).toLocaleString()} · Ultrathink™ Deterministic Engine v1 · $0
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
