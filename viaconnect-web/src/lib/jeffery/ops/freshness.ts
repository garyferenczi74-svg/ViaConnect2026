/**
 * Prompt 219H: freshness target measurement for ACC.
 */

import { createAdminClient, createAdminClientOrNull } from "@/lib/supabase/admin";
import { safeLog } from "@/lib/utils/safe-log";
import type { FreshnessReading } from "./types";

const DEFAULT_TARGETS: Array<{
  target_key: string;
  label: string;
  max_age_hours: number;
  domain: string;
}> = [
  {
    target_key: "user_insights",
    label: "User insight surfaces",
    max_age_hours: 4,
    domain: "hannah",
  },
  {
    target_key: "domain_digests",
    label: "Domain digests",
    max_age_hours: 1,
    domain: "digests",
  },
  {
    target_key: "gated_research",
    label: "Newly gated research curated",
    max_age_hours: 24,
    domain: "research",
  },
  {
    target_key: "genetics_peptide_evidence",
    label: "Genetics/peptide evidence",
    max_age_hours: 24,
    domain: "elysium_thanos",
  },
  {
    target_key: "product_layer",
    label: "Product layer freshness",
    max_age_hours: 24,
    domain: "product",
  },
];

function statusFor(ageHours: number | null, max: number): FreshnessReading["status"] {
  if (ageHours === null) return "unknown";
  if (ageHours <= max) return "ok";
  if (ageHours <= max * 1.25) return "warning";
  return "breach";
}

async function ageHoursFromTable(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  timeCol: string
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select(timeCol)
      .order(timeCol, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const ts = (data as Record<string, string>)[timeCol];
    if (!ts) return null;
    return (Date.now() - new Date(ts).getTime()) / 3_600_000;
  } catch {
    return null;
  }
}

export async function measureFreshness(): Promise<FreshnessReading[]> {
  let targets = DEFAULT_TARGETS;
  try {
    const supabase = createAdminClientOrNull();
    if (!supabase) {
      return DEFAULT_TARGETS.map((t) => ({
        targetKey: t.target_key,
        label: t.label,
        maxAgeHours: t.max_age_hours,
        ageHours: null,
        status: "unknown" as const,
        domain: t.domain,
      }));
    }
    const { data } = await supabase.from("freshness_targets").select("*");
    if (data?.length) {
      targets = data.map((r) => ({
        target_key: String((r as { target_key: string }).target_key),
        label: String((r as { label: string }).label),
        max_age_hours: Number((r as { max_age_hours: number }).max_age_hours),
        domain: String((r as { domain: string }).domain),
      }));
    }

    const readings: FreshnessReading[] = [];

    for (const t of targets) {
      let age: number | null = null;
      if (t.target_key === "user_insights") {
        age = await ageHoursFromTable(supabase, "hannah_daily_notes", "created_at");
        if (age === null) {
          age = await ageHoursFromTable(supabase, "hannah_accelerator_insights", "created_at");
        }
      } else if (t.target_key === "domain_digests") {
        // Proxy: latest ops digest rollup or meal log
        age = await ageHoursFromTable(supabase, "meals", "logged_at");
        if (age === null) age = await ageHoursFromTable(supabase, "meals", "created_at");
      } else if (t.target_key === "gated_research") {
        age = await ageHoursFromTable(supabase, "sherlock_curation_items", "created_at");
        if (age === null) {
          age = await ageHoursFromTable(supabase, "hounddog_gated_items", "approved_at");
        }
      } else if (t.target_key === "genetics_peptide_evidence") {
        age = await ageHoursFromTable(supabase, "pipeline_runs", "ended_at");
      } else if (t.target_key === "product_layer") {
        age = await ageHoursFromTable(supabase, "product_content", "updated_at");
      }

      const st = statusFor(age, t.max_age_hours);
      readings.push({
        targetKey: t.target_key,
        label: t.label,
        maxAgeHours: t.max_age_hours,
        ageHours: age === null ? null : Math.round(age * 10) / 10,
        status: st,
        domain: t.domain,
      });

      try {
        await supabase
          .from("freshness_targets")
          .update({
            last_measured_at: new Date().toISOString(),
            last_age_hours: age,
            last_status: st,
            updated_at: new Date().toISOString(),
          })
          .eq("target_key", t.target_key);
      } catch {
        /* open */
      }
    }

    return readings;
  } catch (err) {
    safeLog.warn("ops.freshness", "measure failed open", {
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_TARGETS.map((t) => ({
      targetKey: t.target_key,
      label: t.label,
      maxAgeHours: t.max_age_hours,
      ageHours: null,
      status: "unknown" as const,
      domain: t.domain,
    }));
  }
}
