'use client';

// WellnessSnapshot — compact AI Wellness Analytics preview with a recharts
// radar chart of all 10 categories. Loads from `wellness_analytics` if a row
// exists; otherwise calls /api/ai/generate-wellness-analytics to generate one.
// Hidden on mobile per Prompt #56 layout — render this in a desktop-only slot.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CategoryEntry {
  id: string;
  name: string;
  score: number;
}

interface WellnessSnapshotProps {
  /** When true, auto-fetches/generates analytics on mount. */
  autoFetch?: boolean;
}

// Short labels for the radar axes (kept tight so they don't overlap)
const SHORT_LABELS: Record<string, string> = {
  nutrient_profile: 'Nutrient',
  symptom_landscape: 'Symptoms',
  risk_radar: 'Risk',
  medication_intel: 'Meds',
  protocol_effectiveness: 'Protocol',
  sleep_recovery: 'Sleep',
  stress_mood: 'Mood',
  metabolic_health: 'Metabolic',
  immune_inflammation: 'Immune',
  bio_optimization_trends: 'Bio Opt',
};

export function WellnessSnapshot({ autoFetch = true }: WellnessSnapshotProps) {
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = async (): Promise<CategoryEntry[] | null> => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await (supabase as any)
        .from('wellness_analytics')
        .select('categories, calculated_at')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && Array.isArray(data.categories)) {
        return data.categories.map((c: { id: string; name: string; score: number }) => ({
          id: c.id,
          name: c.name,
          score: typeof c.score === 'number' ? c.score : 0,
        }));
      }
      return null;
    } catch {
      return null;
    }
  };

  const generateFresh = async (): Promise<CategoryEntry[] | null> => {
    try {
      setGenerating(true);
      const res = await fetch('/api/ai/generate-wellness-analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trigger: 'dashboard' }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'generation failed');
      if (Array.isArray(json.categories)) {
        return json.categories.map((c: { id: string; name: string; score: number }) => ({
          id: c.id,
          name: c.name,
          score: typeof c.score === 'number' ? c.score : 0,
        }));
      }
      return null;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate analytics');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const saved = await fetchSaved();
      if (cancelled) return;
      if (saved && saved.length > 0) {
        setCategories(saved);
        setLoading(false);
        return;
      }
      // No saved row — try one generation
      const fresh = await generateFresh();
      if (cancelled) return;
      if (fresh) setCategories(fresh);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [autoFetch]);

  // Build radar data
  const radarData = categories.map((c) => ({
    label: SHORT_LABELS[c.id] || c.name,
    score: c.score,
  }));

  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const low = sorted[sorted.length - 1];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Wellness Snapshot
          </h2>
        </div>
      </div>

      {loading || generating ? (
        <div className="flex h-[260px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-[#2DA5A0]/20" />
            <p className="text-[11px] text-white/40">
              {generating ? 'Generating insights…' : 'Loading…'}
            </p>
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-white/60">
            {error || 'No wellness data yet'}
          </p>
          <Link
            href="/wellness-analytics"
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 py-2 text-xs font-medium text-[#2DA5A0] hover:border-[#2DA5A0]/50 hover:bg-[#2DA5A0]/20"
          >
            Open Wellness Analytics
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      ) : (
        <>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#2DA5A0"
                  fill="#2DA5A0"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {top && low && (
            <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-white/65">
                  <TrendingUp className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
                  Top: {top.name}
                </span>
                <span className="font-semibold text-[#22C55E]">{top.score}/100</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-white/65">
                  <TrendingDown className="h-3 w-3 text-[#F59E0B]" strokeWidth={1.5} />
                  Low: {low.name}
                </span>
                <span className="font-semibold text-[#F59E0B]">{low.score}/100</span>
              </div>
            </div>
          )}

          <Link
            href="/wellness-analytics"
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            View Full Analytics
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </>
      )}
    </section>
  );
}
