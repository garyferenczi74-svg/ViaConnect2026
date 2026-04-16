'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArnoldRecommendationCard,
  type ArnoldRecommendation,
} from '@/components/body-tracker/ArnoldRecommendationCard';

/* ── Relative time helper ────────────────────────────── */
function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const min = diff / (1000 * 60);
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.round(min)} min ago`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* ── Skeleton card ───────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/[0.08]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 rounded bg-white/[0.08]" />
          <div className="h-2.5 w-full rounded bg-white/[0.06]" />
          <div className="h-2.5 w-2/3 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-[44px] flex-1 rounded-lg bg-white/[0.06]" />
        <div className="h-[44px] w-20 rounded-lg bg-white/[0.06]" />
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────── */
export function ArnoldCoachingSection() {
  const [recs, setRecs] = useState<ArnoldRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /* Fetch recommendations */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data } = await (supabase as any)
          .from('arnold_recommendations')
          .select('id, title, body, category, priority, suggested_action, supporting_data, created_at')
          .eq('user_id', user.id)
          .eq('dismissed', false)
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(3);

        if (!cancelled && data) {
          const mapped: ArnoldRecommendation[] = data.map((r: any) => ({
            id: r.id,
            title: r.title,
            body: r.body,
            category: r.category,
            priority: r.priority,
            suggestedAction: r.suggested_action ?? undefined,
            supportingData: r.supporting_data ?? undefined,
          }));
          setRecs(mapped);
          if (data.length > 0) {
            setLastUpdated(data[0].created_at);
          }
        }
      } catch {
        /* table may not exist yet */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Dismiss handler */
  const handleAction = useCallback(
    async (recId: string, action: 'view' | 'act' | 'dismiss') => {
      if (action === 'dismiss') {
        setRecs((prev) => prev.filter((r) => r.id !== recId));
        try {
          const supabase = createClient();
          await (supabase as any)
            .from('arnold_recommendations')
            .update({ dismissed: true })
            .eq('id', recId);
        } catch {
          /* silent */
        }
      }
      /* view / act: future navigation */
    },
    [],
  );

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Arnold&apos;s Coaching</h2>
          <span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-2 py-0.5 text-[10px] font-medium text-[#2DA5A0]">
            Today
          </span>
        </div>
        <Link
          href="/body-tracker"
          className="flex items-center gap-1 text-xs text-[#2DA5A0] transition-colors hover:text-[#2DA5A0]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
        >
          View All
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : recs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-white/[0.08] bg-white/5 p-6 text-center backdrop-blur-md"
        >
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-white/20" strokeWidth={1.5} />
          <p className="text-sm text-white/50">
            No coaching recommendations yet. Keep logging your data and Arnold will have
            insights for you soon.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {recs.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
              >
                <ArnoldRecommendationCard
                  recommendation={rec}
                  onAction={handleAction}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Last updated */}
      {!loading && lastUpdated && (
        <p className="text-[10px] text-white/25">
          Last updated: {formatRelative(lastUpdated)}
        </p>
      )}
    </section>
  );
}
