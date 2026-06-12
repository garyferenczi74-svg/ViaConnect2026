// Prompt 193 (2026-06-12): GENEX360 per panel description card copy for the
// /shop/genex360 Your DNA section. Every marker description is transcribed
// verbatim from the prompt Section 7. Do not paraphrase or invent biology.
//
// Standing rules honored: no em or en dashes anywhere; Via Cura is the only
// consumer brand here and the legal manufacturing entity is never named on
// this surface; bioavailability copy is locked at "10x to 28x"; the score is
// named "Bio Optimization"; peptides are educational and practitioner facing only.
//
// markerCount on each panel is the real number of marker entries in its groups
// and must match markerCountLabel.

import type { Panel, PanelSlug } from "./types";

export const GENEX360_PANELS: Panel[] = [
  {
    slug: "genex-m",
    pillLabel: "GeneX-M",
    displayName: "GeneX-M",
    subtitle: "Genetic Methylation and Detox Profile",
    tagline: "Your methylation and detox blueprint, decoded.",
    panelType: "snp",
    markerCount: 20,
    markerCountLabel: "20 SNPs",
    overview:
      "GeneX-M analyzes 20 of the most clinically relevant single nucleotide polymorphisms across the methylation, detoxification, neurotransmitter, and nutrient transport pathways. These variants shape how efficiently your body produces methyl donors, clears toxins, balances mood chemistry, and absorbs key vitamins. Knowing your pattern lets Via Cura match active, methylated nutrient forms to your genetics rather than relying on trial and error.",
    groups: [
      {
        groupTitle: "Methylation Pathway Efficiency",
        markers: [
          {
            symbol: "MTHFR",
            fullName: "Methylenetetrahydrofolate reductase",
            description:
              "Converts dietary folate into 5-MTHF, the active methyl donor your body uses to recycle homocysteine into methionine. The common C677T and A1298C variants reduce enzyme activity, with C677T homozygotes retaining roughly thirty percent of normal function. Reduced activity can raise homocysteine and lower overall methylation capacity, which is linked to fatigue, mood changes, and cardiovascular strain. This is the single strongest reason to use methylfolate rather than synthetic folic acid.",
          },
          {
            symbol: "MTR",
            fullName: "Methionine synthase",
            description:
              "Uses active B12 to remethylate homocysteine back into methionine, regenerating the methyl groups your cells depend on. Variants such as A2756G alter how efficiently this step runs. Slower activity can elevate homocysteine and increase your functional demand for B12.",
          },
          {
            symbol: "MTRR",
            fullName: "Methionine synthase reductase",
            description:
              "Keeps B12 in its usable methylcobalamin form so MTR can keep working. The A66G variant reduces this recycling capacity and compounds any MTR or B12 limitation, pushing methylation output lower and homocysteine higher.",
          },
          {
            symbol: "BHMT",
            fullName: "Betaine homocysteine methyltransferase",
            description:
              "Runs the backup remethylation route that uses betaine, also called trimethylglycine, as the methyl donor in the liver and kidney. Reduced function leaves you more dependent on the folate and B12 pathway. Betaine and choline rich support can help this pathway carry more load.",
          },
          {
            symbol: "SHMT1",
            fullName: "Serine hydroxymethyltransferase",
            description:
              "Decides how the folate pool is split between DNA synthesis and methylation by moving carbon units between serine and glycine. Variants can shift folate toward DNA building and away from methylation, subtly lowering methyl donor availability.",
          },
          {
            symbol: "AHCY",
            fullName: "S-adenosylhomocysteine hydrolase",
            description:
              "Clears S-adenosylhomocysteine, which is a direct brake on nearly every methylation reaction in the body. Reduced activity raises this inhibitor and lowers your methylation ratio, broadly slowing methyl dependent processes from detox to neurotransmitter balance.",
          },
        ],
      },
      {
        groupTitle: "Neurotransmitter Balance and Mental Resilience",
        markers: [
          {
            symbol: "COMT",
            fullName: "Catechol-O-methyltransferase",
            description:
              "Breaks down dopamine, norepinephrine, epinephrine, and catechol estrogens using a methyl group and magnesium. The Val158Met variant sets your pace: slow versions hold dopamine longer and can heighten focus but also rumination, stimulant sensitivity, and slower estrogen clearance, while fast versions clear catecholamines quickly and favor stress resilience but lower baseline dopamine. This is central to how you handle stress, mood, and estrogen detox.",
          },
          {
            symbol: "MAOA",
            fullName: "Monoamine oxidase A",
            description:
              "Degrades serotonin, norepinephrine, and dopamine, governing how quickly these signals are turned over. High activity and low activity variants shift the balance and can influence mood stability, motivation, and anxiety tendencies.",
          },
          {
            symbol: "VDR",
            fullName: "Vitamin D receptor",
            description:
              "Translates vitamin D into action across immune function, bone, mood, and methylation cofactor regulation. Variants such as Taq1, Bsm1, and Fok1 change receptor sensitivity and can raise your effective vitamin D requirement.",
          },
          {
            symbol: "NOS3",
            fullName: "Nitric oxide synthase",
            description:
              "Produces nitric oxide for healthy blood flow and shares the BH4 cofactor used in neurotransmitter synthesis. Variants can lower nitric oxide output, affecting circulation, oxidative stress, and the demand placed on BH4.",
          },
          {
            symbol: "DAO",
            fullName: "Diamine oxidase",
            description:
              "Breaks down histamine from food at the gut lining. Reduced activity leads to histamine intolerance, where histamine rich foods can trigger flushing, headaches, congestion, hives, or digestive upset.",
          },
        ],
      },
      {
        groupTitle: "Detoxification and Antioxidant Defense",
        markers: [
          {
            symbol: "CBS",
            fullName: "Cystathionine beta-synthase",
            description:
              "Routes homocysteine into the transsulfuration pathway toward cysteine, glutathione, and sulfate, using B6. Faster acting variants can pull substrate away from methylation and increase sulfur and ammonia load, so pacing sulfur intake and supporting downstream clearance matters.",
          },
          {
            symbol: "GST",
            fullName: "Glutathione S-transferases, including GSTM1, GSTP1, and GSTT1",
            description:
              "Attach glutathione to toxins so they can be excreted, a core Phase II detox step. Deletion genotypes such as GSTM1 null or GSTT1 null reduce your capacity to clear heavy metals, pollutants, and oxidative byproducts, raising the value of glutathione and antioxidant support.",
          },
          {
            symbol: "SOD2",
            fullName: "Superoxide dismutase 2",
            description:
              "First line mitochondrial antioxidant that converts superoxide radicals into hydrogen peroxide for further clearance. The A16V variant alters how well the enzyme reaches the mitochondria, influencing your resilience to oxidative stress.",
          },
          {
            symbol: "SUOX",
            fullName: "Sulfite oxidase",
            description:
              "Converts toxic sulfite into safe sulfate and depends on molybdenum. Reduced function can cause sensitivity to sulfites in wine and dried fruit and to high sulfur foods, sometimes with headaches.",
          },
          {
            symbol: "NAT2",
            fullName: "N-acetyltransferase 2",
            description:
              "Acetylates certain drugs and dietary carcinogens for clearance. Slow acetylator variants change how you process these compounds and can increase your toxic burden from grilled or processed foods.",
          },
        ],
      },
      {
        groupTitle: "Nutrient Absorption and Transport",
        markers: [
          {
            symbol: "TCN2",
            fullName: "Transcobalamin 2",
            description:
              "Carries B12 from blood into your cells. The C776G variant reduces cellular delivery, which can create a functional B12 shortfall and elevated homocysteine even when blood B12 looks normal.",
          },
          {
            symbol: "RFC1",
            fullName: "Reduced folate carrier, also called SLC19A1",
            description:
              "Transports folate into cells. The G80A variant affects intracellular folate levels and how much active methylfolate reaches your methylation machinery.",
          },
          {
            symbol: "ACAT1",
            fullName: "Acetyl-CoA acetyltransferase",
            description:
              "Supports mitochondrial energy metabolism and the handling of ketones, fatty acids, and certain amino acids, and connects to B12 recycling. Variants can subtly raise your cofactor demand and affect cellular energy.",
          },
          {
            symbol: "ADO",
            fullName: "Cysteamine dioxygenase",
            description:
              "Participates in sulfur and taurine metabolism by oxidizing cysteamine toward hypotaurine and taurine, and contributes to cellular oxygen sensing. Variants can shift your sulfur balance and taurine availability, which supports antioxidant and calming pathways.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "Your personal methylation capacity and any genetic tendency toward poor detox, inflammation, or neurotransmitter imbalance.",
      "How your neurotransmitter genes shape mood, focus, stress response, and histamine tolerance.",
      "Which active nutrient forms, such as methylated B vitamins, antioxidants, and adaptogens, can bypass your specific genetic bottlenecks.",
      "Lifestyle and dietary strategies matched to your genomic blueprint.",
    ],
    collection: [
      "Easy at home saliva collection kit.",
      "Secure DNA processing and analysis.",
      "Personalized report with marker by marker insights.",
      "Optional one to one consultation with a Via Cura precision wellness advisor.",
      "Direct integration with your Via Cura custom protocol.",
    ],
    protocolTieIn:
      "GeneX-M results feed directly into your Via Cura protocol. Where your variants slow a pathway, the protocol selects active, methylated nutrient forms delivered through the proprietary micellar and liposomal dual delivery system for 10x to 28x absorption, so the right cofactors actually reach the cells that need them. These genetic insights are also a foundational input to your Bio Optimization framework.",
  },
  {
    slug: "nutrigen-dx",
    pillLabel: "NutriGen-DX",
    displayName: "NutriGen-DX",
    subtitle: "Functional Nutrition and Absorption Assessment",
    tagline: "Eat and supplement in agreement with your DNA.",
    panelType: "snp",
    markerCount: 27,
    markerCountLabel: "27 nutrition related markers",
    overview:
      "NutriGen-DX decodes how your genes affect the absorption, metabolism, and use of essential nutrients and macronutrients. It identifies where you may run low despite adequate intake, how you handle fats and carbohydrates, your antioxidant and inflammatory tendencies, and your likely food sensitivities. The result is a nutrition and supplement plan aligned to your biology rather than generic guidelines.",
    groups: [
      {
        groupTitle: "Vitamin and Mineral Metabolism",
        markers: [
          {
            symbol: "MTHFR",
            fullName: "Methylenetetrahydrofolate reductase",
            description:
              "Controls activation of dietary folate into its usable form. Reduced activity variants raise your need for methylfolate and active B vitamins to maintain energy, methylation, and homocysteine balance.",
          },
          {
            symbol: "FADS1",
            fullName: "Fatty acid desaturase 1",
            description:
              "Converts plant omega-3 and omega-6 fats into the long chain forms EPA, DHA, and arachidonic acid. Slower variants mean plant sources alone may not deliver enough EPA and DHA, raising the value of fish or algae based omega-3.",
          },
          {
            symbol: "TCN2",
            fullName: "Transcobalamin 2",
            description:
              "Delivers B12 into your cells. Variants can leave cells short on B12 even with adequate intake, affecting energy, nerve health, and methylation.",
          },
          {
            symbol: "VDR",
            fullName: "Vitamin D receptor",
            description:
              "Sets how responsive your tissues are to vitamin D. Less sensitive variants can mean you need higher vitamin D status to get the same immune, bone, and mood benefit.",
          },
          {
            symbol: "SLC23A1",
            fullName: "Sodium dependent vitamin C transporter",
            description:
              "Governs how well you absorb vitamin C from the gut. Variants can lower circulating vitamin C and increase your dietary and supplemental requirement.",
          },
          {
            symbol: "SLC30A8",
            fullName: "Zinc transporter ZnT8",
            description:
              "Manages zinc handling, including in the cells that regulate insulin. Variants affect zinc status and can influence glucose control.",
          },
          {
            symbol: "FUT2",
            fullName: "Fucosyltransferase 2, your secretor status",
            description:
              "Determines whether you secrete blood group antigens into the gut, which shapes your microbiome and B12 status. Non secretor variants are linked to a different microbial profile and altered response to certain probiotics.",
          },
          {
            symbol: "GC",
            fullName: "Vitamin D binding protein",
            description:
              "Transports vitamin D through the blood. Variants affect your circulating 25-OH vitamin D level and how strongly you respond to supplementation.",
          },
          {
            symbol: "PEMT",
            fullName: "Phosphatidylethanolamine N-methyltransferase",
            description:
              "Produces choline and phosphatidylcholine internally, a pathway that depends on estrogen. Variants raise your dietary choline requirement, which matters for liver fat, membranes, and methylation, especially after menopause.",
          },
        ],
      },
      {
        groupTitle: "Macronutrient Processing and Sensitivities",
        markers: [
          {
            symbol: "APOA2",
            fullName: "Apolipoprotein A2",
            description:
              "Influences your sensitivity to saturated fat. Certain variants are associated with greater weight gain on high saturated fat intake, guiding saturated fat moderation.",
          },
          {
            symbol: "FTO",
            fullName: "Fat mass and obesity associated gene",
            description:
              "Variants are linked to higher appetite, calorie intake, and body weight, and tend to respond well to higher protein intake and regular activity.",
          },
          {
            symbol: "AMY1",
            fullName: "Salivary amylase, by copy number",
            description:
              "Sets your capacity to digest starch. Low copy number is linked to a higher glycemic response to starchy foods, guiding carbohydrate quality and portioning.",
          },
          {
            symbol: "LIPC",
            fullName: "Hepatic lipase",
            description:
              "Affects HDL cholesterol and lipid handling. Variants change how your lipids respond to dietary fat composition.",
          },
          {
            symbol: "TCF7L2",
            fullName: "Transcription factor 7 like 2",
            description:
              "The strongest common variant linked to type 2 diabetes risk through effects on insulin secretion. Carriers generally benefit from a lower glycemic load and higher fiber pattern.",
          },
        ],
      },
      {
        groupTitle: "Antioxidant and Inflammatory Response",
        markers: [
          {
            symbol: "SOD2",
            fullName: "Superoxide dismutase 2",
            description:
              "Drives mitochondrial antioxidant defense. Variants can reduce your buffering of oxidative stress, increasing the value of targeted antioxidant support.",
          },
          {
            symbol: "GPX1",
            fullName: "Glutathione peroxidase 1",
            description:
              "A selenium dependent enzyme that clears peroxides. Variants lower antioxidant capacity and make adequate selenium status more important.",
          },
          {
            symbol: "IL6",
            fullName: "Interleukin 6",
            description:
              "A signaling molecule that sets inflammatory tone. Variants can raise baseline inflammation and influence how strongly you respond to an anti inflammatory diet and omega-3.",
          },
          {
            symbol: "TNF",
            fullName: "Tumor necrosis factor",
            description:
              "A central inflammatory signal. Variants can increase inflammatory signaling, which is relevant to anti inflammatory nutrition choices.",
          },
          {
            symbol: "GSTM1",
            fullName: "Glutathione S-transferase Mu 1",
            description:
              "Conjugates toxins for clearance. A null genotype removes this enzyme and reduces detox capacity for several pollutants and oxidative byproducts.",
          },
          {
            symbol: "GSTT1",
            fullName: "Glutathione S-transferase Theta 1",
            description:
              "Works alongside GSTM1 in toxin clearance. A null genotype lowers your handling of specific environmental compounds.",
          },
          {
            symbol: "CAT",
            fullName: "Catalase",
            description:
              "Breaks hydrogen peroxide down into water and oxygen. Lower activity variants raise oxidative burden and the demand on the rest of your antioxidant network.",
          },
        ],
      },
      {
        groupTitle: "Food Intolerances and Sensitivities",
        markers: [
          {
            symbol: "MCM6",
            fullName: "Controls lactase persistence at the LCT gene",
            description:
              "Determines whether you keep producing lactase into adulthood. Non persistence variants underlie lactose intolerance and dairy related digestive symptoms.",
          },
          {
            symbol: "HLA-DQ2 and HLA-DQ8",
            fullName: "Human leukocyte antigen types",
            description:
              "Define genetic susceptibility to celiac disease and gluten sensitivity. These variants are necessary but not sufficient for celiac, and their absence makes celiac highly unlikely.",
          },
          {
            symbol: "AHR",
            fullName: "Aryl hydrocarbon receptor",
            description:
              "Senses dietary and environmental compounds including caffeine, cruciferous indoles, and pollutants, and works with caffeine metabolizing enzymes. Variants influence how you process caffeine and aromatic compounds.",
          },
          {
            symbol: "DAO",
            fullName: "Diamine oxidase",
            description:
              "Clears dietary histamine in the gut. Reduced activity can cause histamine intolerance, with reactions to aged, fermented, and leftover foods.",
          },
        ],
      },
      {
        groupTitle: "Nutrient Transport and Detox Support",
        markers: [
          {
            symbol: "NAT2",
            fullName: "N-acetyltransferase 2",
            description:
              "Acetylates certain dietary carcinogens and drugs. Slow acetylator variants change clearance of compounds formed in grilled and processed foods.",
          },
          {
            symbol: "ABCG2",
            fullName: "ATP binding cassette transporter G2",
            description:
              "Moves urate and many compounds out of cells. Variants raise uric acid, increasing gout tendency, and also affect handling of riboflavin and various dietary compounds.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "How your body responds to vitamins, minerals, fats, carbohydrates, and proteins based on your genes.",
      "Where to eat more, reduce, or avoid for your specific profile.",
      "Personalized supplement suggestions that support absorption and metabolic function.",
      "Genetic tendencies tied to inflammation, fatigue, and food sensitivity.",
    ],
    collection: [
      "Simple at home saliva collection kit.",
      "Secure DNA sequencing and analysis.",
      "Comprehensive nutrition report with an action plan.",
      "Optional consultation with a Via Cura wellness advisor.",
      "Seamless integration with your custom vitamin formulations.",
    ],
    protocolTieIn:
      "NutriGen-DX turns your nutrition genetics into a concrete plan. Your Via Cura protocol adjusts nutrient forms, doses, and food guidance to your absorption and metabolism profile, and routes priority nutrients through the dual delivery system for 10x to 28x absorption. Your nutrition genetics feed the Bio Optimization framework so progress is measurable over time.",
  },
  {
    slug: "hormone-iq",
    pillLabel: "HormoneIQ",
    displayName: "HormoneIQ",
    subtitle: "Comprehensive Hormone and Adrenal Mapping",
    tagline: "See not just your hormone levels, but how you make and clear them.",
    panelType: "biomarker",
    markerCount: 29,
    markerCountLabel: "29 hormone, metabolite, and genetic markers",
    overview:
      "HormoneIQ is an at home dried urine assessment that maps your full hormone picture, including adrenal rhythm, sex hormone metabolites, estrogen detox pathways, melatonin, and neurotransmitter metabolites. Unlike a single blood draw, it shows hormone production and clearance across the day, which reveals the root patterns behind fatigue, mood, sleep, and hormonal symptoms. Paired with the estrogen and hormone metabolism genes below, it connects what your body is doing to why.",
    groups: [
      {
        groupTitle: "Adrenal Function and Stress Response",
        markers: [
          {
            symbol: "Cortisol (free, diurnal)",
            fullName: "Free cortisol across the day",
            description:
              "Tracks your stress hormone rhythm from morning to evening. A flattened, elevated, or blunted curve points to HPA axis strain, burnout, or dysregulated stress recovery and guides adaptogen and lifestyle support.",
          },
          {
            symbol: "Cortisone",
            fullName: "Inactive cortisol partner",
            description:
              "Shown alongside cortisol to reveal how your body activates and deactivates the hormone, clarifying whether a cortisol reading reflects production or conversion.",
          },
          {
            symbol: "DHEA and DHEA-S",
            fullName: "Adrenal androgen reserve",
            description:
              "Reflects adrenal resilience and the raw material for downstream hormones. Low levels often accompany chronic stress and aging, while patterns here inform recovery strategy.",
          },
          {
            symbol: "Cortisol Awakening Response",
            fullName: "The rise in cortisol after waking",
            description:
              "A sensitive marker of HPA axis health. A weak or exaggerated response is linked to fatigue, poor stress tolerance, and disrupted energy across the day.",
          },
        ],
      },
      {
        groupTitle: "Sex Hormone Metabolites",
        markers: [
          {
            symbol: "Estrone, E1",
            fullName: "A primary circulating estrogen",
            description:
              "Becomes more dominant after menopause and feeds the estrogen metabolite pathways. Its level and routing influence symptoms and long term estrogen balance.",
          },
          {
            symbol: "Estradiol, E2",
            fullName: "The most active estrogen",
            description:
              "Drives reproductive, bone, mood, and skin effects. Excess or deficiency relative to progesterone shapes cycle symptoms, menopause experience, and overall balance.",
          },
          {
            symbol: "Estriol, E3",
            fullName: "A gentler estrogen",
            description:
              "Offers a fuller view of estrogen status and balance across the estrogen family.",
          },
          {
            symbol: "Progesterone metabolites",
            fullName: "Pregnanediol readouts",
            description:
              "Reflect progesterone production and its calming, cycle regulating, and sleep supporting effects. The estrogen to progesterone relationship is often more telling than either alone.",
          },
          {
            symbol: "Testosterone",
            fullName: "Primary androgen",
            description:
              "Supports libido, muscle, motivation, and energy in all genders. Imbalances connect to mood, body composition, and conditions such as PCOS and andropause.",
          },
          {
            symbol: "DHT",
            fullName: "Dihydrotestosterone",
            description:
              "A potent androgen made from testosterone by 5-alpha reductase. Elevated conversion is associated with hair, skin, and prostate related effects.",
          },
          {
            symbol: "Androstenedione",
            fullName: "Androgen precursor",
            description:
              "Sits upstream of testosterone and estrogen and helps locate where an imbalance originates.",
          },
          {
            symbol: "Androsterone and Etiocholanolone",
            fullName: "Downstream androgen metabolites",
            description:
              "Show how you route androgens through their breakdown pathways, adding detail to androgen status and 5-alpha activity.",
          },
        ],
      },
      {
        groupTitle: "Estrogen Detoxification Pathways",
        markers: [
          {
            symbol: "2-OH estrogen",
            fullName: "The protective hydroxylation route",
            description:
              "A higher share through this pathway is generally favorable for long term estrogen balance.",
          },
          {
            symbol: "4-OH estrogen",
            fullName: "The pathway that needs careful clearance",
            description:
              "These metabolites require efficient methylation and conjugation to be cleared safely, making this reading important for estrogen detox strategy.",
          },
          {
            symbol: "16-OH estrogen",
            fullName: "The more proliferative route",
            description:
              "A higher share here shifts the overall estrogen balance and is interpreted alongside symptoms and the other pathways.",
          },
          {
            symbol: "2-methoxy estrogen",
            fullName: "The methylated, deactivated form",
            description:
              "Shows how well COMT is finishing estrogen clearance through methylation, which depends on methyl donors and magnesium.",
          },
        ],
      },
      {
        groupTitle: "Melatonin and Circadian Rhythm",
        markers: [
          {
            symbol: "6-OH melatonin sulfate",
            fullName: "Melatonin output marker",
            description:
              "Reflects your melatonin production and circadian timing, supporting strategies for sleep quality, shift work recovery, and mood.",
          },
        ],
      },
      {
        groupTitle: "Neurotransmitter Metabolites",
        markers: [
          {
            symbol: "HVA",
            fullName: "Homovanillic acid",
            description:
              "A breakdown product of dopamine that gives insight into dopamine activity relevant to motivation, focus, and drive.",
          },
          {
            symbol: "VMA",
            fullName: "Vanillylmandelic acid",
            description:
              "A breakdown product of norepinephrine and epinephrine reflecting your adrenergic and stress signaling.",
          },
          {
            symbol: "5-HIAA",
            fullName: "5-hydroxyindoleacetic acid",
            description:
              "A serotonin breakdown product that offers a window into serotonin activity relevant to mood and calm.",
          },
        ],
      },
      {
        groupTitle: "Supporting Genetic Markers for Hormone Metabolism",
        markers: [
          {
            symbol: "COMT",
            fullName: "Catechol-O-methyltransferase",
            description:
              "Methylates and clears catechol estrogens and stress catecholamines. Slow variants can leave estrogens and stress chemistry lingering, which the HormoneIQ metabolites confirm in practice.",
          },
          {
            symbol: "CYP1A1",
            fullName: "Cytochrome P450 1A1",
            description:
              "Drives estrogen hydroxylation toward the protective 2-OH pathway. Variants shift your estrogen routing.",
          },
          {
            symbol: "CYP1B1",
            fullName: "Cytochrome P450 1B1",
            description:
              "Pushes estrogen toward the 4-OH pathway that requires careful clearance. Variants increase the importance of efficient downstream detox.",
          },
          {
            symbol: "CYP19A1",
            fullName: "Aromatase",
            description:
              "Converts androgens into estrogens. Variant activity influences your estrogen to androgen balance and is central to interpreting both sides of the panel.",
          },
          {
            symbol: "SRD5A2",
            fullName: "5-alpha reductase type 2",
            description:
              "Converts testosterone into the stronger androgen DHT. Variant activity helps explain androgen driven symptoms seen in the metabolite readings.",
          },
        ],
      },
      {
        groupTitle: "Organic Acid and B Vitamin Add On (optional)",
        markers: [
          {
            symbol: "B6 marker",
            fullName: "Vitamin B6 functional status",
            description:
              "A cofactor for neurotransmitter and hormone metabolism. Low functional B6 can limit several pathways shown elsewhere in the panel.",
          },
          {
            symbol: "B12 and folate markers",
            fullName: "Methylation cofactor status",
            description:
              "Indicate whether you have the methyl donors needed to clear estrogens and support mood chemistry.",
          },
          {
            symbol: "Glutathione marker",
            fullName: "Antioxidant and detox capacity",
            description:
              "Reflects your buffering of oxidative stress, which supports safe hormone clearance.",
          },
          {
            symbol: "8-OHdG",
            fullName: "Oxidative stress marker",
            description:
              "A measure of oxidative damage that contextualizes inflammation and aging pressure alongside hormone balance.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "Your daily hormone production and clearance, not just a single static level.",
      "Your adrenal rhythm and stress recovery across a 24 hour cycle.",
      "How efficiently you route and detox estrogens, informed by your genetics.",
      "The connections between stress, sleep, mood, and hormone balance.",
    ],
    collection: [
      "At home, non invasive dried urine collection.",
      "Four collection points across the day.",
      "Lab validated report with full hormone mapping.",
      "Optional add ons for neurotransmitters, organic acids, and oxidative markers.",
      "Available with a practitioner consult or a digital summary interpretation.",
    ],
    protocolTieIn:
      "HormoneIQ pairs functional hormone data with the genes that explain it, then feeds both into your Via Cura protocol. Where clearance pathways need support, the protocol supplies the methyl donors, magnesium, and targeted nutrients that COMT and the estrogen pathways depend on, delivered for 10x to 28x absorption. The combined picture strengthens your Bio Optimization framework and your personalized strategy over time.",
  },
  {
    slug: "epigen-hq",
    pillLabel: "EpiGen-HQ",
    displayName: "EpiGen-HQ",
    subtitle: "Epigenetic Age and Expression Profile",
    tagline: "Your genes are fixed. How they are read is not.",
    panelType: "epigenetic",
    markerCount: 12,
    markerCountLabel: "12 epigenetic markers",
    overview:
      "EpiGen-HQ looks beyond your fixed DNA sequence to how your genes are actually being expressed right now. It reads DNA methylation patterns, the chemical marks that lifestyle, nutrition, stress, and environment lay down on your genome, to estimate your biological age and the pace at which you are aging. Because these marks are modifiable, EpiGen-HQ is the panel you can move. It is a research informed wellness and tracking tool, not a medical diagnostic, and it pairs naturally with the fixed insights from GeneX-M.",
    groups: [
      {
        groupTitle: "Biological Age and Pace of Aging",
        markers: [
          {
            symbol: "Epigenetic Age",
            fullName: "DNA methylation age estimate",
            description:
              "Estimates how old your body appears at the molecular level based on methylation patterns across many sites. It reflects cumulative lifestyle and environmental influence rather than the calendar.",
          },
          {
            symbol: "Biological Age Gap",
            fullName: "Difference between epigenetic and chronological age",
            description:
              "Shows whether your molecular age is running ahead of or behind your actual age. A favorable gap is a practical, trackable target for your protocol.",
          },
          {
            symbol: "Pace of Aging",
            fullName: "Current rate of biological aging",
            description:
              "Estimates how fast you are aging right now rather than where you have arrived. This is the most responsive marker to recent changes in sleep, nutrition, stress, and supplementation.",
          },
        ],
      },
      {
        groupTitle: "Inflammatory and Immune Methylation",
        markers: [
          {
            symbol: "Inflammatory Methylation Index",
            fullName: "Methylation at inflammation linked regions",
            description:
              "Reflects the epigenetic tone of your inflammatory signaling. A more favorable index is associated with lower chronic inflammatory pressure and supports recovery and longevity strategies.",
          },
          {
            symbol: "Immune Cell Methylation Profile",
            fullName: "Methylation pattern across immune cell types",
            description:
              "Gives a snapshot of immune balance and resilience that can shift with lifestyle, stress load, and nutrient status.",
          },
        ],
      },
      {
        groupTitle: "Metabolic and Cardiometabolic Methylation",
        markers: [
          {
            symbol: "Metabolic Methylation Score",
            fullName: "Methylation at metabolism linked regions",
            description:
              "Reflects how your current habits are shaping the expression of metabolic genes, relevant to energy, body composition, and metabolic resilience.",
          },
          {
            symbol: "Glucose and Insulin Regulation Methylation",
            fullName: "Methylation near glucose handling genes",
            description:
              "Indicates epigenetic influence on glucose and insulin regulation that responds to diet quality, activity, and weight changes.",
          },
        ],
      },
      {
        groupTitle: "Lifestyle and Exposure Signatures",
        markers: [
          {
            symbol: "AHRR Combustion Exposure Signature",
            fullName: "Methylation at the AHRR region",
            description:
              "A well studied epigenetic fingerprint of exposure to smoke and combustion byproducts. It can improve over time after exposure is reduced, making it a useful change marker.",
          },
          {
            symbol: "Alcohol Exposure Methylation",
            fullName: "Methylation linked to alcohol intake",
            description:
              "Reflects the cumulative epigenetic footprint of alcohol, which can shift with reduced intake.",
          },
          {
            symbol: "Stress and Cortisol Exposure Methylation",
            fullName: "Methylation near stress response genes",
            description:
              "Reflects the imprint of chronic stress on gene expression and responds to recovery, sleep, and nervous system support.",
          },
        ],
      },
      {
        groupTitle: "Methylation Capacity and Cellular Aging",
        markers: [
          {
            symbol: "Global DNA Methylation Status",
            fullName: "Overall methylation level across the genome",
            description:
              "A high level read on whether your methylation machinery is well supplied, which connects directly to your methyl donor intake and your GeneX-M variants.",
          },
          {
            symbol: "Telomere Associated Methylation",
            fullName: "Methylation proxy for cellular aging",
            description:
              "An epigenetic estimate related to cellular aging and renewal capacity that contextualizes your overall longevity profile.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "Your estimated biological age and whether you are aging faster or slower than the calendar.",
      "Your current pace of aging, the marker most responsive to recent changes.",
      "Where inflammation, metabolism, and lifestyle exposures are shaping your gene expression.",
      "A clear, repeatable baseline to retest against as your protocol takes effect.",
    ],
    collection: [
      "At home collection kit, typically a saliva or blood spot sample depending on the assay.",
      "Secure epigenetic methylation analysis.",
      "Biological age and pace of aging report with trackable markers.",
      "Retest friendly design so you can measure change over a protocol cycle.",
      "Optional consultation with a Via Cura wellness advisor.",
    ],
    protocolTieIn:
      "EpiGen-HQ is the panel your Via Cura protocol is built to move. Methyl donors, polyphenols, sleep and stress support, and metabolic nutrition are selected to nudge these markers in a favorable direction, delivered for 10x to 28x absorption. Because these markers respond to lifestyle, they become a living input to your Bio Optimization framework, giving you a before and after you can actually see.",
  },
  {
    slug: "peptide-iq",
    pillLabel: "PeptideIQ",
    displayName: "PeptideIQ",
    subtitle: "Peptide Response and Tissue Repair Genetics",
    tagline: "Understand the pathways behind recovery and repair.",
    panelType: "educational",
    markerCount: 14,
    markerCountLabel: "14 peptide response and repair genes",
    overview:
      "PeptideIQ is an educational genetic panel that maps the pathways most relevant to tissue repair, recovery, and the growth hormone and IGF axis. It is intended to inform protocol education and practitioner guided conversations, and it is not a product for sale. Via Cura does not sell peptides as commercial products. PeptideIQ instead helps you and a qualified practitioner understand how your genetics may shape recovery, connective tissue resilience, and response to repair focused protocols.",
    groups: [
      {
        groupTitle: "Growth Hormone and IGF Axis",
        markers: [
          {
            symbol: "GHR",
            fullName: "Growth hormone receptor",
            description:
              "Determines how strongly your tissues respond to growth hormone signaling. Variants influence sensitivity across the axis that governs repair, body composition, and recovery.",
          },
          {
            symbol: "GHRHR",
            fullName: "Growth hormone releasing hormone receptor",
            description:
              "Sets how readily your pituitary responds to growth hormone releasing signals, shaping natural growth hormone pulses relevant to recovery and sleep.",
          },
          {
            symbol: "IGF1",
            fullName: "Insulin like growth factor 1",
            description:
              "A primary anabolic and repair signal downstream of growth hormone. Variants affect baseline repair capacity and tissue maintenance.",
          },
          {
            symbol: "IGFBP3",
            fullName: "IGF binding protein 3",
            description:
              "Regulates how much IGF1 is available to act. Variants tune the balance of anabolic signaling and tissue turnover.",
          },
        ],
      },
      {
        groupTitle: "Secretagogue and Appetite Signaling",
        markers: [
          {
            symbol: "GHRL",
            fullName: "Ghrelin",
            description:
              "Drives hunger signaling and contributes to natural growth hormone release. Variants influence appetite rhythm and the secretagogue pathway that repair focused education often references.",
          },
          {
            symbol: "GHSR",
            fullName: "Growth hormone secretagogue receptor",
            description:
              "The receptor through which ghrelin and secretagogue signals act. Variants shape responsiveness across appetite, energy, and the growth hormone pulse.",
          },
          {
            symbol: "MC4R",
            fullName: "Melanocortin 4 receptor",
            description:
              "A central regulator of appetite and energy balance. Variants influence hunger and body weight regulation, context that informs recovery and body composition discussions.",
          },
        ],
      },
      {
        groupTitle: "Tissue Repair and Connective Structure",
        markers: [
          {
            symbol: "COL1A1",
            fullName: "Type 1 collagen alpha 1",
            description:
              "The main structural collagen of tendon, bone, and skin. Variants affect connective tissue strength and repair tendency, relevant to injury resilience and recovery education.",
          },
          {
            symbol: "COL5A1",
            fullName: "Type 5 collagen alpha 1",
            description:
              "Helps organize collagen fibrils and is linked to tendon and ligament properties. Variants are associated with differences in soft tissue resilience and recovery.",
          },
          {
            symbol: "MMP3",
            fullName: "Matrix metalloproteinase 3",
            description:
              "Remodels the extracellular matrix during repair. Variants influence how aggressively tissue is broken down and rebuilt during recovery.",
          },
          {
            symbol: "VEGFA",
            fullName: "Vascular endothelial growth factor A",
            description:
              "Drives the new blood vessel growth that supplies healing tissue. Variants affect the vascular side of repair and recovery capacity.",
          },
        ],
      },
      {
        groupTitle: "Recovery, Inflammation, and Vascular Response",
        markers: [
          {
            symbol: "IL6",
            fullName: "Interleukin 6",
            description:
              "Plays a dual role in repair, signaling both inflammation and the resolution that follows. Variants shape the intensity and clearance of the recovery inflammatory response.",
          },
          {
            symbol: "TNF",
            fullName: "Tumor necrosis factor",
            description:
              "A core inflammatory signal in tissue stress and repair. Variants influence inflammatory load during recovery.",
          },
          {
            symbol: "NOS3",
            fullName: "Nitric oxide synthase 3",
            description:
              "Produces nitric oxide for blood flow and tissue perfusion. Variants affect circulation that supports recovery and repair.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "How your growth hormone and IGF axis genetics may shape recovery and repair.",
      "Your connective tissue resilience tendencies for tendons, ligaments, and skin.",
      "How your inflammation and vascular genes influence the recovery process.",
      "Educational context to discuss repair focused protocols with a qualified practitioner.",
    ],
    collection: [
      "Easy at home saliva collection kit.",
      "Secure DNA processing and analysis.",
      "Educational report mapping your repair and recovery genetics.",
      "Designed for practitioner guided interpretation.",
      "Not associated with any peptide product for sale.",
    ],
    protocolTieIn:
      "PeptideIQ is educational and practitioner facing. Where appropriate, your Via Cura protocol can emphasize repair supportive nutrition, collagen building cofactors, and recovery focused micronutrients delivered for 10x to 28x absorption, always within a foundation of nutrition, sleep, and training rather than any commercial peptide. The insights add depth to your Bio Optimization framework and recovery strategy.",
  },
  {
    slug: "cannabis-iq",
    pillLabel: "CannabisIQ",
    displayName: "CannabisIQ",
    subtitle: "Cannabinoid Response and Sensitivity Genetics",
    tagline: "Know how your body reads cannabinoids before you make choices.",
    panelType: "educational",
    markerCount: 10,
    markerCountLabel: "10 cannabinoid response genes",
    overview:
      "CannabisIQ is an educational genetic panel that explains how your endocannabinoid system and cannabinoid metabolism shape your individual response to cannabinoids. It is informational and wellness oriented, intended to support personal awareness and responsible choices, and it is not medical advice or a recommendation to use any substance. Legal status varies by region, and CannabisIQ includes risk awareness markers so you understand both response and sensitivity.",
    groups: [
      {
        groupTitle: "Endocannabinoid Receptor Signaling",
        markers: [
          {
            symbol: "CNR1",
            fullName: "Cannabinoid receptor type 1",
            description:
              "The primary brain receptor of the endocannabinoid system, central to mood, appetite, pain perception, and stress. Variants influence baseline endocannabinoid tone and your sensitivity to cannabinoids.",
          },
          {
            symbol: "CNR2",
            fullName: "Cannabinoid receptor type 2",
            description:
              "Found mainly in immune tissue, it governs the endocannabinoid role in inflammation and immune balance. Variants shape this immune facing side of cannabinoid signaling.",
          },
        ],
      },
      {
        groupTitle: "Endocannabinoid Tone and Breakdown",
        markers: [
          {
            symbol: "FAAH",
            fullName: "Fatty acid amide hydrolase",
            description:
              "Breaks down anandamide, one of your own calming endocannabinoids. The common variant that lowers FAAH activity raises anandamide and is associated with a calmer baseline stress response and altered cannabinoid sensitivity.",
          },
          {
            symbol: "MGLL",
            fullName: "Monoacylglycerol lipase",
            description:
              "Breaks down 2-AG, the most abundant endocannabinoid. Variants influence endocannabinoid tone relevant to mood, appetite, and stress regulation.",
          },
        ],
      },
      {
        groupTitle: "Cannabinoid Metabolism and Clearance",
        markers: [
          {
            symbol: "CYP2C9",
            fullName: "Cytochrome P450 2C9",
            description:
              "A primary enzyme that metabolizes THC. Reduced function variants slow THC clearance, which can mean stronger and longer effects and a higher chance of unwanted reactions at a given exposure.",
          },
          {
            symbol: "CYP3A4",
            fullName: "Cytochrome P450 3A4",
            description:
              "Helps metabolize CBD and other cannabinoids and many medications. Variants affect clearance rate and the potential for interactions, an important awareness point.",
          },
          {
            symbol: "ABCB1",
            fullName: "Multidrug resistance transporter",
            description:
              "Moves many compounds across cell barriers, including the blood brain barrier. Variants can influence how much of a compound reaches the brain.",
          },
        ],
      },
      {
        groupTitle: "Cognitive, Mood, and Risk Awareness",
        markers: [
          {
            symbol: "COMT",
            fullName: "Catechol-O-methyltransferase",
            description:
              "Sets your dopamine clearance pace. The Val158Met variant interacts with cannabinoid effects on cognition and mood, and slower variants may be more sensitive to those effects.",
          },
          {
            symbol: "AKT1",
            fullName: "AKT serine threonine kinase 1",
            description:
              "Involved in dopamine signaling. Specific variants are associated in research with a higher risk of adverse psychological effects from heavy cannabis use, making this a key risk awareness marker.",
          },
          {
            symbol: "DRD2",
            fullName: "Dopamine receptor D2",
            description:
              "Shapes dopamine signaling relevant to reward and mood. Variants add context to how cannabinoids may affect motivation and mood for you.",
          },
        ],
      },
    ],
    whatYoullLearn: [
      "How your endocannabinoid system tone and receptor genetics shape your baseline.",
      "How quickly you metabolize and clear cannabinoids, which affects intensity and duration.",
      "Risk awareness from markers linked to mood and cognitive sensitivity.",
      "Educational context for responsible, individualized decisions.",
    ],
    collection: [
      "Easy at home saliva collection kit.",
      "Secure DNA processing and analysis.",
      "Educational report on cannabinoid response and sensitivity.",
      "Risk awareness markers included for informed choices.",
      "Informational only, not medical advice.",
    ],
    protocolTieIn:
      "CannabisIQ is educational. Where relevant to general wellness, your Via Cura protocol can support healthy endocannabinoid tone through nutrition, omega-3 fats, stress recovery, and sleep, delivered for 10x to 28x absorption, independent of any cannabinoid use. The insights round out your Bio Optimization framework with a fuller picture of your individual chemistry.",
  },
];

export const PANEL_BY_SLUG: Record<PanelSlug, Panel> = GENEX360_PANELS.reduce(
  (acc, panel) => {
    acc[panel.slug] = panel;
    return acc;
  },
  {} as Record<PanelSlug, Panel>,
);

export const PANEL_SLUGS: PanelSlug[] = GENEX360_PANELS.map((panel) => panel.slug);
