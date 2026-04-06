'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Zap, Shield, Info, ChevronDown, ChevronUp, Plus, X, RotateCcw, Dna, TestTube2, Activity, Clock, ArrowUpRight, CheckCircle, Loader2, ShoppingCart, ExternalLink } from 'lucide-react';
import { buildPurchaseLink, buildViewLink } from '@/lib/utils/shopLinks';

interface Recommendation {
  id: string; rank: number; priority: 'high' | 'medium' | 'low';
  product: string; category: string; delivery_form: string;
  dosage: string; frequency: string; timing: string[]; duration_weeks: number | null;
  rationale: string; health_signals: string[]; bioavailability_note: string | null;
  interaction_check: string; synergy_with: string[]; replaces_current: string | null;
  evidence_level: string; is_accepted: boolean; is_dismissed: boolean;
}

interface Protocol {
  protocol_id: string; confidence_tier: number; confidence_pct: number;
  data_sources_used: string[]; total_recommendations: number;
  high_priority_count: number; medium_priority_count: number; low_priority_count: number;
  protocol_rationale: string; bio_score_impact: any;
  generated_at: string; recommendations: Recommendation[];
}

const PRI = {
  high: { badge: 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.35)]', icon: Zap, label: 'High Priority' },
  medium: { badge: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.35)]', icon: Shield, label: 'Medium' },
  low: { badge: 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.15)]', icon: Info, label: 'Optimize' },
};

const DEL: Record<string, { color: string; note: string }> = {
  'Liposomal': { color: 'bg-[#2DA5A0] text-white', note: '90% bioavailability' },
  'Micellar': { color: 'bg-[rgba(45,165,160,0.15)] text-[#2DA5A0] border border-[rgba(45,165,160,0.35)]', note: '85% bioavailability' },
};

export default function RecommendedSupplements() {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  useEffect(() => { fetchProtocol(); }, []);

  const fetchProtocol = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ultrathink/recommend');
      if (res.ok) {
        const { protocol: p } = await res.json();
        setProtocol(p);
        if (p?.recommendations) setAccepted(new Set(p.recommendations.filter((r: Recommendation) => r.is_accepted).map((r: Recommendation) => r.id)));
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/ultrathink/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger: 'manual' }) });
      await fetchProtocol();
    } catch { /* silent */ }
    setGenerating(false);
  };

  const visible = protocol?.recommendations?.filter(r => !r.is_dismissed && (filter === 'all' || r.priority === filter)) ?? [];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-full border-2 border-[#2DA5A0] border-t-transparent animate-spin" />
      <p className="text-sm text-[rgba(255,255,255,0.45)]">Loading your protocol...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(45,165,160,0.15)] border border-[rgba(45,165,160,0.30)]">
            <Sparkles className="w-3.5 h-3.5 text-[#2DA5A0]" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-[#2DA5A0]">Ultrathink™ AI</span>
          </div>
          {protocol && (
            <span className="text-xs text-[#2DA5A0] font-medium bg-[rgba(45,165,160,0.10)] px-2.5 py-1 rounded-full border border-[rgba(45,165,160,0.20)]">
              {protocol.confidence_tier === 1 ? 'CAQ Analysis' : protocol.confidence_tier === 2 ? 'CAQ + Labs' : 'Full Genomic'} · {protocol.confidence_pct}%
            </span>
          )}
        </div>
        <button onClick={generate} disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#1A2744] to-[#2DA5A0] hover:from-[#2DA5A0] hover:to-[#1A2744] border border-[rgba(45,165,160,0.40)] shadow-lg shadow-[rgba(45,165,160,0.15)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Analyzing...</> : <><RotateCcw className="w-4 h-4" strokeWidth={1.5} /> {protocol ? 'Regenerate' : 'Generate Protocol'}</>}
        </button>
      </div>

      {/* Rationale */}
      {protocol?.protocol_rationale && (
        <div className="px-4 py-3 rounded-2xl border border-[rgba(45,165,160,0.20)] bg-gradient-to-br from-[rgba(45,165,160,0.08)] to-[rgba(26,39,68,0.60)]">
          <p className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">{protocol.protocol_rationale}</p>
        </div>
      )}

      {/* Bio score impact */}
      {protocol?.bio_score_impact?.overall_delta > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[rgba(45,165,160,0.25)] bg-[rgba(45,165,160,0.10)]">
          <ArrowUpRight className="w-4 h-4 text-[#2DA5A0] flex-shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-[#2DA5A0]">
            <span className="font-semibold">+{protocol.bio_score_impact.overall_delta} Bio Score</span> projected in {protocol.bio_score_impact.timeline_weeks} weeks — {protocol.bio_score_impact.primary_improvements?.join(', ')}
          </p>
        </div>
      )}

      {/* Filter tabs */}
      {protocol && (
        <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-[#2DA5A0] text-white shadow-sm font-semibold' : 'text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.70)] hover:bg-[rgba(255,255,255,0.05)]'}`}>
              {f === 'all' ? `All (${protocol.total_recommendations})` : f === 'high' ? `High (${protocol.high_priority_count})` : f === 'medium' ? `Medium (${protocol.medium_priority_count})` : `Optimize (${protocol.low_priority_count})`}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!protocol && !generating && (
        <div className="py-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] border border-[rgba(45,165,160,0.30)] flex items-center justify-center shadow-lg mx-auto">
            <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-white">Your personalized protocol is ready to generate</p>
          <p className="text-sm text-[rgba(255,255,255,0.45)] max-w-sm mx-auto">Ultrathink™ AI will analyze your health profile and recommend products tailored specifically to you.</p>
          <button onClick={generate} className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1A2744] to-[#2DA5A0] text-white text-sm font-semibold border border-[rgba(45,165,160,0.40)] shadow-lg shadow-[rgba(45,165,160,0.15)] hover:from-[#2DA5A0] hover:to-[#1A2744] transition-all duration-300">Generate My Protocol</button>
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-8 h-8 text-[#2DA5A0] animate-pulse" strokeWidth={1.5} />
          <p className="text-sm text-[rgba(255,255,255,0.55)] font-medium">Analyzing your health profile...</p>
          <p className="text-xs text-[rgba(255,255,255,0.35)]">Building your personalized supplement protocol</p>
        </div>
      )}

      {/* Recommendation cards */}
      <div className="space-y-3">
        {visible.map(rec => {
          const pri = PRI[rec.priority] ?? PRI.low;
          const PriIcon = pri.icon;
          const del = DEL[rec.delivery_form] ?? { color: 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.55)]', note: '' };
          const isExp = expanded === rec.id;
          const isAcc = accepted.has(rec.id);

          return (
            <div key={rec.id} className={`rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1E3054] overflow-hidden hover:border-[rgba(255,255,255,0.15)] transition-all duration-200 ${isAcc ? 'ring-2 ring-[rgba(45,165,160,0.50)]' : ''}`}>
              <div className="px-4 py-3.5 flex items-start gap-3 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{rec.rank}</span>
                  </div>
                  <PriIcon className="w-4 h-4 text-[rgba(255,255,255,0.35)]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white leading-snug">{rec.product}</p>
                    {isAcc && <CheckCircle className="w-4 h-4 text-[#2DA5A0] flex-shrink-0 mt-0.5" strokeWidth={1.5} />}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${del.color}`}>{rec.delivery_form}{del.note ? ` · ${del.note}` : ''}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pri.badge}`}>{pri.label}</span>
                  </div>
                  <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1.5">{rec.dosage} · {rec.frequency} · {rec.timing?.join(' + ')}</p>
                  {rec.replaces_current && <p className="text-xs text-[#FB923C] mt-1">Upgrades: {rec.replaces_current}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : rec.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[rgba(255,255,255,0.08)]">
                    {isExp ? <ChevronUp className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.30)]" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {isExp && (
                <div className="border-t border-[rgba(255,255,255,0.06)] px-4 py-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1">Why This for You</p>
                    <p className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">{rec.rationale}</p>
                  </div>
                  {rec.health_signals?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[rgba(255,255,255,0.40)] uppercase tracking-wide mb-1.5">Your Health Signals</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.health_signals.map(s => <span key={s} className="text-xs px-2 py-0.5 bg-[rgba(255,255,255,0.07)] text-[rgba(255,255,255,0.55)] rounded-full border border-[rgba(255,255,255,0.10)]">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {rec.bioavailability_note && (
                    <div className="px-3 py-2 rounded-lg bg-[rgba(45,165,160,0.10)] border border-[rgba(45,165,160,0.25)]">
                      <p className="text-xs text-[#2DA5A0] font-medium">10-27x Bioavailability Advantage</p>
                      <p className="text-xs text-[rgba(255,255,255,0.55)] mt-0.5">{rec.bioavailability_note}</p>
                    </div>
                  )}
                  {rec.synergy_with?.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-[#172542] p-3">
                      <Sparkles className="w-3.5 h-3.5 text-[#2DA5A0] mt-0.5 shrink-0" strokeWidth={1.5} />
                      <p className="text-xs text-[rgba(255,255,255,0.55)]"><span className="font-semibold text-white">Synergistic:</span> {rec.synergy_with.join(' + ')}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rec.interaction_check === 'safe' ? 'bg-[rgba(45,165,160,0.80)]' : rec.interaction_check === 'caution' ? 'bg-[rgba(245,158,11,0.80)]' : 'bg-[rgba(239,68,68,0.80)]'}`} />
                    <p className="text-xs text-[rgba(255,255,255,0.55)]">Interaction: <span className="font-medium capitalize text-[rgba(255,255,255,0.70)]">{rec.interaction_check}</span></p>
                  </div>

                  {/* Purchase Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={buildPurchaseLink({ productName: rec.product })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#1A8A85] shadow-lg shadow-[rgba(45,165,160,0.20)] transition-all duration-200 group"
                    >
                      <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                      Purchase Now
                    </a>
                    <a
                      href={buildViewLink({ productName: rec.product })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-[rgba(255,255,255,0.65)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-white transition-all duration-200 group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={1.5} />
                      View in Shop
                    </a>
                  </div>

                  <button onClick={() => setAccepted(prev => new Set([...prev, rec.id]))} disabled={isAcc}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${isAcc ? 'bg-[rgba(45,165,160,0.20)] text-[#2DA5A0] border border-[rgba(45,165,160,0.30)] cursor-default' : 'bg-[#2DA5A0] text-white hover:bg-[#1A8A85] shadow-lg shadow-[rgba(45,165,160,0.20)]'}`}>
                    {isAcc ? <><CheckCircle className="w-4 h-4" strokeWidth={1.5} /> Added</> : <><Plus className="w-4 h-4" strokeWidth={1.5} /> Add to My Protocol</>}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {protocol && <p className="text-xs text-center text-[rgba(255,255,255,0.30)] pt-2">Generated {new Date(protocol.generated_at).toLocaleString()}</p>}
    </div>
  );
}
