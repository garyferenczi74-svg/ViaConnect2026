import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { runProtocolGate, toPersistedGateSummary, type ProtocolGateReport } from "@/lib/interactions/protocol-gate";
import type { Json } from "@/lib/supabase/types";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await request.json().catch(() => ({}));
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(supabase.auth.getUser(), 5000, "api.ai.generate-protocol.auth");
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error("api.ai.generate-protocol", "auth timeout", { error: err });
        return NextResponse.json({ error: "Authentication check timed out." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    // Load all data
    const [assessmentsRes, profileRes, labsRes] = await Promise.all([
      supabase.from("assessment_results").select("phase, data").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("bio_optimization_history").select("score").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
    ]);

    const assessments = assessmentsRes.data || [];
    // Cast to any: typegen Row + the `|| {}` fallback widens to {} which loses
    // property access. Same pattern as unified-context.ts and data-fusion.ts.
    const profile: any = profileRes.data || {};
    const getPhase = (phase: number) => assessments.find((a) => a.phase === phase)?.data as Record<string, unknown> | undefined;

    const phase4Data = getPhase(4) || {};
    const medications = (phase4Data.medications as string[]) || [];
    const supplements = ((phase4Data.userSupplements as Array<{ name: string }>) || []).map((s) => s.name);
    const allergies = (phase4Data.allergies as string[]) || [];

    // Determine data tier
    const hasLabs = false; // Will be true when lab_results table has data
    const hasGenetics = !!profile.genetic_profile;
    const tier: 1 | 2 | 3 = hasGenetics ? 3 : hasLabs ? 2 : 1;
    const confidenceLabel = tier === 3 ? "Precision Optimized" : tier === 2 ? "Clinically Enhanced" : "Personalized";
    const confidenceScore = tier === 3 ? 96 : tier === 2 ? 86 : 72;

    // Generate protocol (CAQ-sufficient baseline)
    const protocol = {
      morning: [
        { productName: "Liposomal Vitamin D3 + K2 (MK-7)", dosage: "5000 IU", reason: "Foundational vitamin D support, especially for northern latitudes", priority: "essential", dataSource: "caq" },
        { productName: "BioB Fusion\u2122 Methylated B Complex", dosage: "1 capsule", reason: "Methylated B vitamins for energy and cognitive function", priority: "essential", dataSource: "caq" },
        { productName: "Algal Omega-3 DHA/EPA", dosage: "1000mg", reason: "Anti-inflammatory, cardiovascular, and brain health support", priority: "essential", dataSource: "caq" },
      ],
      afternoon: [
        { productName: "Liposomal CoQ10 (Ubiquinol)", dosage: "200mg", reason: "Mitochondrial energy production and antioxidant support", priority: "recommended", dataSource: "caq" },
      ],
      evening: [
        { productName: "Liposomal Magnesium L-Threonate", dosage: "400mg", reason: "Sleep quality, stress recovery, and cognitive support", priority: "essential", dataSource: "caq" },
        { productName: "Melatonin (Extended Release)", dosage: "3mg", reason: "Sleep onset and circadian rhythm support", priority: "optional", dataSource: "caq" },
      ],
      asNeeded: [
        { productName: "Liposomal NAC (N-Acetyl Cysteine)", dosage: "600mg", reason: "Glutathione precursor for detoxification and antioxidant defense", priority: "recommended", dataSource: "caq" },
        { productName: "L-Theanine", dosage: "200mg", reason: "Calm focus and stress relief without drowsiness", priority: "optional", dataSource: "caq" },
      ],
    };

    // Safety gate: check protocol products against medications
    let interactions: Array<{ severity: string; interactsWith: string; medication: string; mechanism: string; mitigation: string }> = [];
    let blockedProducts: string[] = [];

    if (medications.filter(m => m !== "None").length > 0) {
      try {
        const allNames = [...protocol.morning, ...protocol.afternoon, ...protocol.evening, ...protocol.asNeeded].map(p => p.productName);
        const interactionRes = await fetch(new URL("/api/ai/check-interactions", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, medications: medications.filter(m => m !== "None"), supplements, recommendations: allNames, allergies: allergies.filter(a => a !== "None") }),
        });
        const interactionData = await interactionRes.json();
        interactions = interactionData.interactions || [];
        blockedProducts = interactionData.blockedProducts || [];
      } catch { /* proceed without blocking */ }
    }

    // Protocol safety gate (2026-06-12): interactions floor + Marshall
    // compliance lane + Lex legal lane over every item's copy, pre-save.
    // CYP status feeds the deterministic escalation; the gate fails open
    // per lane but its blocks are honored alongside the AI check above.
    let gateReport: ProtocolGateReport | null = null;
    try {
      // genetic_profiles stores one row per user: cyp2d6_status as a column,
      // other genes inside the additional_genes json map.
      const { data: gpRow } = await supabase
        .from("genetic_profiles")
        .select("cyp2d6_status, additional_genes")
        .eq("user_id", user.id)
        .maybeSingle();
      const cypStatusMap: Record<string, string> = {};
      if (gpRow?.cyp2d6_status) cypStatusMap.CYP2D6 = gpRow.cyp2d6_status;
      const extraGenes = gpRow?.additional_genes;
      if (extraGenes && typeof extraGenes === "object" && !Array.isArray(extraGenes)) {
        for (const [gene, status] of Object.entries(extraGenes)) {
          if (typeof status === "string" && gene.toUpperCase().startsWith("CYP")) {
            cypStatusMap[gene.toUpperCase()] = status;
          }
        }
      }
      gateReport = await runProtocolGate({
        items: [...protocol.morning, ...protocol.afternoon, ...protocol.evening, ...protocol.asNeeded]
          .map(p => ({ productName: p.productName, reason: p.reason })),
        medications: medications.filter(m => m !== "None"),
        cypStatusMap,
      });
      blockedProducts = [...new Set([...blockedProducts, ...gateReport.blockedProducts])];
    } catch (gateErr) {
      safeLog.warn("api.ai.generate-protocol", "protocol gate degraded", { error: gateErr });
    }

    // Remove blocked products
    const blockedSet = new Set(blockedProducts.map((p) => p.toLowerCase()));
    const filterBlocked = (items: typeof protocol.morning) => items.filter((p) => !blockedSet.has(p.productName.toLowerCase()));
    const safeProtocol = {
      morning: filterBlocked(protocol.morning),
      afternoon: filterBlocked(protocol.afternoon),
      evening: filterBlocked(protocol.evening),
      asNeeded: filterBlocked(protocol.asNeeded),
    };

    // Save protocol
    await supabase.from("user_protocols").upsert({
      user_id: user.id,
      protocol_name: "AI-Generated Protocol",
      source: "ai_caq",
      protocol_data: {
        ...safeProtocol,
        tier,
        confidenceLabel,
        confidenceScore,
        blockedProducts,
        interactions,
        // Audit trail: lanes, statuses, counts, and per-finding
        // {ruleId, severity, lane} ONLY. Full Finding objects never land in
        // this consumer-readable row: their message and excerpt embed the
        // flagged term itself plus internal escalation slugs, which would
        // defeat the block (Jeffery review 2026-06-12). Interaction entries
        // stay: their copy is the user-facing clinical guidance by design.
        // Cast through Json per the stripe webhook precedent.
        gate: (gateReport ? toPersistedGateSummary(gateReport) : null) as unknown as Json,
        disclaimer: "This protocol is generated by AI based on your assessment data. Please consult with a practitioner or naturopath before starting any new supplement regimen.",
      },
      confidence_score: confidenceScore,
      is_active: true,
    }, { onConflict: "user_id" }).then(() => {}, () => {});

    const totalRecs = safeProtocol.morning.length + safeProtocol.afternoon.length + safeProtocol.evening.length + safeProtocol.asNeeded.length;

    return NextResponse.json({
      tier,
      confidenceLabel,
      confidenceScore,
      protocol: safeProtocol,
      blockedProducts,
      interactions,
      recommendations_count: totalRecs,
      gapAnalysis: {
        covered: supplements.filter(s => s !== "None"),
        gaps: ["Vitamin D", "Omega-3", "Magnesium"].filter(n => !supplements.some(s => s.toLowerCase().includes(n.toLowerCase()))),
        excesses: [],
        redundancies: [],
      },
      labRecommendations: hasLabs ? [] : ["Complete blood count (CBC)", "Comprehensive metabolic panel", "Vitamin D (25-OH)", "Ferritin", "B12", "Thyroid panel (TSH, T3, T4)"],
      geneticRecommendations: hasGenetics ? [] : ["GeneXM\u2122 (Methylation) for MTHFR/COMT optimization", "NutrigenDX\u2122 (Nutrition) for nutrient metabolism"],
      disclaimer: "This protocol is generated by AI based on your assessment data. Please consult with a practitioner or naturopath before starting any new supplement regimen.",
    });
  } catch (err) {
    safeLog.error("api.ai.generate-protocol", "unexpected error", { error: err });
    return NextResponse.json({ error: "Protocol generation failed", recommendations_count: 0 }, { status: 500 });
  }
}
