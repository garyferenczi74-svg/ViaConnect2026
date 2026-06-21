// Prompt: GeneX360 purchase seeding. Seeds a member's six GeneX360 panels with
// curated SAMPLE data the one time they buy the bundle. Five genotype panels are
// written as user_variants (with a dna_uploads provenance row); the sixth,
// epigenetic, is written as user_epigenetic_markers (with an epigenetic_uploads
// provenance row). Every seeded row carries is_sample: true so the surfaces can
// label it as sample preview data and so the idempotency check can detect it.
//
// Idempotent: if the member already has any is_sample user_variants row, this is a
// no-op. Owner-scoped: RLS handles auth; this layer writes for the given userId.
// Fail-soft: any throw is logged and swallowed, returning a zeroed result so a
// purchase flow is never blocked by a seeding failure.
//
// The shapes mirror dnaUploadStore.persistInterpretedVariants and
// epigenResultStore.persistEpigeneticMarkers exactly; the epigen rows are written
// directly here (not via persistEpigeneticMarkers) so is_sample can be set inline.
//
// Standing rules honored: no em or en dashes; TypeScript strict (no any on the
// public surface; the Supabase client is cast like the sibling genetics stores
// because these tables are not in the generated typegen yet).

import { safeLog } from "@/lib/utils/safe-log";
import { SAMPLE_VARIANTS, SAMPLE_EPIGEN } from "./samplePanelData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export interface SeedSampleResult {
  variants: number;
  epigen: number;
  skipped: boolean;
}

const FAILED: SeedSampleResult = { variants: 0, epigen: 0, skipped: false };

// Pure predicate: returns true when an order's lines include the GeneX360
// bundle. A line qualifies when it is a testing product whose slug is the
// complete bundle or any GeneX360 slug. No side effects.
export function isGenexBundlePurchase(
  lines: ReadonlyArray<{ productType?: string | null; productSlug?: string | null }>,
): boolean {
  return lines.some((line) => {
    if (line.productType !== "testing") {
      return false;
    }
    const slug = line.productSlug;
    return (
      slug === "genex360-complete" ||
      (typeof slug === "string" && slug.toLowerCase().startsWith("genex360"))
    );
  });
}

export async function seedSamplePanels(
  supabase: SupabaseLike,
  userId: string,
): Promise<SeedSampleResult> {
  try {
    // Idempotency: if any sample variant already exists for this member, do not
    // seed again.
    const { data: existing } = await supabase
      .from("user_variants")
      .select("id")
      .eq("user_id", userId)
      .eq("is_sample", true)
      .limit(1);

    if (Array.isArray(existing) && existing.length > 0) {
      return { variants: 0, epigen: 0, skipped: true };
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    const variants = await seedVariants(supabase, userId);
    const epigen = await seedEpigen(supabase, userId, todayIso);

    return { variants, epigen, skipped: false };
  } catch (err) {
    safeLog.error("genetics.sampleseed", "seedSamplePanels threw (fail-soft)", {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return FAILED;
  }
}

async function seedVariants(
  supabase: SupabaseLike,
  userId: string,
): Promise<number> {
  // Provenance row first so the variants can reference its id.
  const { data: upload, error: uploadErr } = await supabase
    .from("dna_uploads")
    .insert({
      user_id: userId,
      provider: "ViaConnect GeneX360",
      is_farmceutica: true,
      branded_product_code: "genex360-complete",
      source_filename: null,
      status: "completed",
    })
    .select("id")
    .single();

  if (uploadErr || !upload) {
    safeLog.warn("genetics.sampleseed", "dna_uploads insert failed", {
      user_id: userId,
      error: uploadErr?.message ?? "no row",
    });
    return 0;
  }

  const uploadId = upload.id as string;

  const rows = SAMPLE_VARIANTS.map((v) => ({
    user_id: userId,
    upload_id: uploadId,
    panel_key: v.panel_key,
    rsid: v.rsid,
    gene: v.gene,
    chromosome: "",
    position: "",
    genotype: v.genotype,
    allele1: v.genotype.charAt(0) || "",
    allele2: v.genotype.charAt(1) || "",
    status: "",
    clinical_significance: v.clinicalSignificance,
    is_sample: true,
  }));

  const { error: variantErr } = await supabase
    .from("user_variants")
    .upsert(rows, { onConflict: "user_id,rsid,panel_key" });

  if (variantErr) {
    safeLog.warn("genetics.sampleseed", "user_variants upsert failed", {
      user_id: userId,
      upload_id: uploadId,
      error: variantErr.message,
    });
    return 0;
  }

  return rows.length;
}

async function seedEpigen(
  supabase: SupabaseLike,
  userId: string,
  todayIso: string,
): Promise<number> {
  const { data: upload, error: uploadErr } = await supabase
    .from("epigenetic_uploads")
    .insert({
      user_id: userId,
      source_filename: null,
      source_type: "manual",
      lab_name: "ViaConnect GeneX360 (sample)",
      measured_on: todayIso,
      status: "completed",
    })
    .select("id")
    .single();

  if (uploadErr || !upload) {
    safeLog.warn("genetics.sampleseed", "epigenetic_uploads insert failed", {
      user_id: userId,
      error: uploadErr?.message ?? "no row",
    });
    return 0;
  }

  const uploadId = upload.id as string;

  const rows = SAMPLE_EPIGEN.map((m) => ({
    user_id: userId,
    upload_id: uploadId,
    marker_key: m.markerKey,
    value_num: m.valueNum,
    value_text: m.valueText,
    unit: m.unit,
    direction: m.direction,
    confidence: "medium",
    source_type: "manual",
    measured_on: todayIso,
    is_sample: true,
  }));

  const { error: markerErr } = await supabase
    .from("user_epigenetic_markers")
    .upsert(rows, { onConflict: "user_id,marker_key,measured_on" });

  if (markerErr) {
    safeLog.warn("genetics.sampleseed", "user_epigenetic_markers upsert failed", {
      user_id: userId,
      upload_id: uploadId,
      error: markerErr.message,
    });
    return 0;
  }

  return rows.length;
}
