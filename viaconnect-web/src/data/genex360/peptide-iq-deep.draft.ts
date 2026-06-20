// Prompt 204h (2026-06-20): PeptideIQ EDUCATIONAL deep report DRAFTS. This is a
// PENDING, NON-LIVE draft. Per Gary's decision, PeptideIQ is EDUCATIONAL, so it
// carries NO genotype tiers and NO severity scoring. Each gene exposes ONE
// keyVariant with the canonical rsID and a SINGLE genotypes row whose genotype
// string is empty and whose label is "Educational". That empty genotype plus the
// "Educational" label deliberately stops the UI deriving any Typical, Moderate,
// or High tier and produces no severity. Nothing here ships: the draft is
// imported only by its test, it is NOT attached to any panel marker, and it is
// NOT registered in panels.ts or any report registry. The human clinical and
// compliance gate is the only path to live.
//
// The panel theme is peptide response and tissue repair: the growth hormone and
// IGF axis, appetite peptides, collagen and connective structure, angiogenesis,
// inflammatory tone, and nitric oxide. IL6, TNF, and NOS3 also appear in other
// panels and are authored here for the peptide and tissue repair context only.
//
// Standing rules honored: no em or en dashes anywhere including comments; consumer
// brand is Via Cura (the legal manufacturing entity is never named here);
// bioavailability is locked at "10x to 28x"; the score is named "Bio
// Optimization"; numbers are written as words; tone is associative and
// educational, never diagnostic; TypeScript strict (no any).

import type { SnpDeepReport } from "./types";

export const PEPTIDE_IQ_DEEP_DRAFTS: Record<string, SnpDeepReport> = {
  ghr: {
    aliases: ["growth hormone receptor"],
    pathway: "Growth hormone signaling and tissue response",
    keyVariants: [
      {
        rsid: "rs6184",
        name: "GHR coding variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "GHR is the receptor that lets your tissues read and respond to growth hormone, the signal that helps set repair, body composition, and recovery. Common variation in this receptor is studied for small differences in how strongly that signal is received across the axis, which can subtly shape how readily connective tissue and muscle respond during recovery. This is educational context about the pathway, associative and not diagnostic, and the levers that matter most are still sleep, training, and protein quality rather than the receptor reading alone.",
          },
        ],
      },
    ],
    biologicalRole:
      "GHR encodes the growth hormone receptor on the surface of many tissues. When growth hormone binds, the receptor relays the signal inside the cell, helping coordinate repair, the IGF axis, and how the body partitions energy toward maintenance and recovery.",
    functionalImpact:
      "Common variation in the receptor does not break it. It is studied for small differences in how strongly the growth hormone signal is received, which may subtly tune the pace of tissue response. The effect per copy is modest and sits within everyday lifestyle influence, so it is best read as background context for recovery rather than a fixed setting.",
    healthAssociations: [
      "Studied at a population level for small differences in growth hormone signaling, tissue response, and body composition tendencies. These are soft, group level, educational associations of the growth hormone axis, not a personal verdict, and they are far outweighed by sleep, training, and nutrition.",
    ],
    nutrientStrategy: [
      "Adequate, well distributed protein across the day to supply the building blocks repair signaling calls for.",
      "Sufficient overall energy and recovery nutrition, since underfeeding blunts the axis far more than any single variant.",
      "Whole food micronutrient sufficiency, especially zinc and vitamin D, which support healthy signaling.",
    ],
    cautions: [
      "This is educational context, not a measure of growth hormone status, so it does not call for any peptide and is not a diagnosis.",
      "Read it alongside the rest of the axis rather than as a standalone signal.",
    ],
    dietLifestyle: [
      "Protect deep sleep, since the natural growth hormone pulse is tied to it.",
      "Train with progressive resistance work, the most reliable lever on tissue response.",
      "Keep recovery nutrition consistent rather than chasing a single nutrient.",
    ],
    interactions: [
      "GHR sits upstream of IGF1 and IGFBP3 in the same axis, so it is best read alongside them, since how the signal is received, produced, and made available together shape the repair picture far more than any single gene.",
    ],
    protocolTieIn:
      "Via Cura frames GHR as educational context within a foundation of sleep, training, and protein forward recovery nutrition, never as a reason for any commercial peptide. Supporting nutrients are delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track recovery and body composition trends as part of your Bio Optimization picture.",
    laySummary: [
      "GHR is the antenna your tissues use to pick up growth hormone, the signal that helps your body repair and rebuild. Common differences in this antenna are studied for small changes in how clearly that signal comes through, which can gently shape how quickly you recover.",
      "Because this is educational rather than a test of your hormone levels, the honest takeaway is that sleep, training, and good protein do far more for recovery than this reading. So treat it as helpful background about the pathway, not a verdict and not a reason for any peptide.",
    ],
  },

  ghrhr: {
    aliases: ["growth hormone releasing hormone receptor"],
    pathway: "Pituitary growth hormone release",
    keyVariants: [
      {
        rsid: "rs4988496",
        name: "Ala57Thr (codon fifty seven variant)",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "GHRHR is the receptor on the pituitary that responds to the releasing signal which triggers a natural pulse of growth hormone, much of it during deep sleep. The common codon fifty seven variation is studied for small differences in how readily the pituitary answers that signal, which can subtly shape the size and timing of the natural pulse relevant to recovery and rest. This is educational context about the pathway, associative and not diagnostic, and sleep quality and training remain the strongest levers.",
          },
        ],
      },
    ],
    biologicalRole:
      "GHRHR encodes the receptor that sits on the growth hormone producing cells of the pituitary. When the releasing hormone arrives, the receptor prompts those cells to release a pulse of growth hormone, the wave that supports overnight repair and recovery.",
    functionalImpact:
      "The common variation does not disable the receptor. It is studied for small differences in how readily the pituitary responds to the releasing signal, which may subtly shape the natural pulse. The effect is modest and sits well within the influence of sleep and training, so it reads as background context rather than a set point.",
    healthAssociations: [
      "Studied at a population level for small differences in growth hormone release and, in some work, in stature. These are soft, group level, educational associations of the pituitary release step, not a personal verdict, and they are shaped far more by sleep, stress, and training.",
    ],
    nutrientStrategy: [
      "Steady overall nutrition and adequate energy, since underfeeding suppresses the natural pulse.",
      "Magnesium and a balanced micronutrient base that support healthy sleep architecture.",
      "Protein sufficiency to supply the repair the pulse helps coordinate.",
    ],
    cautions: [
      "This is educational context, not a measure of pituitary function, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside the wider axis rather than in isolation.",
    ],
    dietLifestyle: [
      "Prioritize consistent, deep sleep, which is when the natural pulse is largest.",
      "Manage stress load, since chronic stress blunts the release rhythm.",
      "Keep training and recovery in balance to support the natural cycle.",
    ],
    interactions: [
      "GHRHR sits at the release step just upstream of GHR and the IGF signals, so it is best read alongside them, since release, reception, and downstream signaling together shape the recovery picture.",
    ],
    protocolTieIn:
      "Via Cura treats GHRHR as educational context inside a foundation of sleep, recovery, and balanced nutrition, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track sleep quality and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "GHRHR is the switch on your pituitary that, when flipped by the right signal, releases a natural pulse of growth hormone, mostly while you sleep deeply. Common differences in this switch are studied for small changes in how readily that pulse fires.",
      "Since this is educational and not a hormone test, the practical message is simple: protecting your deep sleep and managing stress do far more for that natural pulse than this reading. So read it as background about your recovery pathway, not a diagnosis and not a reason for any peptide.",
    ],
  },

  igf1: {
    aliases: ["insulin like growth factor 1", "somatomedin C"],
    pathway: "Anabolic and repair signaling",
    keyVariants: [
      {
        rsid: "rs35767",
        name: "Promoter variant near IGF1",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "IGF1 is a primary repair and anabolic signal that growth hormone calls into action, supporting tissue maintenance and recovery. A common variant near the start of the gene is studied for small differences in circulating IGF1, which may subtly shape baseline repair capacity. This is educational context about the pathway, associative and not diagnostic, and protein intake, training, and sleep influence IGF1 far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "IGF1 produces insulin like growth factor one, the messenger that carries much of growth hormone's repair and anabolic effect to tissues. It supports the maintenance of muscle, bone, and connective tissue and helps coordinate recovery after stress and training.",
    functionalImpact:
      "Common variation near the gene does not break the signal. It is studied for small differences in how much IGF1 circulates, which may subtly tune baseline repair capacity. The effect is modest and highly responsive to nutrition, training, and sleep, so it is best read as context rather than a fixed level.",
    healthAssociations: [
      "Studied at a population level for small differences in circulating IGF1 and in tissue maintenance and recovery tendencies. These are soft, group level, educational associations of the IGF axis, not a personal verdict, and they shift with protein intake, energy balance, and training.",
    ],
    nutrientStrategy: [
      "Adequate, well distributed protein, the most direct nutritional support for IGF1 driven repair.",
      "Sufficient overall energy, since IGF1 falls when energy intake is too low.",
      "Whole food micronutrients, with zinc and magnesium supporting healthy signaling.",
    ],
    cautions: [
      "This is educational context, not a measure of your IGF1 level, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside the rest of the axis rather than alone.",
    ],
    dietLifestyle: [
      "Eat enough protein and total energy to support recovery.",
      "Train with progressive resistance work, which supports healthy IGF1 signaling.",
      "Protect sleep, which underpins the overnight repair IGF1 helps drive.",
    ],
    interactions: [
      "IGF1 sits downstream of GHR and is held in balance by IGFBP3, so the three are best read together, since production, availability, and reception shape the repair picture as a set.",
    ],
    protocolTieIn:
      "Via Cura frames IGF1 as educational context within protein forward, well fueled recovery nutrition rather than any commercial peptide, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track recovery and body composition as part of your Bio Optimization picture.",
    laySummary: [
      "IGF1 is the messenger that carries out much of growth hormone's repair work, helping maintain muscle, bone, and connective tissue. A common variant near this gene is studied for small differences in how much of that messenger circulates.",
      "Because this is educational and not a blood test of your IGF1, the honest framing is that protein, enough total food, and good training shape this signal far more than the reading does. So treat it as background about your repair pathway, not a verdict and not a reason for any peptide.",
    ],
  },

  igfbp3: {
    aliases: ["IGF binding protein 3"],
    pathway: "IGF availability and balance",
    keyVariants: [
      {
        rsid: "rs2854744",
        name: "Minus two hundred two promoter variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "IGFBP3 is the main carrier that holds IGF1 in the blood and meters how much is free to act, tuning the balance of anabolic signaling and tissue turnover. A common promoter variant is studied for small differences in how much binding protein is made, which may subtly shape IGF1 availability. This is educational context about the pathway, associative and not diagnostic, and overall nutrition and the IGF axis as a whole matter more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "IGFBP3 makes the principal binding protein that carries IGF1 through the blood. By holding and releasing IGF1, it sets how much of that repair signal is available to tissues at any moment, helping keep anabolic signaling and tissue turnover in balance.",
    functionalImpact:
      "The common promoter variant is studied for small differences in how much binding protein is produced, which can subtly shift how much IGF1 is free to act. The effect is modest and best read alongside IGF1 itself, since the two together describe availability rather than either one alone.",
    healthAssociations: [
      "Studied at a population level for small differences in circulating binding protein and in the balance of IGF1 availability. These are soft, group level, educational associations of the IGF axis, not a personal verdict, and they sit within the influence of nutrition and training.",
    ],
    nutrientStrategy: [
      "Adequate protein and total energy, which support healthy IGF axis balance overall.",
      "Whole food micronutrient sufficiency rather than any single nutrient aimed at this carrier.",
      "Vitamin D and zinc sufficiency, which support the broader signaling environment.",
    ],
    cautions: [
      "This is educational context, not a measure of your binding protein level, so it is not a diagnosis and calls for no peptide.",
      "Read it together with IGF1 rather than on its own.",
    ],
    dietLifestyle: [
      "Keep protein and energy intake consistent to support axis balance.",
      "Train and recover steadily rather than in extremes.",
      "Protect sleep, which supports the overnight repair the axis coordinates.",
    ],
    interactions: [
      "IGFBP3 meters the IGF1 produced under GHR signaling, so the three read most clearly as a set: reception at GHR, production of IGF1, and availability set by IGFBP3.",
    ],
    protocolTieIn:
      "Via Cura treats IGFBP3 as educational context within a balanced, protein forward recovery foundation, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track recovery trends as part of your Bio Optimization picture.",
    laySummary: [
      "IGFBP3 is the carrier that holds the repair messenger IGF1 in your blood and decides how much is free to work at any time. A common version of this gene is studied for small differences in how much carrier you make.",
      "Since this is educational rather than a blood test, the simple takeaway is that it is best read together with IGF1, and that steady protein, energy, and training shape the whole system more than this one reading. So treat it as background about your repair balance, not a verdict and not a reason for any peptide.",
    ],
  },

  ghrl: {
    aliases: ["ghrelin", "preproghrelin"],
    pathway: "Appetite and growth hormone secretagogue signaling",
    keyVariants: [
      {
        rsid: "rs696217",
        name: "Leu72Met",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "GHRL makes ghrelin, the hormone that drives hunger and also nudges a natural release of growth hormone, the secretagogue pathway repair education often references. The common Leu72Met variation is studied for small differences in appetite rhythm and post meal ghrelin response, which can shape hunger patterns and cravings for sweeter or starchier foods. This is educational context about the pathway, associative and not diagnostic, and meal structure and sleep influence appetite far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "GHRL encodes ghrelin, the hormone made mostly in the stomach that rises before meals to drive hunger and helps prompt a natural pulse of growth hormone. It links appetite rhythm with the secretagogue side of the growth hormone axis.",
    functionalImpact:
      "The common Leu72Met variation is studied for small differences in appetite and the ghrelin response around meals, which may shape hunger timing and food preferences. The effect is modest and very responsive to meal composition, sleep, and activity, so it reads as context for appetite habits rather than a fixed drive.",
    healthAssociations: [
      "Studied at a population level for small differences in appetite, post meal ghrelin response, and preference for sweeter or starchier foods. These are soft, group level, educational associations of the appetite pathway, not a personal verdict, and they respond well to protein forward, fiber rich meals and steady sleep.",
    ],
    nutrientStrategy: [
      "Protein at each meal, which tends to settle ghrelin driven hunger most directly.",
      "Fiber from vegetables, legumes, and intact grains to extend fullness.",
      "Regular meal timing rather than long gaps that let hunger signaling spike.",
    ],
    cautions: [
      "This is educational context about appetite, not a measure of growth hormone status, so it is not a diagnosis and calls for no peptide.",
      "Read it as a lever for meal habits rather than a fixed appetite setting.",
    ],
    dietLifestyle: [
      "Anchor meals around protein and fiber, then add carbohydrate and fat.",
      "Protect sleep, since short sleep raises ghrelin and hunger.",
      "Keep regular movement, which supports steady appetite signaling.",
    ],
    interactions: [
      "Ghrelin acts through the GHSR receptor and sits near MC4R in appetite regulation, so it is best read alongside both, since hunger signaling is a network rather than a single gene.",
    ],
    protocolTieIn:
      "Via Cura leans into the meal structure ghrelin responds to, pairing protein forward guidance with fiber and sleep support, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track appetite and intake as part of your Bio Optimization picture.",
    laySummary: [
      "GHRL makes ghrelin, the hunger hormone that rises before meals and also helps trigger a natural release of growth hormone. A common version called Leu72Met is studied for small differences in appetite and a pull toward sweeter or starchier foods.",
      "Because this is educational and about appetite rather than hormone levels, the helpful framing is that protein, fiber, and good sleep quiet hunger far more than this reading. So treat it as a pointer about your appetite habits, not a verdict and not a reason for any peptide.",
    ],
  },

  ghsr: {
    aliases: ["growth hormone secretagogue receptor", "ghrelin receptor"],
    pathway: "Secretagogue receptor and appetite response",
    keyVariants: [
      {
        rsid: "rs572169",
        name: "GHSR receptor variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "GHSR is the receptor through which ghrelin and secretagogue signals act, shaping responsiveness across appetite, energy, and the natural growth hormone pulse. Common variation in this receptor is studied for small differences in how strongly those signals are received, which can subtly influence hunger and the timing of the pulse. This is educational context about the pathway, associative and not diagnostic, and appetite habits and sleep matter far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "GHSR encodes the receptor that reads ghrelin and related secretagogue signals. By relaying those signals, it influences hunger, energy balance, and the prompting of a natural growth hormone pulse, tying the appetite and recovery sides of the axis together.",
    functionalImpact:
      "Common variation in the receptor is studied for small differences in how strongly secretagogue signals are received, which may subtly shape appetite and the natural pulse. The effect is modest and responsive to meal habits, sleep, and activity, so it reads as context rather than a set response.",
    healthAssociations: [
      "Studied at a population level for small differences in appetite responsiveness and, in some work, metabolic measures. These are soft, group level, educational associations of the secretagogue pathway, not a personal verdict, and they sit within everyday lifestyle influence.",
    ],
    nutrientStrategy: [
      "Protein forward meals that settle hunger signaling reliably.",
      "Fiber rich whole foods to support steady fullness.",
      "A balanced micronutrient base rather than any single nutrient aimed at this receptor.",
    ],
    cautions: [
      "This is educational context, not a measure of appetite or hormone status, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside ghrelin and the wider appetite network rather than alone.",
    ],
    dietLifestyle: [
      "Build meals around protein and fiber to steady hunger.",
      "Protect sleep, which strongly shapes appetite signaling.",
      "Keep regular activity to support energy balance.",
    ],
    interactions: [
      "GHSR is the receptor for ghrelin and works near MC4R in appetite control, so it is best read alongside GHRL and MC4R as part of one signaling network.",
    ],
    protocolTieIn:
      "Via Cura treats GHSR as educational context within protein forward, fiber rich nutrition and good sleep, with supporting nutrients delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track appetite and energy as part of your Bio Optimization picture.",
    laySummary: [
      "GHSR is the receptor that picks up ghrelin's hunger signal and helps prompt a natural growth hormone pulse. Common differences in it are studied for small changes in how strongly that signal lands.",
      "Since this is educational and not a test of your appetite or hormones, the simple message is that meal structure and sleep shape hunger far more than this reading. So treat it as background about your appetite pathway, not a verdict and not a reason for any peptide.",
    ],
  },

  mc4r: {
    aliases: ["melanocortin 4 receptor"],
    pathway: "Central appetite and energy balance",
    keyVariants: [
      {
        rsid: "rs17782313",
        name: "Variant near MC4R",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "MC4R is a central regulator of appetite and energy balance in the brain, and the context it provides for body composition informs recovery discussions. A common variant near the gene is studied for small differences in hunger, snacking, and body weight tendency. This is educational context about the pathway, associative and not diagnostic, and protein, fiber, sleep, and activity influence appetite far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "MC4R encodes a receptor in the hypothalamus that helps set hunger, fullness, and energy balance. It is one of the central hubs through which the brain tunes appetite and how the body manages stored energy.",
    functionalImpact:
      "The common variant near the gene does not break the receptor. It is studied for small differences in appetite, snacking, and body weight tendency. The per copy effect is modest and strongly modifiable, so it is best read as a gentle nudge toward supportive eating habits rather than a fixed outcome.",
    healthAssociations: [
      "Studied at a population level for small differences in hunger, energy intake, snacking, and body weight tendency. These are soft, group level, educational associations of the appetite pathway, not a personal verdict, and they ease as protein, fiber, sleep, and activity are supported.",
    ],
    nutrientStrategy: [
      "Protein at each meal, which tends to blunt the appetite nudge most directly.",
      "Fiber from vegetables, legumes, and intact grains to extend fullness.",
      "Unrushed meals and adequate hydration so fullness cues land in time.",
    ],
    cautions: [
      "This is educational context about appetite, not a weight verdict, so it is not a diagnosis and calls for no peptide.",
      "Frame it as a lever for habits rather than a fixed setting.",
    ],
    dietLifestyle: [
      "Anchor meals around protein and fiber to support earlier fullness.",
      "Protect sleep and manage stress, both of which shape appetite hormones.",
      "Keep regular movement, which reliably supports energy balance.",
    ],
    interactions: [
      "MC4R sits in the same appetite network as ghrelin and its receptor, so it is best read alongside GHRL and GHSR, and it layers onto sleep, stress, and activity that can amplify or soften the appetite tendency far more than the variant alone.",
    ],
    protocolTieIn:
      "Via Cura leans into the appetite levers MC4R responds to, pairing protein forward nutrition with fiber and an activity rhythm, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption. Track appetite, intake, and body composition as part of your Bio Optimization picture.",
    laySummary: [
      "MC4R is one of the brain's main appetite dials, helping set how hungry or full you feel. A common variant near it is studied for small differences in hunger, snacking, and weight tendency, which is useful context for recovery and body composition.",
      "Because this is educational and not a weight verdict, the encouraging part is that protein, fiber, sleep, and movement quiet the extra hunger well. So treat it as a helpful heads up about your appetite, not a verdict and not a reason for any peptide.",
    ],
  },

  col1a1: {
    aliases: ["type 1 collagen alpha 1"],
    pathway: "Collagen structure and connective tissue strength",
    keyVariants: [
      {
        rsid: "rs1800012",
        name: "Sp1 binding site variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "COL1A1 builds the main structural collagen of tendon, bone, and skin, so it sits at the heart of connective tissue strength and repair. The common Sp1 binding site variant is studied for small differences in collagen production and in connective tissue resilience, which can shape injury tendency and recovery. This is educational context about the pathway, associative and not diagnostic, and protein, vitamin C, and progressive loading support collagen far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "COL1A1 encodes a main chain of type one collagen, the dominant structural protein of tendon, ligament, bone, and skin. It provides the tensile strength that connective tissue relies on and is central to how that tissue repairs after stress.",
    functionalImpact:
      "The common Sp1 variant does not break the protein. It is studied for small differences in collagen production and in the makeup of connective tissue, which may shape resilience and recovery tendency. The effect is modest and supported well by protein, vitamin C, and progressive loading, so it reads as context for connective tissue care.",
    healthAssociations: [
      "Studied at a population level for small differences in connective tissue resilience and in tendon and ligament injury tendency. These are soft, group level, educational associations of the collagen pathway, not a personal verdict, and they respond to nutrition that supports collagen and to sensible loading.",
    ],
    nutrientStrategy: [
      "Adequate protein, with collagen and glycine rich foods supplying connective tissue building blocks.",
      "Vitamin C, a required cofactor for collagen formation, from colorful produce across the day.",
      "Copper and zinc sufficiency, which support healthy collagen cross linking.",
    ],
    cautions: [
      "This is educational context, not a measure of tissue strength, so it is not a diagnosis and calls for no peptide.",
      "Read it as a reason to support collagen nutrition and load tissue sensibly, not as a fixed weakness.",
    ],
    dietLifestyle: [
      "Include protein and vitamin C rich foods regularly to support collagen.",
      "Build tendon and ligament tolerance with progressive, well managed loading.",
      "Warm up and progress training gradually to protect connective tissue.",
    ],
    interactions: [
      "COL1A1 works alongside COL5A1 and the matrix remodeling done by MMP3, so it is best read with them, since structure and remodeling together shape connective tissue resilience.",
    ],
    protocolTieIn:
      "Via Cura supports collagen building nutrition with protein, vitamin C, and trace mineral cofactors, delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, alongside sensible loading rather than any commercial peptide. Track joint comfort and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "COL1A1 makes the main collagen in your tendons, bones, and skin, so it is central to how strong and resilient your connective tissue is. A common version called the Sp1 variant is studied for small differences in collagen and injury tendency.",
      "Since this is educational rather than a strength test, the useful takeaway is that protein, vitamin C, and steady, progressive loading support your connective tissue well. So treat it as a pointer about caring for tendons and ligaments, not a verdict and not a reason for any peptide.",
    ],
  },

  col5a1: {
    aliases: ["type 5 collagen alpha 1"],
    pathway: "Collagen fibril organization and soft tissue resilience",
    keyVariants: [
      {
        rsid: "rs12722",
        name: "Three prime untranslated region variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "COL5A1 helps organize how collagen fibrils assemble, which shapes the properties of tendons and ligaments. A common variant in the three prime region of the gene is studied for small differences in soft tissue resilience and, in some work, flexibility. This is educational context about the pathway, associative and not diagnostic, and warm up, progressive loading, and collagen supportive nutrition matter far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "COL5A1 encodes a chain of type five collagen, a minor but important fibril that helps regulate how the main collagen assembles. By guiding fibril organization, it influences the strength and behavior of tendons, ligaments, and other connective tissues.",
    functionalImpact:
      "The common variant lies in a regulatory region and is studied for small differences in collagen messenger stability, which may subtly shape soft tissue properties and flexibility. Findings vary across populations, so it is best read as gentle context for connective tissue care rather than a fixed trait.",
    healthAssociations: [
      "Studied at a population level for small differences in soft tissue resilience, tendon and ligament tendency, and joint flexibility, with mixed results across groups. These are soft, group level, educational associations of the collagen organization pathway, not a personal verdict.",
    ],
    nutrientStrategy: [
      "Adequate protein with collagen and glycine rich foods to supply connective tissue building blocks.",
      "Vitamin C as a required cofactor for collagen formation.",
      "Copper and zinc sufficiency to support healthy fibril cross linking.",
    ],
    cautions: [
      "This is educational context, not a measure of flexibility or tissue strength, so it is not a diagnosis and calls for no peptide.",
      "Read it as a reason to warm up well and load tissue progressively, not as a fixed limitation.",
    ],
    dietLifestyle: [
      "Warm up thoroughly and progress training gradually to protect tendons and ligaments.",
      "Include protein and vitamin C rich foods to support collagen.",
      "Build tissue tolerance with consistent, well managed loading.",
    ],
    interactions: [
      "COL5A1 works with COL1A1 to set connective tissue structure and is studied alongside MMP3 in remodeling, so the three are best read together for the soft tissue picture.",
    ],
    protocolTieIn:
      "Via Cura supports connective tissue with collagen building nutrition delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with sensible warm up and loading rather than any commercial peptide. Track joint comfort and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "COL5A1 helps arrange how your collagen fibers are built, which shapes the feel and resilience of your tendons and ligaments. A common version of this gene is studied for small differences in soft tissue properties and flexibility, though results vary between groups.",
      "Because this is educational and not a flexibility test, the practical message is that warming up, loading gradually, and supporting collagen with protein and vitamin C do the most for your soft tissue. So treat it as background for tissue care, not a verdict and not a reason for any peptide.",
    ],
  },

  mmp3: {
    aliases: ["matrix metalloproteinase 3", "stromelysin one"],
    pathway: "Extracellular matrix remodeling during repair",
    keyVariants: [
      {
        rsid: "rs679620",
        name: "Lys45Glu",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "MMP3 helps remodel the extracellular matrix during repair, clearing damaged tissue so new tissue can be built. A common variant is studied for small differences in how this remodeling proceeds, which may shape the pace and quality of connective tissue recovery. This is educational context about the pathway, associative and not diagnostic, and protein, micronutrient cofactors, and well managed loading shape repair far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "MMP3 encodes a remodeling enzyme that breaks down components of the extracellular matrix during tissue repair. By clearing damaged material, it makes room for new collagen and helps coordinate the rebuild that follows injury or training stress.",
    functionalImpact:
      "The common variant is studied for small differences in how actively the matrix is remodeled, which may subtly shape the balance of breakdown and rebuild during recovery. It is often considered together with the collagen genes, since remodeling and structure interact, and the effect is best read as context rather than a fixed setting.",
    healthAssociations: [
      "Studied at a population level for small differences in tendon and connective tissue remodeling and recovery tendency, sometimes in interaction with collagen variants. These are soft, group level, educational associations of the remodeling pathway, not a personal verdict.",
    ],
    nutrientStrategy: [
      "Adequate protein to supply the rebuild side of remodeling.",
      "Vitamin C, copper, and zinc, cofactors that support healthy collagen formation and cross linking.",
      "An anti inflammatory leaning, whole food pattern that supports orderly repair.",
    ],
    cautions: [
      "This is educational context, not a measure of repair capacity, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside the collagen genes rather than as a standalone signal.",
    ],
    dietLifestyle: [
      "Support recovery with protein, colorful produce, and omega three rich foods.",
      "Load connective tissue progressively so remodeling can keep pace.",
      "Allow adequate rest between hard sessions for repair to complete.",
    ],
    interactions: [
      "MMP3 remodeling acts on the structures COL1A1 and COL5A1 build, so the three are best read together, since breakdown and rebuild and structure shape connective tissue recovery as a set.",
    ],
    protocolTieIn:
      "Via Cura supports orderly repair with protein, collagen cofactors, and an anti inflammatory leaning pattern delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with sensible loading rather than any commercial peptide. Track recovery and joint comfort as part of your Bio Optimization picture.",
    laySummary: [
      "MMP3 is part of the cleanup and rebuild crew that remodels tissue when you recover from injury or hard training, clearing damaged material so new tissue can form. A common version of this gene is studied for small differences in how that remodeling runs.",
      "Since this is educational and not a repair test, the helpful framing is that protein, key cofactors like vitamin C, and gradual loading support your recovery well, and this gene reads best alongside your collagen genes. So treat it as background about repair, not a verdict and not a reason for any peptide.",
    ],
  },

  vegfa: {
    aliases: ["vascular endothelial growth factor A"],
    pathway: "Angiogenesis and blood supply to healing tissue",
    keyVariants: [
      {
        rsid: "rs2010963",
        name: "Five prime untranslated region variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "VEGFA drives the growth of new blood vessels that supply healing tissue, the vascular side of repair and recovery. A common variant near the start of the gene is studied for small differences in VEGFA expression, which may subtly shape the blood supply that supports repair. This is educational context about the pathway, associative and not diagnostic, and cardiovascular health, activity, and nutrition shape circulation far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "VEGFA encodes a signal that prompts the growth of new blood vessels. During repair, fresh vessels carry oxygen and nutrients to healing tissue, so VEGFA helps determine how well the vascular side of recovery is supplied.",
    functionalImpact:
      "The common variant is studied for small differences in how much VEGFA is expressed, which may subtly influence the blood supply available to healing tissue. The effect is modest and sits within the strong influence of cardiovascular fitness and nutrition, so it reads as context for circulation and recovery rather than a set capacity.",
    healthAssociations: [
      "Studied at a population level for small differences in vascular expression and angiogenesis tendency. These are soft, group level, educational associations of the angiogenesis pathway, not a personal verdict, and they are shaped far more by activity, body composition, and diet quality.",
    ],
    nutrientStrategy: [
      "Nitrate rich vegetables such as leafy greens and beets that support healthy blood flow.",
      "Omega three rich foods and a colorful, antioxidant rich pattern for vascular health.",
      "A whole food, fiber forward diet that supports the cardiovascular system overall.",
    ],
    cautions: [
      "This is educational context, not a measure of vascular function, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside your wider circulation and recovery picture rather than alone.",
    ],
    dietLifestyle: [
      "Keep regular aerobic activity, the most reliable lever on healthy circulation.",
      "Eat plenty of vegetables, including nitrate rich greens, to support blood flow.",
      "Protect sleep and manage stress, both of which support vascular health.",
    ],
    interactions: [
      "VEGFA supplies the blood flow that repair tissue depends on, so it is best read alongside NOS3, which governs the nitric oxide tone of that flow, and the connective tissue genes it serves.",
    ],
    protocolTieIn:
      "Via Cura supports healthy circulation with nitrate rich and omega three rich nutrition delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with regular activity rather than any commercial peptide. Track recovery and cardiovascular trends as part of your Bio Optimization picture.",
    laySummary: [
      "VEGFA is the signal that grows new blood vessels to feed healing tissue, so it is the supply line side of recovery. A common version near this gene is studied for small differences in how strongly that signal is expressed.",
      "Because this is educational and not a vascular test, the honest framing is that staying active and eating plenty of vegetables, including leafy greens, support your circulation far more than this reading. So treat it as background about blood flow and repair, not a verdict and not a reason for any peptide.",
    ],
  },

  il6: {
    aliases: ["interleukin 6"],
    pathway: "Recovery inflammation and its resolution",
    keyVariants: [
      {
        rsid: "rs1800795",
        name: "Minus one hundred seventy four promoter variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "In the repair setting, IL6 plays a dual role, signaling both the inflammation that begins recovery and the resolution that follows. A common promoter variant is studied for small differences in IL6 expression, which may subtly shape the intensity and clearance of the recovery inflammatory response. This is educational context about the pathway, associative and not diagnostic, distinct from how IL6 is framed in other panels, and diet quality, sleep, and training balance shape inflammatory tone far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "IL6 encodes a versatile messenger that, in tissue repair, both kicks off the early inflammatory response to stress and helps signal its resolution. This dual role makes it part of how the body opens and then closes the recovery window after training or injury.",
    functionalImpact:
      "The common promoter variant is studied for small differences in IL6 expression, which may subtly shape how intense the recovery inflammatory response runs and how cleanly it resolves. The effect is modest and very responsive to diet quality, sleep, and training load, so it reads as context for managing inflammatory tone in recovery.",
    healthAssociations: [
      "Studied at a population level for small differences in inflammatory tone and in how the recovery inflammatory response is regulated. These are soft, group level, educational associations of the inflammation pathway in the repair context, not a personal verdict, and they ease with an anti inflammatory leaning pattern and good recovery.",
    ],
    nutrientStrategy: [
      "Omega three rich foods such as oily fish or an algae source to support a balanced inflammatory tone.",
      "A colorful, polyphenol rich diet of vegetables, fruit, herbs, and spices.",
      "Whole food, fiber forward eating that supports a resilient inflammatory balance.",
    ],
    cautions: [
      "This is educational context about inflammatory tone in recovery, not a measure of IL6 levels, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside the wider recovery and inflammation picture rather than alone.",
    ],
    dietLifestyle: [
      "Favor an anti inflammatory leaning, whole food pattern most days.",
      "Balance training load with adequate recovery so inflammation resolves cleanly.",
      "Protect sleep, which strongly shapes inflammatory tone.",
    ],
    interactions: [
      "In recovery, IL6 works alongside TNF in setting inflammatory tone and is supported by the circulation NOS3 and VEGFA provide, so it is best read with them as part of the repair response.",
    ],
    protocolTieIn:
      "Via Cura supports a balanced inflammatory tone in recovery with omega three and polyphenol rich nutrition delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with smart training balance rather than any commercial peptide. Track recovery and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "In the repair setting, IL6 is a two sided messenger: it helps start the inflammation that begins recovery and then helps signal its end. A common version of this gene is studied for small differences in how strongly that response runs and clears.",
      "Since this is educational and specific to recovery rather than a blood test, the useful framing is that an anti inflammatory leaning diet, good sleep, and balanced training shape your inflammatory tone far more than this reading. So treat it as background about recovery, not a verdict and not a reason for any peptide.",
    ],
  },

  tnf: {
    aliases: ["tumor necrosis factor", "TNF alpha"],
    pathway: "Inflammatory load during recovery",
    keyVariants: [
      {
        rsid: "rs1800629",
        name: "Minus three hundred eight promoter variant",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "TNF is a core inflammatory signal in tissue stress and repair, helping set the inflammatory load the body carries during recovery. A common promoter variant is studied for small differences in TNF expression, which may subtly shape how strongly that load runs. This is educational context about the pathway, associative and not diagnostic, distinct from how TNF is framed in other panels, and diet quality, sleep, and recovery shape inflammatory load far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "TNF encodes a central inflammatory messenger that responds to tissue stress and injury. In recovery it helps mount the early inflammatory response, contributing to the overall inflammatory load the body manages while it repairs.",
    functionalImpact:
      "The common promoter variant is studied for small differences in TNF expression, which may subtly shape the inflammatory load during recovery. The effect is modest and very responsive to diet quality, sleep, and training balance, so it reads as context for managing inflammatory tone rather than a fixed level.",
    healthAssociations: [
      "Studied at a population level for small differences in inflammatory tone and load. These are soft, group level, educational associations of the inflammation pathway in the repair context, not a personal verdict, and they ease with an anti inflammatory leaning pattern and good recovery.",
    ],
    nutrientStrategy: [
      "Omega three rich foods to support a balanced inflammatory tone.",
      "A colorful, polyphenol rich diet of vegetables, fruit, herbs, and spices.",
      "Whole food, fiber forward eating that supports inflammatory resilience.",
    ],
    cautions: [
      "This is educational context about inflammatory load in recovery, not a measure of TNF levels, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside IL6 and the wider recovery picture rather than alone.",
    ],
    dietLifestyle: [
      "Favor an anti inflammatory leaning, whole food pattern most days.",
      "Balance training load with recovery so inflammation does not stay elevated.",
      "Protect sleep and manage stress, both of which shape inflammatory load.",
    ],
    interactions: [
      "TNF works alongside IL6 in setting inflammatory tone during recovery, so the two are best read together as part of the repair response rather than in isolation.",
    ],
    protocolTieIn:
      "Via Cura supports a balanced inflammatory tone with omega three and polyphenol rich nutrition delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with smart training balance rather than any commercial peptide. Track recovery and how you feel as part of your Bio Optimization picture.",
    laySummary: [
      "TNF is a core inflammation signal that rises when tissue is stressed or healing, helping set how much inflammatory load you carry during recovery. A common version of this gene is studied for small differences in how strongly it is expressed.",
      "Because this is educational and specific to recovery rather than a blood test, the honest message is that an anti inflammatory leaning diet, good sleep, and balanced training shape your inflammatory load far more than this reading, and it reads best alongside IL6. So treat it as background about recovery, not a verdict and not a reason for any peptide.",
    ],
  },

  nos3: {
    aliases: ["nitric oxide synthase 3", "endothelial nitric oxide synthase", "eNOS"],
    pathway: "Nitric oxide, blood flow, and tissue perfusion",
    keyVariants: [
      {
        rsid: "rs1799983",
        name: "Glu298Asp",
        genotypes: [
          {
            genotype: "",
            label: "Educational",
            interpretation:
              "NOS3 produces nitric oxide in the blood vessel lining, the signal that relaxes vessels and supports the blood flow and tissue perfusion recovery depends on. The common Glu298Asp variation is studied for small differences in baseline nitric oxide production, which may subtly shape circulation to healing tissue. This is educational context about the pathway, associative and not diagnostic, distinct from how NOS3 is framed in other panels, and activity, nitrate rich foods, and cardiovascular health shape blood flow far more than this reading.",
          },
        ],
      },
    ],
    biologicalRole:
      "NOS3 encodes the enzyme that makes nitric oxide in the lining of blood vessels. Nitric oxide relaxes the vessel wall and supports healthy blood flow, delivering the oxygen and nutrients that recovering tissue needs.",
    functionalImpact:
      "The common Glu298Asp variation is studied for small differences in baseline nitric oxide production, which may subtly shape blood flow and the perfusion of healing tissue. The effect is modest and very responsive to activity, diet, and cardiovascular health, so it reads as context for circulation and recovery rather than a fixed capacity.",
    healthAssociations: [
      "Studied at a population level for small differences in nitric oxide production and vascular tone. These are soft, group level, educational associations of the nitric oxide pathway in the perfusion context, not a personal verdict, and they are shaped far more by activity, body composition, and diet quality.",
    ],
    nutrientStrategy: [
      "Nitrate rich vegetables such as leafy greens and beets that support nitric oxide and blood flow.",
      "Polyphenol rich foods and omega three sources for healthy vascular tone.",
      "Adequate arginine and citrulline rich whole foods as natural substrates for the pathway.",
    ],
    cautions: [
      "This is educational context, not a measure of vascular function, so it is not a diagnosis and calls for no peptide.",
      "Read it alongside VEGFA and your wider circulation picture rather than alone.",
    ],
    dietLifestyle: [
      "Keep regular aerobic activity, the most reliable lever on nitric oxide and blood flow.",
      "Eat nitrate rich vegetables and a colorful, whole food pattern.",
      "Protect sleep and manage stress, both of which support vascular health.",
    ],
    interactions: [
      "NOS3 sets the nitric oxide tone of the blood flow that VEGFA helps supply, so the two are best read together for the vascular side of recovery, alongside the inflammatory tone IL6 and TNF shape.",
    ],
    protocolTieIn:
      "Via Cura supports healthy blood flow with nitrate rich and polyphenol rich nutrition delivered through the micellar and liposomal dual delivery system for 10x to 28x absorption, paired with regular activity rather than any commercial peptide. Track recovery and cardiovascular trends as part of your Bio Optimization picture.",
    laySummary: [
      "NOS3 makes nitric oxide in the lining of your blood vessels, the signal that relaxes them and keeps blood flowing to healing tissue. The common Glu298Asp version is studied for small differences in how much of that signal you make at rest.",
      "Since this is educational and specific to circulation rather than a vascular test, the helpful framing is that staying active and eating nitrate rich greens support your blood flow far more than this reading, and it reads best alongside VEGFA. So treat it as background about perfusion and recovery, not a verdict and not a reason for any peptide.",
    ],
  },
};
