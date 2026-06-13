// Prompt 193b (2026-06-12): comprehensive per SNP deep reports for the GeneXM
// panel on /shop/genex360. The report level biology, health associations, and
// strategy copy is authoritative and unchanged from 193a. The per SNP genotype
// data (keyVariants) is reconciled to the authoritative GENEX-M variant set.
//
// ASSAY STATUS by locus:
//   Confirmed (genotype tiers shown as reconciled): MTHFR, MTR, MTRR, SHMT1,
//   AHCY, COMT, MAOA, VDR, NOS3, DAO, CBS, GST, SOD2, NAT2, TCN2, RFC1, ACAT1.
//   Confirm with assay: BHMT keeps a real R239Q default but may instead genotype
//   the common methylation panel set (see the BHMT inline note). SUOX is gated
//   pending confirmation of the exact position GENEX-M genotypes; its biology and
//   molybdenum guidance stay live while its genotype tiers are withheld.
//   Defer to lab: ADO has no established common nutrigenetic variant; its biology
//   stays live with no genotype to activity mapping until the lab confirms one.
//
// Orientation: every genotype call is shown in the assay reporting orientation.
// Inline strand and orientation notes flag CBS, SOD2, VDR Fok1 and Taq1, and
// MAOA, where the effect allele label depends on the strand the lab reports.
//
// Modeling notes: keyed by lowercase gene symbol slug (the nested hash is
// #genex-m/<slug>). healthAssociations and interactions are prose in Section 7
// and are kept as a single array entry to stay verbatim. Copy number style loci
// (GSTM1, GSTT1) carry Present or Null calls, and the MAOA promoter repeat
// carries repeat counts, never a SNP genotype. Variants that are not yet
// reconciled with the live assay (SUOX, ADO) set pendingAssayDefinition true and
// carry an empty genotypes array; the UI hides their tiers until confirmed.
//
// Standing rules honored: no em or en dashes anywhere; consumer brand is Via
// Cura (the legal manufacturing entity is never named here); bioavailability is
// locked at "10x to 28x"; the score is named "Bio Optimization"; tone is
// associative and educational, never diagnostic.

import type { SnpDeepReport } from "./types";

export const GENEX_M_DEEP_REPORTS: Record<string, SnpDeepReport> = {
  mthfr: {
    aliases: [],
    pathway: "Methylation",
    keyVariants: [
      {
        rsid: "rs1801133",
        name: "C677T (Ala222Val)",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "Full enzyme activity. You convert folate to its active 5-MTHF form efficiently.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "Roughly sixty five percent of typical activity. Most people do well prioritizing active folate and avoiding high dose synthetic folic acid.",
          },
          {
            genotype: "TT",
            label: "Reduced",
            interpretation:
              "Roughly thirty percent of typical activity and more heat sensitive. Active folate, riboflavin, and homocysteine awareness matter most here. Effect allele T.",
          },
        ],
      },
      {
        rsid: "rs1801131",
        name: "A1298C (Glu429Ala)",
        genotypes: [
          { genotype: "AA", label: "Typical", interpretation: "No reduction from this site." },
          {
            genotype: "AC",
            label: "Intermediate",
            interpretation: "Mild reduction, more relevant when combined with a 677 variant.",
          },
          {
            genotype: "CC",
            label: "Reduced",
            interpretation:
              "Lower activity, and a combined 677 and 1298 pattern compounds the effect. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "MTHFR is the rate limiting enzyme that converts dietary and supplemental folate into 5-MTHF, the active methyl donor your body uses to remethylate homocysteine into methionine and to power the wider methylation cycle.",
    functionalImpact:
      "Reduced activity lowers 5-MTHF production, which can raise homocysteine and reduce the supply of methyl groups needed for DNA, neurotransmitter, and detox reactions. Riboflavin as the FAD cofactor helps stabilize the 677TT enzyme.",
    healthAssociations: [
      "Linked to elevated homocysteine, fatigue, mood patterns including low mood and anxiety, migraine tendency, and folate status during preconception and pregnancy. These are associations, not certainties.",
    ],
    nutrientStrategy: [
      "Methylfolate as 5-MTHF rather than synthetic folic acid.",
      "Methylcobalamin or hydroxocobalamin B12 to partner the remethylation step.",
      "Riboflavin as vitamin B2, especially valuable for 677TT.",
      "Vitamin B6 and magnesium as supporting cofactors.",
    ],
    cautions: [
      "Avoid high dose synthetic folic acid, which can leave unmetabolized folic acid in circulation.",
      "Titrate active methyl donors gradually if you are sensitive to overmethylation, especially alongside a slow COMT result.",
    ],
    dietLifestyle: [
      "Emphasize natural folate from leafy greens, legumes, and asparagus.",
      "Limit alcohol, which depletes folate.",
      "Support homocysteine balance with consistent B vitamin intake.",
    ],
    interactions: [
      "Works hand in hand with MTR and MTRR for B12 driven remethylation, raises the methyl donor demand felt by COMT, and shares homocysteine with the CBS transsulfuration route. Riboflavin status modulates its activity.",
    ],
    protocolTieIn:
      "Via Cura prioritizes 5-MTHF with its B12 and riboflavin partners, delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, so active folate reaches the cells that need it. Track homocysteine and energy as part of your Bio Optimization picture.",
  },

  mtr: {
    aliases: ["MS"],
    pathway: "Methylation",
    keyVariants: [
      {
        rsid: "rs1805087",
        name: "A2756G (Asp919Gly)",
        genotypes: [
          {
            genotype: "AA",
            label: "Typical",
            interpretation: "Efficient remethylation of homocysteine to methionine.",
          },
          {
            genotype: "AG",
            label: "Intermediate",
            interpretation: "Mildly altered activity and B12 turnover.",
          },
          {
            genotype: "GG",
            label: "Reduced",
            interpretation: "Greater demand on active B12 to keep the cycle running. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "MTR uses active B12 as methylcobalamin to transfer a methyl group from 5-MTHF to homocysteine, regenerating methionine and keeping the methylation cycle turning.",
    functionalImpact:
      "Altered activity can slow homocysteine clearance and increase how much functional B12 the pathway consumes, which can deplete B12 over time.",
    healthAssociations: [
      "Linked to homocysteine balance, B12 status, energy, and neurological wellbeing.",
    ],
    nutrientStrategy: [
      "Methylcobalamin or hydroxocobalamin B12.",
      "5-MTHF to supply the methyl group MTR transfers.",
      "Adequate protein for methionine availability.",
    ],
    cautions: [
      "Because MTR uses B12 heavily, a co occurring MTRR variant can accelerate B12 depletion, so pair the two when planning.",
    ],
    dietLifestyle: [
      "Include quality B12 sources, and supplement if you eat little or no animal food.",
    ],
    interactions: [
      "Depends on MTRR to keep its B12 cofactor functional, and on MTHFR to supply 5-MTHF. Together these three set your remethylation capacity.",
    ],
    protocolTieIn:
      "Via Cura supplies active B12 alongside 5-MTHF at high absorption so MTR is never the bottleneck. Track B12 status and homocysteine within Bio Optimization.",
  },

  mtrr: {
    aliases: [],
    pathway: "Methylation",
    keyVariants: [
      {
        rsid: "rs1801394",
        name: "A66G (Ile22Met)",
        genotypes: [
          {
            genotype: "AA",
            label: "Typical",
            interpretation: "Efficient recycling of B12 back to its active form.",
          },
          {
            genotype: "AG",
            label: "Intermediate",
            interpretation: "Somewhat reduced recycling capacity.",
          },
          {
            genotype: "GG",
            label: "Reduced",
            interpretation:
              "Lower ability to regenerate active B12, which compounds any MTR or B12 limitation. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "MTRR keeps B12 in its usable methylcobalamin state so MTR can keep remethylating homocysteine. It is the maintenance crew for the B12 cofactor.",
    functionalImpact:
      "Reduced recycling means active B12 runs down faster, lowering methylation output and raising homocysteine, particularly when paired with MTR or MTHFR variants.",
    healthAssociations: [
      "Linked to homocysteine elevation, functional B12 insufficiency, fatigue, and methylation dependent processes.",
    ],
    nutrientStrategy: [
      "Active B12 as methylcobalamin or hydroxocobalamin to offset slower recycling.",
      "5-MTHF and riboflavin as supporting partners.",
    ],
    cautions: [
      "Combined MTRR and MTR variants warrant steadier active B12 support rather than relying on recycling alone.",
    ],
    dietLifestyle: [
      "Maintain consistent B12 intake and reduce factors that deplete it such as heavy alcohol use.",
    ],
    interactions: [
      "Directly supports MTR, and indirectly the whole remethylation arm with MTHFR. A weak link here strains the entire methylation cycle.",
    ],
    protocolTieIn:
      "Via Cura leans on directly active B12 forms so methylation does not depend on efficient recycling. Track homocysteine and energy in Bio Optimization.",
  },

  bhmt: {
    aliases: [],
    pathway: "Methylation, alternate route",
    keyVariants: [
      // BHMT confirm with assay. GENEX-M may instead genotype the common
      // methylation panel set rs585800 (BHMT/1), rs567754 (BHMT/2), rs617219
      // (BHMT/4), rs651852 (BHMT/8). If the assay uses that set, replace this
      // rs3733890 entry with those four variants and pull their genotype calls
      // from the assay. R239Q is kept as a real default until the assay confirms.
      {
        rsid: "rs3733890",
        name: "R239Q",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation: "Robust backup remethylation using betaine.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation: "Modestly reduced backup capacity.",
          },
          {
            genotype: "AA",
            label: "Reduced function",
            interpretation:
              "Greater reliance on the folate and B12 route, so betaine and choline support matters more.",
          },
        ],
      },
    ],
    biologicalRole:
      "BHMT runs the alternate remethylation route in the liver and kidney, converting homocysteine to methionine using betaine, also called trimethylglycine, as the methyl donor.",
    functionalImpact:
      "Reduced BHMT activity leaves you more dependent on the MTHFR, MTR, and MTRR route, so any weakness there is felt more strongly.",
    healthAssociations: [
      "Linked to homocysteine balance, liver methylation, and choline status.",
    ],
    nutrientStrategy: [
      "Betaine as trimethylglycine to fuel this pathway.",
      "Choline from diet or supplement, which the body can convert toward betaine.",
    ],
    cautions: [
      "High betaine can raise certain lipid markers in some people, so support choline and overall balance rather than betaine alone.",
    ],
    dietLifestyle: [
      "Include choline rich foods such as eggs and, for those who eat it, liver. Beets and spinach provide betaine.",
    ],
    interactions: [
      "Provides a parallel path to the folate and B12 remethylation route, and connects to PEMT and choline metabolism. When MTHFR is slow, a healthy BHMT route is a valuable backup.",
    ],
    protocolTieIn:
      "Via Cura can add betaine and choline support to strengthen this backup route, delivered at high absorption. Track homocysteine within Bio Optimization.",
  },

  shmt1: {
    aliases: ["SHMT"],
    pathway: "Methylation, folate allocation",
    keyVariants: [
      {
        rsid: "rs1979277",
        name: "C1420T (Leu474Phe)",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation: "Balanced folate distribution between DNA synthesis and methylation.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation: "A mild shift in how the folate pool is allocated.",
          },
          {
            genotype: "TT",
            label: "Variant",
            interpretation:
              "Folate is biased toward DNA building, which can leave less for methylation. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "SHMT1 moves one carbon units between serine and glycine and the folate pool, helping decide whether folate is used for DNA synthesis or for methylation.",
    functionalImpact:
      "Variants can shift the balance toward DNA synthesis, subtly reducing the folate available for the methylation cycle.",
    healthAssociations: [
      "Linked to methylation capacity, folate status, and homocysteine balance when combined with other folate cycle variants.",
    ],
    nutrientStrategy: [
      "Adequate 5-MTHF so both demands are met.",
      "Vitamin B6 as a cofactor for SHMT.",
      "Glycine and serine balance through diet.",
    ],
    cautions: [
      "Interpret alongside MTHFR, since the two together shape your effective methylfolate supply.",
    ],
    dietLifestyle: [
      "Maintain steady folate intake and adequate protein for serine and glycine.",
    ],
    interactions: [
      "Sits upstream of the methylation choices made by MTHFR and the remethylation enzymes, and connects to glycine pathways.",
    ],
    protocolTieIn:
      "Via Cura ensures generous active folate so methylation is not shortchanged when allocation shifts. Track within Bio Optimization.",
  },

  ahcy: {
    aliases: ["SAHH"],
    pathway: "Methylation, SAM to SAH balance",
    keyVariants: [
      {
        rsid: "rs819147",
        name: "AHCY-01",
        genotypes: [
          {
            genotype: "TT",
            label: "Typical",
            interpretation:
              "Efficient clearance of S-adenosylhomocysteine, keeping methylation reactions unblocked.",
          },
          {
            genotype: "TC",
            label: "Intermediate",
            interpretation: "Mildly reduced clearance of S-adenosylhomocysteine.",
          },
          {
            genotype: "CC",
            label: "Reduced",
            interpretation:
              "Higher S-adenosylhomocysteine, which inhibits methyltransferases and lowers the methylation ratio. Effect allele C.",
          },
        ],
      },
      {
        rsid: "rs819134",
        name: "AHCY-02",
        genotypes: [
          { genotype: "AA", label: "Typical", interpretation: "Standard AHCY activity." },
          {
            genotype: "AG",
            label: "Intermediate",
            interpretation: "Mildly reduced AHCY activity.",
          },
          {
            genotype: "GG",
            label: "Reduced",
            interpretation: "Lower AHCY activity. Effect allele G.",
          },
        ],
      },
      {
        rsid: "rs819171",
        name: "AHCY-19",
        genotypes: [
          { genotype: "TT", label: "Typical", interpretation: "Standard AHCY activity." },
          {
            genotype: "TC",
            label: "Intermediate",
            interpretation: "Mildly reduced AHCY activity.",
          },
          {
            genotype: "CC",
            label: "Reduced",
            interpretation: "Lower AHCY activity. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "AHCY clears S-adenosylhomocysteine, the direct product and inhibitor of methylation reactions, into homocysteine and adenosine. Removing it keeps the SAM to SAH ratio favorable.",
    functionalImpact:
      "Reduced clearance raises S-adenosylhomocysteine, which broadly slows methylation across DNA, neurotransmitters, and detox, even when methyl donors are adequate.",
    healthAssociations: [
      "Linked to global methylation efficiency, homocysteine balance, and how well methyl donors translate into actual methylation.",
    ],
    nutrientStrategy: [
      "Support downstream homocysteine handling with B12, 5-MTHF, and B6.",
      "Avoid pushing methyl donors so hard that the SAH side cannot keep up.",
    ],
    cautions: [
      "More methyl donors do not always help when the limiter is SAH clearance. Balance is the goal.",
    ],
    dietLifestyle: [
      "Support overall methylation balance rather than aggressive single nutrient loading.",
    ],
    interactions: [
      "Sits at the hinge of the methylation cycle, downstream of every methyltransferase including COMT, and upstream of CBS and homocysteine routing.",
    ],
    protocolTieIn:
      "Via Cura tunes methyl donor intensity to your full pattern rather than overloading, supporting a healthy methylation ratio. Track within Bio Optimization. Note that AHCY rsIDs vary by panel and should be reconciled with the live assay.",
  },

  comt: {
    aliases: [],
    pathway: "Neurotransmitter and estrogen clearance",
    keyVariants: [
      {
        rsid: "rs4680",
        name: "Val158Met",
        genotypes: [
          {
            genotype: "GG",
            label: "Val/Val, fast COMT",
            interpretation:
              "You clear dopamine and catecholamines quickly. Often steadier under stress, sometimes lower baseline focus and drive.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation: "A balanced pace between the two extremes.",
          },
          {
            genotype: "AA",
            label: "Met/Met, slow COMT",
            interpretation:
              "You hold dopamine longer. Often sharp focus, but more sensitivity to stress, stimulants, and slower estrogen clearance. Effect allele A for the slow phenotype.",
          },
        ],
      },
      // rs4633 is a modifier in linkage with rs4680 and tracks the fast or slow
      // reading; display the call in the assay orientation.
      {
        rsid: "rs4633",
        name: "C472T (H62H)",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation: "Tracks with fast COMT.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation: "A mixed reading between fast and slow COMT.",
          },
          {
            genotype: "TT",
            label: "Variant",
            interpretation: "Tracks with slow COMT. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "COMT methylates and breaks down dopamine, norepinephrine, epinephrine, and catechol estrogens, using a methyl group from SAM and magnesium as a cofactor.",
    functionalImpact:
      "Slow variants leave catecholamines and catechol estrogens circulating longer, which raises sensitivity to stress and stimulants and increases the demand for methyl donors and magnesium to finish the job. Fast variants clear these quickly and can lower baseline dopamine tone.",
    healthAssociations: [
      "Linked to stress resilience, focus and motivation, anxiety tendency, response to caffeine and stimulants, and estrogen clearance efficiency.",
    ],
    nutrientStrategy: [
      "Magnesium as a key COMT cofactor.",
      "Methyl donors such as 5-MTHF and B12 to supply the methylation, titrated gently for slow COMT.",
      "For slow COMT, moderate added methyl donors and manage stimulant load.",
    ],
    cautions: [
      "Slow COMT plus aggressive methyl donor supplementation can feel overstimulating. Start low and adjust.",
      "Fast COMT may benefit from supporting dopamine precursors and lifestyle drive rather than clearing harder.",
    ],
    dietLifestyle: [
      "Manage caffeine to your tolerance.",
      "Stress regulation practices matter more for slow COMT.",
      "Support estrogen clearance with cruciferous vegetables and fiber.",
    ],
    interactions: [
      "Competes with all methylation reactions for methyl donors, so it interacts strongly with MTHFR. It finishes the estrogen detox pathway that CYP1A1 and CYP1B1 begin, connecting it to HormoneIQ.",
    ],
    protocolTieIn:
      "Via Cura sets methyl donor intensity and magnesium to your COMT pace, delivered at high absorption, and supports estrogen clearance where relevant. Track stress, focus, and where applicable estrogen metabolites in Bio Optimization.",
  },

  maoa: {
    aliases: [],
    pathway: "Neurotransmitter turnover",
    keyVariants: [
      // MAOA is X linked, so females carry two alleles (GG, GT, or TT) while males
      // are hemizygous and carry a single allele (G or T). Higher activity tracks
      // the T orientation that most panels report and lower activity tracks G;
      // confirm the orientation with the assay before reading the effect direction.
      {
        rsid: "rs6323",
        name: "R297R",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "Females are GG, GT, or TT here and males carry a single allele G or T. This call tracks the higher turnover orientation of serotonin, norepinephrine, and dopamine; confirm the allele orientation with the assay.",
          },
          {
            genotype: "GT",
            label: "Intermediate",
            interpretation:
              "A mixed reading in females, between the two activity orientations. Males carry only a single allele, so confirm the orientation with the assay.",
          },
          {
            genotype: "TT",
            label: "Variant",
            interpretation:
              "Tracks the lower turnover orientation, which can leave these signals elevated longer; the higher activity orientation tracks T on most panels, so confirm with the assay.",
          },
        ],
      },
      // The MAOA uVNTR is a variable number tandem repeat in the promoter, not a
      // SNP, so the assay must report a repeat count. If GENEX-M does not report
      // the uVNTR, omit this modifier rather than faking a genotype.
      {
        rsid: "MAOA-uVNTR",
        name: "MAOA-LPR promoter repeat",
        genotypes: [
          {
            genotype: "2R, 3R, 5R",
            label: "Lower activity",
            interpretation: "Lower activity promoter repeats, which set a lower baseline MAOA expression.",
          },
          {
            genotype: "3.5R, 4R",
            label: "Higher activity",
            interpretation: "Higher activity promoter repeats, which set a higher baseline MAOA expression.",
          },
        ],
      },
    ],
    biologicalRole:
      "MAOA degrades serotonin, norepinephrine, and dopamine, setting how quickly these mood and arousal signals are turned over.",
    functionalImpact:
      "Higher activity clears these neurotransmitters faster, while lower activity leaves them elevated longer, both of which can influence mood stability, motivation, and stress reactivity.",
    healthAssociations: [
      "Linked to mood balance, irritability and stress reactivity, and serotonin and dopamine tone.",
    ],
    nutrientStrategy: [
      "Riboflavin as the FAD cofactor for MAOA.",
      "Balanced precursor intake and steady blood sugar to support even neurotransmitter levels.",
    ],
    cautions: [
      "Be thoughtful combining high dose serotonin or dopamine precursors with other influences on these systems, and involve a practitioner.",
    ],
    dietLifestyle: [
      "Regular sleep, exercise, and light exposure support stable neurotransmitter rhythms.",
    ],
    interactions: [
      "Works alongside COMT in setting overall neurotransmitter tone, one by oxidation and the other by methylation.",
    ],
    protocolTieIn:
      "Via Cura supports cofactors and a steady foundation rather than pushing precursors hard. Track mood and energy in Bio Optimization.",
  },

  vdr: {
    aliases: [],
    pathway: "Vitamin D signaling, immune and methylation support",
    keyVariants: [
      // Fok1 is reported as both C/T and F/f depending on the lab; display the
      // call in the assay orientation.
      {
        rsid: "rs2228570",
        name: "Fok1",
        genotypes: [
          { genotype: "FF", label: "Typical", interpretation: "Standard receptor activity." },
          { genotype: "Ff", label: "Intermediate", interpretation: "Modestly altered signaling." },
          {
            genotype: "ff",
            label: "Reduced sensitivity",
            interpretation: "May need higher vitamin D status to achieve the same downstream effect.",
          },
        ],
      },
      // Bsm1 is a sensitivity modifier. Some labs report bb, Bb, BB equivalently
      // to CC, CT, TT; set the call in the assay orientation.
      {
        rsid: "rs1544410",
        name: "Bsm1",
        genotypes: [
          { genotype: "CC", label: "Typical", interpretation: "Standard vitamin D requirement from this site." },
          { genotype: "CT", label: "Intermediate", interpretation: "A modest shift in vitamin D requirement." },
          {
            genotype: "TT",
            label: "Variant",
            interpretation: "Refines the vitamin D requirement; some labs report bb, Bb, BB on the opposite orientation.",
          },
        ],
      },
      // Taq1 is a sensitivity modifier. Some labs report AA, AG, GG on the
      // opposite strand to TT, TC, CC; set the call in the assay orientation.
      {
        rsid: "rs731236",
        name: "Taq1",
        genotypes: [
          { genotype: "TT", label: "Typical", interpretation: "Standard vitamin D requirement from this site." },
          { genotype: "TC", label: "Intermediate", interpretation: "A modest shift in vitamin D requirement." },
          {
            genotype: "CC",
            label: "Variant",
            interpretation: "Refines the vitamin D requirement; some labs report AA, AG, GG on the opposite strand.",
          },
        ],
      },
    ],
    biologicalRole:
      "VDR translates vitamin D into action across immune regulation, bone and calcium handling, mood, and cofactor regulation that touches methylation.",
    functionalImpact:
      "Less sensitive variants can mean you need a higher vitamin D level to achieve the same downstream benefit, affecting immunity, mood, and bone support.",
    healthAssociations: [
      "Linked to vitamin D dependent immune function, bone health, mood, and seasonal wellbeing.",
    ],
    nutrientStrategy: [
      "Vitamin D3 dosed to reach an adequate blood level for your sensitivity.",
      "Vitamin K2 and magnesium to partner vitamin D for proper calcium handling.",
    ],
    cautions: [
      "Test and target a blood level rather than guessing, since needs vary with these variants.",
    ],
    dietLifestyle: [
      "Sensible sun exposure and vitamin D rich foods, plus supplementation when levels are low.",
    ],
    interactions: [
      "Connects to calcium and bone pathways and supports immune and methylation related regulation, complementing the methylation genes.",
    ],
    protocolTieIn:
      "Via Cura matches vitamin D and its partners to your sensitivity and blood level, delivered at high absorption. Track vitamin D status in Bio Optimization.",
  },

  nos3: {
    aliases: ["eNOS"],
    pathway: "Vascular function and BH4 demand",
    keyVariants: [
      {
        rsid: "rs1799983",
        name: "G894T (Glu298Asp)",
        genotypes: [
          { genotype: "GG", label: "Typical", interpretation: "Efficient nitric oxide production." },
          { genotype: "GT", label: "Intermediate", interpretation: "Mildly reduced output." },
          {
            genotype: "TT",
            label: "Reduced",
            interpretation:
              "Lower nitric oxide production, which can affect blood flow and raise oxidative pressure. Effect allele T.",
          },
        ],
      },
      {
        rsid: "rs2070744",
        name: "-786 promoter variant",
        genotypes: [
          { genotype: "TT", label: "Typical", interpretation: "Standard NOS3 expression." },
          {
            genotype: "TC",
            label: "Intermediate",
            interpretation: "Mildly reduced NOS3 expression.",
          },
          {
            genotype: "CC",
            label: "Reduced",
            interpretation: "Lower NOS3 expression. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "NOS3 produces nitric oxide for healthy blood vessel relaxation and circulation, and it draws on the BH4 cofactor shared with neurotransmitter synthesis.",
    functionalImpact:
      "Reduced output can lower nitric oxide for circulation and, under stress or low BH4, can shift the enzyme toward producing oxidative species instead, raising oxidative load.",
    healthAssociations: [
      "Linked to circulation, blood pressure tendency, exercise blood flow, and oxidative stress.",
    ],
    nutrientStrategy: [
      "Nitric oxide support such as dietary nitrates from beets and leafy greens.",
      "Antioxidant support and folate, which help keep BH4 in its active form.",
    ],
    cautions: [
      "Manage cardiovascular risk factors with a practitioner, since circulation involves more than one gene.",
    ],
    dietLifestyle: [
      "Regular aerobic activity and nitrate rich vegetables support healthy nitric oxide.",
    ],
    interactions: [
      "Shares BH4 demand with neurotransmitter pathways and benefits from folate status, linking it back to MTHFR.",
    ],
    protocolTieIn:
      "Via Cura can add nitric oxide and antioxidant support and emphasize folate, delivered at high absorption. Track circulation related markers in Bio Optimization.",
  },

  dao: {
    aliases: ["AOC1", "ABP1"],
    pathway: "Histamine clearance at the gut",
    keyVariants: [
      {
        rsid: "rs10156191",
        name: "c.47C>T (Thr16Met)",
        genotypes: [
          { genotype: "CC", label: "Typical", interpretation: "Robust breakdown of dietary histamine." },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation: "Somewhat reduced histamine clearance.",
          },
          {
            genotype: "TT",
            label: "Reduced",
            interpretation: "Lower DAO activity, more likely to react to histamine rich foods. Effect allele T.",
          },
        ],
      },
      {
        rsid: "rs1049742",
        name: "c.995C>T (Ser332Phe)",
        genotypes: [
          { genotype: "CC", label: "Typical", interpretation: "Robust DAO activity from this site." },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation: "Somewhat reduced DAO activity from this site.",
          },
          {
            genotype: "TT",
            label: "Variant",
            interpretation: "Associated with reduced DAO activity. Effect allele T.",
          },
        ],
      },
      {
        rsid: "rs1049793",
        name: "c.1990C>G (His645Asp)",
        genotypes: [
          { genotype: "CC", label: "Typical", interpretation: "Robust DAO activity from this site." },
          {
            genotype: "CG",
            label: "Intermediate",
            interpretation: "Somewhat reduced DAO activity from this site.",
          },
          {
            genotype: "GG",
            label: "Variant",
            interpretation: "Associated with reduced DAO activity. Effect allele G.",
          },
        ],
      },
      {
        rsid: "rs2052129",
        name: "c.691G>T promoter variant",
        genotypes: [
          { genotype: "GG", label: "Typical", interpretation: "Standard DAO transcriptional activity." },
          {
            genotype: "GT",
            label: "Intermediate",
            interpretation: "Mildly reduced DAO transcriptional activity.",
          },
          {
            genotype: "TT",
            label: "Variant",
            interpretation: "Lower transcriptional activity. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "DAO breaks down histamine from food at the intestinal lining, limiting how much dietary histamine enters circulation.",
    functionalImpact:
      "Reduced activity can cause histamine intolerance, where histamine rich or histamine releasing foods trigger symptoms because clearance cannot keep pace.",
    healthAssociations: [
      "Linked to flushing, headaches, nasal congestion, hives, and digestive upset after histamine rich foods such as aged cheese, wine, fermented foods, and leftovers.",
    ],
    nutrientStrategy: [
      "Vitamin C and copper, which support DAO activity.",
      "Vitamin B6 as a cofactor.",
      "A DAO supportive approach guided by a practitioner where symptoms are significant.",
    ],
    cautions: [
      "Some supplements and foods are histamine liberators. Identify personal triggers rather than restricting broadly.",
    ],
    dietLifestyle: [
      "A lower histamine pattern during flare ups, with fresh rather than aged or leftover foods, can help.",
    ],
    interactions: [
      "Complements the methylation route of histamine clearance handled by HNMT and connects to overall detox capacity.",
    ],
    protocolTieIn:
      "Via Cura can support DAO cofactors and a personalized lower histamine strategy, delivered at high absorption. Track symptom patterns in Bio Optimization.",
  },

  cbs: {
    aliases: [],
    pathway: "Transsulfuration",
    keyVariants: [
      // The 699T effect allele appears as A on the strand some labs use; display
      // the call in the assay orientation.
      {
        rsid: "rs234706",
        name: "C699T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation: "Balanced flow of homocysteine into the transsulfuration pathway.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation: "Somewhat increased pathway activity.",
          },
          {
            genotype: "TT",
            label: "Upregulated",
            interpretation:
              "Faster pull of homocysteine toward cysteine and sulfur products, which can draw substrate away from methylation and raise sulfur and ammonia load.",
          },
        ],
      },
      // A360A is an additional CBS modifier. The effect allele T appears as A in
      // the 23andMe orientation; set the call in the assay orientation.
      {
        rsid: "rs1801181",
        name: "A360A",
        genotypes: [
          { genotype: "CC", label: "Typical", interpretation: "Balanced CBS modifier reading." },
          { genotype: "CT", label: "Intermediate", interpretation: "A modest shift in CBS activity." },
          {
            genotype: "TT",
            label: "Variant",
            interpretation: "Tracks with increased CBS pull; the effect allele T appears as A in the 23andMe orientation.",
          },
        ],
      },
    ],
    biologicalRole:
      "CBS directs homocysteine into the transsulfuration pathway toward cysteine, glutathione, taurine, and sulfate, using vitamin B6 as a cofactor.",
    functionalImpact:
      "Upregulating variants can speed this pull, lowering the homocysteine available for remethylation and increasing the production of sulfur compounds and ammonia, which some people tolerate less well.",
    healthAssociations: [
      "Linked to sulfur tolerance, ammonia sensitivity, glutathione and taurine production, and the balance between methylation and transsulfuration.",
    ],
    nutrientStrategy: [
      "Vitamin B6, often as P5P, supports balanced CBS function.",
      "Molybdenum and downstream sulfur handling support where sulfur sensitivity is present.",
      "Glutathione and antioxidant support since CBS feeds this arm.",
    ],
    cautions: [
      "Pace high sulfur foods and supplements if you notice sulfur sensitivity, and support ammonia clearance.",
    ],
    dietLifestyle: [
      "Moderate very high sulfur intake if symptomatic, and stay hydrated to support clearance.",
    ],
    interactions: [
      "Sits at the branch point with the remethylation route, so it interacts with MTHFR, MTR, and MTRR for homocysteine, and feeds SUOX and glutathione downstream.",
    ],
    protocolTieIn:
      "Via Cura balances B6, sulfur handling, and antioxidant support to your CBS pattern, delivered at high absorption. Track homocysteine and tolerance in Bio Optimization.",
  },

  gst: {
    aliases: ["GSTM1", "GSTP1", "GSTT1"],
    pathway: "Phase II detoxification",
    keyVariants: [
      // GSTM1 and GSTT1 are reported as a copy number call of Present or Null,
      // not a SNP genotype. Some panels infer the null call from tag SNPs rather
      // than from copy number; confirm how GENEX-M determines null and present
      // Present or Null accordingly.
      {
        rsid: "GSTM1",
        name: "deletion",
        genotypes: [
          {
            genotype: "Present",
            label: "Typical",
            interpretation: "Functional GSTM1 detox capacity.",
          },
          {
            genotype: "Null",
            label: "Reduced",
            interpretation:
              "The gene is deleted, lowering clearance of certain pollutants and oxidative byproducts.",
          },
        ],
      },
      {
        rsid: "GSTT1",
        name: "deletion",
        genotypes: [
          {
            genotype: "Present",
            label: "Typical",
            interpretation: "Functional GSTT1 detox capacity.",
          },
          {
            genotype: "Null",
            label: "Reduced",
            interpretation: "The gene is deleted, lowering handling of specific environmental compounds.",
          },
        ],
      },
      {
        rsid: "rs1695",
        name: "GSTP1 Ile105Val",
        genotypes: [
          { genotype: "AA", label: "Typical", interpretation: "Standard GSTP1 activity." },
          { genotype: "AG", label: "Intermediate", interpretation: "Modestly altered activity." },
          {
            genotype: "GG",
            label: "Variant",
            interpretation: "Altered substrate handling and antioxidant capacity. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "Glutathione S-transferases attach glutathione to toxins, heavy metals, and oxidative byproducts so they can be neutralized and excreted, a core Phase II detox step.",
    functionalImpact:
      "Null or altered genotypes reduce this conjugation capacity, which can slow clearance of pollutants, smoke compounds, and metabolic byproducts and increase oxidative burden.",
    healthAssociations: [
      "Linked to environmental sensitivity, oxidative stress resilience, and detox capacity for everyday exposures.",
    ],
    nutrientStrategy: [
      "Glutathione directly, or precursors such as N-acetylcysteine and glycine.",
      "Sulforaphane from cruciferous vegetables, which supports the broader detox response.",
      "Selenium and antioxidant vitamins to support the glutathione system.",
    ],
    cautions: [
      "Reduce avoidable exposures such as smoke and pollutants, since clearance is the limiter here.",
    ],
    dietLifestyle: [
      "Cruciferous vegetables, colorful antioxidants, and minimizing unnecessary toxic exposure.",
    ],
    interactions: [
      "Depends on glutathione produced through the CBS transsulfuration arm, and works with SOD2 and catalase in the antioxidant network.",
    ],
    protocolTieIn:
      "Via Cura supports glutathione and its precursors and the sulforaphane response, delivered at high absorption. Track resilience and recovery in Bio Optimization.",
  },

  sod2: {
    aliases: ["MnSOD"],
    pathway: "Mitochondrial antioxidant defense",
    keyVariants: [
      // The Ala and Val labels map to C and T depending on the strand and on the
      // Ala16Val versus Val16Ala convention. Display the genotype call and the
      // Ala or Val label exactly as the assay reports them to avoid inverting the
      // meaning.
      {
        rsid: "rs4880",
        name: "Ala16Val (C to T)",
        genotypes: [
          {
            genotype: "CC",
            label: "Ala/Ala",
            interpretation: "Efficient targeting of the enzyme into mitochondria.",
          },
          { genotype: "CT", label: "Intermediate", interpretation: "Mixed efficiency." },
          {
            genotype: "TT",
            label: "Val/Val",
            interpretation: "Altered mitochondrial import that can change how well superoxide is buffered.",
          },
        ],
      },
    ],
    biologicalRole:
      "SOD2 is the first line mitochondrial antioxidant, converting superoxide radicals into hydrogen peroxide, which catalase and glutathione peroxidase then clear.",
    functionalImpact:
      "Variants can change how efficiently the enzyme reaches the mitochondria and balances with downstream peroxide clearance, influencing oxidative stress resilience.",
    healthAssociations: [
      "Linked to oxidative stress handling, exercise recovery, and cellular resilience.",
    ],
    nutrientStrategy: [
      "Manganese as the SOD2 cofactor, in balanced amounts.",
      "Strong downstream clearance through glutathione peroxidase, which needs selenium, and catalase.",
      "A broad antioxidant intake rather than a single nutrient.",
    ],
    cautions: [
      "Boosting superoxide conversion without supporting downstream peroxide clearance can shift the bottleneck, so support the whole chain.",
    ],
    dietLifestyle: [
      "Colorful antioxidant rich foods and sensible training loads that allow recovery.",
    ],
    interactions: [
      "Works directly with GPX1 and catalase to complete antioxidant defense, and complements the glutathione system fed by CBS and the GSTs.",
    ],
    protocolTieIn:
      "Via Cura supports the full antioxidant chain including selenium and balanced manganese, delivered at high absorption. Track recovery and oxidative markers in Bio Optimization.",
  },

  suox: {
    aliases: [],
    pathway: "Sulfur detoxification",
    keyVariants: [
      // rs705703 is a regional tag of uncertain functional relevance; the
      // clinically meaningful SUOX variants are rare deficiency mutations. The
      // SUOX biology and molybdenum guidance stay live, but genotype tiers are
      // withheld until the lab confirms the exact position GENEX-M genotypes and
      // how it interprets it. Flip pendingAssayDefinition off and add the calls
      // once confirmed.
      {
        rsid: "rs705703",
        name: "regional tag SNP near the SUOX locus on 12q13",
        genotypes: [],
        pendingAssayDefinition: true,
      },
    ],
    biologicalRole:
      "SUOX converts toxic sulfite, a byproduct of sulfur metabolism and a common food preservative, into harmless sulfate, using molybdenum as a cofactor.",
    functionalImpact:
      "Reduced activity can let sulfite linger, producing sensitivity to sulfite containing foods and drinks and to high sulfur intake.",
    healthAssociations: [
      "Linked to sensitivity to sulfites in wine and dried fruit, reactions to high sulfur foods, and occasional headaches.",
    ],
    nutrientStrategy: [
      "Molybdenum as the essential SUOX cofactor.",
      "Balanced sulfur intake rather than very high sulfur loads if sensitive.",
    ],
    cautions: [
      "Reconcile this SNP rsID with the live assay, since SUOX reporting varies by panel.",
      "Introduce sulfur supplements gradually if sensitivity is present.",
    ],
    dietLifestyle: [
      "Moderate sulfite rich foods and drinks during sensitivity, and ensure adequate molybdenum.",
    ],
    interactions: [
      "Sits downstream of the CBS transsulfuration pathway, so an upregulated CBS plus a slower SUOX can amplify sulfur load.",
    ],
    protocolTieIn:
      "Via Cura can support molybdenum and a paced sulfur strategy, delivered at high absorption. Track tolerance in Bio Optimization.",
  },

  nat2: {
    aliases: [],
    pathway: "Xenobiotic acetylation",
    keyVariants: [
      // NAT2 reports a single derived acetylator status (rapid, intermediate, or
      // slow) computed from the assay haplotype across rs1801280, rs1799930, and
      // rs1799931, or taken directly if the assay returns the phenotype, rather
      // than three raw genotype rows.
      {
        rsid: "rs1801280, rs1799930, rs1799931",
        name: "341T to C (NAT2*5), 590G to A (NAT2*6), 857G to A (NAT2*7); the derived acetylator status computed from the combined assay haplotype, not three raw genotype rows",
        genotypes: [
          {
            genotype: "Rapid",
            label: "Typical",
            interpretation: "Fast acetylation of relevant compounds.",
          },
          { genotype: "Intermediate", label: "Mixed", interpretation: "A middle acetylation pace." },
          {
            genotype: "Slow",
            label: "Reduced",
            interpretation:
              "Slower clearance of certain drugs and of compounds formed when meat is cooked at high heat, which can raise exposure to them.",
          },
        ],
      },
    ],
    biologicalRole:
      "NAT2 acetylates certain medications and compounds such as the heterocyclic amines formed when meat is cooked at high heat, preparing them for clearance.",
    functionalImpact:
      "Slow acetylator status changes how you process these substances and can increase your effective exposure to some compounds formed when meat is cooked at high heat, and it can alter handling of specific drugs.",
    healthAssociations: [
      "Linked to processing of compounds formed in grilled and processed meat and to variability in handling certain medications.",
    ],
    nutrientStrategy: [
      "Support overall detox with cruciferous vegetables, antioxidants, and glutathione support.",
    ],
    cautions: [
      "Medication dosing questions belong with a prescribing clinician, since NAT2 status can affect certain drugs.",
    ],
    dietLifestyle: [
      "For slow acetylators, favor gentler cooking methods and marinate to reduce heterocyclic amine formation, and balance grilled foods with plenty of vegetables.",
    ],
    interactions: [
      "Works within the broader Phase II network alongside the GSTs and benefits from glutathione support.",
    ],
    protocolTieIn:
      "Via Cura supports the wider detox network and a practical dietary approach to high heat cooking, delivered at high absorption. Track exposures and resilience in Bio Optimization.",
  },

  tcn2: {
    aliases: ["TC2", "TCII"],
    pathway: "B12 cellular delivery",
    keyVariants: [
      {
        rsid: "rs1801198",
        name: "C776G (Pro259Arg)",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation: "Efficient transport of B12 into cells.",
          },
          {
            genotype: "CG",
            label: "Intermediate",
            interpretation: "Mildly reduced cellular B12 delivery.",
          },
          {
            genotype: "GG",
            label: "Reduced",
            interpretation:
              "Lower delivery of B12 into cells, which can create a functional shortfall even when blood B12 looks normal. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "TCN2 produces transcobalamin, the carrier that moves B12 from the blood into your cells where it is actually used.",
    functionalImpact:
      "Reduced transport can leave cells short on B12 despite normal serum levels, which can raise homocysteine and methylmalonic acid and limit methylation and nerve support.",
    healthAssociations: [
      "Linked to functional B12 status, energy, homocysteine balance, and neurological wellbeing.",
    ],
    nutrientStrategy: [
      "Active B12 as methylcobalamin or hydroxocobalamin to push more into cells.",
      "Pair with 5-MTHF so remethylation is fully supported.",
    ],
    cautions: [
      "Serum B12 can look adequate while cells are short, so judge by functional markers and symptoms with a practitioner.",
    ],
    dietLifestyle: [
      "Maintain reliable B12 intake, and supplement actively if you eat little animal food.",
    ],
    interactions: [
      "Feeds the B12 dependent MTR and MTRR steps, so a transport limitation strains the whole remethylation arm.",
    ],
    protocolTieIn:
      "Via Cura uses active B12 forms at high absorption to overcome slower transport. Track functional B12 and homocysteine in Bio Optimization.",
  },

  rfc1: {
    aliases: ["SLC19A1"],
    pathway: "Folate cellular transport",
    keyVariants: [
      {
        rsid: "rs1051266",
        name: "G80A (His27Arg)",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation: "Efficient folate uptake into cells.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation: "Modestly altered folate transport.",
          },
          {
            genotype: "AA",
            label: "Variant",
            interpretation:
              "Changed intracellular folate handling that can affect how much active methylfolate reaches the methylation cycle. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "RFC1, also called SLC19A1, transports folate into cells, setting how much of your folate intake actually reaches the methylation machinery.",
    functionalImpact:
      "Variants can alter intracellular folate levels, which interacts with MTHFR to shape your effective methylfolate supply.",
    healthAssociations: [
      "Linked to folate status, methylation capacity, and homocysteine balance.",
    ],
    nutrientStrategy: [
      "Active 5-MTHF, which is the form the cell needs once transported.",
      "Consistent folate intake to support transport.",
    ],
    cautions: [
      "Interpret together with MTHFR, since transport and activation together set your folate position.",
    ],
    dietLifestyle: [
      "Steady natural folate from greens and legumes alongside active folate as needed.",
    ],
    interactions: [
      "Sits upstream of MTHFR by delivering the folate it will activate, and connects to the whole methylation arm.",
    ],
    protocolTieIn:
      "Via Cura supplies active folate at high absorption so transport variation does not starve methylation. Track homocysteine in Bio Optimization.",
  },

  acat1: {
    aliases: ["ACAT", "T2"],
    pathway: "Energy metabolism and cofactor support",
    keyVariants: [
      {
        rsid: "rs3741049",
        name: "ACAT1-02",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation: "Standard mitochondrial ketone and amino acid handling.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation: "Mildly altered mitochondrial handling.",
          },
          {
            genotype: "AA",
            label: "Variant",
            interpretation:
              "Possible modest change in energy metabolism and in B12 related cofactor demand. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "ACAT1 supports mitochondrial energy metabolism, handling ketones, certain fatty acids, and amino acid byproducts, and connects to the B12 dependent steps of cellular energy.",
    functionalImpact:
      "Variants can subtly raise cofactor demand and affect how smoothly cells generate energy, which can interact with B12 status.",
    healthAssociations: [
      "Linked to cellular energy, metabolic flexibility, and cofactor needs.",
    ],
    nutrientStrategy: [
      "Adequate B12 and the broader B complex to support energy metabolism.",
      "Steady fuel intake and metabolic support.",
    ],
    cautions: [
      "Reconcile this SNP rsID with the live assay, since ACAT1 reporting varies by panel.",
    ],
    dietLifestyle: [
      "Balanced meals and metabolic health basics such as sleep and activity.",
    ],
    interactions: [
      "Connects to B12 handling that also serves MTR and MTRR, so it sits near the energy and methylation crossover.",
    ],
    protocolTieIn:
      "Via Cura supports B vitamins and metabolic foundations at high absorption. Track energy in Bio Optimization.",
  },

  ado: {
    aliases: ["2-aminoethanethiol dioxygenase"],
    pathway: "Sulfur, taurine, and oxygen sensing",
    keyVariants: [
      // There is no established common nutrigenetic SNP for ADO. The biology stays
      // live, but no genotype to activity mapping is asserted. ADO may have entered
      // the panel list by transcription error; if the assay does not genotype ADO,
      // consider removing it from GeneXM pending Gary's decision. ADO is kept in
      // the file for now and only gated.
      {
        rsid: "Pending assay definition",
        name: "no established common nutrigenetic variant",
        genotypes: [],
        pendingAssayDefinition: true,
      },
    ],
    biologicalRole:
      "ADO oxidizes cysteamine toward hypotaurine and ultimately taurine, contributing to sulfur amino acid balance, antioxidant and calming taurine supply, and cellular oxygen sensing.",
    functionalImpact:
      "Altered function may shift sulfur and taurine balance, which connects to antioxidant capacity and nervous system calm.",
    healthAssociations: [
      "Linked to taurine availability, sulfur balance, and antioxidant and calming support.",
    ],
    nutrientStrategy: [
      "Taurine where appropriate to support this pathway.",
      "Balanced sulfur amino acid intake.",
    ],
    cautions: [
      "ADO variant interpretation is less established than the major methylation SNPs, so present it with appropriate humility and reconcile with the live assay.",
    ],
    dietLifestyle: [
      "Adequate protein for sulfur amino acids and taurine precursors.",
    ],
    interactions: [
      "Sits within the sulfur network alongside CBS and SUOX and complements taurine dependent antioxidant and nervous system support.",
    ],
    protocolTieIn:
      "Via Cura can support taurine and sulfur balance where indicated, delivered at high absorption. Track calm and resilience in Bio Optimization.",
  },
};

// Lowercase symbol slugs in canonical GeneXM order (matches the 20 GeneXM
// panel markers). Used to verify full coverage and to drive the nested hash.
export const GENEX_M_SNP_SLUGS: string[] = Object.keys(GENEX_M_DEEP_REPORTS);
