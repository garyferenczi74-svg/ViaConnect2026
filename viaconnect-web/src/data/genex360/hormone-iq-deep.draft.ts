// Prompt 204 (2026-06-20): HormoneIQ clinical content (the 5 genotype-SNP deep
// reports). Authored by Hannah and LIVE since Gary's clinical and compliance
// sign-off (2026-06-20): attached to the HormoneIQ SNP markers by panels.ts and
// registered in DEEP_REPORT_REGISTRY. The "draft" in the filename is historical.
//
// HormoneIQ is biomarker-led. ONLY these 5 of its 29 markers are genotype SNPs
// and get a per-SNP report here: COMT, CYP1A1, CYP1B1, CYP19A1, SRD5A2. The other
// 24 markers are LAB ANALYTES and route to the biomarker monograph / lab engine
// track (204c, 204d biomarker monographs), NOT to a genotype report. Biomarker
// handoff list (for the lab track, not authored here): Cortisol (free, diurnal),
// Cortisone, DHEA and DHEA-S, Cortisol Awakening Response, Estrone E1, Estradiol
// E2, Estriol E3, Progesterone metabolites, Testosterone, DHT, Androstenedione,
// Androsterone and Etiocholanolone, 2-OH estrogen, 4-OH estrogen, 16-OH estrogen,
// 2-methoxy estrogen, 6-OH melatonin sulfate, HVA, VMA, 5-HIAA, B6 marker, B12
// and folate markers, Glutathione marker, 8-OHdG.
//
// COMT rs4680 also lives in genex-m-deep.ts framed for methylation. Per the 204h
// overlap decision the rsID and tier direction (effect allele A = slower) are
// reused, but the prose is re-authored here for the estrogen and catecholamine
// clearance context. The two reports are distinct, panel-scoped, and must be kept
// keyed by panel slug, not merged by rsID.
//
// Same shape and discipline as the GeneXM and NutrigenDX reports: NO citations
// field (the type has none; citations are the separate KB track), associative and
// educational tone, never diagnostic, no em or en dashes, Via Cura brand, "10x to
// 28x", "Bio Optimization", TypeScript strict (no any).

import type { SnpDeepReport } from "./types";

export const HORMONE_IQ_DEEP_DRAFTS: Record<string, SnpDeepReport> = {
  comt: {
    aliases: [],
    pathway: "Estrogen and catecholamine clearance",
    keyVariants: [
      {
        rsid: "rs4680",
        // Forward strand orientation. Effect allele is A, reference is G. The A
        // allele encodes the methionine form and the slower clearing enzyme; the
        // G allele encodes the valine form and the faster enzyme. Some assays
        // print this same call on the complementary strand with the opposite
        // letters, and some report it as Val and Met rather than as bases, so
        // reconcile to the forward G/A frame and the effect allele A before
        // reading the rows.
        name: "Val158Met, forward strand, effect allele A",
        genotypes: [
          {
            genotype: "GG",
            label: "Faster clearance",
            interpretation:
              "No copies of the effect allele A on the forward strand, so two copies of the faster valine form. Catechol estrogens and stress catecholamines tend to be methylated and cleared briskly, so estrogens move through the methylation step at a steady pace. Some people on this end feel calm under pressure but a little flat on baseline drive. Effect allele A, none carried here.",
          },
          {
            genotype: "GA",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele A, so a balanced pace between the faster and slower forms. Estrogen and catecholamine clearance through methylation tends to sit in a comfortable middle. Effect allele A.",
          },
          {
            genotype: "AA",
            label: "Slower clearance tendency",
            interpretation:
              "Two copies of the effect allele A, so two copies of the slower methionine form. Catechol estrogens and stress catecholamines tend to linger a little longer before they are methylated and cleared, which can raise sensitivity to stress and stimulants and place more demand on methyl donors and magnesium. This is a tendency, not a certainty, and it responds well to steady methyl support and stress care. Effect allele A.",
          },
        ],
      },
    ],
    biologicalRole:
      "COMT makes catechol-O-methyltransferase, the enzyme that attaches a methyl group to clear two related families of molecules: the stress catecholamines such as dopamine, norepinephrine, and epinephrine, and the catechol estrogens, meaning the two-hydroxy and four-hydroxy estrogen metabolites. It uses a methyl group from SAM and depends on magnesium as a cofactor.",
    functionalImpact:
      "Carriers of the effect allele A make a slower version of the enzyme, so catechol estrogens and stress catecholamines tend to be methylated a little less quickly and can circulate longer. In hormone terms this is the final tidying step of estrogen clearance, so a slower pace can leave the reactive estrogen metabolites lingering and raises the value of reliable methyl donors and magnesium. The faster valine form clears these briskly and can lower baseline catecholamine tone. The pace is a tendency that nutrition and stress habits shape, not a fixed outcome.",
    healthAssociations: [
      "Linked at a population level to how efficiently catechol estrogens and stress catecholamines are methylated and cleared, and to stress resilience, focus, and sensitivity to caffeine and stimulants. Because the slower form tends to clear these molecules less quickly, it is associated at a group level with estrogen metabolites lingering a little longer, which the HormoneIQ urine metabolites can show in practice. These are soft, group level associations of the methylation clearance step, not a personal verdict, and they tend to ease when methyl donors, magnesium, and stress care are well supported. Effect allele A is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Magnesium as a key cofactor for the methylation step this enzyme performs.",
      "Methyl donors such as active 5-MTHF and B12 to supply the methyl groups, introduced gently for slower clearing carriers rather than loaded.",
      "Cruciferous vegetables and fiber to support the upstream estrogen detox steps that hand off to this final methylation step.",
    ],
    cautions: [
      "This variant shapes a clearance pace, it does not set an outcome, so frame it as a lever for methyl support and stress care rather than a label.",
      "For slower clearing carriers, aggressive methyl donor supplementation can feel overstimulating, so start low and adjust to comfort.",
    ],
    dietLifestyle: [
      "Manage caffeine and stimulant load to your own tolerance, which matters more for slower clearing carriers.",
      "Keep regular stress regulation practices such as sleep, movement, and downtime, since these ease the catecholamine side of the pathway.",
      "Support estrogen clearance with cruciferous vegetables and steady fiber across the day.",
    ],
    interactions: [
      "COMT performs the final methylation step of estrogen detox, finishing the pathway that CYP1A1 and CYP1B1 begin, so a slower result here is best read alongside those genes and the HormoneIQ estrogen metabolites. It also competes with every other methylation reaction for methyl donors, which ties it closely to MTHFR and your wider folate and B12 picture.",
    ],
    protocolTieIn:
      "Via Cura sets methyl donor intensity and magnesium to your clearance pace, supporting the final estrogen methylation step where the HormoneIQ metabolites show it is needed, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track stress, focus, and where relevant your estrogen metabolites as part of your Bio Optimization picture.",
    laySummary: [
      "COMT runs the cleanup crew for two things: your stress chemicals like dopamine and adrenaline, and the leftover pieces of estrogen your body needs to clear. It does this by adding a tiny methyl tag. One common version of this gene makes a slower cleanup crew, so those molecules hang around a bit longer. The slower version is the A version on the standard reading direction we use here, and two copies are slower than one.",
      "If you carry it, you may feel a little more sensitive to stress and caffeine, and your body leans more on methyl nutrients and magnesium to finish clearing estrogen. The good news is this is very workable with steady methyl support, magnesium, plenty of cruciferous vegetables, and good stress care. So read an A result as a helpful pointer toward what supports your clearance, not a verdict about your hormones or your stress.",
    ],
  },

  cyp1a1: {
    aliases: ["CYP1A1*2C"],
    pathway: "Phase one estrogen hydroxylation toward the two-hydroxy route",
    keyVariants: [
      {
        rsid: "rs1048943",
        // Forward strand orientation. Reference allele is A, effect allele is G
        // (the Val462 form, also called the m2 or star two C variant). The G
        // allele encodes valine and a more active enzyme. Some assays report this
        // same call on the complementary strand with the opposite letters, and
        // some print it as Ile and Val rather than as bases, so reconcile to the
        // forward A/G frame and the effect allele G before reading the rows.
        name: "Ile462Val (m2), forward strand, effect allele G",
        genotypes: [
          {
            genotype: "AA",
            label: "Typical",
            interpretation:
              "No copies of the effect allele G on the forward strand, so two copies of the isoleucine form. Phase one estrogen hydroxylation through this enzyme runs at the typical pace, so estrogen routing toward the two-hydroxy pathway tends to sit at the population baseline. Effect allele G, none carried here.",
          },
          {
            genotype: "AG",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele G, so a mix of the isoleucine and valine forms. The activity of this hydroxylation step tends to run modestly higher, which can shift estrogen routing a little. The practical reading is to support steady downstream clearance, since this step hands its products on for finishing. Effect allele G.",
          },
          {
            genotype: "GG",
            label: "Higher activity tendency",
            interpretation:
              "Two copies of the effect allele G, so two copies of the more active valine form. This step of estrogen hydroxylation tends to run faster, so more estrogen is routed through the two-hydroxy pathway and handed on for clearance. Because this step makes products that still need finishing, the useful focus is reliable downstream methylation and antioxidant support. This is a tendency, not a certainty. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "CYP1A1 makes a cytochrome P450 enzyme that performs a phase one step in estrogen metabolism, adding a hydroxyl group that routes estrogen toward the two-hydroxy estrogen metabolites, the route generally regarded as the gentler of the estrogen detox pathways.",
    functionalImpact:
      "Carriers of the effect allele G tend to run this hydroxylation step a little faster. That can shift more estrogen into the two-hydroxy route, and because the products of this step still need finishing further down the line, a faster phase one step raises the value of steady downstream methylation and antioxidant support so the intermediates do not accumulate. The activity shift is a population level tendency that diet and the wider pathway shape, not a fixed outcome.",
    healthAssociations: [
      "Linked at a population level to how estrogen is routed through the two-hydroxy and four-hydroxy phase one pathways, and to the balance between them that the HormoneIQ estrogen metabolites measure. These are soft, group level associations of estrogen hydroxylation, not a personal verdict, and they are best read alongside the downstream clearance steps that finish the job. Effect allele G is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables and their indole compounds, which support balanced estrogen hydroxylation and routing.",
      "Antioxidant rich whole foods to buffer the reactive intermediates that phase one steps can generate.",
      "Steady methyl donor and magnesium support downstream, so the products of this step are finished and cleared smoothly.",
    ],
    cautions: [
      "This variant shapes a phase one routing step, it does not set an outcome, so read it as context for the whole estrogen pathway rather than a verdict.",
      "A faster phase one step is only helpful when the downstream finishing steps keep pace, so judge it alongside COMT and the four-hydroxy route rather than alone.",
    ],
    dietLifestyle: [
      "Include cruciferous vegetables such as broccoli, kale, and cabbage regularly to support balanced estrogen routing.",
      "Limit smoking and heavy charred food intake, which strongly induce this enzyme family.",
      "Keep a colorful, antioxidant rich diet to support safe handling of phase one intermediates.",
    ],
    interactions: [
      "CYP1A1 begins the phase one estrogen detox that CYP1B1 also acts on and that COMT finishes by methylation, so its routing is best read as one part of that sequence and alongside the HormoneIQ estrogen metabolites rather than on its own.",
    ],
    protocolTieIn:
      "Via Cura supports balanced estrogen routing with cruciferous derived and antioxidant nutrients, and pairs a faster phase one step with the downstream methyl and magnesium support that finishes clearance, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track your estrogen metabolite balance as part of your Bio Optimization picture.",
    laySummary: [
      "CYP1A1 handles an early step in clearing estrogen, nudging it toward the two-hydroxy route, which is generally seen as the gentler way to process estrogen. One common version of this gene runs that step a little faster. The faster version is the G version on the standard reading direction we use here, and two copies are faster than one.",
      "The thing to remember is that this early step makes pieces that still need finishing further down the line, so a faster start works best when the later cleanup steps keep up. Eating plenty of cruciferous vegetables, getting good antioxidants, and supporting your methylation nutrients all help. So read a G result as background about how you route estrogen, not a verdict about your hormones.",
    ],
  },

  cyp1b1: {
    aliases: [],
    pathway: "Phase one estrogen hydroxylation toward the four-hydroxy route",
    keyVariants: [
      {
        rsid: "rs1056836",
        // Forward strand orientation. Reference allele is C (encodes Leu432),
        // effect allele is G (encodes Val432, the more active four-hydroxy form).
        // Some assays report this same call on the complementary strand with the
        // opposite letters, and some print it as Leu and Val rather than as
        // bases, so reconcile to the forward C/G frame and the effect allele G
        // before reading the rows.
        name: "Leu432Val, forward strand, effect allele G",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele G on the forward strand, so two copies of the leucine form. Routing of estrogen through the four-hydroxy pathway via this enzyme tends to sit at the typical baseline, so the usual emphasis on steady downstream clearance applies without extra weighting. Effect allele G, none carried here.",
          },
          {
            genotype: "CG",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele G, so a mix of the leucine and valine forms. Activity toward the four-hydroxy route tends to run modestly higher. Because the four-hydroxy metabolites are the more reactive ones, the practical reading is to keep downstream methylation and antioxidant support reliable. Effect allele G.",
          },
          {
            genotype: "GG",
            label: "Higher four-hydroxy routing tendency",
            interpretation:
              "Two copies of the effect allele G, so two copies of the more active valine form. This enzyme tends to route more estrogen through the four-hydroxy pathway, and because those metabolites are more reactive and need careful finishing, steady methylation, antioxidant, and cruciferous support tend to matter most here. This is a tendency, not a certainty, and it is well supported by the right nutrients. Effect allele G.",
          },
        ],
      },
    ],
    biologicalRole:
      "CYP1B1 makes a cytochrome P450 enzyme that performs a phase one step in estrogen metabolism, adding a hydroxyl group that routes estrogen toward the four-hydroxy estrogen metabolites, the more reactive of the estrogen detox products, which need careful downstream clearance.",
    functionalImpact:
      "Carriers of the effect allele G tend to run this step a little faster, routing more estrogen through the four-hydroxy pathway. Because those four-hydroxy metabolites are the more reactive ones, a faster step here raises the value of reliable downstream methylation through COMT and steady antioxidant support, so the reactive intermediates are finished and cleared rather than lingering. This is a population level tendency that the wider pathway and nutrition shape, not a fixed outcome.",
    healthAssociations: [
      "Linked at a population level to how much estrogen is routed through the more reactive four-hydroxy pathway and to the two-hydroxy to four-hydroxy balance that the HormoneIQ estrogen metabolites measure. These are soft, group level associations of estrogen hydroxylation, not a personal verdict, and they are best read alongside the downstream methylation and antioxidant steps that finish the job. Effect allele G is the allele these associations track.",
    ],
    nutrientStrategy: [
      "Cruciferous vegetables and their indole compounds to support balanced estrogen routing and a favorable metabolite balance.",
      "Antioxidant rich whole foods, since the four-hydroxy metabolites this step makes are the more reactive ones.",
      "Reliable methyl donor and magnesium support downstream, so the reactive intermediates are methylated and cleared promptly.",
    ],
    cautions: [
      "This variant shapes a phase one routing step toward the more reactive metabolites, it does not set an outcome, so read it as a reason to keep downstream clearance reliable rather than a verdict.",
      "A faster step here matters most when downstream methylation lags, so it is best weighted alongside a slower COMT result rather than read alone.",
    ],
    dietLifestyle: [
      "Include cruciferous vegetables such as broccoli, kale, and cabbage regularly to support a favorable estrogen metabolite balance.",
      "Limit smoking and heavily charred foods, which induce this enzyme family.",
      "Keep a colorful, antioxidant rich diet and steady fiber to support safe handling and clearance of reactive intermediates.",
    ],
    interactions: [
      "CYP1B1 routes estrogen toward the reactive four-hydroxy metabolites that COMT then methylates and clears, so a faster result here is best read together with COMT and the CYP1A1 two-hydroxy route, and confirmed against the HormoneIQ estrogen metabolites.",
    ],
    protocolTieIn:
      "Via Cura pairs a faster four-hydroxy routing tendency with the downstream methyl, magnesium, and antioxidant support that finishes clearance of the reactive metabolites, alongside cruciferous derived nutrients, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track your estrogen metabolite balance as part of your Bio Optimization picture.",
    laySummary: [
      "CYP1B1 handles an estrogen clearing step that sends estrogen down the four-hydroxy route, which makes the more reactive leftovers that need careful cleanup. One common version of this gene runs that step a little faster. The faster version is the G version on the standard reading direction we use here, and two copies are faster than one.",
      "If you carry it, the helpful focus is making sure the cleanup steps further down the line keep pace, since those four-hydroxy pieces are the reactive ones. Plenty of cruciferous vegetables, good antioxidants, and steady methylation nutrients all support that. So read a G result as a reason to keep your downstream estrogen clearance well supported, not a verdict about your hormones.",
    ],
  },

  cyp19a1: {
    aliases: ["aromatase", "CYP19"],
    pathway: "Androgen to estrogen conversion, the estrogen to androgen balance",
    keyVariants: [
      {
        rsid: "rs10046",
        // Forward strand orientation. Reference allele is C, effect allele is T,
        // in the three prime untranslated region of the aromatase gene. At a
        // population level the T leaning genotypes tend to track modestly higher
        // estrogen and the CC genotype lower estradiol, but the effect is small
        // and population level only. Some assays report this same call on the
        // complementary strand with the opposite letters, so reconcile to the
        // forward C/T frame and the effect allele T before reading the rows.
        name: "Three prime UTR variant, forward strand, effect allele T",
        genotypes: [
          {
            genotype: "CC",
            label: "Typical",
            interpretation:
              "No copies of the effect allele T on the forward strand. Aromatase activity, meaning the conversion of androgens into estrogens, tends to sit at the population baseline, and this genotype is associated at a group level with slightly lower estradiol. This is a soft signal, not a personal verdict. Effect allele T, none carried here.",
          },
          {
            genotype: "CT",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele T. A middle reading for the androgen to estrogen conversion this enzyme performs, with the small population level signal sitting between the two homozygous genotypes. Effect allele T.",
          },
          {
            genotype: "TT",
            label: "Higher conversion tendency",
            interpretation:
              "Two copies of the effect allele T. Associated at a population level with modestly higher aromatase related estrogen, meaning a small tilt toward converting more androgen into estrogen. The effect is small and easily outweighed by body composition, activity, and overall health, so read it as gentle context for your estrogen to androgen balance, not a personal verdict. Effect allele T.",
          },
        ],
      },
    ],
    biologicalRole:
      "CYP19A1 makes aromatase, the enzyme that converts androgens such as testosterone into estrogens. It sits at the hinge of the estrogen to androgen balance, since how actively it runs helps set how much of the androgen pool is turned into estrogen.",
    functionalImpact:
      "Variants here are associated at a population level with small differences in aromatase related estrogen, so carriers of the effect allele T tend to sit with a modest tilt toward more androgen to estrogen conversion. The per copy effect is small and sits well within everyday influence from body composition and activity, since adipose tissue is itself a major site of aromatase. It is best read as gentle context for the estrogen to androgen balance shown by HormoneIQ rather than a meaningful change on its own.",
    healthAssociations: [
      "Linked at a population level to small differences in estrogen relative to androgen and to the estrogen to androgen balance the HormoneIQ metabolites measure. These are soft, group level associations of aromatase activity, not a personal verdict, and they tend to be far outweighed by body composition, activity, and overall metabolic health. Effect allele T is the allele these associations track.",
    ],
    nutrientStrategy: [
      "A body composition supporting, fiber forward whole food pattern, since adipose tissue is a major site of aromatase activity.",
      "Adequate zinc and broader mineral status from whole foods, which support balanced hormone metabolism.",
      "Cruciferous vegetables and steady fiber to support healthy estrogen clearance once estrogen is made.",
    ],
    cautions: [
      "This variant carries a small, population level signal, so frame it as gentle context for your estrogen to androgen balance rather than a diagnosis.",
      "Body composition and activity influence aromatase far more than this genotype, so the lever is lifestyle rather than the variant alone.",
    ],
    dietLifestyle: [
      "Favor a body composition supporting pattern with regular movement and resistance work, which influences aromatase through adipose tissue.",
      "Keep alcohol modest, since it can affect hormone metabolism and clearance.",
      "Build meals around whole foods, fiber, and a varied mineral intake.",
    ],
    interactions: [
      "CYP19A1 sets how much estrogen is made from androgens, which then feeds the estrogen detox genes CYP1A1, CYP1B1, and COMT that clear it, so it is best read as the upstream production side alongside those clearance genes and the full HormoneIQ picture.",
    ],
    protocolTieIn:
      "Via Cura supports a healthy estrogen to androgen balance through body composition, activity, and clearance supportive nutrition, delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track your estrogen and androgen metabolites together as part of your Bio Optimization picture.",
    laySummary: [
      "CYP19A1 makes aromatase, the enzyme that turns androgens like testosterone into estrogens. It sits right at the balance point between your androgens and estrogens, since how busy it is helps decide how much testosterone becomes estrogen. Different versions of this gene are tied to very small differences in that conversion.",
      "The honest framing is that the genetic effect is small and easily outweighed by everyday things, especially body fat, since fat tissue is itself a big site of this enzyme. Staying active, supporting a healthy body composition, and eating well matter far more. So read your result as gentle context for your hormone balance, not a verdict about your estrogen or testosterone.",
    ],
  },

  srd5a2: {
    aliases: ["5-alpha reductase type 2"],
    pathway: "Testosterone to DHT conversion, androgen activity",
    keyVariants: [
      {
        rsid: "rs523349",
        // Forward strand orientation. Reference allele is G (encodes Val89, the
        // higher activity form), effect allele is C (encodes Leu89, associated
        // with lower 5-alpha reductase activity). Some assays report this same
        // call on the complementary strand with the opposite letters, and some
        // print it as Val and Leu rather than as bases, so reconcile to the
        // forward G/C frame and the effect allele C before reading the rows.
        name: "Val89Leu (V89L), forward strand, effect allele C",
        genotypes: [
          {
            genotype: "GG",
            label: "Typical",
            interpretation:
              "No copies of the effect allele C on the forward strand, so two copies of the valine form. Conversion of testosterone into the stronger androgen DHT through this enzyme tends to run at the typical pace, so androgen activity sits at the population baseline. Effect allele C, none carried here.",
          },
          {
            genotype: "GC",
            label: "Intermediate",
            interpretation:
              "One copy of the effect allele C, so a mix of the valine and leucine forms. The conversion of testosterone toward DHT tends to run somewhat lower, a middle reading for this androgen activating step. Effect allele C.",
          },
          {
            genotype: "CC",
            label: "Lower conversion tendency",
            interpretation:
              "Two copies of the effect allele C, so two copies of the leucine form. Conversion of testosterone into the stronger androgen DHT tends to run lower at a population level, which can mean a softer DHT signal relative to total testosterone. This is a tendency, not a certainty, and it is best read as context for the androgen metabolites HormoneIQ measures. Effect allele C.",
          },
        ],
      },
    ],
    biologicalRole:
      "SRD5A2 makes 5-alpha reductase type two, the enzyme that converts testosterone into dihydrotestosterone, or DHT, the more potent androgen that drives much of the androgen signal in tissues such as the skin, scalp, and prostate.",
    functionalImpact:
      "Carriers of the effect allele C tend to run this conversion step a little less actively, so the balance can tilt toward somewhat less DHT relative to total testosterone. Because DHT is the stronger androgen, the practical reading is context for androgen driven patterns rather than a change in total testosterone itself. The effect is a population level tendency that overall hormone status and health shape, not a fixed outcome.",
    healthAssociations: [
      "Linked at a population level to how much testosterone is converted into the stronger androgen DHT and to the androgen activity the HormoneIQ metabolites measure. These are soft, group level associations of this conversion step, not a personal verdict, and they are best read alongside total testosterone and the wider androgen picture. Effect allele C is the allele the lower conversion reading tracks.",
    ],
    nutrientStrategy: [
      "A whole food, fiber forward pattern with adequate zinc, which supports balanced androgen metabolism.",
      "Body composition and metabolic support through nutrition, since these shape the broader hormone backdrop.",
      "Nutrients read in the context of your full androgen metabolite picture rather than this variant alone.",
    ],
    cautions: [
      "This variant shapes a conversion pace, it does not set an outcome, so frame it as context for your androgen metabolites rather than a diagnosis.",
      "It influences DHT relative to testosterone, not total testosterone itself, so read the two together rather than reading this variant in isolation.",
    ],
    dietLifestyle: [
      "Favor a whole food, fiber forward pattern with regular movement and resistance work, which supports healthy androgen status.",
      "Keep adequate zinc and a varied mineral intake from whole foods.",
      "Support body composition and metabolic health, which shape the broader hormone picture.",
    ],
    interactions: [
      "SRD5A2 sets how much testosterone becomes the stronger androgen DHT, which sits on the androgen side of the balance that CYP19A1 sends toward estrogen, so it is best read together with aromatase and the full HormoneIQ androgen and estrogen metabolite picture.",
    ],
    protocolTieIn:
      "Via Cura supports balanced androgen status through whole food nutrition, body composition, and activity, reading this conversion step in the context of your full androgen picture, with supporting nutrients delivered through the micellar and liposomal dual delivery system for Maximum Bioavailability. Track your androgen metabolites as part of your Bio Optimization picture.",
    laySummary: [
      "SRD5A2 makes the enzyme that turns testosterone into DHT, a stronger androgen that drives a lot of the androgen activity in places like skin, scalp, and prostate. One common version of this gene runs that conversion a little less actively. The lower conversion version is the C version on the standard reading direction we use here, and two copies have a stronger effect than one.",
      "If you carry it, you may simply make a bit less DHT relative to your total testosterone, which is best understood alongside your other androgen readings rather than on its own. It is context, not a problem. So read a C result as helpful background about your androgen balance, not a verdict about your testosterone.",
    ],
  },
};
