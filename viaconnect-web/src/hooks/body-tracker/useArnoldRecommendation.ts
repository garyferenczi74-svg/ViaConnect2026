'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type RecommendationSource = 'body_tracker' | 'supplements' | 'caq' | 'genetics';

export interface ArnoldCrossReferenceRecommendation {
  id: string;
  text: string;
  sources: RecommendationSource[];
  confidenceTier: 1 | 2 | 3;
  confidencePct: number;
  generatedAt: string;
}

export interface UseArnoldCrossReferenceRecommendationResult {
  recommendation: ArnoldCrossReferenceRecommendation | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  generate: (regenerate?: boolean) => Promise<void>;
  dismiss: () => Promise<void>;
}

interface RecRow {
  id: string;
  recommendation_text: string;
  source_ids: string[];
  confidence_tier: number;
  confidence_pct: number;
  generated_at: string;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  '';

function rowToRecommendation(row: RecRow): ArnoldCrossReferenceRecommendation {
  const allowed: RecommendationSource[] = ['body_tracker', 'supplements', 'caq', 'genetics'];
  const sources = (row.source_ids ?? []).filter((s): s is RecommendationSource =>
    allowed.includes(s as RecommendationSource),
  );
  const tier = (row.confidence_tier === 1 || row.confidence_tier === 2 || row.confidence_tier === 3)
    ? (row.confidence_tier as 1 | 2 | 3)
    : 1;
  return {
    id: row.id,
    text: row.recommendation_text,
    sources,
    confidenceTier: tier,
    confidencePct: row.confidence_pct,
    generatedAt: row.generated_at,
  };
}

export function useArnoldRecommendation(userId: string | null): UseArnoldCrossReferenceRecommendationResult {
  const [recommendation, setRecommendation] = useState<ArnoldCrossReferenceRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setRecommendation(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const supabase = createClient();
        type Loose = {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                is: (col: string, val: null) => {
                  order: (col: string, opts: { ascending: boolean }) => {
                    limit: (n: number) => {
                      maybeSingle: () => Promise<{ data: RecRow | null; error: { message: string } | null }>;
                    };
                  };
                };
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;
        const { data, error: dbErr } = await sb.from('body_tracker_recommendations')
          .select('id, recommendation_text, source_ids, confidence_tier, confidence_pct, generated_at')
          .eq('user_id', userId)
          .is('dismissed_at', null)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);
        setRecommendation(data ? rowToRecommendation(data) : null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load recommendation');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  const generate = async (regenerate = false) => {
    if (!userId) return;
    setGenerating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');
      const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/arnold-cross-reference-recommend`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ regenerate }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error ?? `Generation failed (${res.status})`);
      }
      const out = await res.json() as {
        id: string;
        recommendation: string;
        sources: string[];
        confidence_tier: number;
        confidence_pct: number;
        generated_at: string;
      };
      setRecommendation(rowToRecommendation({
        id: out.id,
        recommendation_text: out.recommendation,
        source_ids: out.sources,
        confidence_tier: out.confidence_tier,
        confidence_pct: out.confidence_pct,
        generated_at: out.generated_at,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const dismiss = async () => {
    if (!userId || !recommendation) return;
    setError(null);
    try {
      const supabase = createClient();
      type Loose = {
        from: (t: string) => {
          update: (p: Record<string, unknown>) => {
            eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const sb = supabase as unknown as Loose;
      await sb.from('body_tracker_recommendations')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', recommendation.id);
      setRecommendation(null);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not dismiss');
    }
  };

  return { recommendation, loading, generating, error, generate, dismiss };
}
