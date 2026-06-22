/**
 * src/lib/kb/secondaryFindings.ts
 *
 * Secondary-findings gene set reader and membership check.
 * Prompt 208a, Module I, Task I2 (2026-06-21).
 *
 * Reads distinct gene values from secondary_findings_exclusions via the admin
 * client and exposes a membership predicate. Fail-open: any error returns an
 * empty Set so synthesis never crashes on a missing or inaccessible table.
 *
 * A variant whose gene is in the SF gene set NEVER drives a protocol item.
 * It is instead routed to genetic-counseling language in synthesis output.
 *
 * No em/en-dashes. No emojis. No new dependencies. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read the distinct gene names from secondary_findings_exclusions and return
 * them as an uppercased Set for fast O(1) membership testing.
 *
 * Fail-open: returns an empty Set on any error (DB unavailable, missing table,
 * env not configured). The caller must not crash when the set is empty.
 */
export async function getSecondaryFindingsGenes(): Promise<Set<string>> {
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch (err) {
    safeLog.warn('secondary-findings', 'createAdminClient failed - returning empty SF gene set', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Set<string>();
  }

  try {
    const { data, error } = await db
      .from('secondary_findings_exclusions')
      .select('gene') as { data: Array<{ gene: string }> | null; error: { message: string } | null };

    if (error) {
      safeLog.warn('secondary-findings', 'secondary_findings_exclusions read error - returning empty set', {
        error: error.message,
      });
      return new Set<string>();
    }

    if (!data || data.length === 0) {
      return new Set<string>();
    }

    const genes = new Set<string>();
    for (const row of data) {
      if (typeof row.gene === 'string' && row.gene.trim().length > 0) {
        genes.add(row.gene.trim().toUpperCase());
      }
    }
    return genes;
  } catch (err) {
    safeLog.warn('secondary-findings', 'secondary_findings_exclusions query threw - returning empty set', {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Set<string>();
  }
}

/**
 * Returns true when the given gene is a member of the SF gene set.
 *
 * Comparison is case-insensitive. Returns false for null/empty gene values
 * so callers can safely pass rule.gene directly without a null check.
 */
export function isSecondaryFindingGene(gene: string | null, sfGenes: Set<string>): boolean {
  if (!gene || gene.trim().length === 0) return false;
  return sfGenes.has(gene.trim().toUpperCase());
}
