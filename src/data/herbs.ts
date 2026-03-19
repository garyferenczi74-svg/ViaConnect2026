export interface Herb {
  id: string;
  commonName: string;
  latinName: string;
  actions: string[];
  bodySystem: string[];
  preparation: string[];
  energetics: string;
  contraindications: string[];
  drugInteractions: string[];
  pregnancySafety: "safe" | "caution" | "avoid";
  farmceuticaMatch?: string;
  pharmacology: string;
  traditionalUses: string[];
  modernEvidence: { title: string; pmid: string }[];
  dosage: { preparation: string; dose: string; frequency: string }[];
}

export const herbs: Herb[] = [
  {
    id: "ashwagandha",
    commonName: "Ashwagandha",
    latinName: "Withania somnifera",
    actions: ["Adaptogen", "Nervine", "Immunomodulator"],
    bodySystem: ["Nervous", "Immune", "Endocrine"],
    preparation: ["Tincture", "Capsule", "Powder"],
    energetics: "Warming • Moistening",
    contraindications: ["Hyperthyroidism", "Nightshade sensitivity"],
    drugInteractions: ["Thyroid medications", "Immunosuppressants"],
    pregnancySafety: "avoid",
    farmceuticaMatch: "RELAX+",
    pharmacology:
      "Withanolides modulate GABAergic signaling, reduce cortisol via HPA axis regulation, and upregulate BDNF expression. Withaferin A demonstrates anti-inflammatory activity through NF-κB inhibition.",
    traditionalUses: [
      "Rasayana (rejuvenative) in Ayurveda",
      "Balya (strength-promoting)",
      "Nidrajanana (sleep-inducing)",
      "Used for debility and nervous exhaustion",
    ],
    modernEvidence: [
      { title: "Efficacy of Ashwagandha in reducing stress and anxiety: a systematic review", pmid: "34254920" },
      { title: "Withania somnifera improves semen quality in stress-related male fertility", pmid: "19501822" },
      { title: "Effects on cortisol and sleep quality in adults: RCT", pmid: "32818573" },
    ],
    dosage: [
      { preparation: "Tincture (1:3)", dose: "2–4 mL", frequency: "3x daily" },
      { preparation: "Capsule (root)", dose: "300–600 mg", frequency: "2x daily" },
      { preparation: "Powder (Churna)", dose: "3–6 g", frequency: "1–2x daily" },
    ],
  },
  {
    id: "rhodiola",
    commonName: "Rhodiola",
    latinName: "Rhodiola rosea",
    actions: ["Adaptogen", "Nootropic", "Antidepressant"],
    bodySystem: ["Nervous", "Endocrine"],
    preparation: ["Tincture", "Capsule"],
    energetics: "Cooling • Drying",
    contraindications: ["Bipolar disorder"],
    drugInteractions: ["SSRIs", "MAOIs"],
    pregnancySafety: "caution",
    pharmacology:
      "Rosavins and salidroside modulate monoamine oxidase activity, enhance serotonin and dopamine transmission, and improve mitochondrial ATP production under stress conditions.",
    traditionalUses: [
      "Siberian folk medicine for fatigue and altitude sickness",
      "Scandinavian use for endurance and mental stamina",
      "Traditional remedy for depression in Nordic countries",
    ],
    modernEvidence: [
      { title: "Rhodiola rosea for stress-induced fatigue: a systematic review", pmid: "22228617" },
      { title: "Antidepressant activity of Rhodiola rosea in mild-moderate depression", pmid: "26502953" },
    ],
    dosage: [
      { preparation: "Tincture (1:5)", dose: "1–3 mL", frequency: "2x daily" },
      { preparation: "Capsule (standardized)", dose: "200–400 mg", frequency: "1–2x daily" },
    ],
  },
  {
    id: "passionflower",
    commonName: "Passionflower",
    latinName: "Passiflora incarnata",
    actions: ["Nervine", "Anxiolytic", "Sedative"],
    bodySystem: ["Nervous"],
    preparation: ["Tincture", "Tea", "Capsule"],
    energetics: "Cooling • Moistening",
    contraindications: ["Concurrent sedative use"],
    drugInteractions: ["Benzodiazepines", "Sedatives"],
    pregnancySafety: "avoid",
    pharmacology:
      "Chrysin and other flavonoids bind to GABA-A receptors, enhancing inhibitory neurotransmission. Harmine alkaloids provide mild MAO-A inhibition.",
    traditionalUses: [
      "Native American remedy for insomnia and anxiety",
      "Eclectic medicine for nervous restlessness",
      "Traditional European sedative herb",
    ],
    modernEvidence: [
      { title: "Passiflora incarnata for anxiety: systematic review and meta-analysis", pmid: "31006899" },
      { title: "Comparison of Passiflora and oxazepam for generalized anxiety", pmid: "11679026" },
    ],
    dosage: [
      { preparation: "Tincture (1:5)", dose: "2–4 mL", frequency: "3x daily" },
      { preparation: "Tea (dried herb)", dose: "2–4 g", frequency: "2–3x daily" },
      { preparation: "Capsule", dose: "400–800 mg", frequency: "2x daily" },
    ],
  },
  {
    id: "valerian",
    commonName: "Valerian",
    latinName: "Valeriana officinalis",
    actions: ["Nervine", "Sedative", "Spasmolytic"],
    bodySystem: ["Nervous", "Musculoskeletal"],
    preparation: ["Tincture", "Capsule", "Tea"],
    energetics: "Warming • Drying",
    contraindications: ["May cause paradoxical stimulation", "Hepatic impairment"],
    drugInteractions: ["Benzodiazepines", "Barbiturates", "Alcohol"],
    pregnancySafety: "avoid",
    pharmacology:
      "Valerenic acid inhibits GABA transaminase, increasing synaptic GABA availability. Iridoids (valepotriates) demonstrate sedative and spasmolytic activity.",
    traditionalUses: [
      "European remedy for insomnia since antiquity",
      "Used during WWI/WWII for shell shock and nervous conditions",
      "Traditional antispasmodic for colic and cramps",
    ],
    modernEvidence: [
      { title: "Valerian for improving sleep quality: meta-analysis of RCTs", pmid: "16619368" },
      { title: "Valerian extract and valerenic acid are GABAergic ligands", pmid: "14742372" },
    ],
    dosage: [
      { preparation: "Tincture (1:5)", dose: "3–5 mL", frequency: "Before bed" },
      { preparation: "Capsule (root)", dose: "300–600 mg", frequency: "Before bed" },
      { preparation: "Tea (dried root)", dose: "2–3 g", frequency: "Before bed" },
    ],
  },
  {
    id: "turmeric",
    commonName: "Turmeric",
    latinName: "Curcuma longa",
    actions: ["Anti-inflammatory", "Hepatoprotective", "Antioxidant"],
    bodySystem: ["GI", "Musculoskeletal", "Immune"],
    preparation: ["Capsule", "Powder", "Tincture"],
    energetics: "Warming • Drying",
    contraindications: ["Bile duct obstruction", "Gallstones", "Anticoagulant therapy"],
    drugInteractions: ["Anticoagulants", "Antiplatelets", "Diabetes medications"],
    pregnancySafety: "caution",
    pharmacology:
      "Curcumin inhibits NF-κB, COX-2, and LOX pathways. Modulates TNF-α, IL-1β, and IL-6 expression. Enhances Nrf2-mediated antioxidant response.",
    traditionalUses: [
      "Ayurvedic anti-inflammatory and digestive aid",
      "Traditional wound healing paste",
      "TCM blood-moving herb for pain and stasis",
    ],
    modernEvidence: [
      { title: "Efficacy of curcumin in osteoarthritis: systematic review", pmid: "27533649" },
      { title: "Curcumin in inflammatory bowel disease: meta-analysis", pmid: "32749570" },
    ],
    dosage: [
      { preparation: "Capsule (curcumin)", dose: "500–1000 mg", frequency: "2x daily" },
      { preparation: "Powder (whole root)", dose: "2–5 g", frequency: "Daily with fat" },
      { preparation: "Tincture (1:3)", dose: "2–4 mL", frequency: "3x daily" },
    ],
  },
  {
    id: "milk-thistle",
    commonName: "Milk Thistle",
    latinName: "Silybum marianum",
    actions: ["Hepatoprotective", "Antioxidant", "Cholagogue"],
    bodySystem: ["GI", "Hepatic"],
    preparation: ["Capsule", "Tincture"],
    energetics: "Cooling • Drying",
    contraindications: ["Allergy to Asteraceae family"],
    drugInteractions: ["CYP3A4 substrates", "Statins"],
    pregnancySafety: "safe",
    farmceuticaMatch: "LIVER GUARD",
    pharmacology:
      "Silymarin complex (silibinin, silychristin, silydianin) stabilizes hepatocyte membranes, stimulates ribosomal RNA polymerase, and scavenges free radicals. Enhances glutathione synthesis.",
    traditionalUses: [
      "European remedy for liver and gallbladder complaints",
      "Eclectic medicine for congested liver",
      "Traditional antidote for Amanita mushroom poisoning",
    ],
    modernEvidence: [
      { title: "Silymarin in NAFLD: systematic review and meta-analysis", pmid: "28255981" },
      { title: "Milk thistle for alcoholic liver disease: Cochrane review", pmid: "17943848" },
    ],
    dosage: [
      { preparation: "Capsule (standardized 80% silymarin)", dose: "140–420 mg", frequency: "3x daily" },
      { preparation: "Tincture (1:3)", dose: "3–5 mL", frequency: "3x daily" },
    ],
  },
  {
    id: "echinacea",
    commonName: "Echinacea",
    latinName: "Echinacea purpurea",
    actions: ["Immunostimulant", "Anti-inflammatory", "Antimicrobial"],
    bodySystem: ["Immune", "Respiratory"],
    preparation: ["Tincture", "Capsule", "Tea"],
    energetics: "Cooling • Drying",
    contraindications: ["Autoimmune conditions", "Progressive systemic diseases"],
    drugInteractions: ["Immunosuppressants", "CYP3A4 substrates"],
    pregnancySafety: "safe",
    pharmacology:
      "Alkylamides modulate CB2 cannabinoid receptors and TNF-α expression. Polysaccharides (arabinogalactans) stimulate macrophage phagocytosis and NK cell activity.",
    traditionalUses: [
      "Plains Native American remedy for infections and snakebite",
      "Eclectic medicine for blood poisoning",
      "Traditional cold and flu remedy",
    ],
    modernEvidence: [
      { title: "Echinacea for preventing and treating the common cold: Cochrane review", pmid: "24554461" },
      { title: "Immunomodulatory activity of Echinacea preparations", pmid: "17887935" },
    ],
    dosage: [
      { preparation: "Tincture (1:5)", dose: "2–5 mL", frequency: "3x daily (acute)" },
      { preparation: "Capsule", dose: "500–1000 mg", frequency: "3x daily" },
      { preparation: "Tea (dried herb)", dose: "2–3 g", frequency: "3x daily" },
    ],
  },
  {
    id: "ginger",
    commonName: "Ginger",
    latinName: "Zingiber officinale",
    actions: ["Carminative", "Anti-emetic", "Anti-inflammatory"],
    bodySystem: ["GI", "Circulatory"],
    preparation: ["Tea", "Capsule", "Tincture"],
    energetics: "Warming • Drying",
    contraindications: ["Gallstones (high doses)"],
    drugInteractions: ["Anticoagulants"],
    pregnancySafety: "safe",
    pharmacology:
      "Gingerols and shogaols inhibit COX and LOX pathways, antagonize 5-HT3 serotonin receptors (anti-emetic), and enhance gastric motility through cholinergic stimulation.",
    traditionalUses: [
      "Ayurvedic universal medicine (vishwabhesaj)",
      "TCM warming digestive herb",
      "Traditional remedy for nausea, colds, and poor circulation",
    ],
    modernEvidence: [
      { title: "Ginger for nausea and vomiting in pregnancy: Cochrane review", pmid: "25230021" },
      { title: "Analgesic effects of ginger in osteoarthritis: meta-analysis", pmid: "25230021" },
    ],
    dosage: [
      { preparation: "Tea (fresh root)", dose: "2–4 g sliced", frequency: "3x daily" },
      { preparation: "Capsule (dried)", dose: "250–500 mg", frequency: "3–4x daily" },
      { preparation: "Tincture (1:5)", dose: "1–3 mL", frequency: "3x daily" },
    ],
  },
  {
    id: "bacopa",
    commonName: "Bacopa",
    latinName: "Bacopa monnieri",
    actions: ["Nootropic", "Nervine", "Adaptogen"],
    bodySystem: ["Nervous"],
    preparation: ["Capsule", "Powder"],
    energetics: "Cooling • Moistening",
    contraindications: ["GI sensitivity at high doses"],
    drugInteractions: ["Thyroid medications", "Anticholinergics"],
    pregnancySafety: "avoid",
    pharmacology:
      "Bacosides A and B enhance synaptic transmission, upregulate tryptophan hydroxylase and serotonin transporter expression. Increases dendritic branching in hippocampal neurons.",
    traditionalUses: [
      "Ayurvedic medhya rasayana (intellect rejuvenative)",
      "Used for memory enhancement in Vedic scholarship",
      "Traditional remedy for epilepsy and anxiety",
    ],
    modernEvidence: [
      { title: "Meta-analysis of Bacopa monnieri on cognition", pmid: "24252493" },
      { title: "Chronic effects of Bacopa monnieri on memory in older Australians", pmid: "20590480" },
    ],
    dosage: [
      { preparation: "Capsule (standardized 55% bacosides)", dose: "300–450 mg", frequency: "Daily" },
      { preparation: "Powder (whole herb)", dose: "5–10 g", frequency: "Daily" },
    ],
  },
  {
    id: "st-johns-wort",
    commonName: "St. John's Wort",
    latinName: "Hypericum perforatum",
    actions: ["Antidepressant", "Nervine", "Anti-inflammatory"],
    bodySystem: ["Nervous"],
    preparation: ["Tincture", "Capsule"],
    energetics: "Cooling • Drying",
    contraindications: [
      "Concurrent SSRI use",
      "Organ transplant recipients",
      "HIV/AIDS (antiretroviral interactions)",
    ],
    drugInteractions: ["SSRIs", "Oral contraceptives", "Warfarin", "Cyclosporine", "Digoxin"],
    pregnancySafety: "avoid",
    pharmacology:
      "Hypericin and hyperforin inhibit reuptake of serotonin, norepinephrine, and dopamine. Hyperforin activates TRPC6 channels. Potent CYP3A4 and P-glycoprotein inducer.",
    traditionalUses: [
      "Medieval European remedy for 'melancholia'",
      "Traditional wound herb (oil infusion)",
      "Used on St. John's Day for protection and healing",
    ],
    modernEvidence: [
      { title: "St John's wort for depression: Cochrane systematic review", pmid: "18843608" },
      { title: "Hypericum extract vs. SSRIs in moderate depression: meta-analysis", pmid: "27589952" },
    ],
    dosage: [
      { preparation: "Capsule (standardized 0.3% hypericin)", dose: "300 mg", frequency: "3x daily" },
      { preparation: "Tincture (1:5)", dose: "2–4 mL", frequency: "3x daily" },
    ],
  },
  {
    id: "black-cohosh",
    commonName: "Black Cohosh",
    latinName: "Actaea racemosa",
    actions: ["Antispasmodic", "Anti-inflammatory", "Hormone-modulating"],
    bodySystem: ["Reproductive", "Musculoskeletal"],
    preparation: ["Tincture", "Capsule"],
    energetics: "Cooling • Drying",
    contraindications: ["Estrogen-sensitive conditions", "Liver disease", "Aspirin allergy"],
    drugInteractions: ["HRT", "Tamoxifen", "Hepatotoxic drugs"],
    pregnancySafety: "avoid",
    pharmacology:
      "Triterpene glycosides (actein, cimicifugoside) modulate serotonergic pathways rather than acting as phytoestrogens. Demonstrates selective estrogen receptor modulator-like activity.",
    traditionalUses: [
      "Native American remedy for menstrual and menopausal complaints",
      "Eclectic medicine for rheumatic pain",
      "Traditional labor aid and emmenagogue",
    ],
    modernEvidence: [
      { title: "Black cohosh for menopausal symptoms: Cochrane review", pmid: "22786517" },
      { title: "Safety and efficacy of black cohosh in menopause: systematic review", pmid: "16825572" },
    ],
    dosage: [
      { preparation: "Tincture (1:10)", dose: "0.5–2 mL", frequency: "2–3x daily" },
      { preparation: "Capsule (standardized)", dose: "20–40 mg", frequency: "2x daily" },
    ],
  },
  {
    id: "licorice-root",
    commonName: "Licorice Root",
    latinName: "Glycyrrhiza glabra",
    actions: ["Demulcent", "Adaptogen", "Anti-inflammatory", "Expectorant"],
    bodySystem: ["GI", "Respiratory", "Endocrine"],
    preparation: ["Tea", "Tincture", "Capsule"],
    energetics: "Warming • Moistening",
    contraindications: [
      "Hypertension",
      "Hypokalemia",
      "Kidney disease",
      "Cardiac conditions",
    ],
    drugInteractions: ["Diuretics", "Corticosteroids", "Digoxin", "Antihypertensives"],
    pregnancySafety: "avoid",
    pharmacology:
      "Glycyrrhizin inhibits 11β-hydroxysteroid dehydrogenase type 2, prolonging cortisol half-life. Demonstrates anti-viral activity against influenza and herpes. Flavonoids provide mucosal anti-inflammatory and antispasmodic effects.",
    traditionalUses: [
      "TCM harmonizing herb (Gan Cao) used in most formulas",
      "Ayurvedic rejuvenative for throat and respiratory conditions",
      "European remedy for peptic ulcers and adrenal exhaustion",
    ],
    modernEvidence: [
      { title: "Glycyrrhizin in chronic hepatitis C: meta-analysis", pmid: "21771458" },
      { title: "Licorice root for functional dyspepsia: clinical trial", pmid: "22235108" },
    ],
    dosage: [
      { preparation: "Tea (dried root)", dose: "1–4 g", frequency: "3x daily (max 6 weeks)" },
      { preparation: "Tincture (1:5)", dose: "2–4 mL", frequency: "3x daily" },
      { preparation: "Capsule (DGL)", dose: "380–760 mg", frequency: "Before meals" },
    ],
  },
];
