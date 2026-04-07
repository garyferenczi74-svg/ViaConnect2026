import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function apiEnvelope(
  success: boolean,
  data?: unknown,
  error?: string,
  errorCode?: string
) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error, errorCode: errorCode ?? "UNKNOWN" }),
    timestamp: new Date().toISOString(),
  };
}

// ---------- SNP Parsing ----------

interface ParsedVariant {
  rsid: string;
  chromosome: string;
  position: string;
  genotype: string;
}

function parseSNPFile(content: string): ParsedVariant[] {
  const lines = content.split("\n");
  const variants: ParsedVariant[] = [];

  for (const line of lines) {
    // Skip comments and headers (23andMe uses #, AncestryDNA uses headers)
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("rsid")) {
      continue;
    }

    // Expected format: rsid\tchromosome\tposition\tgenotype
    // or tab/comma separated
    const parts = trimmed.split(/[\t,]+/);
    if (parts.length >= 4) {
      const rsid = parts[0].trim();
      // Only process rs-prefixed SNPs
      if (rsid.startsWith("rs")) {
        variants.push({
          rsid,
          chromosome: parts[1].trim(),
          position: parts[2].trim(),
          genotype: parts[3].trim().toUpperCase(),
        });
      }
    }
  }

  return variants;
}

// ---------- SNP Panel Scoring ----------

// Key SNPs mapped to GENEX360 panels and product recommendations
const PANEL_DEFINITIONS: Record<
  string,
  {
    panel: string;
    gene: string;
    category: string;
    riskAlleles: string[];
    riskGenotypes: string[];
    product_sku?: string;
    clinical_summary: string;
  }
> = {
  rs1801133: {
    panel: "GENEX-M",
    gene: "MTHFR",
    category: "methylation",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    product_sku: "MTHFR+",
    clinical_summary:
      "MTHFR C677T variant affects folate metabolism. TT homozygous shows ~70% reduced enzyme activity.",
  },
  rs1801131: {
    panel: "GENEX-M",
    gene: "MTHFR",
    category: "methylation",
    riskAlleles: ["C"],
    riskGenotypes: ["AC", "CC", "CA"],
    product_sku: "MTHFR+",
    clinical_summary:
      "MTHFR A1298C variant affects BH4 recycling. Compound heterozygous with C677T increases risk.",
  },
  rs4680: {
    panel: "GENEX-N",
    gene: "COMT",
    category: "neurotransmitter",
    riskAlleles: ["A"],
    riskGenotypes: ["AG", "AA", "GA"],
    product_sku: "COMT+",
    clinical_summary:
      "COMT Val158Met: Met/Met (AA) = slow COMT, higher dopamine/estrogen. Benefits from COMT+ support.",
  },
  rs1799971: {
    panel: "GENEX-N",
    gene: "OPRM1",
    category: "neurotransmitter",
    riskAlleles: ["G"],
    riskGenotypes: ["AG", "GG", "GA"],
    product_sku: "FOCUS+",
    clinical_summary:
      "OPRM1 A118G variant affects opioid receptor sensitivity and dopamine reward pathways.",
  },
  rs1695: {
    panel: "GENEX-D",
    gene: "GSTP1",
    category: "detoxification",
    riskAlleles: ["G"],
    riskGenotypes: ["AG", "GG", "GA"],
    clinical_summary:
      "GSTP1 Ile105Val variant reduces glutathione S-transferase activity, affecting phase II detox.",
  },
  rs1056836: {
    panel: "GENEX-D",
    gene: "CYP1B1",
    category: "detoxification",
    riskAlleles: ["G"],
    riskGenotypes: ["CG", "GG", "GC"],
    clinical_summary:
      "CYP1B1 Leu432Val affects estrogen metabolism and detoxification capacity.",
  },
  rs2234693: {
    panel: "GENEX-H",
    gene: "ESR1",
    category: "hormone",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    clinical_summary:
      "ESR1 PvuII polymorphism influences estrogen receptor sensitivity and bone mineral density.",
  },
  rs1800629: {
    panel: "GENEX-I",
    gene: "TNF",
    category: "immune",
    riskAlleles: ["A"],
    riskGenotypes: ["GA", "AA", "AG"],
    clinical_summary:
      "TNF-alpha G-308A variant increases inflammatory cytokine production.",
  },
  rs1800795: {
    panel: "GENEX-I",
    gene: "IL6",
    category: "immune",
    riskAlleles: ["C"],
    riskGenotypes: ["GC", "CC", "CG"],
    clinical_summary:
      "IL-6 G-174C variant affects interleukin-6 levels and inflammatory response.",
  },
  rs7412: {
    panel: "GENEX-M",
    gene: "APOE",
    category: "methylation",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    clinical_summary:
      "APOE variant influences lipid metabolism and cardiovascular risk profile.",
  },
  rs429358: {
    panel: "GENEX-M",
    gene: "APOE",
    category: "methylation",
    riskAlleles: ["C"],
    riskGenotypes: ["TC", "CC", "CT"],
    clinical_summary:
      "APOE e4 allele carrier status. Relevant for cardiovascular and cognitive health planning.",
  },
  rs4244285: {
    panel: "GENEX-D",
    gene: "CYP2C19",
    category: "detoxification",
    riskAlleles: ["A"],
    riskGenotypes: ["GA", "AA", "AG"],
    clinical_summary:
      "CYP2C19*2 poor metabolizer variant affects drug metabolism capacity.",
  },
  rs3892097: {
    panel: "GENEX-D",
    gene: "CYP2D6",
    category: "detoxification",
    riskAlleles: ["A"],
    riskGenotypes: ["GA", "AA", "AG"],
    clinical_summary:
      "CYP2D6*4 variant - most common poor metabolizer allele in Caucasians.",
  },
  rs4986893: {
    panel: "GENEX-D",
    gene: "CYP2C19",
    category: "detoxification",
    riskAlleles: ["A"],
    riskGenotypes: ["GA", "AA", "AG"],
    clinical_summary:
      "CYP2C19*3 variant affects drug metabolism. Important for pharmacogenomic profiling.",
  },
  rs6265: {
    panel: "GENEX-N",
    gene: "BDNF",
    category: "neurotransmitter",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    product_sku: "FOCUS+",
    clinical_summary:
      "BDNF Val66Met variant affects brain-derived neurotrophic factor secretion and neuroplasticity.",
  },
  rs53576: {
    panel: "GENEX-N",
    gene: "OXTR",
    category: "neurotransmitter",
    riskAlleles: ["A"],
    riskGenotypes: ["AG", "AA", "GA"],
    clinical_summary:
      "Oxytocin receptor variant affects stress resilience and social cognition.",
  },
  rs1800497: {
    panel: "GENEX-N",
    gene: "DRD2",
    category: "neurotransmitter",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    product_sku: "FOCUS+",
    clinical_summary:
      "DRD2 Taq1A variant affects dopamine receptor density and reward sensitivity.",
  },
  rs2228570: {
    panel: "GENEX-I",
    gene: "VDR",
    category: "immune",
    riskAlleles: ["T"],
    riskGenotypes: ["CT", "TT", "TC"],
    clinical_summary:
      "VDR FokI variant affects vitamin D receptor function and immune regulation.",
  },
};

interface ScoredVariant {
  rsid: string;
  gene: string;
  panel: string;
  genotype: string;
  risk_level: "low" | "moderate" | "high";
  category: string;
  clinical_summary: string;
  product_sku?: string;
}

function scoreVariants(parsed: ParsedVariant[]): ScoredVariant[] {
  const scored: ScoredVariant[] = [];

  for (const variant of parsed) {
    const definition = PANEL_DEFINITIONS[variant.rsid];
    if (!definition) continue;

    // Determine risk level based on genotype
    const genotype = variant.genotype;
    let risk_level: "low" | "moderate" | "high" = "low";

    if (definition.riskGenotypes.includes(genotype)) {
      // Homozygous risk = high, heterozygous = moderate
      const alleleCount = genotype
        .split("")
        .filter((a) => definition.riskAlleles.includes(a)).length;
      risk_level = alleleCount >= 2 ? "high" : "moderate";
    }

    scored.push({
      rsid: variant.rsid,
      gene: definition.gene,
      panel: definition.panel,
      genotype,
      risk_level,
      category: definition.category,
      clinical_summary: definition.clinical_summary,
      product_sku: definition.product_sku,
    });
  }

  return scored;
}

// Build product recommendations from scored variants
function getRecommendations(
  scored: ScoredVariant[]
): Array<{ sku: string; reason: string; priority: "high" | "moderate" }> {
  const recommendations = new Map<
    string,
    { sku: string; reason: string; priority: "high" | "moderate" }
  >();

  for (const variant of scored) {
    if (
      variant.product_sku &&
      (variant.risk_level === "high" || variant.risk_level === "moderate")
    ) {
      const existing = recommendations.get(variant.product_sku);
      const priority =
        variant.risk_level === "high" ? "high" : "moderate";

      if (!existing || (priority === "high" && existing.priority !== "high")) {
        recommendations.set(variant.product_sku, {
          sku: variant.product_sku,
          reason: `${variant.gene} ${variant.rsid} (${variant.genotype}) — ${variant.clinical_summary}`,
          priority,
        });
      }
    }
  }

  return Array.from(recommendations.values()).sort((a, b) =>
    a.priority === "high" && b.priority !== "high" ? -1 : 1
  );
}

// ---------- Route handler ----------

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "Unauthorized", "AUTH_REQUIRED"),
      { status: 401 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? null;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "Invalid multipart form data",
        "INVALID_FORM"
      ),
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  const kitId = formData.get("kitId") as string | null;

  if (!file) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "file required", "MISSING_FILE"),
      { status: 400 }
    );
  }

  if (!kitId) {
    return NextResponse.json(
      apiEnvelope(false, undefined, "kitId required", "MISSING_KIT_ID"),
      { status: 400 }
    );
  }

  // Validate file type
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".txt") && !fileName.endsWith(".csv")) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "Only .txt and .csv files are supported (23andMe/AncestryDNA format)",
        "INVALID_FILE_TYPE"
      ),
      { status: 400 }
    );
  }

  // Limit file size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "File too large. Maximum 50MB.",
        "FILE_TOO_LARGE"
      ),
      { status: 400 }
    );
  }

  try {
    // Read and parse the SNP file
    const fileContent = await file.text();
    const parsedVariants = parseSNPFile(fileContent);

    if (parsedVariants.length === 0) {
      return NextResponse.json(
        apiEnvelope(
          false,
          undefined,
          "No valid SNP data found in file. Ensure it is in 23andMe or AncestryDNA format.",
          "NO_SNP_DATA"
        ),
        { status: 400 }
      );
    }

    // Score against panel definitions
    const scoredVariants = scoreVariants(parsedVariants);
    const recommendations = getRecommendations(scoredVariants);

    // Upload raw file to Supabase Storage for archival
    const storagePath = `${user.id}/${kitId}/${Date.now()}-${file.name}`;
    await supabase.storage
      .from("genex-uploads")
      .upload(storagePath, file);

    // Write scored variants to genetic_variants table
    if (scoredVariants.length > 0) {
      const variantRows = scoredVariants.map((v) => ({
        user_id: user.id,
        panel: v.panel,
        gene: v.gene,
        rsid: v.rsid,
        genotype: v.genotype,
        risk_level: v.risk_level,
        category: v.category,
        clinical_summary: v.clinical_summary,
      }));

      // genetic_variants table is not in the regenerated typegen — cast supabase
      // to any so the upsert chain compiles. Runtime behavior unchanged.
      const { error: variantError } = await (supabase as any)
        .from("genetic_variants")
        .upsert(variantRows, { onConflict: "user_id,rsid" });

      if (variantError) {
        // Fall back to insert if upsert fails (constraint may not exist)
        await (supabase as any).from("genetic_variants").insert(variantRows);
      }
    }

    // Update genetic_profiles with summary data
    const panelCounts = scoredVariants.reduce(
      (acc, v) => {
        acc[v.panel] = (acc[v.panel] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const highRiskGenes = scoredVariants
      .filter((v) => v.risk_level === "high")
      .map((v) => v.gene);

    const mthfrVariant = scoredVariants.find(
      (v) => v.gene === "MTHFR" && v.rsid === "rs1801133"
    );
    const comtVariant = scoredVariants.find((v) => v.gene === "COMT");
    const cyp2d6Variant = scoredVariants.find((v) => v.gene === "CYP2D6");

    await supabase.from("genetic_profiles").upsert(
      {
        user_id: user.id,
        mthfr_status: mthfrVariant
          ? `${mthfrVariant.genotype} (${mthfrVariant.risk_level})`
          : null,
        comt_status: comtVariant
          ? `${comtVariant.genotype} (${comtVariant.risk_level})`
          : null,
        cyp2d6_status: cyp2d6Variant
          ? `${cyp2d6Variant.genotype} (${cyp2d6Variant.risk_level})`
          : null,
        additional_genes: {
          panels_analyzed: panelCounts,
          high_risk_genes: highRiskGenes,
          total_variants_scored: scoredVariants.length,
          total_variants_parsed: parsedVariants.length,
        },
        source_lab: fileName.includes("ancestry")
          ? "AncestryDNA"
          : "23andMe",
        report_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id" }
    );

    // Audit log — typegen rejects the jsonb metadata payload structurally; cast
    await (supabase as any).from("audit_logs").insert({
      user_id: user.id,
      action: "genex_upload_processed",
      resource_type: "genetics",
      resource_id: kitId,
      metadata: {
        file_name: file.name,
        total_snps_parsed: parsedVariants.length,
        panel_variants_scored: scoredVariants.length,
        high_risk_count: highRiskGenes.length,
        recommendations_count: recommendations.length,
      },
      ip_address: ip,
    });

    // Build summary response
    const riskSummary = {
      high: scoredVariants.filter((v) => v.risk_level === "high").length,
      moderate: scoredVariants.filter((v) => v.risk_level === "moderate")
        .length,
      low: scoredVariants.filter((v) => v.risk_level === "low").length,
    };

    return NextResponse.json(
      apiEnvelope(true, {
        summary: {
          total_snps_parsed: parsedVariants.length,
          panel_variants_found: scoredVariants.length,
          risk_summary: riskSummary,
          panels_covered: Object.keys(panelCounts),
        },
        variants: scoredVariants,
        recommendations,
      })
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload processing failed";

    await (supabase as any).from("audit_logs").insert({
      user_id: user.id,
      action: "genex_upload_error",
      resource_type: "genetics",
      metadata: { error: message, kit_id: kitId },
      ip_address: ip,
    });

    return NextResponse.json(
      apiEnvelope(false, undefined, message, "UPLOAD_ERROR"),
      { status: 500 }
    );
  }
}
