'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DashboardProfile {
  full_name: string | null;
  bio_optimization_score: number | null;
  bio_optimization_tier: string | null;
  bio_optimization_strengths: string[] | null;
  bio_optimization_opportunities: string[] | null;
  assessment_completed: boolean | null;
  caq_completed_at: string | null;
}

export interface DashboardSupplement {
  id: string;
  supplement_name: string;
  brand: string | null;
  product_name: string | null;
  dosage: string | null;
  dosage_form: string | null;
  frequency: string | null;
  category: string | null;
  is_current: boolean;
  is_ai_recommended: boolean;
  time_of_day?: string;
}

export interface DashboardAdherence {
  supplement_name: string;
  adherence_percent: number;
  streak_days: number;
  total_doses_logged: number;
  status: string;
}

export interface DashboardBioHistory {
  date: string;
  score: number;
  source: string;
  breakdown: Record<string, unknown> | null;
}

export interface DashboardReward {
  balance: number;
  lifetime_earned: number;
}

export interface DashboardStreak {
  current_count: number;
  longest_count: number;
}

export interface DashboardData {
  loading: boolean;
  userId: string | null;
  profile: DashboardProfile | null;
  supplements: DashboardSupplement[];
  adherence: DashboardAdherence[];
  bioHistory: DashboardBioHistory[];
  helixBalance: DashboardReward | null;
  streak: DashboardStreak | null;
  assessmentCompleted: boolean;
}

// Safe query helper: returns data or null, never throws
async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn('[dashboard] Query error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[dashboard] Query exception:', err);
    return null;
  }
}

export function useUserDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [supplements, setSupplements] = useState<DashboardSupplement[]>([]);
  const [adherence, setAdherence] = useState<DashboardAdherence[]>([]);
  const [bioHistory, setBioHistory] = useState<DashboardBioHistory[]>([]);
  const [helixBalance, setHelixBalance] = useState<DashboardReward | null>(null);
  const [streak, setStreak] = useState<DashboardStreak | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadAll() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Fetch all data in parallel — each query is safe (won't break others)
      const [profileData, suppsData, adherenceData, bioData, helixData, streakData] = await Promise.all([
        // Profile: only select columns that definitely exist
        safeQuery(() =>
          supabase
            .from('profiles')
            .select('full_name, bio_optimization_score, bio_optimization_tier, bio_optimization_strengths, bio_optimization_opportunities, assessment_completed, caq_completed_at')
            .eq('id', user.id)
            .single()
        ),
        // Supplements: try user_current_supplements first, fall back to user_supplements
        safeQuery(() =>
          supabase
            .from('user_current_supplements')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_current', true)
            .order('added_at', { ascending: true })
        ),
        // Adherence
        safeQuery(() =>
          supabase
            .from('supplement_adherence')
            .select('supplement_name, adherence_percent, streak_days, total_doses_logged, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
        ),
        // Bio history
        safeQuery(() =>
          supabase
            .from('bio_optimization_history')
            .select('date, score, source, breakdown')
            .eq('user_id', user.id)
            .order('date', { ascending: true })
            .limit(90)
        ),
        // Helix balance
        safeQuery(() =>
          supabase
            .from('helix_balances')
            .select('balance, lifetime_earned')
            .eq('user_id', user.id)
            .single()
        ),
        // Streak
        safeQuery(() =>
          supabase
            .from('helix_streaks')
            .select('current_count, longest_count')
            .eq('user_id', user.id)
            .order('current_count', { ascending: false })
            .limit(1)
            .single()
        ),
      ]);

      // Parse profile — Supabase returns numeric as strings
      if (profileData) {
        const p = profileData as Record<string, unknown>;
        setProfile({
          full_name: (p.full_name as string) || null,
          bio_optimization_score: p.bio_optimization_score ? parseFloat(String(p.bio_optimization_score)) : null,
          bio_optimization_tier: (p.bio_optimization_tier as string) || null,
          bio_optimization_strengths: (p.bio_optimization_strengths as string[]) || null,
          bio_optimization_opportunities: (p.bio_optimization_opportunities as string[]) || null,
          assessment_completed: p.assessment_completed === true,
          caq_completed_at: (p.caq_completed_at as string) || null,
        });
        console.log('[dashboard] Profile loaded:', { score: p.bio_optimization_score, completed: p.assessment_completed, tier: p.bio_optimization_tier });
      } else {
        console.warn('[dashboard] Profile query returned null — check column names');
        setProfile(null);
      }

      // If user_current_supplements returned data, use it.
      // Otherwise try user_supplements as fallback.
      let finalSupps = (suppsData as DashboardSupplement[]) || [];
      if (finalSupps.length === 0) {
        const fallback = await safeQuery(() =>
          supabase
            .from('user_supplements')
            .select('id, product_name, brand, dosage_amount, dosage_unit, delivery_method, frequency, category, is_active, source')
            .eq('user_id', user.id)
            .eq('is_active', true)
        );
        if (fallback && Array.isArray(fallback)) {
          finalSupps = (fallback as any[]).map((s) => ({
            id: s.id,
            supplement_name: s.product_name || '',
            brand: s.brand,
            product_name: s.product_name,
            dosage: s.dosage_amount ? `${s.dosage_amount}${s.dosage_unit || 'mg'}` : null,
            dosage_form: s.delivery_method || null,
            frequency: s.frequency || 'daily',
            category: s.category || null,
            is_current: true,
            is_ai_recommended: s.source === 'ai',
          }));
        }
      }
      setSupplements(finalSupps);

      setAdherence((adherenceData as DashboardAdherence[]) || []);
      // Parse bio history scores from string to number
      const parsedBioHistory = ((bioData as any[]) || []).map((h) => ({
        ...h,
        score: typeof h.score === 'string' ? parseFloat(h.score) : (h.score || 0),
      }));
      setBioHistory(parsedBioHistory as DashboardBioHistory[]);
      setHelixBalance((helixData as DashboardReward) || null);
      setStreak((streakData as DashboardStreak) || null);
      console.log('[dashboard] Data loaded:', { supplements: finalSupps.length, bioHistory: parsedBioHistory.length, helix: !!helixData, streak: !!streakData });
      setLoading(false);
    }

    loadAll();
  }, []);

  return {
    loading,
    userId,
    profile,
    supplements,
    adherence,
    bioHistory,
    helixBalance,
    streak,
    assessmentCompleted: profile?.assessment_completed === true,
  };
}
