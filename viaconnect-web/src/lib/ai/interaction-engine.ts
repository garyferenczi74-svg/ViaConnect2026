/**
 * Supplement-Medication Interaction Engine
 * ViaConnect AI: pharmacogenomic-aware interaction checking.
 *
 * Wired 2026-06-12 (protocol safety gate): checkProductInteractions is the
 * pure cross-check used by the gate and the check-interactions route;
 * checkAllInteractions remains the DB-loading wrapper.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InteractionCheck {
  supplement: string;
  medication: string;
  severity: 'none' | 'info' | 'warning' | 'critical';
  description: string;
  pharmacogenomic_context?: string;
  recommendation: string;
}

interface InteractionEntry {
  severity: 'none' | 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Interaction Database
// ---------------------------------------------------------------------------

export const INTERACTION_DB: Record<string, Record<string, InteractionEntry>> = {
  'NAD+': {
    metformin: {
      severity: 'info',
      description:
        'NAD+ precursors and metformin both activate AMPK pathways. Concurrent use may amplify glucose-lowering effects.',
      recommendation:
        'Monitor blood glucose more frequently when starting NAD+. No dosage change required unless hypoglycemia occurs.',
    },
    warfarin: {
      severity: 'warning',
      description:
        'NAD+ metabolism may compete with warfarin for CYP enzyme clearance, potentially altering INR levels.',
      recommendation:
        'Consult your prescribing physician and schedule an INR check within 1 week of starting NAD+.',
    },
  },

  'MTHFR+': {
    methotrexate: {
      severity: 'critical',
      description:
        'MTHFR+ supplies active folate which directly antagonises the mechanism of methotrexate, a folate-pathway inhibitor.',
      recommendation:
        'Do NOT take MTHFR+ while on methotrexate without explicit oncologist approval. Pause MTHFR+ immediately.',
    },
    phenytoin: {
      severity: 'warning',
      description:
        'Supplemental methylfolate can accelerate phenytoin metabolism, potentially reducing anticonvulsant efficacy.',
      recommendation:
        'Have phenytoin levels checked within 2 weeks. Your neurologist may need to adjust the dose.',
    },
    fluorouracil: {
      severity: 'critical',
      description:
        'Exogenous folate potentiates 5-FU toxicity by stabilising the ternary complex with thymidylate synthase.',
      recommendation:
        'Stop MTHFR+ immediately and inform your oncology team before any further doses.',
    },
  },

  'FOCUS+': {
    ssri: {
      severity: 'warning',
      description:
        'FOCUS+ contains serotonergic compounds that may stack with SSRIs, increasing serotonin syndrome risk.',
      recommendation:
        'Start with the lowest FOCUS+ dose and watch for agitation, tremor, or hyperthermia. Inform your prescriber.',
    },
    maoi: {
      severity: 'critical',
      description:
        'Combining FOCUS+ with MAO inhibitors can cause dangerous serotonin and catecholamine accumulation.',
      recommendation:
        'Do NOT use FOCUS+ while taking any MAOI. A 14-day washout period is required after MAOI discontinuation.',
    },
    adderall: {
      severity: 'warning',
      description:
        'FOCUS+ nootropics may potentiate amphetamine-driven dopamine release, increasing cardiovascular stress.',
      recommendation:
        'Use FOCUS+ on non-Adderall days or consult your psychiatrist for a combined protocol.',
    },
  },

  'COMT+': {
    levodopa: {
      severity: 'warning',
      description:
        'COMT+ ingredients may modulate catechol-O-methyltransferase activity, altering levodopa peripheral metabolism.',
      recommendation:
        'Coordinate dosing with your neurologist. Levodopa levels may need re-titration.',
    },
    methylphenidate: {
      severity: 'info',
      description:
        'COMT+ may mildly extend dopamine availability when combined with methylphenidate, though clinical significance is low.',
      recommendation:
        'No immediate changes required. Monitor for increased stimulant side-effects such as insomnia or appetite loss.',
    },
  },

  'RELAX+': {
    benzodiazepines: {
      severity: 'warning',
      description:
        'RELAX+ GABAergic compounds may synergise with benzodiazepines, deepening sedation and respiratory depression.',
      recommendation:
        'Reduce RELAX+ to half dose if using benzodiazepines. Do not combine before driving or operating machinery.',
    },
    zolpidem: {
      severity: 'warning',
      description:
        'Zolpidem and RELAX+ both target GABA-A receptors; combined use increases excessive sedation risk.',
      recommendation:
        'Take RELAX+ at least 4 hours before zolpidem, or use on alternating nights. Discuss with your prescriber.',
    },
  },

  'CLEAN+': {
    acetaminophen: {
      severity: 'info',
      description:
        'CLEAN+ liver-support compounds may upregulate glutathione conjugation, theoretically aiding acetaminophen clearance.',
      recommendation:
        'Generally safe. Maintain standard acetaminophen dose limits (<3g/day) and stay hydrated.',
    },
    'statin drugs': {
      severity: 'warning',
      description:
        'CLEAN+ detox pathway induction may alter CYP3A4 activity, affecting statin plasma concentrations.',
      recommendation:
        'Have liver enzymes (ALT/AST) checked within 4 weeks. Report any unexplained muscle pain immediately.',
    },
  },

  'RISE+': {
    testosterone: {
      severity: 'warning',
      description:
        'RISE+ androgenic support ingredients combined with exogenous testosterone may push levels above therapeutic range.',
      recommendation:
        'Get total and free testosterone checked before and 4 weeks after starting RISE+. Adjust with your endocrinologist.',
    },
    clomiphene: {
      severity: 'info',
      description:
        'RISE+ and clomiphene both aim to support endogenous testosterone via different mechanisms with minimal direct interaction.',
      recommendation:
        'Safe to combine under physician oversight. Continue scheduled hormone panels as normal.',
    },
  },

  'SHRED+': {
    'thyroid medication': {
      severity: 'warning',
      description:
        'SHRED+ thermogenic compounds may potentiate thyroid hormone effects, risking hyperthyroid-like symptoms.',
      recommendation:
        'Have TSH and free T4 checked within 3 weeks. Report palpitations, excessive sweating, or weight loss.',
    },
    stimulants: {
      severity: 'warning',
      description:
        'SHRED+ contains natural stimulants that stack with prescription stimulants, increasing cardiovascular strain.',
      recommendation:
        'Avoid using SHRED+ on days you take prescription stimulants. Monitor resting heart rate and blood pressure.',
    },
  },

  'APOE+': {
    'statin drugs': {
      severity: 'info',
      description:
        'APOE+ lipid-support nutrients complement statin therapy and may improve lipid panel outcomes synergistically.',
      recommendation:
        'No changes required. Continue statin as prescribed and track lipid panels at regular intervals.',
    },
    'blood thinners': {
      severity: 'warning',
      description:
        'Certain APOE+ omega-3 and lipid-modulating ingredients have mild antiplatelet activity that may augment blood thinners.',
      recommendation:
        'Inform your cardiologist or haematologist. Monitor for unusual bruising or bleeding. INR checks recommended.',
    },
  },
};

// ---------------------------------------------------------------------------
// Severity Escalation
// ---------------------------------------------------------------------------

export function escalateSeverity(
  current: 'none' | 'info' | 'warning' | 'critical',
): 'none' | 'info' | 'warning' | 'critical' {
  switch (current) {
    case 'none':
      return 'info';
    case 'info':
      return 'warning';
    case 'warning':
      return 'critical';
    case 'critical':
      return 'critical';
    default:
      return current;
  }
}

// ---------------------------------------------------------------------------
// Pure product cross-check (no I/O)
// ---------------------------------------------------------------------------

/**
 * Cross-checks FarmCeutica product names against medication names using the
 * curated INTERACTION_DB, applying CYP-based severity escalation. Pure and
 * deterministic so the protocol safety gate and API routes can run it as the
 * floor under any AI-powered interaction analysis.
 */
// Resolve a free-form product name ("MTHFR+ Methylation Support 60ct") to
// its INTERACTION_DB key ("MTHFR+"). Boundary-guarded so NAD+ cannot match
// inside an unrelated token. Exact match wins; otherwise the first key found
// as a standalone token in the name.
function resolveDbKey(productName: string): string | undefined {
  if (INTERACTION_DB[productName]) return productName;
  const upper = productName.toUpperCase();
  for (const key of Object.keys(INTERACTION_DB)) {
    const escaped = key.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^A-Z0-9])${escaped}(?:$|[^A-Z0-9])`).test(` ${upper} `)) {
      return key;
    }
  }
  return undefined;
}

export function checkProductInteractions(
  supplementNames: string[],
  medicationNames: string[],
  cypStatusMap: Record<string, string> = {},
): InteractionCheck[] {
  const isCYP2D6Poor =
    cypStatusMap['CYP2D6']?.toLowerCase().includes('poor') ?? false;
  const isCYP2C19UltraRapid =
    cypStatusMap['CYP2C19']?.toLowerCase().includes('ultra') ?? false;

  const results: InteractionCheck[] = [];
  const meds = medicationNames.map((m) => m.toLowerCase());

  for (const supplement of supplementNames) {
    const dbKey = resolveDbKey(supplement);
    const dbEntry = dbKey ? INTERACTION_DB[dbKey] : undefined;
    if (!dbEntry) continue;

    for (const medication of meds) {
      const match = dbEntry[medication];
      if (!match) continue;

      let severity = match.severity;
      let pharmacogenomicContext: string | undefined;

      // CYP2D6 poor metaboliser: escalate severity by one level.
      if (isCYP2D6Poor) {
        severity = escalateSeverity(severity);
        pharmacogenomicContext =
          'CYP2D6 poor metaboliser detected. Reduced enzyme clearance may intensify this interaction; severity has been escalated.';
      }

      // CYP2C19 ultra-rapid metaboliser: add context note.
      if (isCYP2C19UltraRapid) {
        const note =
          'CYP2C19 ultra-rapid metaboliser detected. Faster drug clearance may reduce medication efficacy; discuss with your prescriber.';
        pharmacogenomicContext = pharmacogenomicContext
          ? `${pharmacogenomicContext} ${note}`
          : note;
      }

      results.push({
        supplement,
        medication,
        severity,
        description: match.description,
        pharmacogenomic_context: pharmacogenomicContext,
        recommendation: match.recommendation,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main Interaction Checker
// ---------------------------------------------------------------------------

export async function checkAllInteractions(
  userId: string,
  supabase: any,
): Promise<InteractionCheck[]> {
  // 1. Load the user's active medications
  const { data: medications, error: medError } = await supabase
    .from('user_medications')
    .select('medication_name')
    .eq('user_id', userId)
    .eq('active', true);

  if (medError) {
    console.error('[InteractionEngine] Failed to load medications:', medError.message);
    return [];
  }

  // 2. Load the user's active supplement protocol
  const { data: protocol, error: protoError } = await supabase
    .from('user_protocols')
    .select('supplement_name')
    .eq('user_id', userId)
    .eq('active', true);

  if (protoError) {
    console.error('[InteractionEngine] Failed to load protocol:', protoError.message);
    return [];
  }

  // 3. Load genetic profile for CYP450 genes.
  // Fixed 2026-06-12: the original query selected gene/phenotype/
  // metaboliser_status columns that never existed on genetic_profiles
  // (the table is one row per user: cyp2d6_status + additional_genes
  // json), so CYP escalation silently never applied.
  const { data: gpRow, error: genError } = await supabase
    .from('genetic_profiles')
    .select('cyp2d6_status, additional_genes')
    .eq('user_id', userId)
    .maybeSingle();

  if (genError) {
    console.error('[InteractionEngine] Failed to load genetic profiles:', genError.message);
  }

  // Build look-up maps for CYP status
  const cypStatusMap: Record<string, string> = {};
  if (gpRow?.cyp2d6_status) cypStatusMap['CYP2D6'] = gpRow.cyp2d6_status;
  const extraGenes = gpRow?.additional_genes;
  if (extraGenes && typeof extraGenes === 'object' && !Array.isArray(extraGenes)) {
    for (const [gene, status] of Object.entries(extraGenes)) {
      if (typeof status === 'string' && gene.toUpperCase().startsWith('CYP')) {
        cypStatusMap[gene.toUpperCase()] = status;
      }
    }
  }

  // 4. Cross-check every supplement x medication pair via the pure checker.
  const supplementNames: string[] = (protocol ?? []).map(
    (p: { supplement_name: string }) => p.supplement_name,
  );
  const medicationNames: string[] = (medications ?? []).map(
    (m: { medication_name: string }) => m.medication_name,
  );

  return checkProductInteractions(supplementNames, medicationNames, cypStatusMap);
}
