/**
 * Real FarmCeutica peptide names mapped to functional medicine patterns
 * Source: Peptide_List.xlsx (April 2026) — 28 peptides, 4 tiers
 */

export const PEPTIDE_PATTERN_MAP: Record<string, string[]> = {
  hpa_axis: [
    'Selank',               // Tier 1 — primary HPA modulator
    'Semax',                // Tier 1 — ACTH/BDNF support
    'Epitalon Oral',        // Tier 1 — pineal/circadian normalization
  ],
  neuroinflammation: [
    'BPC-157 Nasal Spray',  // Tier 1 — CNS-targeted, BBB penetrating
    'Semax',                // Tier 1 — BDNF upregulation
    'Selank',               // Tier 1 — neuroinflammatory cytokine reduction
  ],
  gut_brain_axis: [
    'BPC-157 Oral',         // Tier 1 — gold standard gut repair
    'KPV',                  // Tier 2 — IL-10 anti-inflammatory
  ],
  metabolic_dysregulation: [
    'AOD-9604',             // Tier 1 — fat loss, no IGF-1 effect
    'Tesamorelin',          // Tier 2 — visceral fat, GHRH analog (HCP)
    'MOTS-C',               // Additional — AMPK activation
  ],
  tissue_repair: [
    'BPC-157 Injectable',   // Tier 1 — systemic tissue repair
    'TB-500 (Thymosin Beta-4) Injectable', // Tier 1 — actin/anti-fibrotic
    'GHK-Cu Injectable',    // Tier 2 — collagen synthesis systemic
  ],
  immune_dysregulation: [
    'Thymosin Alpha-1',     // Tier 2 — gold standard immune modulator (HCP)
    'KPV',                  // Tier 2 — IL-10 gut immune
    'BPC-157 Oral',         // Tier 1 — systemic anti-inflammatory
  ],
  hormonal_imbalance: [
    'Ipamorelin',           // Tier 2 — selective GH secretagogue (HCP)
    'CJC-1295 (No DAC)',    // Tier 2 — GHRH analog, stack with Ipamorelin (HCP)
    'PT-141 / Bremelanotide', // Tier 2 — sexual health melanocortin
    'Sermorelin',           // Tier 1 — GH axis support
  ],
  circadian_disruption: [
    'Epitalon Oral',        // Tier 1 — pineal/telomerase
    'PPW (Pro-Pro-Trp)',    // Tier 1 — orexin/sleep architecture
    'Pinealon',             // Tier 1 — pineal peptide neuroprotection
  ],
  longevity_aging: [
    'Epitalon',             // Tier 1 — injectable telomerase (highest priority)
    'BPC-157 Oral',         // Tier 1 — systemic healing/vascular
    'GHK-Cu Topical',       // Tier 1 — collagen/DNA repair topical
    'MOTS-C',               // Additional — mitochondrial anti-aging
  ],
  autonomic_dysregulation: [
    'Selank',               // Tier 1 — HPA-ANS normalization
    'BPC-157 Oral',         // Tier 1 — NO/vagal tone support
    'Semax',                // Tier 1 — autonomic CNS support
  ],
};
