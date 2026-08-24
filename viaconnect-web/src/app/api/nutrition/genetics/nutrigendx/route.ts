/**
 * GET /api/nutrition/genetics/nutrigendx
 * NutrigenDX GeneX360 variants + nutrition_genetic_findings cross-ref for
 * the Nutrition by Genetics Results tab.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { severityFor } from "@/lib/genetics/variantSeverity";
import { fetchActiveFindings } from "@/lib/nutrition/genetics/recommendations";
import {
  buildNutrigenDxCrossRefPayload,
  type NutrigenDxVariantRow,
} from "@/lib/nutrition/genetics/nutrigenDxCrossRef";
import { safeLog } from "@/lib/utils/safe-log";
import { panelKeyAliasesFor } from "@/lib/genetics/panelKeyAliases";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const [{ data: varData }, findings] = await Promise.all([
      db
        .from("user_variants")
        .select(
          "panel_key, rsid, gene, genotype, status, clinical_significance, is_sample"
        )
        .eq("user_id", user.id)
        .in("panel_key", panelKeyAliasesFor("nutrition")),
      fetchActiveFindings(db, user.id),
    ]);

    const variants: NutrigenDxVariantRow[] = (
      (varData ?? []) as Array<{
        rsid?: string | null;
        gene?: string | null;
        genotype?: string | null;
        status?: string | null;
        clinical_significance?: string | null;
        is_sample?: boolean | null;
      }>
    ).map((row) => ({
      rsid: String(row.rsid ?? ""),
      gene: row.gene ?? null,
      genotype: row.genotype ?? null,
      status: row.status ?? null,
      clinical_significance: row.clinical_significance ?? null,
      is_sample: row.is_sample === true,
      severity:
        severityFor("nutrigen-dx", String(row.rsid ?? ""), row.genotype ?? null) ??
        null,
    }));

    const payload = buildNutrigenDxCrossRefPayload(variants, findings);
    return NextResponse.json(payload);
  } catch (err) {
    safeLog.error("api.nutrition.genetics.nutrigendx", "read failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({
      resultSet: {
        panelId: "nutrigen-dx",
        collectedDate: null,
        processedDate: null,
        markers: [],
        findings: [],
      },
      summary: {
        marker_count: 0,
        marker_total: 0,
        finding_count: 0,
        has_any_data: false,
        missing_genes: [],
      },
      genetics_href: "/genetics",
    });
  }
}
