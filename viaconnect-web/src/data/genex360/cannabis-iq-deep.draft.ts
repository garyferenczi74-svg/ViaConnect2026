// Prompt 204 (2026-06-20): CannabisIQ EDUCATIONAL deep report DRAFTS. This is a
// PENDING, NON-LIVE draft. Per Gary's decision, CannabisIQ is EDUCATIONAL, so it
// carries NO genotype tiers and NO severity scoring. Each gene exposes ONE
// keyVariant with the canonical rsID and a SINGLE genotypes row whose genotype
// string is empty and whose label is "Educational". That empty genotype plus the
// "Educational" label deliberately stops the UI deriving any Typical, Moderate,
// or High tier and produces no severity. Nothing here ships: the draft is
// imported only by its test, it is NOT attached to any panel marker, and it is
// NOT registered in panels.ts or any report registry. The human clinical and
// compliance gate is the only path to live.
//
// CANNABIS EDUCATION, NOT ADVICE: this panel is educational information about how
// the body may process and respond to cannabinoids. It is not a recommendation to
// use cannabis, not a diagnosis, and not medical or legal advice. Cannabis laws
// vary by region and personal health decisions are individual. The tone is
// strictly neutral and non-judgmental throughout.
//
// The panel theme is cannabinoid response and sensitivity genetics: the
// endocannabinoid receptors and the enzymes that set endocannabinoid tone, the
// pathways that metabolize and clear THC and CBD, and the dopamine and
// psychoactive response genes. COMT also appears in GeneXM and HormoneIQ and is
// authored here for the cannabis and psychoactive response context only.
//
// GATE NOTE: drd2 uses rs1800497 (Taq1A), which physically resides in the
// adjacent ANKK1 gene and is associated with DRD2 receptor density. The entry
// states this transparently rather than mislabel it; confirm at the clinical gate.
//
// Standing rules honored: no em or en dashes anywhere including comments; consumer
// brand is Via Cura (the legal manufacturing entity is never named here);
// bioavailability is locked at "10x to 28x"; the score is named "Bio
// Optimization"; numbers are written as words; tone is associative and
// educational, never diagnostic and never promotional; TypeScript strict (no any).

import type { SnpDeepReport } from "./types";

export const CANNABIS_IQ_DEEP_DRAFTS: Record<string, SnpDeepReport> = {
  cnr1: {
    aliases: ["cannabinoid receptor type 1", "CB1 receptor"],
    pathway: "Endocannabinoid receptor signaling in the brain",
    keyVariants: [
      {
        rsid: "rs1049353",
        name: "Thirteen fifty nine G to A variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "CNR1 encodes the main brain receptor of the endocannabinoid system, the CB1 receptor, which helps shape mood, appetite, pain perception, and the stress response. The common thirteen fifty nine variation is studied for small differences in baseline endocannabinoid tone and in how readily this receptor reads cannabinoid signals, which may subtly shape individual sensitivity. This is educational context about the receptor pathway, associative and not diagnostic. It describes how the body may respond to cannabinoids and is neither a recommendation to use cannabis nor a measure of any current state.",
          },
        ],
      },
    ],
    biologicalRole:
      "CNR1 encodes the cannabinoid receptor type one, the CB1 receptor, found densely in the brain and nervous system. It is the central node of the endocannabinoid system, helping regulate mood, appetite, pain signaling, memory, and the stress response, and it is the receptor through which the main psychoactive cannabinoid acts.",
    functionalImpact:
      "Common variation in this receptor does not break it. It is studied for small differences in baseline endocannabinoid tone and in how strongly cannabinoid signals are received, which may subtly shape sensitivity. The effect per copy is modest and sits within everyday influence from sleep, stress, and lifestyle, so it is best read as background context about response rather than a fixed setting.",
    healthAssociations: [
      "Studied at a population level for small differences in endocannabinoid tone and in cannabinoid sensitivity, with research touching mood, appetite, and stress regulation. These are soft, group level, educational associations of the receptor pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Omega three rich foods such as oily fish or an algae source, which supply building blocks the body uses to make its own endocannabinoids.",
      "A colorful, whole food pattern that supports a balanced nervous system environment.",
      "Steady, fiber forward eating that supports stable mood and energy.",
    ],
    cautions: [
      "This is educational context about cannabinoid response, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Cannabis laws and personal health decisions are individual, so read this alongside your own circumstances and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly shape endocannabinoid tone.",
      "Keep regular movement, which naturally supports a healthy endocannabinoid rhythm.",
      "Favor an omega three forward, whole food pattern most days.",
    ],
    interactions: [
      "CNR1 sits alongside CNR2 in receptor signaling and is shaped by the endocannabinoid levels FAAH and MGLL set, so it reads most clearly alongside them, since reception and tone together describe the system far more than any single gene.",
    ],
    protocolTieIn:
      "Via Cura frames CNR1 as educational context within a foundation of sleep, stress recovery, movement, and omega three forward nutrition that supports healthy endocannabinoid tone independent of any cannabinoid use. Supporting nutrients are delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood, sleep, and stress trends as part of your Bio Optimization picture.",
    laySummary: [
      "CNR1 makes the main brain receptor your body uses to read endocannabinoid signals, which touch mood, appetite, pain, and stress, and it is also the receptor the main psychoactive cannabinoid acts on. A common version of this gene is studied for small differences in your baseline tone and in how strongly that receptor responds.",
      "Because this is educational and not a test or a recommendation, the honest framing is that sleep, stress, movement, and good nutrition shape your endocannabinoid tone far more than this reading. So treat it as neutral background about how your body may respond, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  cnr2: {
    aliases: ["cannabinoid receptor type 2", "CB2 receptor"],
    pathway: "Endocannabinoid signaling in immune tissue",
    keyVariants: [
      {
        rsid: "rs2501432",
        name: "Gln63Arg",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "CNR2 encodes the CB2 receptor, found mainly in immune tissue, where the endocannabinoid system helps tune inflammation and immune balance. The common Gln63Arg variation is studied for small differences in this immune facing side of cannabinoid signaling. This is educational context about the receptor pathway, associative and not diagnostic. It describes how the body may engage cannabinoid signals in immune tissue and is not a recommendation to use cannabis and not a measure of immune status.",
          },
        ],
      },
    ],
    biologicalRole:
      "CNR2 encodes the cannabinoid receptor type two, the CB2 receptor, expressed mostly on immune cells and in peripheral tissue. Through it the endocannabinoid system helps modulate inflammation and immune balance, the quieter, immune facing counterpart to the brain focused CB1 receptor.",
    functionalImpact:
      "The common Gln63Arg variation does not disable the receptor. It is studied for small differences in how this immune facing branch of cannabinoid signaling behaves, which may subtly shape inflammatory tone. The effect is modest and responsive to diet quality, activity, and recovery, so it reads as background context rather than a set response.",
    healthAssociations: [
      "Studied at a population level for small differences in immune and inflammatory signaling through the CB2 receptor. These are soft, group level, educational associations of the immune facing endocannabinoid pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Omega three rich foods to support a balanced inflammatory tone.",
      "A colorful, polyphenol rich diet of vegetables, fruit, herbs, and spices.",
      "Whole food, fiber forward eating that supports a resilient immune environment.",
    ],
    cautions: [
      "This is educational context about cannabinoid signaling in immune tissue, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Cannabis laws and personal health decisions are individual, so read this in light of your own circumstances and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Favor an anti inflammatory leaning, whole food pattern most days.",
      "Keep regular activity and steady recovery, both of which support immune balance.",
      "Protect sleep, which strongly shapes inflammatory tone.",
    ],
    interactions: [
      "CNR2 works alongside CNR1 as the two arms of cannabinoid receptor signaling and is shaped by the endocannabinoid levels FAAH and MGLL set, so it reads most clearly alongside them as part of one system.",
    ],
    protocolTieIn:
      "Via Cura treats CNR2 as educational context within an anti inflammatory leaning, omega three forward foundation that supports healthy immune balance independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track recovery and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "CNR2 makes the CB2 receptor, which sits mostly in your immune tissue and helps the endocannabinoid system tune inflammation. A common version called Gln63Arg is studied for small differences in this quieter, immune side of cannabinoid signaling.",
      "Since this is educational rather than a test or a recommendation, the simple message is that an anti inflammatory leaning diet, activity, and good recovery shape your immune balance far more than this reading. So treat it as neutral background about how your body may respond, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  faah: {
    aliases: ["fatty acid amide hydrolase"],
    pathway: "Endocannabinoid tone and anandamide breakdown",
    keyVariants: [
      {
        rsid: "rs324420",
        name: "C385A (Pro129Thr)",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "FAAH is the enzyme that breaks down anandamide, one of the body's own calming endocannabinoids sometimes called the bliss molecule. The common C385A variation is studied for small differences in FAAH activity, where lower activity is associated with higher anandamide and, at a population level, a calmer baseline stress response and altered cannabinoid sensitivity. This is educational context about the enzyme pathway, associative and not diagnostic. It describes how the body may regulate its own endocannabinoids and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "FAAH encodes the enzyme that breaks down anandamide, a naturally produced endocannabinoid that gently supports mood, stress resilience, and pain modulation. By setting how quickly anandamide is cleared, FAAH helps determine the body's baseline endocannabinoid tone.",
    functionalImpact:
      "The common C385A variation is studied for small differences in FAAH activity. Lower activity is associated with higher circulating anandamide, which may subtly shape baseline stress tone and cannabinoid sensitivity. The effect is modest and works alongside sleep, stress, and lifestyle, so it is best read as background context rather than a fixed trait.",
    healthAssociations: [
      "Studied at a population level for small differences in anandamide levels, baseline stress response, anxiety tendency, and cannabinoid sensitivity. These are soft, group level, educational associations of the endocannabinoid breakdown pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Omega three rich foods, which supply building blocks the body uses for its own endocannabinoids.",
      "A colorful, polyphenol rich diet that supports a balanced nervous system environment.",
      "Steady, whole food eating that supports stable mood and stress resilience.",
    ],
    cautions: [
      "This is educational context about endocannabinoid tone, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Cannabis laws and personal health decisions are individual, so read this alongside your own circumstances and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly shape endocannabinoid tone.",
      "Keep regular movement, which naturally raises the body's own endocannabinoids.",
      "Favor an omega three forward, whole food pattern most days.",
    ],
    interactions: [
      "FAAH sets anandamide tone while MGLL sets the tone of the other main endocannabinoid, and together they feed the CNR1 and CNR2 receptors, so the four read most clearly as one connected system.",
    ],
    protocolTieIn:
      "Via Cura frames FAAH as educational context within a foundation of sleep, stress recovery, movement, and omega three forward nutrition that supports healthy endocannabinoid tone independent of any cannabinoid use. Supporting nutrients are delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood, stress, and sleep trends as part of your Bio Optimization picture.",
    laySummary: [
      "FAAH is the enzyme that clears anandamide, one of your body's own calming endocannabinoids. A common version called C385A is studied for small differences in how fast that clearing happens, where slower clearing is linked at a group level with a calmer baseline and altered sensitivity to cannabinoids.",
      "Because this is educational and not a test or a recommendation, the useful framing is that sleep, stress management, and movement shape your own endocannabinoid tone far more than this reading. So treat it as neutral background about how your body regulates these signals, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  mgll: {
    aliases: ["monoacylglycerol lipase", "MAGL"],
    pathway: "Endocannabinoid tone and 2-AG breakdown",
    keyVariants: [
      {
        rsid: "rs604300",
        name: "MGLL regulatory variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "MGLL encodes the enzyme that breaks down 2-AG, the most abundant endocannabinoid in the body. A common variant in this gene is studied for small differences in how quickly 2-AG is cleared, which may subtly shape endocannabinoid tone relevant to mood, appetite, and stress regulation. This is educational context about the enzyme pathway, associative and not diagnostic. It describes how the body may regulate its own endocannabinoids and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "MGLL encodes monoacylglycerol lipase, the enzyme that breaks down 2-AG, the most abundant of the body's own endocannabinoids. By setting how quickly 2-AG is cleared, MGLL helps tune endocannabinoid tone across mood, appetite, and stress regulation, complementing the anandamide arm that FAAH manages.",
    functionalImpact:
      "The common variant is studied for small differences in how actively 2-AG is broken down, which may subtly shift baseline endocannabinoid tone. The effect is modest and works within strong influence from sleep, stress, and activity, so it is best read as background context rather than a fixed setting.",
    healthAssociations: [
      "Studied at a population level for small differences in endocannabinoid tone and, in some work, in stress and reward related signaling. These are soft, group level, educational associations of the endocannabinoid breakdown pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Omega three rich foods, which supply building blocks for the body's own endocannabinoids.",
      "A colorful, whole food pattern that supports a balanced nervous system environment.",
      "Steady, fiber forward eating that supports stable mood and appetite.",
    ],
    cautions: [
      "This is educational context about endocannabinoid tone, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Cannabis laws and personal health decisions are individual, so read this alongside your own circumstances and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly shape endocannabinoid tone.",
      "Keep regular movement, which naturally supports a healthy endocannabinoid rhythm.",
      "Favor an omega three forward, whole food pattern most days.",
    ],
    interactions: [
      "MGLL sets 2-AG tone while FAAH sets anandamide tone, and together they feed the CNR1 and CNR2 receptors, so the four read most clearly as one connected system rather than in isolation.",
    ],
    protocolTieIn:
      "Via Cura treats MGLL as educational context within a foundation of sleep, stress recovery, movement, and omega three forward nutrition that supports healthy endocannabinoid tone independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood, appetite, and stress trends as part of your Bio Optimization picture.",
    laySummary: [
      "MGLL is the enzyme that clears 2-AG, the most plentiful of your body's own endocannabinoids. A common version of this gene is studied for small differences in how fast that clearing runs, which can gently shape your tone around mood, appetite, and stress.",
      "Since this is educational and not a test or a recommendation, the honest message is that sleep, stress management, and movement shape your own endocannabinoid tone far more than this reading. So treat it as neutral background about how your body regulates these signals, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  cyp2c9: {
    aliases: ["cytochrome P450 2C9"],
    pathway: "Cannabinoid metabolism and THC clearance",
    keyVariants: [
      {
        rsid: "rs1057910",
        name: "CYP2C9*3 (Ile359Leu)",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "CYP2C9 is a primary liver enzyme that metabolizes the main psychoactive cannabinoid. The common star three variation is studied for small differences in enzyme activity, where reduced function is associated with slower clearance, which at a population level can mean a given exposure feels stronger and lasts longer. This is educational context about the metabolism pathway, associative and not diagnostic. It describes how the body may process cannabinoids and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "CYP2C9 encodes a liver enzyme in the cytochrome P450 family that is a primary route for metabolizing the main psychoactive cannabinoid, along with many medications. By processing these compounds, it sets how quickly they are cleared from the body.",
    functionalImpact:
      "The common star three variation is studied for small differences in enzyme activity. Reduced function is associated with slower clearance of the psychoactive cannabinoid, which at a population level may mean a given exposure produces a stronger and longer effect. This is educational context about processing rate, modest in effect and not a personal prediction.",
    healthAssociations: [
      "Studied at a population level for small differences in cannabinoid clearance rate and in the intensity and duration of effect at a given exposure. These are soft, group level, educational associations of the metabolism pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "A whole food, fiber forward diet that supports healthy liver function overall.",
      "Colorful vegetables and fruit rich in compounds that support balanced detox pathways.",
      "Adequate protein and a varied micronutrient base that supports liver enzyme function.",
    ],
    cautions: [
      "This is educational context about how the body may process cannabinoids, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Cannabis laws and personal health decisions are individual, and this enzyme also processes many medications, so any questions about interactions belong with your own clinician or pharmacist.",
    ],
    dietLifestyle: [
      "Support liver health with a whole food, vegetable rich pattern and adequate hydration.",
      "Keep alcohol moderate, since it shares liver processing capacity.",
      "Maintain steady sleep and activity, which support healthy metabolic function.",
    ],
    interactions: [
      "CYP2C9 works alongside CYP3A4 in cannabinoid metabolism and alongside the ABCB1 transporter that moves compounds across barriers, so the three read most clearly together as the clearance picture rather than any single gene.",
    ],
    protocolTieIn:
      "Via Cura frames CYP2C9 as educational context within a liver supportive, whole food foundation independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track energy and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "CYP2C9 is a liver enzyme that helps break down the main psychoactive cannabinoid, so it influences how quickly your body clears it. A common version called star three is studied for slower clearance, which at a group level can make a given exposure feel stronger and last longer.",
      "Because this is educational and not a test or a recommendation, the useful framing is that this is background about how your body may process cannabinoids, and that since the same enzyme handles many medications, any interaction questions belong with your own clinician. So treat it as neutral context, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  cyp3a4: {
    aliases: ["cytochrome P450 3A4"],
    pathway: "Cannabinoid metabolism and drug interaction awareness",
    keyVariants: [
      {
        rsid: "rs35599367",
        name: "CYP3A4*22",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "CYP3A4 helps metabolize CBD and other cannabinoids and a large share of common medications. The star twenty two variation is studied for small differences in enzyme activity, where reduced function is associated with slower clearance and a greater potential for interactions, an important awareness point. This is educational context about the metabolism pathway, associative and not diagnostic. It describes how the body may process cannabinoids and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "CYP3A4 encodes one of the body's most important liver enzymes, responsible for metabolizing a large fraction of common medications along with CBD and other cannabinoids. By processing these compounds, it sets clearance rate and is central to how substances may interact.",
    functionalImpact:
      "The common star twenty two variation is studied for small differences in enzyme activity. Reduced function is associated with slower clearance, which may raise the potential for interactions when multiple substances share this pathway. This is educational context about processing rate, modest in effect and not a personal prediction.",
    healthAssociations: [
      "Studied at a population level for small differences in clearance rate of cannabinoids and many medications, and in interaction potential when substances share this enzyme. These are soft, group level, educational associations of the metabolism pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "A whole food, fiber forward diet that supports healthy liver function overall.",
      "Colorful vegetables and fruit that support balanced detox pathways.",
      "Awareness that grapefruit and certain other foods can affect this enzyme, worth noting with your own clinician.",
    ],
    cautions: [
      "This is educational context about how the body may process cannabinoids, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Because this enzyme handles many medications, interaction awareness is the key takeaway here, and any specific medication or cannabinoid interaction questions belong with your own clinician or pharmacist.",
    ],
    dietLifestyle: [
      "Support liver health with a whole food, vegetable rich pattern and adequate hydration.",
      "Be aware that grapefruit and a few other foods can influence this enzyme.",
      "Maintain steady sleep and activity, which support healthy metabolic function.",
    ],
    interactions: [
      "CYP3A4 works alongside CYP2C9 in cannabinoid metabolism and alongside the ABCB1 transporter, so the three read most clearly together as the clearance and interaction picture rather than any single gene.",
    ],
    protocolTieIn:
      "Via Cura frames CYP3A4 as educational context within a liver supportive, whole food foundation independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track energy and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "CYP3A4 is a major liver enzyme that helps break down CBD, other cannabinoids, and a big share of everyday medications. A common version called star twenty two is studied for slower clearance, which mainly matters as an awareness point about interactions.",
      "Since this is educational and not a test or a recommendation, the honest framing is that this is background about how your body may process cannabinoids, and because the same enzyme handles many medications, interaction questions belong with your own clinician or pharmacist. So treat it as neutral context, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  abcb1: {
    aliases: ["multidrug resistance transporter", "P-glycoprotein", "MDR1"],
    pathway: "Compound transport across cell barriers",
    keyVariants: [
      {
        rsid: "rs1045642",
        name: "C3435T",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "ABCB1 encodes a transporter that moves many compounds across cell barriers, including the blood brain barrier. The common C3435T variation is studied for small differences in transporter activity, which may subtly influence how much of a compound reaches the brain. This is educational context about the transport pathway, associative and not diagnostic. It describes how the body may distribute cannabinoids and many other compounds and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "ABCB1 encodes a transporter, sometimes called P-glycoprotein, that pumps a wide range of compounds out of cells and across barriers, including the blood brain barrier. By regulating this movement, it helps determine how much of a substance reaches sensitive tissues such as the brain.",
    functionalImpact:
      "The common C3435T variation is studied for small differences in transporter activity, which may subtly shape how much of a compound crosses into the brain and how it is distributed. The effect is modest and best read alongside the metabolism genes, since transport and clearance together shape exposure rather than either alone.",
    healthAssociations: [
      "Studied at a population level for small differences in compound distribution and in how much reaches the brain across many substances. These are soft, group level, educational associations of the transport pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "A whole food, fiber forward diet that supports healthy barrier and liver function overall.",
      "Colorful vegetables and fruit rich in protective plant compounds.",
      "Adequate hydration and a balanced micronutrient base rather than any single nutrient aimed at this transporter.",
    ],
    cautions: [
      "This is educational context about how the body may distribute compounds, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "Because this transporter handles many medications too, any questions about how it shapes a specific substance belong with your own clinician or pharmacist.",
    ],
    dietLifestyle: [
      "Support overall metabolic and barrier health with a whole food, vegetable rich pattern.",
      "Maintain steady sleep and activity, which support healthy physiology.",
      "Keep hydration consistent, which supports normal transport and clearance.",
    ],
    interactions: [
      "ABCB1 transport works alongside the CYP2C9 and CYP3A4 metabolism enzymes, so the three read most clearly together, since how much of a compound is carried, processed, and cleared shapes exposure as a set.",
    ],
    protocolTieIn:
      "Via Cura frames ABCB1 as educational context within a whole food, liver and barrier supportive foundation independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track energy and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "ABCB1 makes a transporter that moves many compounds across your cell barriers, including the gateway into your brain. A common version called C3435T is studied for small differences in how active that transporter is, which can gently shape how much of something reaches the brain.",
      "Because this is educational and not a test or a recommendation, the simple message is that this is background about how your body may distribute cannabinoids and other compounds, and since it handles many medications, specific questions belong with your own clinician. So treat it as neutral context, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  comt: {
    aliases: ["catechol-O-methyltransferase"],
    pathway: "Dopamine clearance and psychoactive response",
    keyVariants: [
      {
        rsid: "rs4680",
        name: "Val158Met",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "COMT sets the pace at which dopamine is cleared in the prefrontal cortex, the region tied to focus, mood, and stress handling. In the cannabis context, the common Val158Met variation is studied for small differences in how the dopamine system interacts with the cognitive and mood effects of cannabinoids, where slower clearing variants may be more sensitive to those effects. This is educational context about the dopamine pathway in the psychoactive response setting, associative and not diagnostic, and authored here for cannabis context only. It is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "COMT encodes an enzyme that breaks down dopamine and related signaling molecules, especially in the prefrontal cortex. By setting the pace of dopamine clearance, it helps shape focus, mood, and the handling of stress, and in the cannabis context it influences how the dopamine system meets the cognitive and mood effects of cannabinoids.",
    functionalImpact:
      "The common Val158Met variation is studied for small differences in dopamine clearance pace. In the psychoactive response context, slower clearing variants are associated at a population level with greater sensitivity to the cognitive and mood effects of cannabinoids. The effect is modest and sits within strong influence from sleep, stress, and lifestyle, so it reads as background context rather than a fixed response.",
    healthAssociations: [
      "Studied at a population level for small differences in dopamine clearance and in sensitivity to the cognitive and mood effects of cannabinoids. These are soft, group level, educational associations of the dopamine pathway in the psychoactive response context, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Magnesium and a balanced micronutrient base that support steady neurotransmitter handling.",
      "Adequate protein to supply the building blocks of healthy dopamine signaling.",
      "A colorful, whole food pattern that supports a stable nervous system environment.",
    ],
    cautions: [
      "This is educational context about dopamine and psychoactive response, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "COMT appears in other panels in different contexts, and this entry is framed for cannabis response only, so read it alongside your wider picture and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly shape dopamine handling.",
      "Keep regular movement, which naturally supports balanced dopamine signaling.",
      "Favor steady, whole food meals that support stable mood and focus.",
    ],
    interactions: [
      "In the cannabis context COMT sits alongside AKT1 and DRD2 in dopamine and psychoactive response signaling, so the three read most clearly together, since dopamine handling, downstream signaling, and receptor sensitivity describe the response as a set.",
    ],
    protocolTieIn:
      "Via Cura frames COMT as educational context within a foundation of sleep, stress recovery, movement, and steady whole food nutrition that supports balanced dopamine handling independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood, focus, and stress trends as part of your Bio Optimization picture.",
    laySummary: [
      "COMT sets how quickly your brain clears dopamine, which touches focus, mood, and stress handling. In the cannabis setting, the common Val158Met version is studied for small differences in how sensitive the dopamine system may be to the cognitive and mood effects of cannabinoids.",
      "Because this is educational and not a test or a recommendation, the honest framing is that sleep, stress management, and movement shape your dopamine handling far more than this reading. So treat it as neutral background about psychoactive response, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  akt1: {
    aliases: ["AKT serine threonine kinase 1"],
    pathway: "Dopamine signaling and risk awareness",
    keyVariants: [
      {
        rsid: "rs2494732",
        name: "AKT1 signaling variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "AKT1 is part of the dopamine signaling cascade in the brain. Specific variants are associated in research with a higher reported chance of adverse psychological effects from heavy cannabis use, which makes this an educational risk awareness marker rather than a measure of any current state. This is associative population level context, not diagnostic and not a prediction for any one person, and it is not a recommendation to use cannabis. The takeaway is informed, cautious awareness.",
          },
        ],
      },
    ],
    biologicalRole:
      "AKT1 encodes a signaling protein that sits within the dopamine pathway, helping relay signals that shape mood, cognition, and reward. Its role in this cascade is why it is studied in the context of how the brain responds to cannabinoids.",
    functionalImpact:
      "Specific common variants are studied for small differences in dopamine signaling. In research, certain genotypes are associated at a population level with a higher reported chance of adverse psychological effects from heavy cannabis use. This is educational, group level risk awareness, modest in effect and never a personal prediction.",
    healthAssociations: [
      "Studied at a population level for small differences in dopamine signaling and, in research on heavy cannabis use, in the reported chance of adverse psychological effects. These are soft, group level, educational associations included for risk awareness, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Magnesium and a balanced micronutrient base that support steady neurotransmitter signaling.",
      "Adequate protein to supply the building blocks of healthy dopamine signaling.",
      "A colorful, whole food pattern that supports a stable nervous system environment.",
    ],
    cautions: [
      "This is an educational risk awareness marker about psychological response, not a recommendation to use cannabis, not a diagnosis, and not a prediction of any outcome.",
      "Cannabis laws and personal health decisions are individual, so the takeaway is informed, cautious awareness, and any personal mental health questions belong with your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly support balanced mood and cognition.",
      "Keep regular movement, which naturally supports healthy dopamine signaling.",
      "Favor steady, whole food meals that support stable mood.",
    ],
    interactions: [
      "AKT1 sits alongside COMT and DRD2 in dopamine and psychoactive response signaling, so in the cannabis context the three read most clearly together as one risk awareness picture rather than any single gene.",
    ],
    protocolTieIn:
      "Via Cura frames AKT1 as educational risk awareness within a foundation of sleep, stress recovery, movement, and steady whole food nutrition that supports balanced mood independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood and stress trends as part of your Bio Optimization picture.",
    laySummary: [
      "AKT1 is part of your brain's dopamine signaling, and certain versions are studied in research for a higher reported chance of difficult psychological effects from heavy cannabis use. That is why it is included here as an educational risk awareness marker.",
      "Because this is educational and group level rather than a test or a prediction for you, the honest framing is informed, cautious awareness, and any personal mental health questions belong with your own clinician. So treat it as neutral background, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },

  drd2: {
    aliases: ["dopamine receptor D2"],
    pathway: "Dopamine receptor signaling, reward, and mood",
    keyVariants: [
      {
        rsid: "rs1800497",
        name: "Taq1A (ANKK1 to DRD2 region)",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "DRD2 helps shape dopamine signaling relevant to reward, motivation, and mood. The commonly studied Taq1A marker, which lies in the neighboring ANKK1 gene and is associated with DRD2 receptor density, adds context to how cannabinoids may interact with reward and mood for an individual. This is educational context about the dopamine receptor pathway, associative and not diagnostic. It describes how the body may respond and is not a recommendation to use cannabis.",
          },
        ],
      },
    ],
    biologicalRole:
      "DRD2 encodes the dopamine receptor D2, a central receptor in the brain's reward and motivation circuitry that also influences mood and movement. Its signaling helps set how rewarding and motivating experiences feel, which is why it is studied in the context of cannabinoid response.",
    functionalImpact:
      "The commonly studied Taq1A marker actually sits in the adjacent ANKK1 gene but is associated at a population level with DRD2 receptor density. It is studied for small differences in dopamine receptor signaling that may add context to reward, motivation, and mood responses. The effect is modest and works within strong lifestyle influence, so it reads as background context rather than a fixed trait.",
    healthAssociations: [
      "Studied at a population level for small differences in dopamine receptor signaling and in reward, motivation, and mood tendencies. These are soft, group level, educational associations of the dopamine receptor pathway, not a personal verdict and not a prediction of any individual outcome.",
    ],
    nutrientStrategy: [
      "Adequate protein to supply the building blocks of healthy dopamine signaling.",
      "Magnesium and a balanced micronutrient base that support steady neurotransmitter handling.",
      "A colorful, whole food pattern that supports a stable nervous system environment.",
    ],
    cautions: [
      "This is educational context about dopamine reward signaling, not a recommendation to use cannabis, not a diagnosis, and not legal advice.",
      "The Taq1A marker technically lies in the neighboring ANKK1 gene, so it is best read as a proxy for DRD2 context alongside your wider picture and any guidance from your own clinician.",
    ],
    dietLifestyle: [
      "Protect sleep and manage stress, both of which strongly support balanced mood and motivation.",
      "Keep regular movement, which naturally supports healthy dopamine signaling.",
      "Favor steady, whole food meals and rewarding non substance routines that support stable mood.",
    ],
    interactions: [
      "DRD2 sits alongside COMT and AKT1 in dopamine and psychoactive response signaling, so in the cannabis context the three read most clearly together, since receptor sensitivity, dopamine handling, and downstream signaling describe the response as a set.",
    ],
    protocolTieIn:
      "Via Cura frames DRD2 as educational context within a foundation of sleep, stress recovery, movement, and steady whole food nutrition that supports balanced mood and motivation independent of any cannabinoid use, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track mood and motivation trends as part of your Bio Optimization picture.",
    laySummary: [
      "DRD2 shapes dopamine signaling tied to reward, motivation, and mood. The commonly studied Taq1A marker, which actually sits in the neighboring ANKK1 gene and is linked with receptor density, adds context to how cannabinoids may interact with reward and mood for you.",
      "Because this is educational and not a test or a recommendation, the simple framing is that sleep, stress management, movement, and rewarding everyday routines shape your dopamine signaling far more than this reading. So treat it as neutral background about how your body may respond, not a verdict, not a diagnosis, and not advice to use cannabis.",
    ],
  },
};
