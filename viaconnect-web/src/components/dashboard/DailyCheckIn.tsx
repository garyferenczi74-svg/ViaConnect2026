'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, Bed, Activity, Footprints, Brain, HeartPulse,
  ChevronDown, Check, type LucideIcon,
} from 'lucide-react';

interface Question {
  gaugeId: string;
  icon: LucideIcon;
  label: string;
  options: string[];
  scores: number[];
}

const QUESTIONS: Question[] = [
  { gaugeId: 'sleep', icon: Bed, label: 'How did you sleep?', options: ['Terrible', 'Poor', 'OK', 'Good', 'Great'], scores: [10, 30, 50, 70, 90] },
  { gaugeId: 'exercise', icon: Activity, label: 'Exercise today?', options: ['None', '< 15 min', '15-30 min', '30-60 min', '60+ min'], scores: [0, 25, 50, 75, 100] },
  { gaugeId: 'steps', icon: Footprints, label: 'How active were you?', options: ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'], scores: [10, 30, 50, 70, 90] },
  { gaugeId: 'stress', icon: Brain, label: 'Stress level?', options: ['Very High', 'High', 'Moderate', 'Low', 'Very Low'], scores: [10, 30, 50, 70, 90] },
  { gaugeId: 'recovery', icon: HeartPulse, label: 'Energy & recovery?', options: ['Exhausted', 'Tired', 'OK', 'Good', 'Energized'], scores: [10, 30, 50, 70, 90] },
];

export function DailyCheckIn() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.gaugeId] !== undefined);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        const { data } = await (supabase as any)
          .from('daily_score_inputs')
          .select('id')
          .eq('user_id', user.id)
          .eq('score_date', today)
          .eq('source_id', 'manual_checkin')
          .limit(1);
        if (data && data.length > 0) {
          setSubmitted(true);
          setCollapsed(true);
        }
      } catch { /* table may not exist yet */ }
    })();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!allAnswered || loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      const rows = QUESTIONS.map((q) => ({
        user_id: user.id,
        gauge_id: q.gaugeId,
        source_id: 'manual_checkin',
        tier: 4,
        raw_value: answers[q.gaugeId],
        normalized_score: answers[q.gaugeId],
        confidence: 0.6,
        score_date: today,
      }));

      await (supabase as any)
        .from('daily_score_inputs')
        .upsert(rows, { onConflict: 'user_id,gauge_id,source_id,score_date' });

      setSubmitted(true);
    } catch { /* table may not exist yet */ }
    finally { setLoading(false); }
  }, [allAnswered, answers, loading]);

  if (submitted && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-3"
      >
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
          <span className="text-xs font-medium text-white/60">Daily check-in complete</span>
        </div>
        <span className="text-xs text-[#2DA5A0]">+15 pts</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4 sm:p-5">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold text-white">Quick Daily Check</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#2DA5A0]">+15 pts</span>
          <ChevronDown
            className={`h-4 w-4 text-white/40 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            strokeWidth={1.5}
          />
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {QUESTIONS.map((q) => {
                const Icon = q.icon;
                const selected = answers[q.gaugeId];
                return (
                  <div key={q.gaugeId}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-white/50" strokeWidth={1.5} />
                      <span className="text-xs text-white/70">{q.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map((opt, i) => {
                        const isSelected = selected === q.scores[i];
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, [q.gaugeId]: q.scores[i] }))}
                            disabled={submitted}
                            className={`min-h-[32px] rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                              isSelected
                                ? 'border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 text-[#2DA5A0]'
                                : 'border border-white/[0.06] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!submitted && (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || loading}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 text-sm font-medium text-[#2DA5A0] transition-all hover:bg-[#2DA5A0]/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? 'Saving...' : 'Submit Check-In'}
                </button>
              )}

              {submitted && (
                <div className="flex items-center gap-2 rounded-lg border border-[#22C55E]/20 bg-[#22C55E]/10 p-3">
                  <Check className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                  <span className="text-xs text-[#22C55E]">Check-in saved! +15 Helix Points</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
