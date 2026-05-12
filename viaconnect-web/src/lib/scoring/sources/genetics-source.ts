// Genetics source for the Bio Optimization Score compute bundle.
//
// Reads two tables that work together:
//   genex360_purchases : kit lifecycle (purchase -> ship -> sample ->
//                       processing -> delivered).
//   genetic_profiles   : the final SNP report payload.
//
// Derivation:
//   present = TRUE if a genetic_profiles row has any non-null SNP status
//             OR genex360_purchases.test_results_delivered_at is set.
//   processed_at = MAX of profile.report_date (cast iso) and
//                  purchase.test_results_delivered_at.
//   panel = 'genex360_v1' when a purchase row exists; null otherwise.
//
// Lifecycle status used by the Phase D read API to resolve the
// destination_key for the Genetics pill:
//   no purchase + no profile -> 'genex360_purchase'
//   purchase, no results yet -> 'genex360_status'
//   profile exists           -> 'complete'

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GeneticsSource {
  present: boolean;
  processed_at: string | null;
  panel: 'genex360_v1' | null;
  source_specific?: {
    lifecycle_status: 'genex360_purchase' | 'genex360_status' | 'complete';
    purchase_lifecycle?: string | null;
  };
}

function toIsoFromReportDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // genetic_profiles.report_date is a DATE column ('YYYY-MM-DD'); pad to
  // midnight UTC iso so we can compare against the purchase timestamptz.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00Z`;
  }
  return value;
}

function pickLatest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export async function getGeneticsSource(
  userId: string,
  supabase: SupabaseClient,
): Promise<GeneticsSource> {
  const empty: GeneticsSource = {
    present: false,
    processed_at: null,
    panel: null,
    source_specific: { lifecycle_status: 'genex360_purchase' },
  };

  try {
    const purchaseResult = await supabase
      .from('genex360_purchases')
      .select('product_id, test_results_delivered_at, lifecycle_status')
      .eq('user_id', userId)
      .order('test_results_delivered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const profileResult = await supabase
      .from('genetic_profiles')
      .select('mthfr_status, comt_status, cyp2d6_status, report_date')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const purchase = (purchaseResult.error ? null : purchaseResult.data) as
      | {
          product_id?: string | null;
          test_results_delivered_at?: string | null;
          lifecycle_status?: string | null;
        }
      | null;
    const profile = (profileResult.error ? null : profileResult.data) as
      | {
          mthfr_status?: string | null;
          comt_status?: string | null;
          cyp2d6_status?: string | null;
          report_date?: string | null;
        }
      | null;

    const profilePresent = Boolean(
      profile && (profile.mthfr_status || profile.comt_status || profile.cyp2d6_status),
    );
    const purchaseDelivered = Boolean(purchase?.test_results_delivered_at);

    const present = profilePresent || purchaseDelivered;
    const processed_at = pickLatest(
      purchase?.test_results_delivered_at ?? null,
      toIsoFromReportDate(profile?.report_date ?? null),
    );

    let lifecycle_status: 'genex360_purchase' | 'genex360_status' | 'complete';
    if (profilePresent) {
      lifecycle_status = 'complete';
    } else if (purchase && !purchaseDelivered) {
      lifecycle_status = 'genex360_status';
    } else if (purchaseDelivered) {
      lifecycle_status = 'complete';
    } else {
      lifecycle_status = 'genex360_purchase';
    }

    return {
      present,
      processed_at,
      panel: purchase?.product_id ? 'genex360_v1' : null,
      source_specific: {
        lifecycle_status,
        purchase_lifecycle: purchase?.lifecycle_status ?? null,
      },
    };
  } catch {
    return empty;
  }
}
