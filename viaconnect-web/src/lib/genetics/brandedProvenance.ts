// Prompt 204b (2026-06-17): resolve which panels a member has a Farmceutica
// Wellness Ltd branded test for, so the panel buttons can flip from their
// generic label to the branded product label. A competitor upload never makes a
// panel branded.
//
// Source of truth (Decision Gate 1), in precedence order:
//   1. dna_uploads with is_farmceutica = true (a branded kit was uploaded)
//   2. genex360_purchases delivered (the member bought a GENEX360 panel)
//   3. kit_registrations completed (a registered branded kit)
//
// genex360_purchases and kit_registrations are EMPTY today and their
// product_id / panel_type formats are not yet pinned, so the matcher tolerates a
// branded product code, a panel slug, or a panel_key string. Until real branded
// data exists with a confirmed format, this returns an empty set and every panel
// renders its generic label. Fail-open: any read error yields no branded panels.

import { safeLog } from '@/lib/utils/safe-log';
import {
  panelKeyForProductCode,
  panelKeyForSlug,
  PANEL_LABELS,
  PANEL_KEYS,
  type PanelKey,
} from './panelLabels';

/** Best-effort map of an unknown identifier to a panel_key. */
function matchPanelKey(raw: string | null | undefined): PanelKey | null {
  if (!raw) return null;
  const value = raw.trim();
  return (
    panelKeyForProductCode(value) ??
    panelKeyForSlug(value) ??
    (PANEL_KEYS.find((k) => k === value.toLowerCase()) ?? null) ??
    (PANEL_KEYS.find((k) => PANEL_LABELS[k].branded_label.toLowerCase() === value.toLowerCase()) ?? null)
  );
}

export async function getBrandedPanelKeys(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<PanelKey[]> {
  const branded = new Set<PanelKey>();

  // The three provenance reads are independent, so run them concurrently. Each
  // is individually fail-open so one source erroring never sinks the others.
  const fromUploads = (async (): Promise<PanelKey[]> => {
    try {
      const { data } = await supabase
        .from('dna_uploads')
        .select('branded_product_code, is_farmceutica')
        .eq('user_id', userId)
        .eq('is_farmceutica', true);
      return (data ?? [])
        .map((row: { branded_product_code: string | null }) => panelKeyForProductCode(row.branded_product_code))
        .filter((k: PanelKey | null): k is PanelKey => k !== null);
    } catch (err) {
      safeLog.warn('genetics.branded', 'dna_uploads read failed (continuing)', {
        user_id: userId, error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  })();

  const fromPurchases = (async (): Promise<PanelKey[]> => {
    try {
      const { data } = await supabase
        .from('genex360_purchases')
        .select('product_id, lifecycle_status, test_results_delivered_at')
        .eq('user_id', userId);
      const keys: PanelKey[] = [];
      for (const row of data ?? []) {
        const delivered = row.test_results_delivered_at != null || row.lifecycle_status === 'delivered';
        if (!delivered) continue;
        const key = matchPanelKey(row.product_id);
        if (key) keys.push(key);
      }
      return keys;
    } catch (err) {
      safeLog.warn('genetics.branded', 'genex360_purchases read failed (continuing)', {
        user_id: userId, error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  })();

  const fromKits = (async (): Promise<PanelKey[]> => {
    try {
      const { data } = await supabase
        .from('kit_registrations')
        .select('panel_type, status')
        .eq('user_id', userId)
        .eq('status', 'completed');
      return (data ?? [])
        .map((row: { panel_type: string | null }) => matchPanelKey(row.panel_type))
        .filter((k: PanelKey | null): k is PanelKey => k !== null);
    } catch (err) {
      safeLog.warn('genetics.branded', 'kit_registrations read failed (continuing)', {
        user_id: userId, error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  })();

  const groups = await Promise.all([fromUploads, fromPurchases, fromKits]);
  for (const group of groups) {
    for (const key of group) branded.add(key);
  }

  return [...branded];
}
