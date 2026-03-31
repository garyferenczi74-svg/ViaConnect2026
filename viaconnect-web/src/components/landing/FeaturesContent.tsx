"use client";

import { TabH1, TabH2, TabH3, TabP, TabAccent, TabBold, TabBullet, TabCheck } from "./TabSection";
import { TabTable } from "./TabTable";
import { TabStat } from "./TabStat";
import { TabCTA } from "./TabCTA";

export function FeaturesContent() {
  return (
    <div>
      <TabH1>Your DNA Has a Plan. Start Following It.</TabH1>

      <TabP>You take supplements every day. So do 170 million other Americans. And here&apos;s the part nobody talks about: almost none of you are taking the right ones.</TabP>
      <TabP>Not because you&apos;re not trying. Because the supplement industry was never built to help you. It was built to sell the same bottle to everyone&mdash;regardless of whether your body can even absorb what&apos;s inside.</TabP>
      <TabP>ViaConnect&trade; GeneX360&trade; changes that. Permanently.</TabP>
      <TabP>We read your genetic code across six diagnostic panels. We identify exactly which enzymes are underperforming, which receptors are over-expressed, which metabolic pathways are running at half capacity. Then we build a supplement protocol that matches YOUR genome&mdash;not the average genome, not a population estimate, YOURS&mdash;and deliver it through absorption technology that is 10 to 27 times more effective than anything on a shelf at Whole Foods.</TabP>

      <TabAccent>This is not a wellness trend. This is the end of guessing.</TabAccent>

      <TabStat stats={[
        { value: "6", label: "Diagnostic Panels" },
        { value: "150+", label: "Genetic Variants" },
        { value: "10\u201327x", label: "Bioavailability" },
        { value: "5", label: "AI Sources" },
      ]} />

      <TabH2>Why ViaConnect Is the New Standard</TabH2>
      <TabP>AG1 gave the world a greens powder. Thorne built a clinical brand. Viome tested your gut. All good steps. All incomplete.</TabP>
      <TabP>None of them test your DNA. None of them formulate supplements specific to your genetic variants. None of them deliver those supplements through dual liposomal-micellar technology. And none of them connect you, your doctor, and your naturopath on a single HIPAA-compliant platform where everyone sees the same data and works from the same playbook.</TabP>
      <TabP>ViaConnect does all of it. In one place. With one login.</TabP>

      <TabH2>The Five Things No One Else Can Do</TabH2>

      <TabH3>1. Genomic-First Formulations</TabH3>
      <TabP>Every product in the FarmCeutica line exists because a genetic variant demands it. MTHFR+ exists because 40&ndash;60% of the population can&apos;t convert folic acid into usable folate. COMT+ exists because Val158Met carriers metabolize catecholamines at dramatically different rates. SHRED+ exists because FTO and MC4R variants create genetically distinct obesity-risk profiles. These are not marketing angles&mdash;they are biochemical realities that your current supplement brand is ignoring.</TabP>

      <TabH3>2. World&apos;s Most Comprehensive Genetic Test Suite</TabH3>
      <TabP>GeneX360&trade; is not one test. It is six. Methylation and pharmacogenomics. Nutrient genetics. Hormonal profiling (DUTCH Complete with 40+ metabolites). Biological age via 850,000 epigenetic markers. Peptide response genetics (world&apos;s first&mdash;zero competitors). Cannabinoid metabolism genetics (world&apos;s first&mdash;zero competitors). Nobody else even comes close.</TabP>

      <TabH3>3. Five-Source AI Consensus</TabH3>
      <TabP>Other wellness apps give you a chatbot. We give you five independent intelligence sources&mdash;Claude, OpenAI, Perplexity Sonar, OpenEvidence, and PubMed with 36 million citations&mdash;all cross-referencing every recommendation before it reaches you. A safety gating system blocks any flagged interaction regardless of what any individual AI suggests.</TabP>

      <TabH3>4. Dual-Delivery Absorption Technology</TabH3>
      <TabP>Standard supplements absorb at less than 10%. Some below 1%. FarmCeutica&apos;s proprietary dual liposomal-micellar technology delivers 10 to 27 times greater bioavailability&mdash;validated in clinical pharmacokinetic studies. Micelles hit fast (30&ndash;60 minutes). Liposomes sustain (4&ndash;8 hours).</TabP>

      <TabH3>5. Three Portals, One Ecosystem</TabH3>
      <TabP>You get your own health command center. Your doctor gets a clinical decision support system with EHR integration. Your naturopath gets an herb-gene interaction database with 500+ botanicals. Everyone sees the same genetic data. Everyone works from the same protocol.</TabP>

      <TabH2>Three Portals, One Revolution</TabH2>

      <TabH3>Personal Wellness Portal</TabH3>
      <TabP><TabBold>Your health. Your data. Your command center.</TabBold> Health Score (0&ndash;100) | Genetic Profile (plain language SNP explanations) | Daily Protocol (interactive timeline with genetic evidence trail) | Progress Dashboard (longitudinal biomarker tracking) | AI Health Advisor (three engines, SHAP explainability) | ViaTokens Rewards</TabP>

      <TabH3>Practitioner Portal</TabH3>
      <TabP><TabBold>Clinical precision. Genetic intelligence. Zero busywork.</TabBold> Patient Management | Pharmacogenomic Interaction Checker (CYP2D6, CYP2C19, CYP2C9, CYP3A4) | Protocol Builder | EHR Integration (FHIR R4) | Clinical Evidence Library | Revenue Tracking | CME Credits (18/year)</TabP>

      <TabH3>Naturopath Portal</TabH3>
      <TabP><TabBold>Where 5,000 years of botanical wisdom meets your patient&apos;s genome.</TabBold> Herb-Gene Database (500+ botanicals) | Methylation &amp; Detox by Genotype | Therapeutic Order Templates | Functional Lab Ordering | CNME CE Credits (18/year) | White-Label &amp; Wholesale | Herbal Materia Medica</TabP>

      <TabH2>Competitive Comparison</TabH2>
      <TabTable
        headers={["Capability", "ViaConnect", "AG1", "Thorne", "Viome", "23andMe"]}
        rows={[
          ["Genetic Testing", "6 panels", "None", "None", "Gut only", "Ancestry + basic"],
          ["First-to-Market", "PeptideIQ\u2122 + CannabisIQ\u2122", "None", "None", "None", "None"],
          ["Personalized Formulations", "SNP-matched to YOUR variants", "Same for everyone", "Generic line", "Microbiome-based", "Reports only"],
          ["Absorption Tech", "Dual liposomal-micellar: 10\u201327x", "Standard powder", "Standard capsules", "Standard capsules", "N/A"],
          ["AI Engines", "5 sources + safety gating", "None", "None", "Single AI", "None"],
          ["Practitioner Portal", "Full clinical + EHR", "None", "Basic ordering", "None", "None"],
          ["Naturopath Portal", "500+ herb-gene database", "None", "None", "None", "None"],
          ["HSA/FSA Eligible", "Yes (Truemed)", "No", "No", "No", "No"],
          ["Data Ownership", "You own it. Never sold.", "N/A", "N/A", "Limited", "Shared with pharma"],
        ]}
      />
      <TabP>&ldquo;AG1 is a good greens powder. It is also the same greens powder for all 8 billion people on Earth. That was fine for 2020. It is not fine anymore.&rdquo;</TabP>

      <TabCTA text={"Your DNA Has a Plan. Start Following It.\nBegin Your Free Assessment"} />
    </div>
  );
}
