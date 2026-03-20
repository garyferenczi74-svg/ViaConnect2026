import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin, getUserId } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';
import { z } from '../_shared/validate.ts';

// ── SNP panel definitions for GENEX360 6-panel test ──────────────────────
const PANEL_VARIANTS: Record<string, { rsids: string[]; pathway: string }> = {
  methylation: {
    rsids: ['rs1801133', 'rs1801131', 'rs1805087', 'rs1801394', 'rs2236225'],
    pathway: 'Methylation',
  },
  detox: {
    rsids: ['rs4680', 'rs4633', 'rs6323', 'rs1695', 'rs1138272'],
    pathway: 'Detoxification',
  },
  inflammation: {
    rsids: ['rs1800795', 'rs1800629', 'rs20417', 'rs5275', 'rs4073'],
    pathway: 'Inflammation',
  },
  neurotransmitter: {
    rsids: ['rs6265', 'rs4570625', 'rs53576', 'rs1800497', 'rs1799971'],
    pathway: 'Neurotransmitter',
  },
  cardiovascular: {
    rsids: ['rs1801282', 'rs9939609', 'rs662', 'rs854560', 'rs1800588'],
    pathway: 'Cardiovascular',
  },
  hormone: {
    rsids: ['rs2414096', 'rs700518', 'rs10046', 'rs743572', 'rs6166'],
    pathway: 'Hormone',
  },
};

// Map risk variants → FarmCeutica product SKU recommendations
const VARIANT_PRODUCT_MAP: Record<string, string[]> = {
  rs1801133: ['VIA-MTHFR-PLUS'],   // MTHFR+
  rs1801131: ['VIA-MTHFR-PLUS'],
  rs4680:    ['VIA-COMT-PLUS'],     // COMT+
  rs4633:    ['VIA-COMT-PLUS'],
  rs6265:    ['VIA-FOCUS-PLUS'],    // FOCUS+
  rs1800795: ['VIA-INFLAM-GUARD'],
  rs1800629: ['VIA-INFLAM-GUARD'],
  rs9939609: ['VIA-SHRED-PLUS'],    // SHRED+
  rs1801282: ['VIA-CARDIO-GUARD'],
  rs662:     ['VIA-CARDIO-GUARD'],
  rs1800497: ['VIA-FOCUS-PLUS', 'VIA-BLAST-PLUS'],
};

const RISK_GENOTYPES: Record<string, string[]> = {
  rs1801133: ['CT', 'TT'],
  rs1801131: ['AC', 'CC'],
  rs4680:    ['AG', 'AA'],
  rs4633:    ['CT', 'TT'],
  rs6265:    ['CT', 'TT'],
  rs1800795: ['CG', 'CC'],
  rs1800629: ['AG', 'AA'],
  rs9939609: ['AT', 'AA'],
  rs1801282: ['CG', 'GG'],
  rs662:     ['AG', 'GG'],
  rs1800497: ['CT', 'TT'],
};

const InputSchema = z.object({
  fileContent: z.string().min(1, 'File content is required'),
  sourceFormat: z.enum(['23andme', 'ancestry', 'genex360']).default('23andme'),
  panelType: z.string().optional(),
});

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = await getUserId(req);
    if (!userId) return err('Unauthorized', 'AUTH_REQUIRED', 401);

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0].message, 'VALIDATION_ERROR');
    }
    const { fileContent, sourceFormat } = parsed.data;

    const admin = getSupabaseAdmin();

    // Parse SNP file lines
    const lines = fileContent.split('\n').filter(
      (l) => l.trim() && !l.startsWith('#'),
    );

    const variants: Array<{
      rsid: string;
      genotype: string;
      chromosome: string;
      position: number;
    }> = [];

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 4) continue;

      if (sourceFormat === '23andme' || sourceFormat === 'genex360') {
        // Format: rsid \t chromosome \t position \t genotype
        const [rsid, chromosome, position, genotype] = parts;
        if (rsid.startsWith('rs')) {
          variants.push({
            rsid: rsid.trim(),
            genotype: genotype.trim().toUpperCase(),
            chromosome: chromosome.trim(),
            position: parseInt(position.trim(), 10) || 0,
          });
        }
      } else if (sourceFormat === 'ancestry') {
        // Format: rsid \t chromosome \t position \t allele1 \t allele2
        const [rsid, chromosome, position, allele1, allele2] = parts;
        if (rsid.startsWith('rs')) {
          variants.push({
            rsid: rsid.trim(),
            genotype: `${allele1.trim()}${allele2.trim()}`.toUpperCase(),
            chromosome: chromosome.trim(),
            position: parseInt(position.trim(), 10) || 0,
          });
        }
      }
    }

    if (variants.length === 0) {
      return err('No valid SNP variants found in file', 'PARSE_ERROR');
    }

    // Create genetic profile
    const { data: profile, error: profileErr } = await admin
      .from('genetic_profiles')
      .insert({
        user_id: userId,
        source_lab: sourceFormat,
        report_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (profileErr || !profile) {
      return err('Failed to create genetic profile', 'DB_ERROR', 500);
    }

    // Score variants against panel definitions
    const allPanelRsids = new Set(
      Object.values(PANEL_VARIANTS).flatMap((p) => p.rsids),
    );
    const relevantVariants = variants.filter((v) => allPanelRsids.has(v.rsid));

    // Determine risk levels and pathways
    const variantRecords = relevantVariants.map((v) => {
      const riskGenotypes = RISK_GENOTYPES[v.rsid] ?? [];
      const isRisk = riskGenotypes.includes(v.genotype);
      const pathway = Object.entries(PANEL_VARIANTS).find(([, p]) =>
        p.rsids.includes(v.rsid),
      );

      return {
        genetic_profile_id: profile.id,
        user_id: userId,
        rsid: v.rsid,
        genotype: v.genotype,
        chromosome: v.chromosome,
        position: v.position,
        risk_level: isRisk
          ? riskGenotypes.indexOf(v.genotype) === 1
            ? 'high'
            : 'moderate'
          : 'none',
        pathway: pathway?.[1].pathway ?? 'Unknown',
        gene: v.rsid, // simplified — real gene lookup would use a reference DB
      };
    });

    // Batch insert variants
    if (variantRecords.length > 0) {
      const { error: insertErr } = await admin
        .from('genetic_variants')
        .insert(variantRecords);

      if (insertErr) {
        return err('Failed to store genetic variants', 'DB_ERROR', 500);
      }
    }

    // Map variants to product recommendations
    const productSkus = new Set<string>();
    for (const v of variantRecords) {
      if (v.risk_level !== 'none') {
        const skus = VARIANT_PRODUCT_MAP[v.rsid] ?? [];
        skus.forEach((s) => productSkus.add(s));
      }
    }

    // Update genetic profile with pathway statuses
    const mthfrVariant = variantRecords.find((v) => v.rsid === 'rs1801133');
    const comtVariant = variantRecords.find((v) => v.rsid === 'rs4680');
    const cyp2d6Variant = variantRecords.find((v) => v.rsid === 'rs1800497');

    await admin
      .from('genetic_profiles')
      .update({
        mthfr_status: mthfrVariant?.risk_level ?? 'normal',
        comt_status: comtVariant?.risk_level ?? 'normal',
        cyp2d6_status: cyp2d6Variant?.risk_level ?? 'normal',
        additional_genes: Object.fromEntries(
          variantRecords.map((v) => [v.rsid, { genotype: v.genotype, risk: v.risk_level }]),
        ),
      })
      .eq('id', profile.id);

    await writeAudit({
      userId,
      action: 'process_genex_upload',
      tableName: 'genetic_profiles',
      recordId: profile.id,
      newData: {
        variantCount: variantRecords.length,
        riskVariants: variantRecords.filter((v) => v.risk_level !== 'none').length,
        recommendedProducts: [...productSkus],
      },
    });

    return ok({
      geneticProfileId: profile.id,
      totalVariantsParsed: variants.length,
      panelVariantsMatched: variantRecords.length,
      riskVariants: variantRecords.filter((v) => v.risk_level !== 'none').length,
      pathwaySummary: Object.entries(PANEL_VARIANTS).map(([key, panel]) => {
        const panelVariants = variantRecords.filter(
          (v) => v.pathway === panel.pathway,
        );
        const riskCount = panelVariants.filter(
          (v) => v.risk_level !== 'none',
        ).length;
        return {
          panel: key,
          pathway: panel.pathway,
          variantsFound: panelVariants.length,
          riskVariants: riskCount,
          riskLevel:
            riskCount >= 3 ? 'high' : riskCount >= 1 ? 'moderate' : 'low',
        };
      }),
      recommendedProducts: [...productSkus],
    });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
