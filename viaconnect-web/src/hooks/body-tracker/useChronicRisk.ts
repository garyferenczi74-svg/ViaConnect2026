'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ChronicRiskAssessment,
  TrackedCondition,
  ChronicRiskDataSource,
} from '@/lib/body-tracker/chronic-risk-types';

export interface UseChronicRiskResult {
  assessment: ChronicRiskAssessment | null;
  loading: boolean;
  computing: boolean;
  error: string | null;
  recompute: () => Promise<void>;
}

interface DbRow {
  id: string;
  user_id: string;
  assessment_date: string;
  overall_score: number | null;
  overall_grade: string | null;
  conditions: unknown;
  data_sources_used: unknown;
  arnold_summary: string | null;
  created_at: string;
}

function normalizeConditions(raw: unknown): TrackedCondition[] {
  if (!Array.isArray(raw)) return [];
  const out: TrackedCondition[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const name = typeof c.name === 'string' ? c.name : null;
    const riskScore = typeof c.riskScore === 'number' ? c.riskScore : null;
    const severity = typeof c.severity === 'string'
      ? (c.severity as TrackedCondition['severity'])
      : null;
    const trend = typeof c.trend === 'string'
      ? (c.trend as TrackedCondition['trend'])
      : null;
    if (!name || riskScore === null || !severity || !trend) continue;
    const td = Array.isArray(c.trendData)
      ? c.trendData.filter((v): v is number => typeof v === 'number')
      : undefined;
    const ind = Array.isArray(c.indicators)
      ? c.indicators.filter((v): v is string => typeof v === 'string')
      : undefined;
    out.push({ name, riskScore, severity, trend, trendData: td, indicators: ind });
  }
  return out;
}

function normalizeSources(raw: unknown): ChronicRiskDataSource[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<ChronicRiskDataSource>([
    'body_tracker', 'caq', 'genex360', 'lab_results',
  ]);
  const out: ChronicRiskDataSource[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && allowed.has(item as ChronicRiskDataSource)) {
      out.push(item as ChronicRiskDataSource);
    }
  }
  return out;
}

export function useChronicRisk(userId: string | null): UseChronicRiskResult {
  const [assessment, setAssessment] = useState<ChronicRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) {
      setAssessment(null);
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
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{
                      data: DbRow | null;
                      error: { message: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
        const sb = supabase as unknown as Loose;
        const { data, error: dbErr } = await sb.from('body_tracker_chronic_risk')
          .select('id, user_id, assessment_date, overall_score, overall_grade, conditions, data_sources_used, arnold_summary, created_at')
          .eq('user_id', userId)
          .order('assessment_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (dbErr) throw new Error(dbErr.message);
        if (!data) {
          setAssessment(null);
        } else {
          setAssessment({
            id: data.id,
            user_id: data.user_id,
            assessment_date: data.assessment_date,
            overall_score: data.overall_score,
            overall_grade: data.overall_grade,
            conditions: normalizeConditions(data.conditions),
            data_sources_used: normalizeSources(data.data_sources_used),
            arnold_summary: data.arnold_summary,
            created_at: data.created_at,
          });
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load chronic risk');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, tick]);

  const recompute = useCallback(async () => {
    if (!userId) return;
    setComputing(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) throw new Error('No active session');

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/arnold-chronic-risk-compute`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(errPayload.error || `Compute failed (${res.status})`);
      }
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute chronic risk');
    } finally {
      setComputing(false);
    }
  }, [userId]);

  return { assessment, loading, computing, error, recompute };
}
