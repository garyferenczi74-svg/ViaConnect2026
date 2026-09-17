/**
 * Labs Soft assemble — engines/labs SSOT read only.
 * Same loader as GET /api/labs/results (loadLabResults → lab_biomarkers).
 * Rhythm Health uploads persist into that table. No invent tables/migrations.
 * Payload is biomarker keys only — never dump raw values / units / ranges.
 * Demo Client 4634 / demo@ never map.
 */

import { createClient } from "@/lib/supabase/server";
import { loadLabResults } from "@/lib/labs/loadLabResults";
import { biomarkerKeyFor } from "@/lib/labs/biomarkerDictionary";
import { isBannedDemoAccount } from "@/lib/jeffery/grounded/lookup-snp-assemble";
import { safeLog } from "@/lib/utils/safe-log";
import type { LabsEnginePayload, LabsMemberRow } from "./map";

export const LABS_ASSEMBLE_ROUTE = "GET /api/labs/results";

export interface LabsAssembleInput {
  userId: string;
}

export type AssembleLabsNextOrderFn = (input: LabsAssembleInput) => Promise<LabsEnginePayload>;

function keysFromConfirmedRows(
  rows: ReadonlyArray<{ name?: string | null }>
): LabsMemberRow[] {
  const out: LabsMemberRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = biomarkerKeyFor(row.name ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ biomarker_key: key, is_sample: false });
  }
  return out;
}

export async function assembleLabsNextOrder(
  input: LabsAssembleInput
): Promise<LabsEnginePayload> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { loadStatus: "unauthorized", biomarkers: [] };
    }
    if (input.userId && input.userId !== user.id) {
      return { loadStatus: "unauthorized", biomarkers: [], error: "user mismatch" };
    }

    const demoAccount = isBannedDemoAccount(user);

    try {
      const rows = await loadLabResults(supabase, user.id);
      return {
        loadStatus: "ok",
        demoAccount,
        biomarkers: keysFromConfirmedRows(rows),
      };
    } catch (err) {
      safeLog.error("advisor.grounded.labs-next-order", "loadLabResults threw", {
        user_id: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        loadStatus: "error",
        biomarkers: [],
        demoAccount,
        error: "labs load failed",
      };
    }
  } catch (err) {
    safeLog.error("advisor.grounded.labs-next-order", "unexpected error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { loadStatus: "error", biomarkers: [], error: "labs assemble failed" };
  }
}
