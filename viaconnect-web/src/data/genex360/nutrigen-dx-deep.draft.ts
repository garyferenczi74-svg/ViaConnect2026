// Prompt 204 (2026-06-20): NutrigenDX clinical content (all 27 SNP deep reports).
// Authored by Hannah and LIVE since Gary's clinical and compliance sign-off
// (2026-06-20): attached to the NutrigenDX markers by panels.ts and registered in
// DEEP_REPORT_REGISTRY (variantReport.config.ts), so it is user-facing on the
// blueprint. The "draft" in the filename is historical (the gate seam).
//
// The data shape mirrors the validated GeneXM deep reports (genex-m-deep.ts) and
// carries NO citations field by design: the data type has none, and citation
// backed validation is a separate knowledge base track (204d). The prose here is
// validated, associative, and educational in the GeneXM style, never diagnostic.
//
// FTO rs9939609 was held under 204h for three reasons. Each is resolved here:
//
//   1. STRAND FLIP. rs9939609 is reported in a SINGLE explicit orientation: the
//      FORWARD strand, where the effect (risk) allele is A and the reference
//      allele is T. Every genotype row is written in this forward A/T frame and
//      labels the effect allele A explicitly, exactly as GeneXM labels its effect
//      alleles. Some assays report the complementary strand and would print the
//      same call with the opposite letter, so an orientation note is included so a
//      strand flipped result is reconciled before it is read, not misread.
//
//   2. UNVERIFIABLE 2024 CITATION. The previously circulated, unverifiable 2024
//      citation is NOT included or alluded to. No claim in this entry depends on
//      it; the type carries no citations field, and the prose stands on the long
//      established, broadly replicated FTO appetite and body weight association
//      only.
//
//   3. T2D AND CVD SOFTENED. Type two diabetes and cardiovascular health are
//      framed only as soft, population level associations of the obesity related
//      pathway, never as a personal risk verdict. The copy says associations
//      "tend to" track body weight and are seen "at a population level", never
//      that the reader is at risk.
//
// Standing rules honored: no em or en dashes anywhere; consumer brand is Via
// Cura (the legal manufacturing entity is never named here); bioavailability is
// locked at "Maximum Bioavailability"; the score is named "Bio Optimization"; tone is
// associative and educational, never diagnostic; TypeScript strict (no any).

import type { SnpDeepReport } from "./types";

export const NUTRIGEN_DX_DEEP_DRAFTS: Record<string, SnpDeepReport> = {
  fto: {
    aliases: ["ALKBH9"],
    pathway: "Body weight and appetite",
    keyVariants: [
      {
        rsid: "rs9939609",
        // Forward strand orientation. Effect (risk) allele is A, reference is T.
        // A strand flipped assay may print this same locus with the complementary
        // letters; reconcile to the forward A/T frame before reading the rows.
        name: "Intron one variant (forward strand, effect allele A)",
        genotypes: [
          {
            genotype: "TT",
            label: "Typical",
            interpretation:
              "No copies of the effect allele A on the forward strand. Appetite signaling sits at the typical baseline, so fullness cues tend to feel reliable without extra structure. Effect allele A, none carried here.",
          },
          {
            genotype: "AT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A. Often a gentle nudge toward higher appetite and a softer sense of fullness, which can lift calorie intake a little over the day. Protein forward meals and steady activity tend to settle this well. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Higher appetite tendency",
            interpretation:
              "Two copies of the effect allele A. Associated on average with stronger appetite, a later sense of fullness, and a tendency toward higher calorie intake and body weight. This is a tendency, not a certainty, and it responds well to higher protein intake, fiber, and regular movement. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "FTO encodes a nutrient sensing enzyme expressed in the brain regions that help set hunger and fullness. It acts on RNA as a demethylase and sits within the network that tunes appetite, energy intake, and how the body partitions stored energy.",
    functionalImpact:
      "The common intron one variant does not break the enzyme. Instead it subtly shifts appetite regulation, so carriers of the effect allele A tend to feel hungrier sooner, register fullness a little later, and take in modestly more calories across a day. The downstream effect on body weight is real on average but small per copy, and it is strongly modifiable by diet and activity.",
    healthAssociations: [
      "Linked at a population level to higher appetite, greater calorie intake, and a tendency toward higher body weight and body fat. Because body weight tends to track these patterns, the variant is associated at a population level with the broader obesity related picture, which over time can include type two diabetes and cardiovascular health considerations. These are soft, group level associations of the body weight pathway, not a personal risk verdict, and they tend to ease as appetite and activity are supported. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Protein at each meal, since higher protein intake tends to blunt the appetite effect most directly for effect allele carriers.",
      "Fiber from vegetables, legumes, and intact grains to slow gastric emptying and extend fullness.",
      "Adequate hydration and unrushed meals, which help fullness cues land before extra calories are taken in.",
    ],
    cautions: [
      "This variant shifts appetite, it does not set an outcome, so frame it as a lever rather than a label.",
      "Very low protein or highly processed, fast eaten meals tend to amplify the appetite effect, so those are the patterns to watch.",
    ],
    dietLifestyle: [
      "Anchor meals around protein and fiber, then add carbohydrate and fat, which supports earlier fullness.",
      "Keep regular movement, since physical activity reliably softens the body weight tendency tied to this variant.",
      "Protect sleep and stress balance, both of which influence appetite hormones that layer on top of the FTO effect.",
    ],
    interactions: [
      "FTO sits near MC4R in the same appetite regulating network, so the two are often considered together when appetite runs high. Its effect also layers onto lifestyle inputs like sleep, stress, and activity, which can amplify or soften the appetite tendency far more than the genotype alone.",
    ],
    protocolTieIn:
      "Via Cura leans into the levers FTO responds to, pairing protein forward nutrition guidance with fiber and an activity rhythm so appetite feels manageable rather than fixed. Supporting nutrients are delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track appetite, intake, and body composition trends as part of your Bio Optimization picture.",
    laySummary: [
      "FTO is sometimes called the appetite gene. It does not decide your weight, but one common spot in it can gently turn up hunger and make fullness arrive a little later, so it is easier to eat a bit more without noticing. The version that does this is the A version on the standard reading direction we use here, and the more A copies you carry, the stronger the nudge tends to be.",
      "The good news is that this is one of the most responsive traits we look at. Building meals around protein and fiber, moving regularly, and protecting your sleep all tend to quiet the extra hunger. So think of an A result as a helpful heads up about what your body responds to, not a verdict about your weight or your health.",
    ],
  },

  mthfr: {
    aliases: [],
    pathway: "Folate activation and B vitamin status",
    keyVariants: [
      {
        rsid: "rs1801133",
        // Forward strand orientation. Effect allele is T, reference is C. Some
        // assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward C/T frame before reading.
        name: "C677T (Ala222Val), forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. You activate dietary folate into its usable methylfolate form at full pace, so standard food folate and a balanced B vitamin intake tend to be enough. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Folate activation runs at roughly two thirds of typical pace, so most people do well leaning on active methylfolate and steady B vitamin intake rather than high dose synthetic folic acid. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Reduced activation tendency",
            interpretation:
              "Two copies of the effect allele T. Folate activation runs at roughly one third of typical pace and is more heat sensitive, so active methylfolate, riboflavin, and attention to homocysteine tend to matter most here. This is a tendency that responds well to the right nutrient forms, not a fixed outcome. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "MTHFR converts dietary and supplemental folate into 5-MTHF, the active form your body uses to recycle homocysteine into methionine and to keep energy, mood, and methylation reactions well supplied.",
    functionalImpact:
      "The common 677 variant does not break the enzyme. It slows folate activation, so carriers of the effect allele T may make less active methylfolate from the same intake. The practical answer is the nutrient form rather than the dose: active methylfolate sidesteps the slowed step, and riboflavin helps stabilize the enzyme for those carrying two copies.",
    healthAssociations: [
      "Linked at a population level to higher homocysteine, fatigue, and folate status around preconception and pregnancy, and to mood patterns in some people. These are soft, group level associations of the folate pathway, not a personal verdict, and they tend to ease when active folate and B vitamin status are well supported. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Active folate as 5-MTHF rather than high dose synthetic folic acid, since it bypasses the slowed activation step.",
      "Methylcobalamin or hydroxocobalamin B12 to partner the homocysteine recycling step.",
      "Riboflavin as vitamin B2, which is especially supportive for those carrying two copies of the effect allele.",
    ],
    cautions: [
      "This variant slows a step, it does not set an outcome, so frame it as a nutrient form choice rather than a diagnosis.",
      "Very high dose synthetic folic acid can leave unmetabolized folic acid in circulation, so favor the active form instead.",
    ],
    dietLifestyle: [
      "Lean on natural folate from leafy greens, legumes, and asparagus as your everyday base.",
      "Keep alcohol modest, since it depletes folate.",
      "Support steady homocysteine balance with consistent B vitamin intake.",
    ],
    interactions: [
      "MTHFR works hand in hand with the B12 dependent recycling enzymes and raises the methyl donor demand felt elsewhere, so a slow result here is best read alongside your wider B vitamin picture. Riboflavin status modulates how well the enzyme performs.",
    ],
    protocolTieIn:
      "Via Cura prioritizes active 5-MTHF with its B12 and riboflavin partners, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability, so active folate reaches the cells that need it. Track energy and, where relevant, homocysteine as part of your Bio Optimization picture.",
    laySummary: [
      "MTHFR is the gene that switches the folate in your food into the form your body can actually use. One common spot in it, called 677, can slow that switch down. The slower version is the T version on the standard reading direction we use here, and carrying two copies slows it more than carrying one.",
      "The good news is that the fix is usually about the form of the nutrient rather than taking more of it. Choosing an already active folate, getting steady B vitamins, and eating plenty of leafy greens tend to cover the gap nicely. So read a T result as a helpful pointer toward the right kind of folate, not a problem with your health.",
    ],
  },

  fads1: {
    aliases: ["FADSD5"],
    pathway: "Omega-3 and omega-6 fat conversion",
    keyVariants: [
      {
        rsid: "rs174537",
        // Forward strand orientation. Effect allele is T, reference is G. Some
        // assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward G/T frame before reading.
        name: "Near FADS1 regulatory region, forward strand, effect allele T",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. You tend to convert plant omega-3 and omega-6 fats into their long chain forms efficiently, so plant sources carry more of the load comfortably. Effect allele T, none carried here.",
          },
          {
            genotype: "GT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Conversion of plant fats toward the long chain forms tends to run somewhat slower, so a little preformed omega-3 from fish or algae can help close the gap. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Lower conversion tendency",
            interpretation:
              "Two copies of the effect allele T. Conversion of plant omega-3 toward the active long chain forms tends to run at roughly half pace, so preformed sources of these fats often serve you better than relying on plant precursors alone. This is a tendency, not a certainty. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "FADS1 encodes a desaturase enzyme that performs a key step in turning the shorter plant fats, such as the omega-3 in flax and walnuts, into the long chain forms the body uses most directly for membranes, signaling, and balance.",
    functionalImpact:
      "Carriers of the effect allele T tend to perform this conversion step more slowly, so plant precursors may yield less of the active long chain omega-3 than expected. Including preformed long chain omega-3 from fish or an algae source is the simplest way to support carriers, rather than relying on conversion alone.",
    healthAssociations: [
      "Linked at a population level to lower long chain omega-3 status in people who eat mostly plant sources, and to the inflammatory balance that omega-3 intake influences. These are soft, group level associations of the fat conversion pathway, not a personal verdict, and they respond well to including a direct omega-3 source. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Preformed long chain omega-3 from fish, or an algae based source for those who prefer plant only, since it bypasses the slowed conversion step.",
      "A sensible balance of omega-6 and omega-3 intake overall.",
      "Whole food fat sources rather than relying on a single precursor.",
    ],
    cautions: [
      "This variant shapes conversion, it does not set a health outcome, so frame it as a guide to which omega-3 source suits you.",
      "Plant precursors alone may underdeliver for carriers, so judge by including a direct source rather than increasing flax indefinitely.",
    ],
    dietLifestyle: [
      "Include oily fish a couple of times a week, or an algae omega-3 if you eat plant only.",
      "Keep processed omega-6 heavy oils modest to support a balanced fat profile.",
      "Build meals around whole food fats such as nuts, seeds, and fish.",
    ],
    interactions: [
      "FADS1 sits beside FADS2 in the same fat desaturation cluster, so the two are often read together when long chain omega-3 status runs low. Its effect also layers onto overall diet quality and the omega-6 to omega-3 balance of the foods you choose.",
    ],
    protocolTieIn:
      "Via Cura can prioritize a direct long chain omega-3 source for carriers, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability, so the active fats arrive without depending on conversion. Track how you feel and, where relevant, an omega-3 index as part of your Bio Optimization picture.",
    laySummary: [
      "FADS1 helps your body upgrade the omega-3 in plant foods like flax into the stronger long chain form found in fish. One common version of this gene slows that upgrade. That slower version is the T version on the standard reading direction we use here, and two copies slow it more than one.",
      "If you carry it, the easy answer is to get some omega-3 from fish or an algae supplement, which is already in the form your body wants. So read a T result as a nudge toward a fish or algae source rather than a sign that anything is wrong.",
    ],
  },

  tcn2: {
    aliases: ["TC2", "TCII"],
    pathway: "B12 cellular delivery",
    keyVariants: [
      {
        rsid: "rs1801198",
        // Forward strand orientation. Effect allele is G, reference is C. Some
        // assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward C/G frame before reading.
        name: "C776G (Pro259Arg), forward strand, effect allele G",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele G on the forward strand. B12 moves into your cells efficiently, so a normal blood level tends to reflect what your cells actually have. Effect allele G, none carried here.",
          },
          {
            genotype: "CG",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele G. Cellular delivery of B12 tends to run a little lower, so active B12 forms are a sensible way to keep the supply generous. Effect allele G.",
          },
          {
            genotype: "GG",
            label: "Reduced delivery tendency",
            interpretation:
              "Two copies of the effect allele G. B12 delivery into cells tends to run lower, which can leave a functional shortfall even when a blood B12 level looks normal. Active B12 forms and judging by function rather than serum alone tend to help most. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "TCN2 makes transcobalamin, the carrier that ferries B12 out of the blood and into your cells, where it powers energy, nerve support, and the recycling of homocysteine.",
    functionalImpact:
      "Carriers of the effect allele G may move B12 into cells a little less efficiently, so cells can run short even when a blood test looks fine. Choosing active B12 forms and reading functional markers rather than serum alone is the practical way to support delivery.",
    healthAssociations: [
      "Linked at a population level to functional B12 status, energy, and homocysteine balance, and in some people to neurological wellbeing. These are soft, group level associations of the B12 delivery pathway, not a personal verdict, and they tend to ease with reliable active B12 intake. Effect allele G is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Active B12 as methylcobalamin or hydroxocobalamin to push more into the cells.",
      "Pair with active folate so the homocysteine recycling step is fully supported.",
      "Reliable everyday B12 sources, especially for those who eat little animal food.",
    ],
    cautions: [
      "A serum B12 level can look adequate while cells run short, so judge by functional markers and how you feel alongside a practitioner.",
      "This variant shapes delivery, it does not set an outcome, so treat it as a reason to favor active B12 forms.",
    ],
    dietLifestyle: [
      "Keep a steady B12 intake from food, and supplement actively if your diet is low in animal sources.",
      "Support overall B vitamin balance rather than B12 in isolation.",
    ],
    interactions: [
      "TCN2 feeds the B12 dependent recycling steps, so a delivery limitation here is best read alongside MTHFR and your wider folate and B12 picture, which together set your methylation capacity.",
    ],
    protocolTieIn:
      "Via Cura uses active B12 forms delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability, so slower transport is less of a bottleneck. Track functional B12 and, where relevant, homocysteine as part of your Bio Optimization picture.",
    laySummary: [
      "TCN2 builds the little courier that carries vitamin B12 from your blood into your cells, which is where it actually does its work. One common version of this gene makes the courier a bit less efficient. The slower version is the G version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "The quirk here is that a normal blood B12 test can hide a cellular shortfall, so the helpful move is choosing an active form of B12 and watching how you feel. Read a G result as a reason to favor active B12, not as a deficiency you already have.",
    ],
  },

  vdr: {
    aliases: [],
    pathway: "Vitamin D sensitivity and use",
    keyVariants: [
      {
        rsid: "rs2228570",
        // VDR Fok1. Reported as both C/T and as F/f depending on the lab. Effect
        // allele is the lower sensitivity f, which most labs print as C. Confirm
        // the orientation with the assay before reading the effect direction.
        name: "Fok1, effect allele f (printed as C on most labs)",
        genotypes: [
          {
            genotype: "FF",
            label: "Typical",
            interpretation:
              "Standard receptor sensitivity to vitamin D, so a healthy blood level tends to translate into the expected benefit. Effect allele f, none carried here. Some labs print this call as TT.",
          },
          {
            genotype: "Ff",
            label: "Intermediate",
            interpretation:
              "Modestly altered receptor sensitivity, which can mean you do a little better at the upper part of a healthy vitamin D range. Effect allele f. Some labs print this call as TC.",
          },
          {
            genotype: "ff",
            label: "Lower sensitivity tendency",
            interpretation:
              "Tends toward lower receptor sensitivity, so you may need a higher vitamin D blood level to reach the same downstream benefit. Test and target a level rather than guessing. Effect allele f. Some labs print this call as CC.",
          },
        ],
      },
    ],
    biologicalRole:
      "VDR is the receptor that lets vitamin D act, translating your vitamin D status into effects across immune balance, bone and calcium handling, mood, and seasonal wellbeing.",
    functionalImpact:
      "Less sensitive receptor variants can mean you need a higher vitamin D level to achieve the same effect, so the practical answer is to test your blood level and target a healthy range for your sensitivity rather than relying on a fixed dose.",
    healthAssociations: [
      "Linked at a population level to vitamin D dependent immune function, bone support, mood, and seasonal wellbeing. These are soft, group level associations of vitamin D signaling, not a personal verdict, and they respond to reaching and holding an adequate blood level. Effect allele f is the allele the lower sensitivity reading tracks.",
    ],
    nutrientStrategy: [
      "Vitamin D3 dosed to reach an adequate blood level for your sensitivity rather than a one size dose.",
      "Vitamin K2 and magnesium to partner vitamin D for healthy calcium handling.",
      "Sensible sun exposure as a natural contributor.",
    ],
    cautions: [
      "Test and target a blood level rather than guessing, since the right amount varies with these variants.",
      "This variant shapes sensitivity, it does not set an outcome, so read it as a reason to confirm your level.",
    ],
    dietLifestyle: [
      "Combine sensible sun exposure, vitamin D rich foods, and supplementation when your level is low.",
      "Retest periodically so your intake stays matched to your blood level.",
    ],
    interactions: [
      "VDR connects to calcium and bone pathways and supports immune and methylation related regulation, so it is best read alongside your overall mineral and vitamin status rather than alone.",
    ],
    protocolTieIn:
      "Via Cura matches vitamin D and its partners to your sensitivity and blood level, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track vitamin D status as part of your Bio Optimization picture.",
    laySummary: [
      "VDR is the docking point that lets the vitamin D in your body actually do its job. One common version of this gene, called Fok1, makes that docking a little less responsive. The lower sensitivity version is labeled f, which most labs print as the C reading on the direction we use here.",
      "If you carry it, you may simply need to aim for the higher end of a healthy vitamin D level to feel the full benefit, which is easy to confirm with a blood test. So read an f result as a reason to check and target your vitamin D level, not as a deficiency in itself.",
    ],
  },

  slc23a1: {
    aliases: ["SVCT1"],
    pathway: "Vitamin C absorption",
    keyVariants: [
      {
        rsid: "rs33972313",
        // Forward strand orientation. Effect allele is A, reference is G. Some
        // assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward G/A frame before reading.
        name: "G790A (Val264Met), forward strand, effect allele A",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele A on the forward strand. You tend to absorb vitamin C from the gut efficiently, so a normal dietary intake usually maintains a healthy circulating level. Effect allele A, none carried here.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A. Vitamin C absorption tends to run a little lower, so consistent food sources across the day help keep your level steady. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Lower absorption tendency",
            interpretation:
              "Two copies of the effect allele A. This rarer pattern tends toward meaningfully lower circulating vitamin C for a given intake, so steady food sources and attention to vitamin C status tend to matter more here. This is a tendency, not a certainty. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "SLC23A1 encodes a transporter that absorbs vitamin C from the gut and helps the body hold on to it, setting how much of your dietary vitamin C reaches circulation.",
    functionalImpact:
      "Carriers of the effect allele A may absorb and retain vitamin C a little less efficiently, so circulating levels can sit lower for the same intake. The practical answer is steady, spread out vitamin C from food rather than a single large dose, since absorption of this nutrient is naturally capped per serving.",
    healthAssociations: [
      "Linked at a population level to lower circulating vitamin C, which over time touches the antioxidant and collagen supporting roles vitamin C plays. These are soft, group level associations of the vitamin C absorption pathway, not a personal verdict, and they respond to consistent intake. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Vitamin C from food spread across the day, since absorption is naturally capped per serving.",
      "A varied intake of fruits and vegetables rather than relying on one large dose.",
      "Gentle, divided vitamin C supplementation where intake is low, guided to your needs.",
    ],
    cautions: [
      "Very large single doses are absorbed less efficiently, so spread intake rather than loading at once.",
      "This variant shapes absorption, it does not set an outcome, so read it as a reason to keep intake steady.",
    ],
    dietLifestyle: [
      "Include vitamin C rich foods such as peppers, citrus, berries, and leafy greens across the day.",
      "Favor fresh produce, since vitamin C is lost with prolonged storage and high heat.",
    ],
    interactions: [
      "Vitamin C supports the broader antioxidant network and collagen formation, so a lower absorption tendency here is best read alongside your overall antioxidant and protein intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura can support steady vitamin C intake in well absorbed forms delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability, so a lower transport tendency is less limiting. Track resilience and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "SLC23A1 is the doorway that lets vitamin C from your food into your bloodstream. One version of this gene makes that doorway a little narrower. The lower absorption version is the A version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, the simple answer is to get vitamin C steadily through the day from colorful fruits and vegetables rather than in one big hit, since the body absorbs it best in smaller amounts. So read an A result as a reason to keep your vitamin C topped up regularly, not as a deficiency.",
    ],
  },

  slc30a8: {
    aliases: ["ZnT8"],
    pathway: "Zinc handling and glucose balance",
    keyVariants: [
      {
        rsid: "rs13266634",
        // Forward strand orientation. The common C allele encodes arginine and is
        // the population reference here; the T allele encodes tryptophan. On this
        // locus the common C allele is the one population studies associate with a
        // small glucose effect, so the rows are framed conservatively. Some assays
        // report the complementary strand with opposite letters; reconcile first.
        name: "Arg325Trp (C encodes Arg, T encodes Trp), forward strand",
        genotypes: [
          {
            genotype: "CC",
            label: "Common",
            interpretation:
              "Two copies of the common C allele, which encodes arginine. This is the most frequent genotype and is associated at a population level with a small shift in early insulin response. It is a soft group level signal, not a personal verdict, and it is well supported by everyday glucose friendly habits.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy each of the C and T alleles. A middle reading for zinc handling and the small glucose related signal this locus carries.",
          },
          {
            genotype: "TT",
            label: "Tryptophan variant",
            interpretation:
              "Two copies of the T allele, which encodes tryptophan. This genotype tends to track slightly more favorably for the early insulin signal at a population level. Either way, the effect is small and very responsive to nutrition and activity.",
          },
        ],
      },
    ],
    biologicalRole:
      "SLC30A8 encodes ZnT8, a transporter that moves zinc into the insulin storing cells of the pancreas, where zinc helps package and release insulin smoothly.",
    functionalImpact:
      "Variants here are associated with small differences in early insulin release and zinc handling. The effect per copy is modest and sits well within everyday lifestyle influence, so it is best read as a gentle nudge toward glucose friendly habits rather than a meaningful change in zinc requirement on its own.",
    healthAssociations: [
      "Linked at a population level to small differences in early insulin response and glucose balance. These are soft, group level associations of the glucose handling pathway, not a personal risk verdict, and they tend to be far outweighed by diet quality, body composition, and activity.",
    ],
    nutrientStrategy: [
      "Adequate dietary zinc from foods such as shellfish, meat, seeds, and legumes.",
      "A balanced, fiber forward pattern that supports steady glucose rather than zinc loading.",
      "Zinc supplementation only to meet needs, not as a response to this variant alone.",
    ],
    cautions: [
      "This variant carries a small, population level glucose signal, so frame it as a reason to keep glucose friendly habits rather than a diagnosis.",
      "High dose zinc can crowd out copper, so support needs rather than overload.",
    ],
    dietLifestyle: [
      "Favor a higher fiber, lower glycemic load pattern that steadies blood sugar.",
      "Keep regular movement, which reliably supports glucose balance.",
      "Include whole food zinc sources as part of a varied diet.",
    ],
    interactions: [
      "This locus is best read alongside your wider glucose and metabolic picture, since diet quality, activity, and body composition shape glucose balance far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura supports balanced zinc status and glucose friendly nutrition, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track glucose related trends as part of your Bio Optimization picture.",
    laySummary: [
      "SLC30A8 builds a transporter that moves zinc into the cells that store and release insulin, which helps keep blood sugar steady. Different versions of this gene are tied to very small differences in how smoothly that early insulin release happens.",
      "The honest framing here is that the effect is small and easily outweighed by everyday habits. Eating enough zinc, choosing fiber rich meals, and staying active matter far more. So read your result as a gentle nudge toward glucose friendly habits, not as a verdict about your blood sugar.",
    ],
  },

  fut2: {
    aliases: ["secretor gene"],
    pathway: "Gut microbiome and B12 status, secretor type",
    keyVariants: [
      {
        rsid: "rs601338",
        // Forward strand orientation. G is the secretor allele, A is the
        // non-secretor stop variant (W143X). This is a descriptive secretor type,
        // not a high to low severity scale. Some assays report the complementary
        // strand with opposite letters; reconcile to the forward G/A frame first.
        name: "W143X (Trp154Ter), forward strand, secretor allele G",
        genotypes: [
          {
            genotype: "GG",
            label: "Secretor",
            interpretation:
              "Two copies of the secretor allele G. You secrete blood group antigens into the gut, which shapes a typical secretor microbiome profile. This is a descriptive type, not a better or worse result. Secretor allele G.",
          },
          {
            genotype: "GA",
            label: "Secretor",
            interpretation:
              "One copy each of the secretor allele G and the non secretor allele A. A single working copy is enough for secretor status, so you secrete normally. Descriptive type, not a severity. Secretor allele G.",
          },
          {
            genotype: "AA",
            label: "Non secretor",
            interpretation:
              "Two copies of the non secretor allele A, which inactivates the enzyme, so you do not secrete these antigens into the gut. This is associated with a different microbiome profile and, at a population level, with somewhat higher measured B12. It is a descriptive type, not a high or low severity. Non secretor allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "FUT2 decides your secretor status, meaning whether you release certain blood group sugars onto the gut lining. That choice shapes which microbes settle in and influences how some nutrients, including B12, are read on a blood test.",
    functionalImpact:
      "Secretor and non secretor are two normal types rather than a working and broken pair. Non secretors tend toward a different microbiome balance and can show somewhat higher measured B12, so this result is most useful as descriptive context for gut and probiotic choices rather than a deficiency or risk signal.",
    healthAssociations: [
      "Linked at a population level to a distinct microbiome profile and to differences in measured B12 and in response to some probiotic strains. These are descriptive, group level associations of secretor type, not a personal verdict, and neither type is inherently better. The non secretor allele A is the allele the non secretor type tracks.",
    ],
    nutrientStrategy: [
      "A diverse, fiber and plant rich diet that supports a resilient microbiome whatever your type.",
      "Fermented foods and a varied prebiotic intake to nurture beneficial microbes.",
      "B12 read in context, since a non secretor blood B12 can sit higher for reasons unrelated to intake.",
    ],
    cautions: [
      "Secretor status is a descriptive type, not a severity grade, so it is not scored high to low.",
      "Do not read a non secretor B12 result as proof of excellent status, since the value can sit higher for transport reasons.",
    ],
    dietLifestyle: [
      "Eat a wide range of plants and fibers to support microbial diversity.",
      "Include fermented foods if they suit you, and adjust probiotic choices to how you respond.",
    ],
    interactions: [
      "Secretor status shapes the microbiome backdrop that other nutrition genes act within, so it is best read as context alongside your gut and B12 picture rather than as a standalone score.",
    ],
    protocolTieIn:
      "Via Cura tailors microbiome supportive nutrition and, where helpful, targeted probiotic guidance to your secretor type, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track digestive comfort as part of your Bio Optimization picture.",
    laySummary: [
      "FUT2 sets your secretor status, which is simply whether your body releases certain sugars onto your gut lining. About one in five people are non secretors, and it shapes which friendly microbes live in your gut. The non secretor version is the A version on the reading direction we use here, and you are a non secretor only with two copies.",
      "This is a type, not a grade, so there is no good or bad result. It is most useful as background for the kinds of fiber and probiotics that may suit you, and it explains why a non secretor blood B12 can read a little high. So treat your result as helpful context about your gut, not a score.",
    ],
  },

  gc: {
    aliases: ["GC-globulin", "vitamin D binding protein"],
    pathway: "Vitamin D transport in the blood",
    keyVariants: [
      {
        rsid: "rs4588",
        // Forward strand orientation. Effect allele is A, reference is C. The A
        // allele defines the Gc2 form, associated with lower binding protein and
        // 25-OH vitamin D. Often read together with rs7041. Some assays report the
        // complementary strand with opposite letters; reconcile to forward C/A.
        name: "Thr436Lys, forward strand, effect allele A",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele A on the forward strand. You tend to carry vitamin D through the blood at a typical level, so your 25-OH vitamin D usually responds to intake as expected. Effect allele A, none carried here.",
          },
          {
            genotype: "CA",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A. Vitamin D binding protein and circulating vitamin D can sit modestly lower, so confirming your blood level and adjusting intake helps. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Lower transport tendency",
            interpretation:
              "Two copies of the effect allele A. This pattern tends toward lower binding protein and somewhat lower circulating vitamin D for a given intake, so testing your level and targeting a healthy range matters more here. This is a tendency, not a certainty. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "GC produces vitamin D binding protein, the carrier that moves vitamin D through the blood and helps set your circulating 25-OH vitamin D level.",
    functionalImpact:
      "Carriers of the effect allele A tend to make a little less binding protein, which can leave circulating vitamin D somewhat lower for the same intake and can change how strongly your level rises with supplementation. The practical answer is to confirm your blood level and target a healthy range rather than assuming a fixed dose is enough.",
    healthAssociations: [
      "Linked at a population level to lower circulating 25-OH vitamin D and to how strongly vitamin D rises with supplementation. These are soft, group level associations of vitamin D transport, not a personal verdict, and they respond to testing and adjusting intake. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Vitamin D3 dosed to reach an adequate blood level, since carriers may need a little more to get there.",
      "Vitamin K2 and magnesium as partners for healthy vitamin D use.",
      "Retesting after a change in dose to confirm your level has moved.",
    ],
    cautions: [
      "Judge by your measured blood level rather than dose alone, since transport differences change the response.",
      "This variant shapes transport, it does not set an outcome, so read it as a reason to confirm your level.",
    ],
    dietLifestyle: [
      "Combine sensible sun exposure, vitamin D rich foods, and supplementation when your level is low.",
      "Retest periodically so your intake stays matched to your blood level.",
    ],
    interactions: [
      "GC works alongside the vitamin D receptor, so transport here and sensitivity at the receptor together shape how well vitamin D serves you. Read the two as a pair when planning your vitamin D approach.",
    ],
    protocolTieIn:
      "Via Cura matches vitamin D dosing to your transport pattern and blood level, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track vitamin D status as part of your Bio Optimization picture.",
    laySummary: [
      "GC makes the carrier protein that ferries vitamin D around your bloodstream and helps decide what your vitamin D blood test reads. One common version of this gene makes a little less of that carrier. The lower transport version is the A version on the reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, you may need to aim a bit higher to reach a healthy vitamin D level, which a simple blood test confirms. This gene is often read together with the vitamin D receptor gene. So read an A result as a reason to check and adjust your vitamin D level, not as a deficiency on its own.",
    ],
  },

  pemt: {
    aliases: [],
    pathway: "Choline production and liver support",
    keyVariants: [
      {
        rsid: "rs7946",
        // Forward strand orientation. Effect allele is A, reference is G. The A
        // allele reduces internal phosphatidylcholine synthesis and raises dietary
        // choline reliance. Estrogen supports this pathway, so the effect tends to
        // be felt more after menopause. Reconcile strand to forward G/A first.
        name: "Val175Met (5465G to A), forward strand, effect allele A",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele A on the forward strand. You make a healthy share of your own phosphatidylcholine internally, so a normal dietary choline intake tends to be enough. Effect allele A, none carried here.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A. Internal choline production tends to run a little lower, so reliable dietary choline from foods such as eggs helps cover the gap. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Higher choline need tendency",
            interpretation:
              "Two copies of the effect allele A. Internal phosphatidylcholine production tends to run lower, so dietary choline matters more here, especially for those past menopause since estrogen supports this pathway. This is a tendency, not a certainty. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "PEMT lets the liver make its own phosphatidylcholine, a building block for cell membranes and a source of choline used in liver fat handling and methylation.",
    functionalImpact:
      "Carriers of the effect allele A make less of their own phosphatidylcholine, so they lean more on dietary choline. Because estrogen supports this pathway, the effect tends to be felt more by men and by women after menopause, which makes adequate food choline a sensible focus for carriers in those groups.",
    healthAssociations: [
      "Linked at a population level to higher dietary choline need and to liver fat and membrane support, with the effect more apparent when estrogen is low. These are soft, group level associations of the choline pathway, not a personal verdict, and they respond well to reliable food choline. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Reliable dietary choline from foods such as eggs, and for those who eat it, liver.",
      "Adequate folate and B12, since choline and folate share methylation duties and can spare each other.",
      "Choline supplementation where dietary intake is low, guided to your needs.",
    ],
    cautions: [
      "Choline need rises after menopause for carriers, so revisit intake across life stages.",
      "This variant shapes a requirement, it does not set an outcome, so read it as a reason to secure food choline.",
    ],
    dietLifestyle: [
      "Include choline rich foods regularly, with eggs an especially convenient source.",
      "Support overall liver health with a balanced diet, moderate alcohol, and steady activity.",
    ],
    interactions: [
      "PEMT shares methylation duties with the folate and betaine routes, so a higher choline need here is best read alongside your folate, B12, and betaine picture, which can partly cover for one another.",
    ],
    protocolTieIn:
      "Via Cura can add choline and its partners where a carrier's intake runs low, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track liver related markers and energy as part of your Bio Optimization picture.",
    laySummary: [
      "PEMT lets your liver make its own version of choline, a nutrient that supports your cell membranes and helps keep fat from building up in the liver. One common version of this gene makes less of it, so you rely more on choline from food. The higher need version is the A version on the reading direction we use here, and two copies have a stronger effect than one.",
      "Estrogen helps this pathway along, so the effect tends to show up more in men and in women after menopause. If you carry it, regularly eating choline rich foods like eggs usually covers it nicely. So read an A result as a reason to keep food choline on your plate, not as a problem with your liver.",
    ],
  },

  apoa2: {
    aliases: ["apolipoprotein A2"],
    pathway: "Saturated fat sensitivity and body weight",
    keyVariants: [
      {
        rsid: "rs5082",
        // Forward strand orientation. Reference allele is T, effect allele is C
        // (the minus two hundred sixty five promoter variant). The CC genotype is
        // the one population studies link to greater weight gain on high saturated
        // fat intake. Some assays print this locus on the complementary strand as
        // A and G, where T reads as A and C reads as G; reconcile to the forward
        // T/C frame before reading the rows.
        name: "Minus two hundred sixty five promoter variant, forward strand, effect allele C",
        genotypes: [
          {
            genotype: "TT",
            label: "Typical",
            interpretation:
              "No copies of the effect allele C on the forward strand. Body weight tends to respond to saturated fat much like the general population, so a balanced fat intake sits comfortably here. Effect allele C, none carried here.",
          },
          {
            genotype: "TC",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele C. The saturated fat sensitivity linked to this locus shows up mainly in those carrying two copies, so a single copy is usually a gentle reminder to keep saturated fat moderate rather than a strong signal. Effect allele C.",
          },
          {
            genotype: "CC",
            label: "Higher saturated fat sensitivity tendency",
            interpretation:
              "Two copies of the effect allele C. Associated at a population level with greater weight gain when saturated fat intake runs high, roughly above twenty two grams a day in the studies. The same people tend to do well when saturated fat is kept modest. This is a diet dependent tendency, not a certainty. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "APOA2 makes apolipoprotein A2, a major protein on HDL particles that helps shape how the body handles dietary fat and appetite signaling around meals.",
    functionalImpact:
      "The common promoter variant does not break the protein. It is linked to how strongly body weight responds to saturated fat, so carriers of two copies of the effect allele C tend to gain more readily on a high saturated fat pattern and to respond well when that fat is moderated. The signal is most apparent when saturated fat intake is high, which makes it a diet sensitive trait rather than a fixed one.",
    healthAssociations: [
      "Linked at a population level to greater weight gain and a higher chance of carrying extra body fat in those who eat a lot of saturated fat, with little difference when saturated fat is kept modest. These are soft, group level associations of the saturated fat response pathway, not a personal verdict, and they ease as saturated fat is brought into a sensible range. Effect allele C is the allele these associations track.",
    ],
    nutrientStrategy: [
      "A moderate saturated fat intake, leaning on unsaturated fats from olive oil, nuts, seeds, and fish as the everyday base.",
      "Plenty of fiber and whole foods, which support healthy body weight independent of this variant.",
      "Whole food fat sources rather than processed foods high in saturated and refined fat.",
    ],
    cautions: [
      "This variant shapes a response to saturated fat, it does not set a weight outcome, so frame it as a reason to watch saturated fat quality and quantity.",
      "The effect is most relevant when saturated fat is high, so the lever is the diet pattern rather than the genotype alone.",
    ],
    dietLifestyle: [
      "Favor a Mediterranean leaning pattern rich in olive oil, vegetables, legumes, and fish.",
      "Keep fatty processed meats and rich dairy modest if you carry two copies of the effect allele.",
      "Pair balanced eating with regular activity, which supports body weight across all genotypes.",
    ],
    interactions: [
      "APOA2 sits within the broader lipid and appetite picture, so its saturated fat signal is best read alongside FTO and your overall diet quality, which together shape body weight far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura leans into the saturated fat moderation this locus responds to, pairing a Mediterranean leaning fat profile with fiber forward nutrition, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track body composition and dietary fat quality as part of your Bio Optimization picture.",
    laySummary: [
      "APOA2 helps decide how your body reacts to saturated fat, the kind found in fatty meat, butter, and rich dairy. One version of this gene is tied to gaining weight more easily when saturated fat runs high. That version is the C version on the standard reading direction we use here, and the effect really shows up only when you carry two copies.",
      "The encouraging part is that this is all about the food. People with this version tend to do well simply by keeping saturated fat moderate and leaning on olive oil, nuts, and fish instead. So read a C result as a nudge toward the kind of fats that suit you, not a verdict about your weight.",
    ],
  },

  amy1: {
    aliases: ["salivary amylase"],
    pathway: "Starch digestion capacity, by copy number",
    keyVariants: [
      {
        // AMY1 is a COPY NUMBER marker, not a single base genotype. There is no
        // rsID with a two base call here, so the call is the number of salivary
        // amylase gene copies a person carries. This is descriptive context, like
        // secretor status, and it is NOT scored on a high to low severity scale.
        rsid: "AMY1-CNV",
        name: "Salivary amylase gene copy number, descriptive call",
        genotypes: [
          {
            genotype: "Low copy number",
            label: "Lower starch digestion capacity",
            interpretation:
              "Fewer copies of the salivary amylase gene, so less of the enzyme that begins breaking starch down in the mouth. This is associated at a population level with a somewhat higher blood sugar rise after starchy meals. It is a descriptive type, not a severity grade, and it responds well to choosing slower, higher fiber carbohydrates.",
          },
          {
            genotype: "Typical copy number",
            label: "Typical starch digestion capacity",
            interpretation:
              "A typical number of salivary amylase copies, so starch digestion begins at the usual pace. A balanced carbohydrate intake tends to sit comfortably here. Descriptive type, not a severity grade.",
          },
          {
            genotype: "High copy number",
            label: "Higher starch digestion capacity",
            interpretation:
              "More copies of the salivary amylase gene, so more of the enzyme that starts digesting starch early. This is associated at a population level with a smoother handling of starchy foods. Descriptive type, not a severity grade.",
          },
        ],
      },
    ],
    biologicalRole:
      "AMY1 encodes salivary amylase, the enzyme that begins digesting starch the moment food reaches the mouth. People carry different numbers of copies of this gene, and more copies generally mean more of the enzyme.",
    functionalImpact:
      "Copy number, rather than a single letter change, sets how much salivary amylase you make. A lower copy number tends to mean starch is broken down a little more slowly at the start of digestion, which is linked at a population level to a somewhat higher blood sugar rise after starchy meals. This is descriptive context for carbohydrate choices, not a deficiency or a graded severity.",
    healthAssociations: [
      "Linked at a population level to how smoothly starchy foods are handled and to the blood sugar rise that follows them, with lower copy numbers tracking a slightly steeper rise. These are soft, group level, descriptive associations of starch digestion capacity, not a personal verdict, and neither a high nor a low count is inherently better. Because this is a copy number type rather than a genotype, it is not scored on a high to low severity scale.",
    ],
    nutrientStrategy: [
      "Carbohydrate from slower, higher fiber sources such as legumes, intact grains, and vegetables, especially helpful for a lower copy number.",
      "Pairing starchy foods with protein, fat, and fiber to soften the blood sugar rise.",
      "A balanced overall pattern rather than any single nutrient response to this marker.",
    ],
    cautions: [
      "This is a copy number type, not a severity grade, so it is not scored high to low.",
      "A lower copy number is a reason to favor carbohydrate quality and portioning, not a sign that you cannot eat starch.",
    ],
    dietLifestyle: [
      "Favor a higher fiber, lower glycemic load pattern if you carry a lower copy number.",
      "Mind portions of refined starches such as white bread and white rice, and pair them with whole foods.",
      "Keep regular movement, which reliably supports blood sugar handling across all copy numbers.",
    ],
    interactions: [
      "AMY1 starch digestion capacity is best read alongside your wider glucose picture, including TCF7L2 and SLC30A8, since diet quality, activity, and body composition shape blood sugar far more than any single marker.",
    ],
    protocolTieIn:
      "Via Cura supports carbohydrate quality and portioning suited to your starch digestion capacity, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track blood sugar related trends as part of your Bio Optimization picture.",
    laySummary: [
      "AMY1 makes the enzyme in your saliva that starts breaking down starch the moment you take a bite. Unlike most genes here, what matters is not a single spelling change but how many copies of the gene you carry. More copies mean more of the enzyme, and fewer copies mean a little less.",
      "If you carry a lower number of copies, starchy foods may raise your blood sugar a touch more, so leaning on slower, higher fiber carbohydrates like beans, oats, and vegetables tends to help. This is simply a type, not a grade, so there is no good or bad result, just a helpful pointer about the kind of carbohydrates that suit you.",
    ],
  },

  lipc: {
    aliases: ["hepatic lipase"],
    pathway: "HDL cholesterol and dietary fat handling",
    keyVariants: [
      {
        rsid: "rs1800588",
        // Forward strand orientation. Reference allele is C, effect allele is T
        // (the minus five hundred fourteen promoter variant). The T allele lowers
        // hepatic lipase activity and tends to track higher HDL. Some assays report
        // the complementary strand and print this same call with the opposite
        // letters; reconcile to the forward C/T frame before reading the rows.
        name: "Minus five hundred fourteen promoter variant, forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. Hepatic lipase runs at its usual pace, so HDL handling sits at the typical baseline and responds to dietary fat much like the general population. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Hepatic lipase activity tends to run a little lower, which is linked at a population level to modestly higher HDL and to lipids that respond somewhat more to the type of fat you eat. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Lower lipase activity tendency",
            interpretation:
              "Two copies of the effect allele T. Hepatic lipase activity tends to run lower, which tracks with higher HDL on average and with a lipid profile that can be more sensitive to dietary fat composition. How this plays out depends on the overall diet, so it is best read alongside your measured lipids. This is a tendency, not a certainty. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "LIPC makes hepatic lipase, an enzyme that reshapes circulating lipoproteins in the liver and is a major influence on your HDL cholesterol level and on how dietary fat is handled.",
    functionalImpact:
      "The common promoter variant does not break the enzyme. Carriers of the effect allele T tend to make hepatic lipase that works a little more slowly, which is linked to higher HDL and to lipids that can respond more to the balance of fats in the diet. Because the direction depends on the wider diet pattern, this locus is best read alongside your measured lipid panel rather than in isolation.",
    healthAssociations: [
      "Linked at a population level to HDL cholesterol level and to how strongly your lipids respond to the composition of dietary fat. These are soft, group level associations of the lipid handling pathway, not a personal verdict, and they are best understood together with your measured lipids and overall diet. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "A favorable balance of unsaturated fats from olive oil, nuts, seeds, and fish, since lipid response can be more sensitive to fat type here.",
      "Adequate fiber from vegetables, legumes, and intact grains, which supports a healthy lipid profile.",
      "Whole food fat sources rather than processed foods high in refined and saturated fat.",
    ],
    cautions: [
      "This variant shapes lipid handling, it does not set a cardiovascular outcome, so read it as context for your lipid panel rather than a verdict.",
      "The direction of the lipid effect depends on the overall diet, so judge by your measured lipids rather than the genotype alone.",
    ],
    dietLifestyle: [
      "Favor a Mediterranean leaning pattern rich in unsaturated fats, vegetables, and fish.",
      "Keep refined and heavily processed fats modest to support a balanced lipid profile.",
      "Pair balanced eating with regular activity, which reliably supports HDL and lipid health.",
    ],
    interactions: [
      "LIPC sits within the wider lipid network, so its HDL signal is best read alongside APOA2 and your overall dietary fat pattern, which together shape lipids far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura supports a favorable dietary fat balance and fiber forward nutrition suited to your lipid pattern, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track your lipid panel as part of your Bio Optimization picture.",
    laySummary: [
      "LIPC makes an enzyme in your liver that helps shape your cholesterol, especially your HDL, the kind people often call the helpful one. One common version of this gene slows that enzyme down a little. The slower version is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, your HDL tends to sit a bit higher, and your lipids may respond more to the kind of fats you eat, which makes choosing olive oil, nuts, and fish especially worthwhile. So read a T result as a reason to mind the quality of your dietary fat and to keep an eye on your lipid panel, not as a problem on its own.",
    ],
  },

  tcf7l2: {
    aliases: ["TCF4"],
    pathway: "Insulin secretion and glucose balance",
    keyVariants: [
      {
        rsid: "rs7903146",
        // Forward strand orientation. Reference allele is C, effect allele is T.
        // The T allele is the most strongly and consistently replicated common
        // variant linked to type two diabetes through reduced insulin secretion.
        // Some assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward C/T frame before reading.
        name: "Intron variant, forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. Insulin secretion in response to meals tends to sit at the typical baseline, so a balanced glucose friendly pattern is usually enough. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Associated at a population level with a modestly softer early insulin response and a small upward nudge in long term glucose related risk. This responds well to a lower glycemic load and higher fiber pattern. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Higher glucose risk tendency",
            interpretation:
              "Two copies of the effect allele T. This is the most studied common variant for glucose handling and is associated at a population level with reduced early insulin secretion and a higher tendency toward type two diabetes over time. It is a population level tendency, not a personal verdict, and it is strongly modifiable by diet, body composition, and activity. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "TCF7L2 encodes a transcription factor active in the insulin secreting cells of the pancreas and in the gut, where it helps tune how much insulin is released in response to a meal.",
    functionalImpact:
      "The common intron variant does not break the gene. Carriers of the effect allele T tend to release insulin a little less briskly after meals, partly through a softened incretin response, which over time is the most consistently replicated common genetic nudge toward type two diabetes. The effect per copy is real but modest and sits well within everyday lifestyle influence.",
    healthAssociations: [
      "Linked at a population level to reduced early insulin secretion and to a higher tendency toward type two diabetes over time. These are soft, group level associations of the glucose handling pathway, not a personal risk verdict, and they tend to be far outweighed by diet quality, body composition, and activity. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "A lower glycemic load, higher fiber pattern that supports steady blood sugar, the lever this variant responds to most directly.",
      "Adequate protein and healthy fats at meals to blunt the blood sugar rise from carbohydrates.",
      "Whole food carbohydrates such as legumes, intact grains, and vegetables rather than refined starches and sugars.",
    ],
    cautions: [
      "This variant shifts insulin response, it does not set a diagnosis, so frame it as a strong reason to keep glucose friendly habits.",
      "Refined, high glycemic eating tends to amplify the tendency, so those are the patterns to watch for carriers.",
    ],
    dietLifestyle: [
      "Favor a higher fiber, lower glycemic load pattern that steadies blood sugar across the day.",
      "Keep regular movement, since physical activity reliably supports insulin sensitivity.",
      "Support a healthy body composition, which strongly influences glucose handling on top of this variant.",
    ],
    interactions: [
      "TCF7L2 is best read alongside the wider glucose picture, including SLC30A8 and AMY1, since diet quality, activity, and body composition shape blood sugar far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura leans into the glucose friendly nutrition this variant responds to, pairing a lower glycemic load pattern with fiber and an activity rhythm, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track glucose related trends as part of your Bio Optimization picture.",
    laySummary: [
      "TCF7L2 helps set how much insulin your body releases after you eat. It carries the single most studied common gene change tied to type two diabetes, working by softening that early insulin release. The version that does this is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "The reassuring part is that this is one of the most responsive traits to lifestyle. Choosing slower, higher fiber carbohydrates, staying active, and keeping a healthy body composition all tend to outweigh the genetic nudge. So read a T result as a strong, helpful reason to build glucose friendly habits, not a verdict about your future.",
    ],
  },

  sod2: {
    aliases: ["MnSOD"],
    pathway: "Mitochondrial antioxidant defense",
    keyVariants: [
      {
        rsid: "rs4880",
        // Overlapping locus with the GeneXM methylation panel SOD2 entry. Per the
        // 204h decision the rsID and the per genotype tier direction are reused
        // from GeneXM, and the prose is re-authored for the nutrition context. The
        // Ala and Val labels map to C and T depending on strand and on the
        // Ala16Val versus Val16Ala convention, so the genotype call and the Ala or
        // Val label are shown exactly as the assay reports them. Forward strand
        // here reads the common C allele as Ala and the T allele as Val. Reconcile
        // strand and Ala or Val convention with the assay before reading.
        name: "Ala16Val (C to T), forward strand, effect allele T (Val)",
        genotypes: [
          {
            genotype: "CC",
            label: "Ala/Ala, typical",
            interpretation:
              "Two copies of the common C allele, which reads as Ala. The enzyme is imported efficiently into mitochondria, so first line antioxidant defense sits at the typical baseline. Effect allele T (Val), none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy each of the C and T alleles, reading as Ala and Val. A middle reading for how efficiently the enzyme reaches the mitochondria, so a broad antioxidant intake comfortably supports the pathway. Effect allele T (Val).",
          },
          {
            genotype: "TT",
            label: "Val/Val tendency",
            interpretation:
              "Two copies of the effect allele T, which reads as Val. Mitochondrial import of the enzyme can run a little less efficiently, which is linked at a population level to a modestly higher demand on the rest of the antioxidant network. Supporting the whole chain, including downstream peroxide clearance, tends to matter most here. This is a tendency, not a certainty. Effect allele T (Val).",
          },
        ],
      },
    ],
    biologicalRole:
      "SOD2 makes the first line mitochondrial antioxidant enzyme, which converts superoxide radicals generated during energy production into hydrogen peroxide that catalase and glutathione peroxidase then clear.",
    functionalImpact:
      "The common Ala16Val variant does not break the enzyme. Carriers of the effect allele T, the Val form, can import the enzyme into mitochondria a little less efficiently, which is linked to a modestly higher reliance on the downstream antioxidant steps. Because the enzyme works as part of a chain, the practical answer for nutrition is to support the whole antioxidant network rather than this one step alone.",
    healthAssociations: [
      "Linked at a population level to oxidative stress handling, exercise recovery, and cellular resilience. These are soft, group level associations of the mitochondrial antioxidant pathway, not a personal verdict, and they respond to a broad, food first antioxidant intake. Effect allele T, the Val form, is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Manganese in balanced, food first amounts as the cofactor this enzyme depends on.",
      "Selenium to power glutathione peroxidase, which clears the peroxide this enzyme produces.",
      "A broad, colorful antioxidant intake from whole foods rather than reliance on any single nutrient.",
    ],
    cautions: [
      "This variant shapes one step in a chain, it does not set an outcome, so support the whole antioxidant network rather than a single nutrient.",
      "Pushing superoxide conversion without supporting downstream peroxide clearance can shift the bottleneck, so balance manganese with selenium and a broad antioxidant intake.",
    ],
    dietLifestyle: [
      "Eat a wide range of colorful, antioxidant rich plants as your everyday base.",
      "Keep training loads sensible with room to recover, which supports oxidative balance.",
      "Include whole food sources of selenium, such as a small amount of brazil nuts, and varied mineral intake.",
    ],
    interactions: [
      "SOD2 works directly with GPX1 and catalase to complete antioxidant defense and is supported by the glutathione system, so a Val reading here is best read alongside GPX1, CAT, and your overall antioxidant intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the full antioxidant chain, including balanced manganese and selenium and a broad antioxidant intake, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track recovery and resilience as part of your Bio Optimization picture.",
    laySummary: [
      "SOD2 makes your cells first line of defense against the wear and tear of producing energy, mopping up reactive molecules inside the mitochondria. One common version of this gene, called Val, may get the enzyme into place a little less efficiently. That version is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, the helpful move is to support the whole antioxidant team rather than just one part, since this enzyme hands its work off to others. A broad, colorful diet with enough selenium and balanced manganese covers it well. So read a Val result as a reason to eat the rainbow and support recovery, not as a sign of damage.",
    ],
  },

  gpx1: {
    aliases: ["glutathione peroxidase 1", "GSHPx-1"],
    pathway: "Selenium dependent antioxidant defense",
    keyVariants: [
      {
        rsid: "rs1050450",
        // Forward strand orientation. Reference allele is C (Pro), effect allele is
        // T (Leu), the Pro198Leu variant. The T allele is linked to somewhat
        // reduced enzyme activity. Some assays report the complementary strand and
        // print this same call with the opposite letters; reconcile to the forward
        // C/T frame before reading the rows.
        name: "Pro198Leu (C to T), forward strand, effect allele T (Leu)",
        genotypes: [
          {
            genotype: "CC",
            label: "Pro/Pro, typical",
            interpretation:
              "Two copies of the common C allele, which reads as Pro. The enzyme clears peroxides at its usual pace, so a normal selenium intake tends to keep antioxidant defense well supplied. Effect allele T (Leu), none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy each of the C and T alleles, reading as Pro and Leu. Enzyme activity tends to run a little lower, so reliable selenium status becomes more worthwhile for keeping peroxide clearance steady. Effect allele T (Leu).",
          },
          {
            genotype: "TT",
            label: "Lower activity tendency",
            interpretation:
              "Two copies of the effect allele T, which reads as Leu. Enzyme activity tends to run lower, which is linked at a population level to a greater reliance on adequate selenium and a broad antioxidant intake to keep peroxide clearance well supported. This is a tendency, not a certainty. Effect allele T (Leu).",
          },
        ],
      },
    ],
    biologicalRole:
      "GPX1 makes glutathione peroxidase, a selenium dependent enzyme that clears hydrogen peroxide and other reactive byproducts, working hand in hand with SOD2 and catalase to complete antioxidant defense.",
    functionalImpact:
      "The common Pro198Leu variant does not break the enzyme. Carriers of the effect allele T, the Leu form, tend to have somewhat lower enzyme activity, which raises the value of adequate selenium since selenium is the nutrient the enzyme depends on. The practical answer is reliable selenium status and a broad antioxidant intake rather than a single high dose.",
    healthAssociations: [
      "Linked at a population level to antioxidant capacity, oxidative stress handling, and how well peroxide is cleared, with the lower activity allele making selenium status more important. These are soft, group level associations of the selenium dependent antioxidant pathway, not a personal verdict, and they respond to adequate selenium and a broad antioxidant intake. Effect allele T, the Leu form, is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Adequate selenium from whole foods, since it is the cofactor this enzyme depends on, with a small amount of brazil nuts a convenient source.",
      "A broad antioxidant intake from colorful plants to support the wider network.",
      "Selenium to meet needs rather than in high doses, since more is not better past adequacy.",
    ],
    cautions: [
      "This variant shapes enzyme activity, it does not set an outcome, so read it as a reason to secure adequate selenium.",
      "High dose selenium is not better than adequate selenium and can be counterproductive, so support needs rather than overload.",
    ],
    dietLifestyle: [
      "Include whole food selenium sources such as a small amount of brazil nuts, fish, and eggs.",
      "Eat a wide range of colorful, antioxidant rich plants to support the broader network.",
      "Keep training loads sensible with room to recover, which supports oxidative balance.",
    ],
    interactions: [
      "GPX1 completes the antioxidant chain that SOD2 and catalase begin, so a lower activity reading here is best read alongside SOD2, CAT, and your selenium status rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the full antioxidant chain, including adequate selenium and a broad antioxidant intake, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track recovery and resilience as part of your Bio Optimization picture.",
    laySummary: [
      "GPX1 makes a selenium powered enzyme that clears away the reactive leftovers of everyday metabolism, finishing the cleanup that other antioxidant enzymes start. One common version of this gene, called Leu, works a little more slowly. That version is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, the simplest help is making sure you get enough selenium, since this enzyme depends on it, alongside a colorful antioxidant rich diet. A little goes a long way, so it is about adequacy rather than loading up. Read a Leu result as a reason to keep your selenium steady, not as a sign of harm.",
    ],
  },

  il6: {
    aliases: ["interleukin 6"],
    pathway: "Inflammatory tone and diet response",
    keyVariants: [
      {
        rsid: "rs1800795",
        // Forward strand orientation. The canonical minus one hundred seventy four
        // promoter variant. Reference allele is G, effect allele is C. The C allele
        // is linked at a population level to differences in baseline inflammatory
        // signaling, though associations are modest and population dependent. Some
        // assays report the complementary strand and print this same call with the
        // opposite letters; reconcile to the forward G/C frame before reading.
        name: "Minus one hundred seventy four promoter variant, forward strand, effect allele C",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele C on the forward strand. Baseline inflammatory tone tends to sit at the typical level, so an everyday anti inflammatory pattern is usually plenty. Effect allele C, none carried here.",
          },
          {
            genotype: "GC",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele C. Associated at a population level with a modest difference in baseline inflammatory signaling, which makes an anti inflammatory diet and steady omega-3 intake a little more worthwhile. The evidence here is modest and population dependent. Effect allele C.",
          },
          {
            genotype: "CC",
            label: "Altered inflammatory tone tendency",
            interpretation:
              "Two copies of the effect allele C. Associated at a population level with a difference in baseline inflammatory tone, so an anti inflammatory eating pattern and reliable omega-3 intake tend to be especially supportive. The association is modest and varies between populations, so it is best read as a gentle nudge rather than a strong signal. This is a tendency, not a certainty. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "IL6 makes interleukin six, a signaling molecule that helps set inflammatory tone throughout the body and also plays normal roles in immune response and tissue repair.",
    functionalImpact:
      "The common promoter variant does not break the gene. Carriers of the effect allele C are linked at a population level to differences in baseline inflammatory signaling, though the size and direction of the effect vary between populations and the evidence is modest. For nutrition, it is most useful as a gentle reason to lean into an anti inflammatory eating pattern rather than as a strong personal signal.",
    healthAssociations: [
      "Linked at a population level to baseline inflammatory tone and to how strongly people respond to an anti inflammatory diet and omega-3 intake. These are soft, modest, population dependent associations of the inflammatory pathway, not a personal verdict, and they respond well to an anti inflammatory eating pattern. Effect allele C is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Long chain omega-3 from fish or an algae source, which supports a balanced inflammatory tone.",
      "A broad intake of colorful polyphenol rich plants, such as berries, leafy greens, and herbs.",
      "Olive oil and other unsaturated fats as the everyday base, with refined and processed foods kept modest.",
    ],
    cautions: [
      "The inflammatory associations here are modest and vary between populations, so read this as a gentle nudge rather than a strong personal signal.",
      "This variant shapes inflammatory tone, it does not set a diagnosis, so frame it as a reason to lean into an anti inflammatory pattern.",
    ],
    dietLifestyle: [
      "Favor a Mediterranean leaning, anti inflammatory pattern rich in fish, vegetables, fruit, and olive oil.",
      "Keep refined sugar and heavily processed foods modest, since they tend to lift inflammatory tone.",
      "Support inflammatory balance with regular activity, good sleep, and stress management.",
    ],
    interactions: [
      "IL6 sits within the wider inflammatory network and is best read alongside TNF and your overall diet quality, since lifestyle inputs shape inflammatory tone far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura leans into anti inflammatory nutrition, pairing omega-3 with a polyphenol rich pattern, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track how you feel and, where relevant, inflammatory markers as part of your Bio Optimization picture.",
    laySummary: [
      "IL6 makes a messenger that helps set your body's background level of inflammation, the low simmer that influences recovery and long term wellbeing. One common version of this gene is tied to small differences in that simmer. The version we track is the C version on the standard reading direction we use here.",
      "The honest framing is that this link is modest and varies between groups of people, so it is a gentle nudge rather than a loud signal. Either way, leaning into an anti inflammatory pattern with fish, colorful plants, and olive oil tends to help everyone. So read a C result as encouragement toward those foods, not a verdict about inflammation.",
    ],
  },

  tnf: {
    aliases: ["TNF-alpha", "TNFA"],
    pathway: "Inflammatory signaling and diet response",
    keyVariants: [
      {
        rsid: "rs1800629",
        // Forward strand orientation. The canonical minus three hundred eight
        // promoter variant. Reference allele is G, effect allele is A. The A allele
        // is linked at a population level to somewhat higher inflammatory signaling,
        // though associations are modest and population dependent. Some assays
        // report the complementary strand and print this same call with the opposite
        // letters; reconcile to the forward G/A frame before reading.
        name: "Minus three hundred eight promoter variant, forward strand, effect allele A",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele A on the forward strand. Inflammatory signaling through this pathway tends to sit at the typical level, so an everyday anti inflammatory pattern is usually plenty. Effect allele A, none carried here.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A. Associated at a population level with a modestly higher tendency in inflammatory signaling, which makes an anti inflammatory diet and steady omega-3 intake a little more worthwhile. The evidence here is modest and population dependent. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Higher inflammatory signaling tendency",
            interpretation:
              "Two copies of the effect allele A. Associated at a population level with a higher tendency in inflammatory signaling, so an anti inflammatory eating pattern and reliable omega-3 intake tend to be especially supportive. The association is modest and varies between populations, so it is best read as a gentle nudge rather than a strong signal. This is a tendency, not a certainty. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "TNF makes tumor necrosis factor, a central inflammatory signal that coordinates immune response and helps set inflammatory tone, with normal protective roles alongside its association with chronic low grade inflammation.",
    functionalImpact:
      "The common promoter variant does not break the gene. Carriers of the effect allele A are linked at a population level to a somewhat higher tendency in inflammatory signaling, though the effect is modest and varies between populations. For nutrition, it is most useful as a gentle reason to lean into an anti inflammatory eating pattern rather than as a strong personal signal.",
    healthAssociations: [
      "Linked at a population level to inflammatory signaling tone and to how strongly people respond to an anti inflammatory diet and omega-3 intake. These are soft, modest, population dependent associations of the inflammatory pathway, not a personal verdict, and they respond well to an anti inflammatory eating pattern. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Long chain omega-3 from fish or an algae source, which supports a balanced inflammatory tone.",
      "A broad intake of colorful polyphenol rich plants, such as berries, leafy greens, and herbs.",
      "Olive oil and other unsaturated fats as the everyday base, with refined and processed foods kept modest.",
    ],
    cautions: [
      "The inflammatory associations here are modest and vary between populations, so read this as a gentle nudge rather than a strong personal signal.",
      "This variant shapes inflammatory tone, it does not set a diagnosis, so frame it as a reason to lean into an anti inflammatory pattern.",
    ],
    dietLifestyle: [
      "Favor a Mediterranean leaning, anti inflammatory pattern rich in fish, vegetables, fruit, and olive oil.",
      "Keep refined sugar and heavily processed foods modest, since they tend to lift inflammatory tone.",
      "Support inflammatory balance with regular activity, good sleep, and stress management.",
    ],
    interactions: [
      "TNF sits within the wider inflammatory network and is best read alongside IL6 and your overall diet quality, since lifestyle inputs shape inflammatory tone far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura leans into anti inflammatory nutrition, pairing omega-3 with a polyphenol rich pattern, and supporting nutrients are delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track how you feel and, where relevant, inflammatory markers as part of your Bio Optimization picture.",
    laySummary: [
      "TNF makes one of the body's central inflammation messengers, important for normal immune defense but also tied to the low grade inflammation that can build up over time. One common version of this gene is linked to slightly stronger signaling. That version is the A version on the standard reading direction we use here.",
      "As with IL6, the honest framing is that this link is modest and varies between groups, so it is a gentle nudge rather than a loud one. Leaning into an anti inflammatory pattern with fish, colorful plants, and olive oil helps everyone regardless. So read an A result as encouragement toward those foods, not a verdict about inflammation.",
    ],
  },

  cat: {
    aliases: ["catalase"],
    pathway: "Hydrogen peroxide clearance and antioxidant defense",
    keyVariants: [
      {
        rsid: "rs1001179",
        // Forward strand orientation. The canonical minus two hundred sixty two
        // promoter variant. Reference allele is C, effect allele is T. The T allele
        // is linked at a population level to lower catalase expression and activity.
        // Some assays report the complementary strand and print this same call with
        // the opposite letters; reconcile to the forward C/T frame before reading.
        name: "Minus two hundred sixty two promoter variant, forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. Catalase is expressed at its usual level, so hydrogen peroxide is cleared at the typical pace and a broad antioxidant intake keeps the network well supplied. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Catalase expression tends to run a little lower, which is linked at a population level to a modestly higher demand on the rest of your antioxidant network. A broad antioxidant intake comfortably supports this. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Lower activity tendency",
            interpretation:
              "Two copies of the effect allele T. Catalase expression tends to run lower, which is linked at a population level to a higher oxidative burden and a greater reliance on the rest of the antioxidant network to clear peroxide. A broad, food first antioxidant intake tends to matter most here. This is a tendency, not a certainty. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "CAT makes catalase, a fast acting enzyme that breaks hydrogen peroxide down into water and oxygen, working alongside SOD2 and glutathione peroxidase to complete antioxidant defense.",
    functionalImpact:
      "The common promoter variant does not break the enzyme. Carriers of the effect allele T tend to express catalase a little less, which is linked to a higher reliance on the rest of the antioxidant network to keep peroxide cleared. Because the enzyme works as part of a chain, the practical answer for nutrition is to support the whole antioxidant network rather than this one step alone.",
    healthAssociations: [
      "Linked at a population level to oxidative burden and to how well hydrogen peroxide is cleared, with the lower expression allele raising the demand on the rest of the antioxidant network. These are soft, group level associations of the antioxidant pathway, not a personal verdict, and they respond to a broad, food first antioxidant intake. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "A broad, colorful antioxidant intake from whole foods to support the wider network.",
      "Adequate selenium and a balanced mineral intake to power the partner enzymes that share this work.",
      "Whole food antioxidant sources rather than reliance on any single high dose nutrient.",
    ],
    cautions: [
      "This variant shapes one step in a chain, it does not set an outcome, so support the whole antioxidant network rather than a single nutrient.",
      "A single high dose antioxidant is no substitute for a broad, balanced intake, so favor variety from food.",
    ],
    dietLifestyle: [
      "Eat a wide range of colorful, antioxidant rich plants as your everyday base.",
      "Keep training loads sensible with room to recover, which supports oxidative balance.",
      "Limit unnecessary oxidative exposures such as smoking and excess alcohol.",
    ],
    interactions: [
      "CAT completes the antioxidant chain that SOD2 begins and that glutathione peroxidase shares, so a lower expression reading here is best read alongside SOD2, GPX1, and your overall antioxidant intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the full antioxidant chain with a broad antioxidant intake and the minerals its partner enzymes depend on, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track recovery and resilience as part of your Bio Optimization picture.",
    laySummary: [
      "CAT makes a lightning fast enzyme that breaks down hydrogen peroxide, a reactive byproduct of everyday metabolism, into harmless water and oxygen. One common version of this gene makes a little less of it. The lower activity version is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, the rest of your antioxidant team picks up more of the load, so the helpful move is a broad, colorful diet that supports the whole network rather than any one nutrient. So read a T result as a reason to eat the rainbow and support recovery, not as a sign of damage.",
    ],
  },

  gstm1: {
    aliases: ["GST mu 1", "glutathione S-transferase mu 1"],
    pathway: "Phase two detox, glutathione conjugation, by gene copy",
    keyVariants: [
      {
        // GSTM1 is a NULL DELETION locus, not a single base genotype. You either
        // carry the gene (Present) or you do not (Null). There is no two base call
        // here, so the call is a copy number style Present or Null. Like secretor
        // status, this is descriptive context and is NOT scored on a high to low
        // severity scale. The Null call simply means a common deletion of the gene.
        rsid: "GSTM1-CNV",
        name: "GSTM1 gene present or null deletion, descriptive call",
        genotypes: [
          {
            genotype: "Present",
            label: "Gene present",
            interpretation:
              "You carry a working copy of the GSTM1 gene, so this arm of glutathione conjugation runs at its usual pace. A broad antioxidant intake comfortably supports it. This is a descriptive type, not a severity grade.",
          },
          {
            genotype: "Null",
            label: "Gene deleted",
            interpretation:
              "Both copies of GSTM1 are deleted, which is common in the general population, so this one detox arm is quieter. Other glutathione enzymes still cover the work, and a broad, food first antioxidant intake supports the wider network. This is a descriptive type, not a severity grade, and it is not a disease or a deficiency.",
          },
        ],
      },
    ],
    biologicalRole:
      "GSTM1 encodes one of the glutathione S-transferase enzymes that attach glutathione to certain pollutants, smoke compounds, and oxidative byproducts so the body can neutralize and clear them, a core part of Phase two detox.",
    functionalImpact:
      "A common deletion leaves some people with no working GSTM1, written as the Null call. This quiets one arm of glutathione conjugation, though related enzymes still share the work. For nutrition it is most useful as a gentle reason to support the whole glutathione and antioxidant network rather than as a deficiency. Because this is a present or null gene copy call rather than a graded genotype, it is not scored on a high to low severity scale.",
    healthAssociations: [
      "Linked at a population level to how briskly certain pollutants, smoke compounds, and oxidative byproducts are conjugated and cleared, with the Null type leaning a little more on the rest of the antioxidant network. These are soft, group level, descriptive associations of Phase two detox, not a personal verdict, and neither type is a disease. The Null type is very common in the general population.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables such as broccoli, kale, and brussels sprouts, which gently support the wider glutathione detox network.",
      "Glutathione building blocks from a broad protein and sulfur rich food intake, with NAC where a practitioner advises.",
      "A broad, colorful antioxidant intake from whole foods rather than reliance on any single nutrient.",
    ],
    cautions: [
      "This is a present or null gene copy call, not a severity grade, so it is not scored high to low.",
      "A Null result is common and is a reason to support the wider antioxidant network, not a sign that you cannot detox.",
    ],
    dietLifestyle: [
      "Eat cruciferous vegetables regularly, since they are a reliable everyday support for glutathione linked detox.",
      "Limit unnecessary oxidative exposures such as smoking and excess alcohol, which lean harder on this network.",
      "Build a broad, colorful, antioxidant rich plate as your everyday base.",
    ],
    interactions: [
      "GSTM1 works alongside GSTT1, GSTP1, and the wider glutathione system, so a Null result here is best read alongside your other detox genes and your overall antioxidant intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the wider glutathione and antioxidant network with cruciferous forward nutrition and supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track resilience and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "GSTM1 is one of your body's detox helpers, attaching a cleanup tag to certain pollutants and byproducts so they can be cleared. Unlike most genes here, it is not about a single spelling change. Instead, a very common quirk means some people are simply missing this gene, which shows up as a Null result.",
      "If yours reads Null, do not worry, it is common and your other detox enzymes pick up the slack. The helpful move is supporting the whole team with cruciferous vegetables like broccoli and a colorful antioxidant rich diet. This is a type, not a grade, so there is no good or bad result here, just a nudge toward detox friendly foods.",
    ],
  },

  gstt1: {
    aliases: ["GST theta 1", "glutathione S-transferase theta 1"],
    pathway: "Phase two detox, glutathione conjugation, by gene copy",
    keyVariants: [
      {
        // GSTT1 is a NULL DELETION locus, not a single base genotype. You either
        // carry the gene (Present) or you do not (Null). There is no two base call
        // here, so the call is a copy number style Present or Null. Like GSTM1 and
        // secretor status, this is descriptive context and is NOT scored on a high
        // to low severity scale. The Null call means a common deletion of the gene.
        rsid: "GSTT1-CNV",
        name: "GSTT1 gene present or null deletion, descriptive call",
        genotypes: [
          {
            genotype: "Present",
            label: "Gene present",
            interpretation:
              "You carry a working copy of the GSTT1 gene, so this arm of glutathione conjugation runs at its usual pace. A broad antioxidant intake comfortably supports it. This is a descriptive type, not a severity grade.",
          },
          {
            genotype: "Null",
            label: "Gene deleted",
            interpretation:
              "Both copies of GSTT1 are deleted, which is common in the general population, so this one detox arm is quieter. Related glutathione enzymes still cover the work, and a broad, food first antioxidant intake supports the wider network. This is a descriptive type, not a severity grade, and it is not a disease or a deficiency.",
          },
        ],
      },
    ],
    biologicalRole:
      "GSTT1 encodes another of the glutathione S-transferase enzymes that attach glutathione to specific environmental compounds and oxidative byproducts so the body can neutralize and clear them, working alongside GSTM1 in Phase two detox.",
    functionalImpact:
      "A common deletion leaves some people with no working GSTT1, written as the Null call. This quiets one arm of glutathione conjugation, though related enzymes still share the work. For nutrition it is most useful as a gentle reason to support the whole glutathione and antioxidant network rather than as a deficiency. Because this is a present or null gene copy call rather than a graded genotype, it is not scored on a high to low severity scale.",
    healthAssociations: [
      "Linked at a population level to how briskly certain environmental compounds and oxidative byproducts are conjugated and cleared, with the Null type leaning a little more on the rest of the antioxidant network. These are soft, group level, descriptive associations of Phase two detox, not a personal verdict, and neither type is a disease. The Null type is common in the general population.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables such as broccoli, kale, and brussels sprouts, which gently support the wider glutathione detox network.",
      "Glutathione building blocks from a broad protein and sulfur rich food intake, with NAC where a practitioner advises.",
      "A broad, colorful antioxidant intake from whole foods rather than reliance on any single nutrient.",
    ],
    cautions: [
      "This is a present or null gene copy call, not a severity grade, so it is not scored high to low.",
      "A Null result is common and is a reason to support the wider antioxidant network, not a sign that you cannot detox.",
    ],
    dietLifestyle: [
      "Eat cruciferous vegetables regularly, since they are a reliable everyday support for glutathione linked detox.",
      "Limit unnecessary oxidative exposures such as smoking and excess alcohol, which lean harder on this network.",
      "Build a broad, colorful, antioxidant rich plate as your everyday base.",
    ],
    interactions: [
      "GSTT1 works alongside GSTM1, GSTP1, and the wider glutathione system, so a Null result here is best read alongside your other detox genes and your overall antioxidant intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the wider glutathione and antioxidant network with cruciferous forward nutrition and supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track resilience and recovery as part of your Bio Optimization picture.",
    laySummary: [
      "GSTT1 is a close partner of GSTM1, another detox helper that tags certain environmental compounds for cleanup. As with GSTM1, the common quirk here is not a spelling change but whether you carry the gene at all, so the result reads as Present or Null.",
      "A Null result is common and nothing to worry about, since your other detox enzymes share the work. The same simple support helps, leaning on cruciferous vegetables and a colorful antioxidant rich diet. This is a type, not a grade, so read it as background that nudges you toward detox friendly foods, not as a score.",
    ],
  },

  mcm6: {
    aliases: ["LCT regulatory region", "lactase persistence"],
    pathway: "Lactase persistence and lactose tolerance",
    keyVariants: [
      {
        rsid: "rs4988235",
        // Forward strand orientation. This MCM6 variant controls the neighboring
        // LCT lactase gene. The T allele is the lactase persistence allele, linked
        // to continued lactase production and lactose tolerance into adulthood; the
        // C allele is the ancestral non persistence allele, linked to the common
        // adult decline in lactase. This is a descriptive dietary trait, NOT a high
        // to low severity scale, since lactase non persistence is the normal global
        // default and not a disorder. Some assays report the complementary strand
        // and print this call with the opposite letters; reconcile to forward C/T.
        name: "MCM6 minus 13910 C to T, forward strand, persistence allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Lactase non persistence type",
            interpretation:
              "Two copies of the ancestral C allele, the global default. Lactase production tends to decline after early childhood, so larger amounts of lactose from milk can bring digestive discomfort. This is a normal dietary trait, not a disorder, and lower lactose foods or lactase enzyme drops manage it easily. Persistence allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Lactase persistence type",
            interpretation:
              "One copy of the persistence allele T. A single copy is usually enough to keep lactase active into adulthood, so most people in this group tolerate dairy comfortably, with personal tolerance still varying. Persistence allele T.",
          },
          {
            genotype: "TT",
            label: "Lactase persistence type",
            interpretation:
              "Two copies of the persistence allele T. Lactase production tends to continue into adulthood, so dairy and its lactose are usually well tolerated. This is a descriptive type, not a better or worse result. Persistence allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "This MCM6 variant sits beside the LCT gene and acts as a switch for lactase, the enzyme that digests the lactose sugar in milk. It sets whether lactase production continues into adulthood or follows the more common decline after early childhood.",
    functionalImpact:
      "Carriers of the persistence allele T tend to keep making lactase and digest lactose comfortably, while those with two C alleles follow the global default of declining lactase, which is normal rather than a disorder. For nutrition this is descriptive context about dairy tolerance. Personal tolerance still varies, since gut microbes and portion size also shape how lactose feels.",
    healthAssociations: [
      "Linked at a population level to lactose tolerance and to digestive comfort after dairy, with the non persistence type more likely to notice symptoms from larger lactose loads. These are descriptive, group level associations of a normal dietary trait, not a disease or a personal verdict, and lactase non persistence is the most common pattern worldwide. The persistence allele T is the allele the tolerant type tracks.",
    ],
    nutrientStrategy: [
      "For the non persistence type, calcium and vitamin D from lower lactose dairy such as hard cheese and yogurt, or from fortified plant milks and leafy greens.",
      "Lactase enzyme drops or lactose free dairy where milk is wanted but poorly tolerated.",
      "A varied calcium intake so dairy is never the only route, whatever your type.",
    ],
    cautions: [
      "This is a descriptive dietary trait, not a severity grade, so it is not scored high to low.",
      "Tolerance varies person to person, so judge by how foods feel rather than the genotype alone, and avoid cutting whole food groups without need.",
    ],
    dietLifestyle: [
      "If you are the non persistence type, favor lower lactose dairy, smaller portions, or lactose free options, and pair dairy with other foods.",
      "Keep calcium and vitamin D reliable from a range of sources so bone support never depends on dairy alone.",
      "Reintroduce small amounts to find your personal comfort level, since many non persistent people tolerate modest dairy.",
    ],
    interactions: [
      "Dairy tolerance shapes how easily you reach calcium and vitamin D from milk, so a non persistence result is best read alongside your vitamin D genes and overall mineral intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura tailors calcium and vitamin D guidance to your dairy tolerance and can route those nutrients through the micellar and liposomal dual delivery system for Maximum Bioavailability where dairy is limited. Track digestive comfort and bone support nutrients as part of your Bio Optimization picture.",
    laySummary: [
      "MCM6 is the switch that decides whether you keep making lactase, the enzyme that digests the sugar in milk, once you are grown. The tolerant version is the T version on the standard reading direction we use here, and even one copy is usually enough to keep dairy comfortable.",
      "If you have two C copies, your lactase naturally winds down, which is the most common pattern in the world and is normal, not a disorder. The easy answer is smaller portions, lower lactose dairy like hard cheese and yogurt, or lactase drops, while keeping calcium and vitamin D coming from a range of foods. So read your result as a simple guide to how dairy suits you, not a grade.",
    ],
  },

  "hla-dq2-and-hla-dq8": {
    aliases: ["HLA-DQA1 and HLA-DQB1 celiac haplotypes", "celiac risk haplotypes"],
    pathway: "Gluten and celiac predisposition, descriptive haplotype context",
    keyVariants: [
      {
        // HLA-DQ2 and HLA-DQ8 are celiac associated immune haplotypes, not single
        // base genotypes. The call is the presence or absence of these haplotypes,
        // typically derived from tag SNPs or HLA typing rather than one rsID. This
        // is descriptive context and is NOT scored on a high to low severity scale.
        // CRITICAL CONSERVATISM: carrying a haplotype is common in the general
        // population and does NOT mean celiac disease. The haplotypes are necessary
        // but not sufficient for celiac, so presence is not a diagnosis and absence
        // is reassuring rather than a clearance. This is never diagnostic.
        rsid: "HLA-DQ2/DQ8",
        name: "HLA-DQ2 and HLA-DQ8 haplotype presence, descriptive call",
        genotypes: [
          {
            genotype: "Neither haplotype",
            label: "Haplotypes absent",
            interpretation:
              "Neither the HLA-DQ2 nor the HLA-DQ8 haplotype is detected. Because these haplotypes are almost always present in celiac disease, their absence makes celiac very unlikely. This is descriptive, reassuring context, not a clearance or a diagnosis, and a balanced diet that includes gluten is generally fine unless a clinician advises otherwise.",
          },
          {
            genotype: "DQ2 or DQ8 present",
            label: "Haplotype present, common",
            interpretation:
              "One or both of the HLA-DQ2 or HLA-DQ8 haplotypes is detected. This is common in the general population, and the large majority of carriers never develop celiac disease, so on its own it is NOT a diagnosis and not a reason to remove gluten. It is descriptive predisposition context. If you have ongoing gut symptoms, discuss proper celiac testing with a clinician before changing your diet, since going gluten free first can obscure the diagnosis. This is not scored on a severity scale.",
          },
        ],
      },
    ],
    biologicalRole:
      "HLA-DQ2 and HLA-DQ8 are immune system tissue type haplotypes that shape how the body presents fragments of gluten to immune cells. They form the genetic backdrop against which celiac disease can, in a small minority of carriers, develop.",
    functionalImpact:
      "These haplotypes are necessary but not sufficient for celiac disease. Almost everyone with celiac carries one, yet the haplotypes are common and the large majority of carriers never develop the condition. So this result is descriptive predisposition context only. Its strongest practical value is reassurance, since absence makes celiac very unlikely, while presence on its own changes nothing about how you should eat.",
    healthAssociations: [
      "Associated at a population level with eligibility to develop celiac disease and, more loosely, with non celiac gluten sensitivity, while remaining common among healthy people who never react to gluten. These are descriptive, group level predisposition associations, never a diagnosis, and presence of a haplotype does not mean you have or will get celiac disease. This is not scored on a high to low severity scale.",
    ],
    nutrientStrategy: [
      "No change to nutrient intake is warranted on this result alone, since most carriers tolerate gluten normally.",
      "If celiac is confirmed by a clinician, a fully gluten free diet plus attention to fiber, B vitamins, iron, and calcium becomes the focus.",
      "A varied whole food diet remains the sensible default for carriers without symptoms.",
    ],
    cautions: [
      "Carrying a haplotype is common and is NOT a celiac diagnosis, so it is descriptive context, not a severity grade, and it is not scored high to low.",
      "Do not start a gluten free diet based on this result alone, and do not remove gluten before celiac testing, since doing so can hide the diagnosis. Celiac testing and any gluten free decision belong with a clinician.",
    ],
    dietLifestyle: [
      "If you have no gluten related symptoms, keep eating a normal balanced diet, since this result does not call for restriction.",
      "If you have ongoing digestive symptoms, see a clinician about proper celiac testing while still eating gluten.",
      "Only adopt a gluten free pattern under clinical guidance if celiac or a clear sensitivity is confirmed.",
    ],
    interactions: [
      "This haplotype context sits alongside the DAO histamine and wider gut picture, so any gluten related symptoms are best read with a clinician rather than attributed to this result alone.",
    ],
    protocolTieIn:
      "Via Cura treats this as descriptive context, never a diagnosis, and where celiac is clinically confirmed it can support a gluten free diet with the nutrients that pattern can run low in, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track digestive comfort as part of your Bio Optimization picture, always alongside clinical guidance.",
    laySummary: [
      "HLA-DQ2 and HLA-DQ8 are immune system types that set whether celiac disease is even possible for you. Almost everyone with celiac carries one, but here is the key point, these types are common and the large majority of people who carry them never develop celiac at all.",
      "So a present result is not a diagnosis and not a reason to drop gluten. Its most useful side is reassurance, because if you carry neither type, celiac is very unlikely. If you do carry one and have ongoing gut symptoms, the right step is proper celiac testing with a clinician while you are still eating gluten, since cutting it out first can hide the answer. Read this as background, never a verdict.",
    ],
  },

  ahr: {
    aliases: ["aryl hydrocarbon receptor"],
    pathway: "Caffeine and aromatic compound sensing",
    keyVariants: [
      {
        rsid: "rs4410790",
        // Forward strand orientation. This is the strongest replicated locus for
        // habitual caffeine consumption, sitting upstream of AHR and shaping AHR
        // expression. The C allele is associated at a population level with higher
        // habitual caffeine intake; the T allele with lower intake. The link is to
        // consumption behavior and AHR signaling, not a clean enzyme speed call, so
        // the rows stay conservative. Some assays report the complementary strand
        // and print this call with the opposite letters; reconcile to forward T/C.
        name: "Upstream of AHR, forward strand, effect allele C",
        genotypes: [
          {
            genotype: "TT",
            label: "Typical",
            interpretation:
              "No copies of the effect allele C on the forward strand. AHR signaling and habitual caffeine intake tend to sit at the population baseline, so a sensible everyday caffeine pattern usually feels comfortable. Effect allele C, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele C. Associated at a population level with a modest shift in AHR signaling and a slightly higher habitual caffeine intake, which makes mindful timing of coffee a little more worthwhile. Effect allele C.",
          },
          {
            genotype: "CC",
            label: "Higher caffeine intake tendency",
            interpretation:
              "Two copies of the effect allele C. Associated at a population level with higher habitual caffeine intake and altered AHR signaling. This is a soft behavioral tendency, not a verdict on how caffeine affects you personally, so let your own sleep, jitteriness, and afternoon cutoff guide your intake. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "AHR makes the aryl hydrocarbon receptor, a sensor that responds to dietary and environmental compounds including caffeine, the indoles in cruciferous vegetables, and certain pollutants, and helps switch on the enzymes that process them, including the main caffeine metabolizing enzyme.",
    functionalImpact:
      "Variation near AHR shifts how strongly this sensor signals, which is linked at a population level to habitual caffeine intake and to how aromatic dietary compounds are handled. The effect is on a behavioral tendency and signaling tone rather than a clean enzyme speed, so it is best read alongside your real world caffeine response rather than as a fixed metabolic verdict.",
    healthAssociations: [
      "Linked at a population level to habitual caffeine consumption and to AHR driven handling of aromatic dietary and environmental compounds. These are soft, group level associations of caffeine sensing, not a personal verdict, and they are best understood together with how caffeine actually feels for you. Effect allele C is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables such as broccoli and brussels sprouts, whose indoles work with this sensing pathway.",
      "A sensible caffeine ceiling and timing rather than a fixed amount, guided by your own response.",
      "A broad antioxidant intake from colorful plants to support handling of aromatic compounds.",
    ],
    cautions: [
      "This locus tracks a behavioral and signaling tendency, not a clean caffeine clearance speed, so judge by your own sleep and jitteriness rather than the genotype alone.",
      "It is best read alongside the caffeine metabolizing enzyme picture rather than as a standalone caffeine verdict.",
    ],
    dietLifestyle: [
      "Set an afternoon caffeine cutoff that protects your sleep, since caffeine timing matters more than genotype here.",
      "Include cruciferous vegetables regularly to support the aromatic compound handling this sensor helps drive.",
      "Notice how coffee affects your sleep, focus, and heart rate, and adjust to what feels good.",
    ],
    interactions: [
      "AHR helps switch on the main caffeine metabolizing enzyme, so a result here is best read alongside that enzyme and your real world caffeine response rather than alone.",
    ],
    protocolTieIn:
      "Via Cura pairs sensible caffeine guidance with cruciferous forward nutrition and a broad antioxidant intake, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track sleep, energy, and caffeine response as part of your Bio Optimization picture.",
    laySummary: [
      "AHR is a kind of sensor that notices certain compounds in your food and environment, including caffeine and the natural compounds in broccoli, and helps switch on the enzymes that process them. A common version near this gene is tied to how much coffee people tend to drink. That version is the C version on the standard reading direction we use here.",
      "The honest framing is that this is more about habits and signaling than a precise caffeine speed, so your own experience matters most. If coffee disrupts your sleep or makes you jittery, that is your best guide. Cruciferous vegetables and a sensible afternoon cutoff help everyone. So read a C result as gentle context about caffeine, not a rule about how much you can handle.",
    ],
  },

  dao: {
    aliases: ["AOC1", "ABP1", "diamine oxidase"],
    pathway: "Dietary histamine clearance at the gut",
    keyVariants: [
      {
        rsid: "rs10156191",
        // Overlapping locus with the GeneXM DAO entry. Per the 204h decision the
        // rsID and the per genotype tier direction are reused from GeneXM, and the
        // prose is re-authored for the NUTRITION context. Forward strand: effect
        // allele is T, reference is C, the c.47C>T (Thr16Met) variant linked to
        // lower DAO activity. Some assays report the complementary strand and print
        // this call with the opposite letters; reconcile to forward C/T first.
        name: "c.47C>T (Thr16Met), forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. DAO breaks down dietary histamine at its usual pace, so histamine rich foods are usually well tolerated. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Histamine clearance at the gut tends to run somewhat lower, so some people notice mild reactions to very histamine rich or fermented foods, especially when eaten in quantity. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Lower histamine clearance tendency",
            interpretation:
              "Two copies of the effect allele T. DAO activity tends to run lower, so histamine rich, fermented, and leftover foods are more likely to bring flushing, headache, congestion, or digestive upset when clearance cannot keep pace. This is a tendency, not a certainty, and it responds well to fresher foods and identifying personal triggers. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "DAO makes diamine oxidase, the enzyme at the gut lining that breaks down histamine from food, limiting how much dietary histamine enters circulation.",
    functionalImpact:
      "Carriers of the effect allele T tend to have lower DAO activity, so dietary histamine clears more slowly. When intake outpaces clearance, this can show up as histamine intolerance, where histamine rich or histamine releasing foods trigger symptoms. The practical answer is fresher foods, mindful portions, and supportive cofactors rather than broad, indefinite restriction.",
    healthAssociations: [
      "Linked at a population level to histamine intolerance symptoms after histamine rich foods such as aged cheese, wine, fermented foods, and leftovers, including flushing, headaches, nasal congestion, hives, and digestive upset. These are soft, group level associations of the histamine clearance pathway, not a personal verdict, and they ease when intake matches clearance. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Vitamin C and copper, which support DAO activity at the gut.",
      "Vitamin B6 as a cofactor for histamine handling.",
      "A practitioner guided DAO supportive approach where symptoms are significant rather than broad self restriction.",
    ],
    cautions: [
      "This variant shapes clearance, it does not set an outcome, so frame it as a reason to match histamine intake to tolerance rather than a diagnosis.",
      "Some foods and supplements are histamine liberators, so identify personal triggers rather than restricting broadly and risking an unbalanced diet.",
    ],
    dietLifestyle: [
      "Favor fresh rather than aged or leftover foods during a flare up, since histamine builds as food ages.",
      "Lean toward a lower histamine pattern only as needed, then reintroduce to find your personal tolerance.",
      "Support overall gut health, since the gut lining is where dietary histamine is cleared.",
    ],
    interactions: [
      "DAO handles dietary histamine while the methylation route through HNMT clears it inside cells, so a lower DAO tendency is best read alongside your methylation and overall gut picture rather than alone.",
    ],
    protocolTieIn:
      "Via Cura can support DAO cofactors and a personalized lower histamine strategy, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track symptom patterns and food triggers as part of your Bio Optimization picture.",
    laySummary: [
      "DAO makes the enzyme that breaks down histamine from food right at your gut lining. Histamine is the same compound behind allergy type symptoms, and it is naturally high in aged, fermented, and leftover foods. One common version of this gene slows that breakdown. The slower version is the T version on the standard reading direction we use here, and two copies slow it more than one.",
      "If you carry it and clearance cannot keep up, histamine rich foods may bring flushing, headaches, or a stuffy nose. The good news is it responds well to eating fresher foods, watching portions of the highest histamine foods, and finding your own triggers rather than cutting out whole groups. So read a T result as a helpful pointer about which foods to watch, not a permanent restriction.",
    ],
  },

  nat2: {
    aliases: ["N-acetyltransferase 2"],
    pathway: "Acetylation of dietary amines and xenobiotics",
    keyVariants: [
      {
        // Overlapping locus with the GeneXM NAT2 entry. Per the 204h decision the
        // composite rsIDs and the derived acetylator status direction are reused
        // from GeneXM, and the prose is re-authored for the NUTRITION context.
        // NAT2 reports a single derived acetylator status (rapid, intermediate, or
        // slow) computed from the assay haplotype across rs1801280, rs1799930, and
        // rs1799931, not three raw genotype rows. The slow status is the reduced
        // acetylation direction. Confirm the derived status with the assay.
        rsid: "rs1801280, rs1799930, rs1799931",
        name: "NAT2*5 (341T>C), NAT2*6 (590G>A), NAT2*7 (857G>A); derived acetylator status from the combined haplotype, not three raw genotype rows",
        genotypes: [
          {
            genotype: "Rapid",
            label: "Typical",
            interpretation:
              "Rapid acetylator status. You acetylate dietary amines and related compounds, including some formed when meat is cooked at high heat, at a brisk pace. A balanced diet with sensible cooking is usually plenty. This is the typical, faster clearing direction.",
          },
          {
            genotype: "Intermediate",
            label: "Mixed",
            interpretation:
              "Intermediate acetylator status, a middle acetylation pace. Gentler cooking methods and a vegetable rich plate alongside grilled foods are a sensible, low effort support.",
          },
          {
            genotype: "Slow",
            label: "Slower acetylation tendency",
            interpretation:
              "Slow acetylator status. Acetylation runs more slowly, so compounds formed when meat is cooked at high heat, and certain dietary amines, clear less briskly, which can raise your effective exposure to them. This is a tendency, not a certainty, and it responds well to gentler cooking and a produce rich plate. Slow is the reduced acetylation direction.",
          },
        ],
      },
    ],
    biologicalRole:
      "NAT2 makes an acetylation enzyme that tags certain dietary compounds, including the heterocyclic amines formed when meat is cooked at high heat, and some amines and medications, preparing them for clearance as part of Phase two detox.",
    functionalImpact:
      "Your derived acetylator status, rapid, intermediate, or slow, sets how briskly NAT2 clears these compounds. Slow acetylators process them less quickly, which can raise effective exposure to compounds formed in high heat cooking and alter handling of certain dietary amines. For nutrition the practical lever is gentler cooking and a produce rich plate rather than avoiding meat entirely.",
    healthAssociations: [
      "Linked at a population level to handling of compounds formed in grilled and charred meat and to variability in processing certain dietary amines, with slow acetylators leaning more on supportive cooking and detox friendly foods. These are soft, group level associations of the acetylation pathway, not a personal verdict, and they respond well to cooking choices. The slow acetylator status is the reduced clearance direction.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables and a broad antioxidant intake to support the wider Phase two detox network alongside acetylation.",
      "Glutathione supportive foods and a colorful plate that helps handle high heat cooking byproducts.",
      "Adequate folate and a varied diet, which supports overall xenobiotic handling.",
    ],
    cautions: [
      "This is an acetylation tendency, not a diagnosis, so frame it as a reason to favor gentler cooking rather than a verdict.",
      "Medication dosing questions belong with a prescribing clinician, since acetylator status can affect how some drugs are handled.",
    ],
    dietLifestyle: [
      "For slow acetylators, favor gentler cooking methods such as braising, steaming, or marinating before grilling, which reduces formation of high heat cooking byproducts.",
      "Balance grilled and charred foods with plenty of vegetables and a colorful plate.",
      "Keep charred and heavily processed meat modest while enjoying a varied protein intake.",
    ],
    interactions: [
      "NAT2 works within the broader Phase two detox network alongside the GST enzymes and benefits from glutathione support, so a slow result is best read alongside your other detox genes and overall antioxidant intake rather than alone.",
    ],
    protocolTieIn:
      "Via Cura supports the wider detox network and a practical approach to high heat cooking, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track exposures and resilience as part of your Bio Optimization picture.",
    laySummary: [
      "NAT2 makes an enzyme that helps clear certain compounds from your food, including the ones that form when meat is cooked at high heat or charred. People fall into rapid, intermediate, or slow groups depending on their genetics, and slow acetylators clear these compounds a bit less quickly.",
      "If you are a slow acetylator, the easy and tasty fix is mostly about cooking, leaning toward gentler methods, marinating before grilling, and piling on the vegetables. None of this means giving up meat. So read a slow result as a friendly nudge toward how you cook and round out your plate, not a verdict about your diet.",
    ],
  },

  abcg2: {
    aliases: ["BCRP", "ATP binding cassette transporter G2"],
    pathway: "Urate transport and dietary compound handling",
    keyVariants: [
      {
        rsid: "rs2231142",
        // Forward strand orientation. The Q141K (Gln141Lys) missense variant.
        // Reference allele is C (Gln), effect allele is T (Lys, the 141K reduced
        // function variant). The T allele lowers ABCG2 urate efflux by roughly half,
        // which is linked at a population level to higher serum uric acid and a
        // greater gout tendency. Some assays report the complementary strand and
        // print this call with the opposite letters; reconcile to forward C/T first.
        name: "Q141K (Gln141Lys), forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. ABCG2 moves urate out of the body at its usual pace, so uric acid tends to sit at the typical baseline with everyday habits. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. Urate transport tends to run somewhat lower, which is linked at a population level to a modest rise in uric acid, making a lower purine, hydration forward pattern a little more worthwhile. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Higher uric acid tendency",
            interpretation:
              "Two copies of the effect allele T. ABCG2 urate transport tends to run lower, which is linked at a population level to higher serum uric acid and a greater tendency toward gout over time. This is a population level tendency, not a personal verdict, and it responds well to hydration, a lower purine pattern, and limiting alcohol and sugary drinks. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "ABCG2 makes a transporter that pumps urate and many dietary and environmental compounds out of cells, in the kidney and gut it is a major route for clearing uric acid from the body.",
    functionalImpact:
      "Carriers of the effect allele T move urate out less efficiently, so uric acid can build up more readily, which is linked at a population level to higher serum uric acid and gout tendency. The same transporter also affects handling of some dietary compounds and riboflavin. For nutrition the practical levers are hydration, a lower purine pattern, and moderating alcohol and sugary drinks.",
    healthAssociations: [
      "Linked at a population level to higher serum uric acid and a greater tendency toward gout, and to handling of riboflavin and various dietary compounds. These are soft, group level associations of the urate transport pathway, not a personal risk verdict, and they respond well to hydration, a lower purine pattern, and limiting alcohol and sugary drinks. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Generous hydration across the day, which supports urate clearance directly.",
      "A lower purine, plant forward pattern that keeps uric acid in a comfortable range.",
      "Vitamin C from food and adequate riboflavin, both of which support healthy urate handling.",
    ],
    cautions: [
      "This variant shapes urate transport, it does not set a diagnosis, so frame it as a reason to support healthy uric acid rather than a gout verdict.",
      "Alcohol, especially beer, and sugary drinks high in fructose tend to raise uric acid, so those are the patterns to watch for carriers.",
    ],
    dietLifestyle: [
      "Stay well hydrated, since fluid intake reliably supports urate clearance.",
      "Keep high purine foods such as organ meats and certain seafood modest, and lean on a plant forward plate.",
      "Limit alcohol and sugary, high fructose drinks, which tend to push uric acid up.",
    ],
    interactions: [
      "ABCG2 is one of several urate handling routes, so a result here is best read alongside your measured uric acid and overall diet pattern, which shape uric acid far more than any single variant.",
    ],
    protocolTieIn:
      "Via Cura supports hydration, a lower purine pattern, and the nutrients that aid healthy urate handling, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track uric acid related trends as part of your Bio Optimization picture.",
    laySummary: [
      "ABCG2 builds a pump that clears uric acid and many other compounds out of your body, mostly through the kidneys and gut. One common version of this gene, called Q141K, makes that pump less efficient, so uric acid can build up a little more. The reduced version is the T version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, uric acid may run higher, which over time can raise the tendency toward gout. The encouraging part is how responsive this is, since staying well hydrated, leaning on a plant forward plate, and easing up on alcohol and sugary drinks all help. So read a T result as a practical nudge toward those habits, not a verdict that you will get gout.",
    ],
  },
};
