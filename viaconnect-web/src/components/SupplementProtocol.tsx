'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Rec {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  reason: string;
  confidence_score: number;
  confidence_level: string;
  priority_rank: number;
  dosage: string;
  frequency: string;
  time_of_day: string;
  monthly_price: number;
  status: string;
}

interface Replacement {
  current_supplement: string;
  replacement_sku: string;
  replacement_name: string;
  reason: string;
}

export default function SupplementProtocol() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [currentSupplements, setCurrentSupplements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecs();
  }, []);

  async function fetchRecs() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch recommendations
    const { data } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['recommended', 'accepted'])
      .order('priority_rank', { ascending: true });
    setRecs((data || []) as Rec[]);

    // Fetch supplement replacements and current supplements from assessment data.
    // assessment_results.data is jsonb (typed as Json union); cast at the read
    // site so we can pull strongly named keys without per-property narrowing.
    const { data: summary } = await supabase
      .from('assessment_results')
      .select('data')
      .eq('user_id', user.id)
      .eq('phase', 0)
      .single();
    const summaryData = (summary?.data ?? null) as any;
    if (summaryData?.supplement_replacements) {
      setReplacements(summaryData.supplement_replacements);
    }
    if (summaryData?.current_supplements) {
      setCurrentSupplements(summaryData.current_supplements);
    }

    // Fallback: load current supplements from Phase 4 if not in summary
    if (!summaryData?.current_supplements) {
      const { data: phase4 } = await supabase
        .from('assessment_results')
        .select('data')
        .eq('user_id', user.id)
        .eq('phase', 4)
        .single();
      const phase4Data = (phase4?.data ?? null) as any;
      if (phase4Data?.supplements) {
        setCurrentSupplements(phase4Data.supplements);
      }
    }

    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) await fetchRecs();
    } catch {
      // request failed — silently ignore
    } finally {
      setGenerating(false);
    }
  }

  const grouped = recs.reduce<Record<string, Rec[]>>((acc, r) => {
    const t = r.time_of_day || 'morning';
    if (!acc[t]) acc[t] = [];
    acc[t].push(r);
    return acc;
  }, {});

  const total = recs.reduce((s, r) => s + (r.monthly_price || 0), 0);

  const cfg: Record<string, { label: string; icon: string; color: string }> = {
    morning: { label: 'Morning', icon: '\u2600\uFE0F', color: '#FBBF24' },
    afternoon: { label: 'Afternoon', icon: '\uD83C\uDF24\uFE0F', color: '#22D3EE' },
    evening: { label: 'Evening', icon: '\uD83C\uDF19', color: '#A78BFA' },
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="space-y-5">
        {/* Current supplements from questionnaire */}
        {currentSupplements.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm sm:text-base mb-2">
              Your Current Supplements
            </h3>
            <p className="text-white/40 text-[10px] sm:text-xs mb-3">
              From your onboarding questionnaire
            </p>
            <div className="space-y-1.5">
              {currentSupplements.map((supp) => {
                const replacement = replacements.find(
                  (r) => r.current_supplement.toLowerCase() === supp.toLowerCase()
                );
                return (
                  <div
                    key={supp}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] sm:text-xs font-bold text-white/40 flex-shrink-0">
                        {supp.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white text-xs sm:text-sm truncate">{supp}</span>
                    </div>
                    {replacement && (
                      <span className="text-emerald-400 text-[10px] sm:text-xs font-medium whitespace-nowrap flex-shrink-0 ml-2">
                        {'\u2192'} {replacement.replacement_name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generate */}
        <div className="text-center py-4 sm:py-6">
          {currentSupplements.length === 0 && (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-xl sm:text-2xl">{'\uD83E\uDDEA'}</span>
            </div>
          )}
          <p className="text-white/50 text-xs sm:text-sm mb-4">
            {currentSupplements.length > 0
              ? 'Generate your personalized ViaConnect protocol based on your assessment'
              : 'No supplements in your protocol yet.'}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs sm:text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {generating ? '\u23F3 Analyzing Your Profile...' : '\u26A1 Generate My Protocol'}
          </button>
        </div>

        {/* Shop link */}
        <div className="pt-4 border-t border-white/[0.06] text-center">
          <a
            href="https://farmceuticawellness.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper text-xs sm:text-sm font-medium hover:text-copper/80 transition-colors"
          >
            Shop ViaConnect &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-white font-semibold text-sm sm:text-lg truncate">
          Your Personalized Protocol
        </h3>
        <span className="text-[10px] sm:text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
          {recs.length} products
        </span>
      </div>

      {/* Confidence badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit max-w-full">
        <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
        <span className="text-cyan-300 text-[10px] sm:text-xs font-medium truncate">
          {recs[0]?.confidence_score || 68}% Confidence (
          {recs[0]?.confidence_level === 'combined'
            ? 'Genetic + Assessment'
            : 'Assessment-Based'}
          )
        </span>
      </div>

      {/* Time-of-day groups */}
      {(['morning', 'afternoon', 'evening'] as const).map((time) => {
        const items = grouped[time] || [];
        if (!items.length) return null;
        const c = cfg[time];
        return (
          <div key={time}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{c.icon}</span>
              <span className="text-xs sm:text-sm font-medium" style={{ color: c.color }}>
                {c.label}
              </span>
            </div>
            <div className="space-y-1.5">
              {items.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: `${c.color}15`, color: c.color }}
                    >
                      {rec.product_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs sm:text-sm font-medium truncate">
                        {rec.product_name}
                      </p>
                      <p className="text-white/40 text-[10px] sm:text-xs truncate">
                        {rec.dosage} &middot; {rec.frequency}
                      </p>
                    </div>
                  </div>
                  <span />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA */}
      <div className="pt-4 border-t border-white/[0.06] flex justify-end">
        <a
          href="https://farmceuticawellness.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Shop ViaConnect
        </a>
      </div>

      {/* Supplement Replacements */}
      {replacements.length > 0 && (
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
          <p className="text-white text-xs sm:text-sm font-medium mb-2">
            {'\uD83D\uDD04'} Upgrade Your Current Supplements
          </p>
          <p className="text-white/50 text-[10px] sm:text-xs mb-3">
            We found ViaConnect replacements with 10-27x bioavailability for supplements you&apos;re already taking:
          </p>
          <div className="space-y-2">
            {replacements.map((r) => (
              <div
                key={r.replacement_sku}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white/30 text-[10px] sm:text-xs line-through whitespace-nowrap flex-shrink-0">
                    {r.current_supplement}
                  </span>
                  <span className="text-white/30 text-xs flex-shrink-0">{'\u2192'}</span>
                  <span className="text-emerald-400 text-xs sm:text-sm font-medium truncate">
                    {r.replacement_name}
                  </span>
                </div>
                <p className="text-white/40 text-[10px] leading-tight sm:hidden">{r.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genetic upsell */}
      {recs[0]?.confidence_level === 'questionnaire' && (
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <p className="text-white text-xs sm:text-sm font-medium mb-1">
            {'\uD83E\uDDEC'} Unlock 94%+ confidence with genetic testing
          </p>
          <p className="text-white/50 text-[10px] sm:text-xs mb-2">
            GENEX360 adds 80+ genetic markers for precision targeting.
          </p>
          <a
            href="/genex360"
            className="text-purple-300 text-[10px] sm:text-xs font-medium hover:text-purple-200 transition-colors"
          >
            Upgrade to GENEX360 &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
