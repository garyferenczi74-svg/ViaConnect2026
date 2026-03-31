"use client";

import { TabH1, TabH2, TabH3, TabP, TabBold, TabBullet } from "./TabSection";
import { TabTable } from "./TabTable";
import { TabCTA } from "./TabCTA";

export function GenomicsContent() {
  return (
    <div>
      <TabH1>Stop Guessing. Start Knowing.</TabH1>
      <TabP>Right now, 40 to 60 percent of the people reading this carry an MTHFR gene variant that reduces their ability to process folate by up to 70%. They don&apos;t know it. Their supplement brand doesn&apos;t test for it. Their multivitamin contains folic acid&mdash;the synthetic form their body literally cannot convert.</TabP>
      <TabP>Every body is running different software. The supplement industry is still selling one-size-fits-all hardware. GeneX360&trade; is the update your body has been waiting for.</TabP>

      <TabH2>The GeneX360&trade; Six-Panel System</TabH2>
      <TabP>&ldquo;No test on the market goes this deep. A simple saliva kit. Results in 7&ndash;14 days. A lifetime of precision.&rdquo;</TabP>

      <TabH3>GENEX-M&trade; ($288.88)</TabH3>
      <TabP>25+ SNPs &mdash; methylation (MTHFR, MTRR, MTR, BHMT, CBS), detox/neuro (COMT, MAOA, DAO, SOD2, GST), drug metabolism (CYP2D6, CYP2C19, CYP2C9), nutrients (VDR, APOE, FTO).</TabP>

      <TabH3>NUTRIGEN-DX&trade; ($388.88)</TabH3>
      <TabP>Complete nutrient genetics &mdash; vitamin metabolism, mineral utilization, macronutrient response, fatty acids, food sensitivities.</TabP>

      <TabH3>HormoneIQ&trade; ($508.88)</TabH3>
      <TabP>DUTCH Complete &mdash; 40+ hormones via 24-hour urine. Sex hormones, cortisol rhythm, estrogen metabolites, neurotransmitter metabolites.</TabP>

      <TabH3>EpigenHQ&trade; ($448.88)</TabH3>
      <TabP>Illumina 850K array, 4 aging clocks (Horvath, Hannum, PhenoAge, GrimAge). Accuracy: &plusmn;2.8 years.</TabP>

      <TabH3>PeptideIQ&trade; ($428.88) &mdash; WORLD&apos;S FIRST</TabH3>
      <TabP>Growth Hormone Axis (GHSR, IGF1), Collagen &amp; Repair (COL1A1, MMP1), Peptide Transport (SLC15A1, DPP4), Immune &amp; Thymic (FOXN1, IL-7R). Zero competitors.</TabP>

      <TabH3>CannabisIQ&trade; ($398.88) &mdash; WORLD&apos;S FIRST</TabH3>
      <TabP>Cannabinoid Metabolism (CYP2C9, CYP3A4), Receptor Sensitivity (CNR1, CNR2, FAAH), Adverse Reaction Risk (AKT1, COMT, DRD2), Terpene Response (OR genes, TRPV1). Zero competitors.</TabP>

      <TabH3>GeneX360&trade; COMPLETE ($988.88)</TabH3>
      <TabP><TabBold>All 6 panels. Save $1,473 (59.8%).</TabBold> 6 months Platinum included ($173.28 value). HSA/FSA eligible.</TabP>

      <TabH2>SNP-Targeted Nutraceuticals</TabH2>
      <TabP>&ldquo;FarmCeutica doesn&apos;t make supplements then figure out who to sell them to. We identify genetic variants, research the biochemistry, then formulate exactly what that variant demands.&rdquo;</TabP>
      <TabP>MTHFR+ (MTHFR C677T/A1298C) | COMT+ (Val158Met) | SHRED+ (FTO/MC4R/GLP1R) | FOCUS+ (COMT/BDNF) | CALM+ (stress SNPs) | RELAX+ (multi-SNP sleep) | RISE+ (energy metabolism) | NAD+ (longevity SNPs) | FLEX+ (TNF/IL-6) | BLAST+ (ACTN3/ACE) | VDR+ (VDR Bsm1/Taq1) | MAOA+ (MAOA VNTR) | Plus BALANCE+, CLEAN+, IRON+, AMINO ACID MATRIX+, DigestiZorb+, CREATINE HCL+, DESIRE+, GROW+ Pre-Natal. 27+ products.</TabP>

      <TabH2>Dual-Delivery Absorption</TabH2>
      <TabP>&ldquo;Your current supplements absorb at less than 10%. Some below 1%. You&apos;re paying for 100% and getting less than 10%.&rdquo;</TabP>
      <TabP><TabBold>Liposomal:</TabBold> 50&ndash;200nm, sunflower lecithin, 20,000 PSI, &gt;85% encapsulation, lymphatic bypass, 4&ndash;8 hour sustained.</TabP>
      <TabP><TabBold>Micellar:</TabBold> 10&ndash;50nm, Quillaja saponin, 50&ndash;1,000x solubilization, no fat required, 30&ndash;60 min rapid.</TabP>
      <TabP><TabBold>Combined:</TabBold> 10&ndash;27x bioavailability. PK studies: N=24 liposomal (Cmax +1,055%, AUC +1,079%), N=32 micellar (Cmax +2,594%, 27x bioavailability).</TabP>

      <TabTable
        headers={["Nutrient", "Standard", "FarmCeutica", "Improvement"]}
        rows={[
          ["CoQ10", "<4%", "60\u2013108%", "15\u201327x"],
          ["Curcumin", "<1%", "27\u201345%", "27\u201345x"],
          ["Glutathione", "<3%", "42\u201360%", "14\u201320x"],
          ["Vitamin C", "14\u201316%", "63\u201396%", "4.5\u20136x"],
          ["Quercetin", "<2%", "20\u201344%", "10\u201322x"],
          ["Resveratrol", "<1%", "3.4\u20134.2%", "3.4\u20134.2x"],
        ]}
      />

      <TabH2>Future Genetic Peptide Protocols</TabH2>
      <TabP>11 therapeutic modules, 27 peptides, four-tier benefit ratings. Growth Hormone Optimization, Neurotrophic &amp; Cognitive, Immune, Metabolic (Retatrutide + Tirzepatide), Longevity, Tissue Repair. Real-world data continuously refining correlations.</TabP>

      <TabH2>You Own Your Data</TabH2>
      <ul className="list-none space-y-2 mb-6">
        <TabBullet>Never sell (not to insurers, employers, pharma, anyone)</TabBullet>
        <TabBullet>One-click delete, GDPR, GINA</TabBullet>
        <TabBullet>AES-256 at rest, TLS 1.3 in transit</TabBullet>
        <TabBullet>Full HIPAA with BAAs</TabBullet>
        <TabBullet>De-identified research only with opt-in</TabBullet>
      </ul>
      <TabP>&ldquo;We are not 23andMe. Your genome belongs to you.&rdquo;</TabP>

      <TabCTA text="Stop Guessing. Start Knowing. \u2192 Order Your GeneX360\u2122 Kit" />
    </div>
  );
}
