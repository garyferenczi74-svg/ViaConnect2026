/**
 * Prompt 221B: flagship draft rows (testosterone + estradiol).
 * consumer_safe = false until Marshall review. Full A1 catalog is Phase 3.
 */

import type { KbHormoneRow } from "./types";

export const FLAGSHIP_HORMONE_DRAFTS: readonly KbHormoneRow[] = [
  {
    item_id: "draft-testosterone",
    hormone_slug: "testosterone",
    display_name: "Total testosterone",
    hormone_class: "androgen",
    sex_relevance: "both",
    physiology_summary:
      "Testosterone is an androgen involved in reproductive physiology, muscle and bone maintenance, and other tissue signaling. Levels vary by sex, age, and assay method.",
    male_content_block:
      "In adult males, testosterone is produced mainly in the testes under LH drive. Total and free fractions, SHBG context, and age patterns are common educational framing. High or low lab values are interpreted by a practitioner with clinical context.",
    female_content_block:
      "In adult females, testosterone is produced in the ovaries and adrenals at lower circulating levels than in males. Educational framing covers androgen contribution to physiology across reproductive years and later life stages. Lab interpretation belongs with a practitioner.",
    life_stage_notes: {
      puberty: "Androgen rise supports secondary sexual characteristics.",
      reproductive_years: "Adult ranges vary by lab method and time of day.",
      andropause_era: "Average circulating levels tend to decline with age; individual patterns vary.",
      aging: "Age-related change is educational context, not a diagnosis.",
    },
    typical_ranges: [
      {
        population: "adult male morning sample (illustrative published reference)",
        sex: "male",
        life_stage_or_cycle_phase: "adult",
        range_low: null,
        range_high: null,
        unit: "ng/dL",
        source_url: "https://pubmed.ncbi.nlm.nih.gov/",
        source_note:
          "Ranges vary by lab and method. Stored rows are typical published references, never the user lab authoritative range. Flagship draft pending sourced A/B citations.",
      },
    ],
    influencing_factors: [
      { factor: "sleep", note: "Sleep restriction can influence androgen patterns in studies.", grade: "B" },
      { factor: "training", note: "Training load and recovery associate with androgen context in literature.", grade: "C" },
      { factor: "body_composition", note: "Adiposity and SHBG interact with measured total testosterone.", grade: "B" },
    ],
    related_rsids: [],
    related_study_item_ids: [],
    related_ingredient_notes: [],
    marker_mapping: [
      { alias: "testosterone" },
      { alias: "total testosterone" },
      { alias: "testosterone total" },
      { alias: "serum testosterone" },
    ],
    consumer_safe: false,
    practitioner_depth_block:
      "Practitioner depth (214d): TRT landscape and monitoring concepts are educational for licensed clinicians only. Never render on consumer surfaces.",
  },
  {
    item_id: "draft-estradiol",
    hormone_slug: "estradiol",
    display_name: "Estradiol (E2)",
    hormone_class: "estrogen",
    sex_relevance: "both",
    physiology_summary:
      "Estradiol is the primary circulating estrogen in reproductive-age females and is also present in males. Levels vary by sex, cycle phase, life stage, and assay.",
    male_content_block:
      "In males, estradiol arises largely from aromatization of androgens. Educational framing often pairs estradiol with testosterone and SHBG context. Interpretation of high or low values is clinical.",
    female_content_block:
      "In females, estradiol varies across the menstrual cycle and across perimenopause and menopause. When lab draw cycle phase is unknown, educational content must state that honestly and avoid phase-timed claims.",
    life_stage_notes: {
      reproductive_years: "Cycle-phase variation is large; timing of the draw matters.",
      perimenopause: "Fluctuating patterns are common; education is not a diagnosis.",
      menopause: "Lower average estradiol is a life-stage pattern, not an automatic treatment decision.",
    },
    typical_ranges: [
      {
        population: "adult female (illustrative; phase-dependent)",
        sex: "female",
        life_stage_or_cycle_phase: "cycle_phase_unknown",
        range_low: null,
        range_high: null,
        unit: "pg/mL",
        source_url: "https://pubmed.ncbi.nlm.nih.gov/",
        source_note:
          "Ranges vary by lab, method, and cycle phase. Flagship draft pending sourced A/B citations.",
      },
    ],
    influencing_factors: [
      { factor: "body_composition", note: "Adipose tissue contributes to estrogen production via aromatization.", grade: "B" },
      { factor: "stress", note: "Stress-axis context can sit alongside reproductive hormone education.", grade: "C" },
    ],
    related_rsids: [],
    related_study_item_ids: [],
    related_ingredient_notes: [],
    marker_mapping: [
      { alias: "estradiol" },
      { alias: "estradiol e2" },
      { alias: "e2" },
      { alias: "17 beta estradiol" },
    ],
    consumer_safe: false,
    practitioner_depth_block:
      "Practitioner depth (214d): HRT landscape and monitoring concepts are educational for licensed clinicians only. Never render on consumer surfaces.",
  },
] as const;
