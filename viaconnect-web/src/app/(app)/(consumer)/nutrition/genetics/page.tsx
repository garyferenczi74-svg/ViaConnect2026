// Prompt 187 Task 4 (2026-06-11): the Nutrition by Genetics page. Server
// shell: resolves the user, preloads the three result-source status booleans
// with fail open reads (each timeout wrapped, try/catch, one safeLog line; on
// any failure the source is treated as absent), renders the back link, the
// header with the active-source pill, and hands the booleans to the client
// tabs container. The consumer layout paints the Deep Navy page behind this.
//
// The two 187 tables (nutrition_genetic_findings, nutrition_test_uploads) are
// live but not yet in the generated Database types, so the three reads go
// through the loose SupabaseLike cast the genetics lib defines, the same way
// useNutritionHubMetrics casts its client.

import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { SupabaseLike } from '@/lib/nutrition/genetics/recommendations';
import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import { NutritionGeneticsTabs } from '@/components/nutrition/genetics/NutritionGeneticsTabs';
import { NutritionByGeneticsPanel } from '@/components/protocol/NutritionByGeneticsPanel';

const TIMEOUT_MS = 4_000;

// payment_status values treated as paid for the Tab 1 pending state. Read
// defensively (lowercased) because the column is free text in the schema.
const PAID_STATUSES = ['paid', 'succeeded', 'completed'];

// Head count of the user's ACTIVE findings for one source. Fail open: any
// timeout, thrown error, or supabase error response counts as absent.
async function hasActiveFindings(
  db: SupabaseLike,
  userId: string,
  source: 'nutrigendx' | 'uploaded_test',
): Promise<boolean> {
  try {
    const result = (await withTimeout(
      db
        .from('nutrition_genetic_findings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source', source)
        .is('superseded_at', null),
      TIMEOUT_MS,
      `nutrition.genetics.page.findings.${source}`,
    )) as { count: number | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('nutrition.genetics.page', 'findings count failed', {
        userId,
        source,
        error: result.error.message ?? 'supabase error response',
      });
      return false;
    }
    return (result.count ?? 0) > 0;
  } catch (err) {
    safeLog.warn('nutrition.genetics.page', 'findings count failed', {
      userId,
      source,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// GeneX360 NutrigenDX variants already on the account (panel_key=nutrition).
async function hasNutrigenDxVariants(db: SupabaseLike, userId: string): Promise<boolean> {
  try {
    const result = (await withTimeout(
      db
        .from('user_variants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('panel_key', 'nutrition'),
      TIMEOUT_MS,
      'nutrition.genetics.page.variants',
    )) as { count: number | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('nutrition.genetics.page', 'variants count failed', {
        userId,
        error: result.error.message ?? 'supabase error response',
      });
      return false;
    }
    return (result.count ?? 0) > 0;
  } catch (err) {
    safeLog.warn('nutrition.genetics.page', 'variants count failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// Any undelivered genex360 purchase in a paid-ish state means NutrigenDX
// results are pending. Fail open to false.
async function hasPendingNutrigenDx(db: SupabaseLike, userId: string): Promise<boolean> {
  try {
    const result = (await withTimeout(
      db
        .from('genex360_purchases')
        .select('payment_status')
        .eq('user_id', userId)
        .is('test_results_delivered_at', null),
      TIMEOUT_MS,
      'nutrition.genetics.page.pending',
    )) as { data: { payment_status?: string | null }[] | null; error: { message?: string } | null };
    if (result.error) {
      safeLog.warn('nutrition.genetics.page', 'genex360 pending read failed', {
        userId,
        error: result.error.message ?? 'supabase error response',
      });
      return false;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    return rows.some((row) => PAID_STATUSES.includes(String(row.payment_status ?? '').toLowerCase()));
  } catch (err) {
    safeLog.warn('nutrition.genetics.page', 'genex360 pending read failed', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export default async function NutritionGeneticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = supabase as unknown as SupabaseLike;
  const [hasNutrigenDxFindings, hasNutrigenDxVars, hasUploaded, nutrigenDxPending] =
    await Promise.all([
      hasActiveFindings(db, user.id, 'nutrigendx'),
      hasNutrigenDxVariants(db, user.id),
      hasActiveFindings(db, user.id, 'uploaded_test'),
      hasPendingNutrigenDx(db, user.id),
    ]);

  const hasNutrigenDx = hasNutrigenDxFindings || hasNutrigenDxVars;
  const hasResults = hasNutrigenDx || hasUploaded;
  const sourceLabel = hasNutrigenDx ? 'NutrigenDX' : hasUploaded ? 'Uploaded Test' : 'No Results Yet';

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <BackToNutritionLink />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-white md:text-[26px]">
            Nutrition by Genetics
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
            Your genetic blueprint, translated into what to eat and what to limit.
          </p>
        </div>
        {/* Active source pill, styled like the hub's Guided-by chip with a
            teal accent when results exist. */}
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${
            hasResults
              ? 'border-[#2DA5A0]/40 bg-[#2DA5A0]/10 text-white/90'
              : 'border-white/10 bg-white/[0.04] text-white/55'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              hasResults ? 'bg-[#2DA5A0]' : 'bg-white/30'
            }`}
          />
          {sourceLabel}
        </span>
      </header>

      {/* The tabs container reads ?tab= / &sub= via useSearchParams, so it
          needs a Suspense boundary under this server shell. */}
      <div className="mt-6">
        <Suspense fallback={<div className="h-12" />}>
          <NutritionGeneticsTabs
            userId={user.id}
            hasNutrigenDx={hasNutrigenDx}
            hasUploaded={hasUploaded}
            nutrigenDxPending={nutrigenDxPending}
          />
        </Suspense>
      </div>

      {/* Nutrition by Genetics panel: Gordon's synthesis-driven prefer/avoid
          lists keyed to the member's variants. Client component; fetches its
          own data via GET /api/protocol/synthesis. */}
      <div className="mt-8">
        <NutritionByGeneticsPanel />
      </div>
    </div>
  );
}
