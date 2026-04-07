import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Genemetrics API Integration for ViaConnect GENEX360
 *
 * This endpoint handles two actions:
 * 1. "check" — Polls the Genemetrics partner API for pending results
 * 2. "import" — Pulls completed results and writes to genetic_variants
 *
 * Genemetrics is FarmCeutica's lab partner for GENEX360 genetic testing.
 * Results are auto-uploaded when the lab completes analysis.
 */

const GENEMETRICS_BASE_URL = process.env.GENEMETRICS_API_URL || "https://api.genemetrics.com/v1";
const GENEMETRICS_API_KEY = process.env.GENEMETRICS_API_KEY || "";
const GENEMETRICS_PARTNER_ID = process.env.GENEMETRICS_PARTNER_ID || "farmceutica";

// GENEX360 panel mapping from Genemetrics panel codes to our internal structure
const PANEL_MAP: Record<string, { panel: string; category: string }> = {
  "METH": { panel: "GENEX-M", category: "methylation" },
  "NEURO": { panel: "GENEX-N", category: "neurotransmitter" },
  "CARDIO": { panel: "GENEX-C", category: "cardiovascular" },
  "DETOX": { panel: "GENEX-D", category: "detoxification" },
  "IMMUNE": { panel: "GENEX-I", category: "immune" },
  "HORMONE": { panel: "GENEX-H", category: "hormone" },
};

// Product recommendations by gene
const GENE_PRODUCT_MAP: Record<string, string> = {
  MTHFR: "FC-MTHFR-001", COMT: "FC-COMT-001", MAOA: "FC-MAOA-001",
  VDR: "FC-VDR-001", CBS: "FC-CBS-001", MTR: "FC-MTR-001",
  MTRR: "FC-MTRR-001", BHMT: "FC-BHMT-001", GSTP1: "FC-GST-001",
  NOS3: "FC-NOS-001", SOD2: "FC-SOD-001", APOE: "FC-APOE-001",
  CYP1B1: "FC-CYP-001", CYP2C19: "FC-CYP-001", CYP2D6: "FC-CYP-001",
  BDNF: "FC-FOCUS-001", DRD2: "FC-FOCUS-001", OPRM1: "FC-FOCUS-001",
  TNF: "FC-FLEX-001", IL6: "FC-FLEX-001",
};

interface GenemetricsResult {
  kit_barcode: string;
  patient_email: string;
  status: "completed" | "processing" | "failed";
  panels: Array<{
    panel_code: string;
    variants: Array<{
      rsid: string;
      gene: string;
      genotype: string;
      risk_level: "low" | "moderate" | "high";
      clinical_note: string;
    }>;
  }>;
  completed_at: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "check") {
    // Check if user has a registered kit with pending results
    const { data: kits } = await supabase
      .from("kit_registrations")
      .select("kit_barcode, panel_type, status")
      .eq("user_id", user.id)
      .in("status", ["processing", "completed"])
      .order("registered_at", { ascending: false });

    if (!kits || kits.length === 0) {
      return NextResponse.json({
        success: true,
        data: { results_available: false, kits_registered: 0, message: "No GENEX360 kits found" },
      });
    }

    // If Genemetrics API key is configured, poll the real API
    if (GENEMETRICS_API_KEY) {
      try {
        const barcodes = kits.map((k) => k.kit_barcode).join(",");
        const res = await fetch(`${GENEMETRICS_BASE_URL}/results/status?partner=${GENEMETRICS_PARTNER_ID}&barcodes=${barcodes}`, {
          headers: {
            "Authorization": `Bearer ${GENEMETRICS_API_KEY}`,
            "X-Partner-ID": GENEMETRICS_PARTNER_ID,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const ready = data.results?.filter((r: any) => r.status === "completed") || [];
          return NextResponse.json({
            success: true,
            data: {
              results_available: ready.length > 0,
              panels_ready: ready.length,
              kits_registered: kits.length,
              kits: kits.map((k) => ({ barcode: k.kit_barcode, status: k.status })),
            },
          });
        }
      } catch {
        // Fall through to kit-based check
      }
    }

    // Fallback: check kit statuses from our DB
    const completed = kits.filter((k) => k.status === "completed");
    const processing = kits.filter((k) => k.status === "processing");

    return NextResponse.json({
      success: true,
      data: {
        results_available: completed.length > 0,
        panels_ready: completed.length,
        kits_registered: kits.length,
        processing: processing.length,
        kits: kits.map((k) => ({ barcode: k.kit_barcode, status: k.status, panel: k.panel_type })),
      },
    });
  }

  if (action === "import") {
    // Get completed kits
    const { data: kits } = await supabase
      .from("kit_registrations")
      .select("kit_barcode, panel_type")
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (!kits || kits.length === 0) {
      return NextResponse.json({ success: false, error: "No completed results to import" }, { status: 404 });
    }

    let totalVariants = 0;
    let totalHigh = 0;
    let totalModerate = 0;
    let totalLow = 0;
    const allVariants: Array<any> = [];
    const recommendations: Array<{ sku: string; reason: string; priority: string }> = [];
    const panelsCovered: string[] = [];

    // If Genemetrics API is configured, pull real results
    if (GENEMETRICS_API_KEY) {
      for (const kit of kits) {
        try {
          const res = await fetch(`${GENEMETRICS_BASE_URL}/results/${kit.kit_barcode}?partner=${GENEMETRICS_PARTNER_ID}`, {
            headers: {
              "Authorization": `Bearer ${GENEMETRICS_API_KEY}`,
              "X-Partner-ID": GENEMETRICS_PARTNER_ID,
            },
          });

          if (!res.ok) continue;
          const result: GenemetricsResult = await res.json();

          for (const panel of result.panels) {
            const mapping = PANEL_MAP[panel.panel_code];
            if (!mapping) continue;
            panelsCovered.push(mapping.panel);

            for (const variant of panel.variants) {
              const row = {
                user_id: user.id,
                panel: mapping.panel,
                gene: variant.gene,
                rsid: variant.rsid,
                genotype: variant.genotype,
                risk_level: variant.risk_level,
                category: mapping.category,
                clinical_summary: variant.clinical_note,
              };
              allVariants.push(row);
              totalVariants++;
              if (variant.risk_level === "high") totalHigh++;
              else if (variant.risk_level === "moderate") totalModerate++;
              else totalLow++;

              // Product recommendation
              const productSku = GENE_PRODUCT_MAP[variant.gene];
              if (productSku && variant.risk_level !== "low") {
                if (!recommendations.find((r) => r.sku === productSku)) {
                  recommendations.push({
                    sku: productSku,
                    reason: `${variant.gene} ${variant.rsid} (${variant.genotype}) — ${variant.clinical_note}`,
                    priority: variant.risk_level === "high" ? "high" : "moderate",
                  });
                }
              }
            }
          }

          // Mark kit as imported
          await supabase.from("kit_registrations")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("kit_barcode", kit.kit_barcode);

        } catch {
          continue;
        }
      }
    }

    // Write variants to genetic_variants table (not in regenerated typegen — cast)
    if (allVariants.length > 0) {
      await (supabase as any).from("genetic_variants").upsert(allVariants, { onConflict: "user_id,rsid" });
    }

    // Update genetic_profiles
    const highRiskGenes = allVariants.filter((v) => v.risk_level === "high").map((v) => v.gene);
    const mthfr = allVariants.find((v) => v.gene === "MTHFR");
    const comt = allVariants.find((v) => v.gene === "COMT");

    await supabase.from("genetic_profiles").upsert({
      user_id: user.id,
      mthfr_status: mthfr ? `${mthfr.genotype} (${mthfr.risk_level})` : null,
      comt_status: comt ? `${comt.genotype} (${comt.risk_level})` : null,
      additional_genes: {
        panels_analyzed: panelsCovered,
        high_risk_genes: highRiskGenes,
        total_variants: totalVariants,
        source: "genemetrics_genex360",
        imported_at: new Date().toISOString(),
      },
      source_lab: "ViaConnect GENEX360 (Genemetrics)",
      report_date: new Date().toISOString().split("T")[0],
    }, { onConflict: "user_id" });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "genemetrics_import",
      table_name: "genetic_variants",
      record_id: kits[0].kit_barcode,
      new_data: {
        kits_imported: kits.length,
        variants_imported: totalVariants,
        high_risk: totalHigh,
        panels: panelsCovered,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_snps_parsed: totalVariants,
          panel_variants_found: totalVariants,
          risk_summary: { high: totalHigh, moderate: totalModerate, low: totalLow },
          panels_covered: panelsCovered,
        },
        variants: allVariants.slice(0, 50),
        recommendations: recommendations.sort((a, b) => a.priority === "high" ? -1 : 1),
      },
    });
  }

  return NextResponse.json({ success: false, error: "Invalid action. Use 'check' or 'import'." }, { status: 400 });
}
