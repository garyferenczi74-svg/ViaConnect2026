// =============================================================================
// dryrun-precheck (Prompt #138a operational rollout, dry-run-only)
// =============================================================================
// No DB access. Hardcodes the variant text from the seed and runs
// validateWordCounts + preCheckVariant against each variant. Prints
// findings so Gary can inspect before any gate update lands.
//
// Use scripts/marketing/run-precheck.ts (which needs SUPABASE_SERVICE_ROLE_KEY)
// for the apply path that writes gates and the precheck_completed event.
//
// Usage: npx tsx scripts/marketing/dryrun-precheck.ts
// =============================================================================

import { preCheckVariant } from '../../src/lib/marketing/variants/precheck';
import { validateWordCounts } from '../../src/lib/marketing/variants/wordCount';

interface SeedVariant {
  slot_id: string;
  variant_label: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  clinicianConsentOnFile?: boolean;
  timeSubstantiationOnFile?: boolean;
  scientificSubstantiationOnFile?: boolean;
}

const VARIANTS: SeedVariant[] = [
  {
    slot_id: 'hero.variant.control',
    variant_label: 'Control (existing copy)',
    headline: 'Precision Personal Health. Powered by Your Data.',
    subheadline: 'One Genome  One Formulation  One Life at a Time. Precision health insights from your DNA, delivered through formulations engineered for your unique genome.',
    cta_label: 'Your Journey Starts Here',
  },
  {
    slot_id: 'hero.variant.A',
    variant_label: 'Process Narrative',
    headline: 'Your wellness protocol, built from your biology, in three steps.',
    subheadline: 'Answer the assessment. Add your data. Get the precise protocol your body needs, with the science behind every recommendation.',
    cta_label: 'Start the assessment',
  },
  {
    slot_id: 'hero.variant.B',
    variant_label: 'Outcome First',
    headline: 'Sleep deeper. Wake clearer. Know exactly what your body needs.',
    subheadline: 'ViaConnect builds your Bio Optimization protocol from your assessment, your supplements, and (optionally) your genetics. The next 30 days actually move your numbers.',
    cta_label: 'Build my protocol',
  },
  {
    slot_id: 'hero.variant.C',
    variant_label: 'Proof First',
    headline: 'Precision wellness, reviewed by clinicians.',
    subheadline: "FarmCeutica's protocol engine is medically directed by Dr. Fadi Dagher. Every recommendation is grounded in published research, FTC compliant claims, and your own biology.",
    cta_label: 'See how it works',
    clinicianConsentOnFile: true,
    scientificSubstantiationOnFile: true,
  },
  {
    slot_id: 'hero.variant.D',
    variant_label: 'Time to Value',
    headline: 'Your personalized protocol in about 12 minutes.',
    subheadline: 'Answer the Comprehensive Assessment, optionally add your genetic panel, and get a Tier 1, 2, or 3 protocol, backed by Dr. Fadi Dagher and the Marshall compliance system.',
    cta_label: 'Begin: 12 minutes',
    clinicianConsentOnFile: true,
    timeSubstantiationOnFile: true,
  },
];

async function main() {
  let pass = 0;
  let warnOnly = 0;
  let blocked = 0;

  for (const v of VARIANTS) {
    console.log(`-- ${v.variant_label} (${v.slot_id}) --`);
    const wc = validateWordCounts(v.headline, v.subheadline);
    console.log(`  word counts: headline ${wc.headlineWords}, subhead ${wc.subheadlineWords}; ok=${wc.ok}`);
    if (!wc.ok) console.log(`    reasons: ${wc.reasons.join('; ')}`);

    const r = await preCheckVariant({
      headline: v.headline,
      subheadline: v.subheadline,
      ctaLabel: v.cta_label,
      clinicianConsentOnFile: v.clinicianConsentOnFile,
      timeSubstantiationOnFile: v.timeSubstantiationOnFile,
      scientificSubstantiationOnFile: v.scientificSubstantiationOnFile,
    });
    console.log(`  marshall: passed=${r.passed}; blockers=${r.blockerCount}; warnings=${r.warnCount}`);
    for (const f of r.findings) {
      console.log(`    ${f.severity}  ${f.ruleId}  ${f.message}`);
      if (f.remediation?.summary) console.log(`         remedy: ${f.remediation.summary}`);
    }

    const overall = wc.ok && r.passed;
    if (overall) pass += 1;
    else if (r.blockerCount > 0 || !wc.ok) blocked += 1;
    else warnOnly += 1;
    console.log('');
  }

  console.log(`Summary: ${pass} passed, ${warnOnly} warnings only, ${blocked} blocked.`);
  console.log('No DB writes performed. To apply, set SUPABASE_SERVICE_ROLE_KEY and run scripts/marketing/run-precheck.ts --apply.');
}

main().catch((err) => { console.error(err); process.exit(1); });
