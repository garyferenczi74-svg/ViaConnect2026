'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, AlertTriangle, Info, Sparkles, CheckCircle,
  ChevronDown, ChevronUp, RefreshCw, Shield, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Interaction {
  rule_id: string;
  severity: 'major' | 'moderate' | 'minor' | 'synergistic';
  interaction_type: string;
  agent_a: string;
  agent_b: string;
  mechanism: string;
  rationale: string;
  consumer_message: string;
  practitioner_message: string;
  recommendation: string;
  timing_note: string | null;
  requires_hcp_review: boolean;
  blocks_protocol: boolean;
  evidence_level: string;
}

interface Props {
  userId: string;
  portal?: 'consumer' | 'practitioner' | 'naturopath';
  onSafetyChange?: (cleared: boolean) => void;
}

const SEV = {
  major:       { bg: 'bg-[rgba(239,68,68,0.12)]', border: 'border-[rgba(239,68,68,0.25)]', accent: 'border-l-[#F87171]', text: '#F87171', Icon: AlertCircle, label: 'Major. Action Required' },
  moderate:    { bg: 'bg-[rgba(245,158,11,0.12)]', border: 'border-[rgba(245,158,11,0.25)]', accent: 'border-l-[#F59E0B]', text: '#F59E0B', Icon: AlertTriangle, label: 'Moderate. Review Recommended' },
  minor:       { bg: 'bg-[rgba(45,165,160,0.12)]', border: 'border-[rgba(45,165,160,0.25)]', accent: 'border-l-[#2DA5A0]', text: '#2DA5A0', Icon: Info, label: 'Minor. Timing Note' },
  synergistic: { bg: 'bg-[rgba(139,92,246,0.12)]', border: 'border-[rgba(139,92,246,0.25)]', accent: 'border-l-[#A78BFA]', text: '#A78BFA', Icon: Sparkles, label: 'Synergistic. Beneficial' },
};

export function MedicalHerbalInteractions({ userId, portal = 'consumer', onSafetyChange }: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [counts, setCounts] = useState({ major: 0, moderate: 0, minor: 0, synergistic: 0 });
  const [safetyCleared, setSafetyCleared] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'major' | 'moderate' | 'minor' | 'synergistic'>('all');
  const [evaluatedAt, setEvaluatedAt] = useState<string | null>(null);

  const fetchInteractions = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/interactions/evaluate', { method: force ? 'POST' : 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setInteractions(data.interactions ?? []);
      setCounts(data.counts ?? { major: 0, moderate: 0, minor: 0, synergistic: 0 });
      setSafetyCleared(data.safety_cleared ?? true);
      setEvaluatedAt(data.evaluated_at);
      onSafetyChange?.(data.safety_cleared ?? true);
    } catch { /* silent */ }
    setLoading(false);
    setRefreshing(false);
  }, [onSafetyChange]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  const visible = filter === 'all' ? interactions : interactions.filter(i => i.severity === filter);
  const getMessage = (i: Interaction) => portal === 'consumer' ? i.consumer_message : (i.practitioner_message || i.rationale);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#2DA5A0] border-t-transparent animate-spin" />
        <p className="text-sm text-[rgba(255,255,255,0.45)]">Analyzing interactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
            <span className="text-sm font-bold text-white">Interaction Check</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              safetyCleared
                ? 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.30)]'
                : 'bg-[rgba(239,68,68,0.15)] text-[#F87171] border border-[rgba(239,68,68,0.30)]'
            }`}>
              {safetyCleared
                ? <><CheckCircle className="w-3 h-3" strokeWidth={1.5} />Cleared</>
                : <><AlertCircle className="w-3 h-3" strokeWidth={1.5} />Action Required</>}
            </span>
          </div>
          {evaluatedAt && (
            <p className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
              Updated {new Date(evaluatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button onClick={() => fetchInteractions(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Re-evaluate
        </button>
      </div>

      {/* Severity tiles */}
      <div className="grid grid-cols-4 gap-2">
        {(['major','moderate','minor','synergistic'] as const).map(sev => {
          const c = SEV[sev];
          const count = counts[sev];
          const { Icon } = c;
          return (
            <button key={sev} onClick={() => setFilter(filter === sev ? 'all' : sev)}
              className={`p-2.5 rounded-xl border text-center transition-all ${c.bg} ${c.border} ${filter === sev ? 'ring-2 ring-offset-1 ring-offset-[#1A2744]' : ''}`}
              style={filter === sev ? { ringColor: c.text } : {}}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: c.text }} strokeWidth={1.5} />
              <p className="text-xl font-black text-white">{count}</p>
              <p className="text-xs font-medium capitalize" style={{ color: c.text }}>{sev}</p>
            </button>
          );
        })}
      </div>

      {/* Major block banner */}
      {counts.major > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.20)] border border-[rgba(239,68,68,0.35)]">
          <AlertCircle className="w-5 h-5 text-[#F87171] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-bold text-[#F87171]">{counts.major} major interaction{counts.major > 1 ? 's' : ''} detected</p>
            <p className="text-xs text-[rgba(248,113,113,0.70)] mt-0.5">Protocol save blocked until resolved or cleared by a practitioner.</p>
          </div>
        </div>
      )}

      {/* All clear */}
      {interactions.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[rgba(45,165,160,0.10)] border border-[rgba(45,165,160,0.25)]">
          <CheckCircle className="w-5 h-5 text-[#2DA5A0] flex-shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-[#2DA5A0]">No interactions detected</p>
            <p className="text-xs text-[rgba(45,165,160,0.70)] mt-0.5">Your current combination is clear.</p>
          </div>
        </div>
      )}

      {/* Interaction cards */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visible.map(interaction => {
            const c = SEV[interaction.severity];
            const { Icon } = c;
            const isExp = expandedId === interaction.rule_id;
            const message = getMessage(interaction);

            return (
              <motion.div key={interaction.rule_id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }} layout
                className={`rounded-2xl border-l-4 ${c.accent} border border-[rgba(255,255,255,0.08)] bg-[#1E3054] overflow-hidden`}>

                <button onClick={() => setExpandedId(isExp ? null : interaction.rule_id)}
                  className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.text}20` }}>
                    <Icon className="w-4 h-4" style={{ color: c.text }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${c.text}20`, color: c.text, border: `1px solid ${c.text}40` }}>
                        {c.label}
                      </span>
                      {interaction.requires_hcp_review && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[rgba(139,92,246,0.15)] text-[#A78BFA] border border-[rgba(139,92,246,0.30)]">HCP Review</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">{interaction.agent_a} + {interaction.agent_b}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.55)] mt-1 leading-relaxed">{message}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {isExp ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />
                           : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExp && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">
                            {portal === 'consumer' ? 'Why This Matters' : 'Clinical Mechanism'}
                          </p>
                          <p className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">
                            {portal === 'consumer' ? interaction.rationale : interaction.mechanism}
                          </p>
                        </div>
                        <div className="px-3 py-2 rounded-xl" style={{ background: `${c.text}12`, border: `1px solid ${c.text}30` }}>
                          <p className="text-xs font-bold text-white mb-0.5">Recommendation</p>
                          <p className="text-sm text-[rgba(255,255,255,0.65)]">{interaction.recommendation}</p>
                        </div>
                        {interaction.timing_note && (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-[#2DA5A0] flex-shrink-0" strokeWidth={1.5} />
                            <p className="text-xs text-[rgba(255,255,255,0.55)] font-medium">{interaction.timing_note}</p>
                          </div>
                        )}
                        <p className="text-xs text-[rgba(255,255,255,0.35)]">Evidence: {interaction.evidence_level}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Practitioner note */}
      {portal !== 'consumer' && counts.major > 0 && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">
          <p className="text-xs text-[rgba(255,255,255,0.45)]">
            <span className="font-semibold text-white">Practitioner note:</span> Major interactions block protocol save. Override from the practitioner portal. All acknowledgments are logged.
          </p>
        </div>
      )}
    </div>
  );
}
