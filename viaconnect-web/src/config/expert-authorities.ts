// Expert Authority Database — Nutritional Genomics + Peptide Science

export interface ExpertAuthority {
  id: string;
  name: string;
  credentials: string;
  country: string;
  specialty: string;
  domain: "nutritional_genomics" | "peptide_science" | "functional_medicine" | "tcm" | "ayurvedic" | "herbal_medicine" | "cannabis_science" | "vitamins_minerals";
  keyContributions: string[];
  affiliations: string[];
  relevantGeneNutrientPairs?: string[];
  publicationCount?: string;
  notableWork?: string;
}

export const NUTRITIONAL_GENOMICS_EXPERTS: ExpertAuthority[] = [
  { id: "el-sohemy", name: "Ahmed El-Sohemy, PhD", credentials: "PhD", country: "Canada", specialty: "Nutrigenomics & Personalized Nutrition", domain: "nutritional_genomics", keyContributions: ["Founder of Nutrigenomix", "Pioneer in gene-diet interaction research", "Defined genetic variants affecting caffeine, vitamin C, folate, omega-3 response"], affiliations: ["University of Toronto", "Nutrigenomix Inc."], relevantGeneNutrientPairs: ["CYP1A2-caffeine", "MTHFR-folate", "FADS1-omega3", "GC-vitaminD"], publicationCount: "200+", notableWork: "Established that CYP1A2 genotype determines whether coffee is cardioprotective or harmful" },
  { id: "ordovas", name: "Jos\u00e9 M. Ordov\u00e1s, PhD", credentials: "PhD", country: "USA/Spain", specialty: "Nutrigenetics & Cardiovascular Genomics", domain: "nutritional_genomics", keyContributions: ["Director of Nutrition & Genomics at Tufts", "Pioneer in gene-diet interactions for CVD", "Led research on APOE, FADS, lipid metabolism"], affiliations: ["Tufts University", "IMDEA Food Institute"], relevantGeneNutrientPairs: ["APOE-lipids", "FADS1/2-PUFA", "CETP-HDL", "LPL-triglycerides"], publicationCount: "800+", notableWork: "Defined how APOE genotype determines optimal dietary fat intake for heart health" },
  { id: "joffe", name: "Yael Joffe, PhD, RD, FACN", credentials: "PhD, RD, FACN", country: "South Africa/USA", specialty: "Clinical Nutrigenomics & Practitioner Education", domain: "nutritional_genomics", keyContributions: ["Founder of 3X4 Genetics", "Author of 'It's Not Just Your Genes'", "Leader in translating genomics to clinical practice"], affiliations: ["3X4 Genetics", "Manuka Science"], relevantGeneNutrientPairs: ["MTHFR-methylation", "COMT-catechol", "VDR-vitaminD", "SOD2-antioxidant"], publicationCount: "50+", notableWork: "Created the clinical framework for translating SNP data into personalized supplement protocols" },
  { id: "kohlmeier", name: "Martin Kohlmeier, MD, PhD", credentials: "MD, PhD", country: "USA/Germany", specialty: "Nutritional Genomics Education & Micronutrient Metabolism", domain: "nutritional_genomics", keyContributions: ["Author of 'Nutrigenetics' textbook", "Professor at UNC Chapel Hill", "Expert in micronutrient metabolism"], affiliations: ["University of North Carolina at Chapel Hill"], relevantGeneNutrientPairs: ["BCMO1-betaCarotene", "SLC23A1-vitaminC", "FUT2-B12", "NBPF3-folate"], publicationCount: "150+", notableWork: "Authored the standard reference textbook for nutrigenetics used in medical education worldwide" },
  { id: "ferguson", name: "Lynnette R. Ferguson, DPhil (Oxon), DSc", credentials: "DPhil (Oxon), DSc", country: "New Zealand", specialty: "Nutrigenomics & Cancer Prevention", domain: "nutritional_genomics", keyContributions: ["Pioneer in nutrigenomics in Oceania", "Gene-nutrient interactions in IBD and cancer", "Founding member of NuGO"], affiliations: ["University of Auckland"], relevantGeneNutrientPairs: ["NAT2-detox", "GSTM1-antioxidant", "IL6-inflammation"], publicationCount: "300+", notableWork: "Defined nutrigenomic pathways linking diet, genetic variation, and cancer risk" },
  { id: "simopoulos", name: "Artemis P. Simopoulos, MD", credentials: "MD", country: "USA", specialty: "Omega-3/Omega-6 Ratio & Evolutionary Nutrition", domain: "nutritional_genomics", keyContributions: ["Founder of Center for Genetics, Nutrition and Health", "Defined evolutionary omega ratio concept", "Pioneer in genetic variation and fatty acid metabolism"], affiliations: ["The Center for Genetics, Nutrition and Health"], relevantGeneNutrientPairs: ["FADS1/2-omega3", "ELOVL2-DHA", "PPARG-fatMetabolism"], publicationCount: "300+", notableWork: "Established that human genetics evolved with a 1:1 omega-6/omega-3 ratio, not the modern 15:1" },
  { id: "perusse", name: "Louis P\u00e9russe, PhD", credentials: "PhD", country: "Canada", specialty: "Genetic Epidemiology & Obesity Genomics", domain: "nutritional_genomics", keyContributions: ["Co-leader of HERITAGE Family Study", "Pioneer in genetic variants affecting nutrient response", "Expert in gene-environment interactions"], affiliations: ["Universit\u00e9 Laval"], relevantGeneNutrientPairs: ["FTO-obesity", "MC4R-appetite", "ADRB2-fatMetabolism"], publicationCount: "400+", notableWork: "Co-discovered genetic variants that determine individual exercise and nutrient response" },
  { id: "martinez", name: "Alfredo Mart\u00ednez, PhD", credentials: "PhD", country: "Spain", specialty: "Precision Nutrition & Mediterranean Diet Genomics", domain: "nutritional_genomics", keyContributions: ["Leader of PREDIMED-Plus trial", "Expert in Mediterranean diet-gene interactions", "Pioneer in personalized dietary intervention"], affiliations: ["University of Navarra", "CIBERobn"], relevantGeneNutrientPairs: ["TCF7L2-glucose", "PPARG-fatResponse", "CLOCK-chronoNutrition"], publicationCount: "500+", notableWork: "Demonstrated that genetic variants modify the metabolic benefits of the Mediterranean diet" },
];

export const PEPTIDE_SCIENCE_EXPERTS: ExpertAuthority[] = [
  { id: "seeds", name: "William A. Seeds, MD, FMNM, ABAARM", credentials: "MD, FMNM, ABAARM", country: "USA", specialty: "Clinical Peptide Therapy & Regenerative Medicine", domain: "peptide_science", keyContributions: ["Author of 'Peptide Protocols'", "Founder of International Peptide Society", "Leading clinical educator on peptide therapy"], affiliations: ["International Peptide Society", "A4M"], notableWork: "Authored the definitive clinical protocols for BPC-157, Thymosin Alpha-1, and growth hormone secretagogues" },
  { id: "khavinson", name: "Vladimir Khavinson, MD, PhD", credentials: "MD, PhD", country: "Russia", specialty: "Bioregulatory Peptides & Aging", domain: "peptide_science", keyContributions: ["Pioneer of bioregulatory peptide therapy", "Discovered Epithalon and telomerase-activating effects", "40+ years of short peptide bioregulator research"], affiliations: ["Saint Petersburg Institute of Bioregulation and Gerontology"], notableWork: "Demonstrated that short peptides can regulate gene expression and extend biological age markers" },
  { id: "albericio", name: "Fernando Albericio, PhD", credentials: "PhD", country: "Spain/South Africa", specialty: "Peptide Synthesis Chemistry", domain: "peptide_science", keyContributions: ["World authority on solid-phase peptide synthesis", "Pioneer in peptide coupling reagent development"], affiliations: ["University of KwaZulu-Natal", "University of Barcelona"], notableWork: "Advanced the chemistry that enables modern peptide drug manufacturing" },
  { id: "arora", name: "Paramjit Arora, PhD", credentials: "PhD", country: "USA", specialty: "Peptide Mimetics & Protein-Protein Interactions", domain: "peptide_science", keyContributions: ["Expert in peptide mimetics", "Pioneer in alpha-helix stabilization"], affiliations: ["New York University"], notableWork: "Developed synthetic peptide scaffolds that mimic natural protein interactions" },
  { id: "schneider", name: "Joel Schneider, PhD", credentials: "PhD", country: "USA", specialty: "Self-Assembling Peptides & Biomaterials", domain: "peptide_science", keyContributions: ["Pioneer in self-assembling peptide hydrogels", "Research on peptide-based wound healing"], affiliations: ["National Cancer Institute", "NIH"], notableWork: "Created self-assembling peptide hydrogels used in regenerative medicine" },
  { id: "dawson", name: "Philip Dawson, PhD", credentials: "PhD", country: "USA", specialty: "Chemical Protein Synthesis & Ligation", domain: "peptide_science", keyContributions: ["Co-inventor of native chemical ligation", "Pioneer in chemical biology of peptides"], affiliations: ["Scripps Research Institute"], notableWork: "Co-developed native chemical ligation, enabling synthesis of full-length therapeutic proteins" },
  { id: "fields", name: "Gregg B. Fields, PhD", credentials: "PhD", country: "USA", specialty: "Collagen Peptide Science & Matrix Metalloproteinases", domain: "peptide_science", keyContributions: ["World expert on collagen-model peptides", "Research on peptide-based cancer and wound healing"], affiliations: ["Florida Atlantic University"], notableWork: "Defined peptide chemistry underlying collagen synthesis — foundational for collagen supplement science" },
  { id: "mapp", name: "Anna Mapp, PhD", credentials: "PhD", country: "USA", specialty: "Peptide-Based Transcription Factor Modulators", domain: "peptide_science", keyContributions: ["Pioneer in peptides that modulate gene expression", "Research on protein-protein interactions in gene regulation"], affiliations: ["University of Michigan"], notableWork: "Developed peptide-based tools for controlling gene expression" },
  { id: "craik", name: "David J. Craik, PhD, AO, FAA, FRS", credentials: "PhD, AO, FAA, FRS", country: "Australia", specialty: "Cyclic Peptides & Plant-Derived Therapeutics", domain: "peptide_science", keyContributions: ["World leader in cyclotide research", "Pioneer in peptide drug design with oral bioavailability", "Fellow of the Royal Society"], affiliations: ["University of Queensland"], notableWork: "Pioneered plant-derived cyclic peptides as scaffolds for stable oral peptide drugs" },
  { id: "lavalle", name: "James B. LaValle, RPh, CCN", credentials: "RPh, CCN", country: "USA", specialty: "Clinical Peptide Application & Integrative Pharmacy", domain: "peptide_science", keyContributions: ["Leading clinical educator on integrative peptide therapy", "Author on metabolic optimization"], affiliations: ["Metabolic Code", "A4M"], notableWork: "Translated peptide research into practical clinical protocols for integrative practitioners" },
  { id: "turner", name: "Suzanne Turner, MD", credentials: "MD", country: "USA", specialty: "Anti-Aging Peptide Therapy & Regenerative Medicine", domain: "peptide_science", keyContributions: ["Clinical peptide therapy specialist", "Educator on peptide applications for hormone optimization"], affiliations: ["A4M", "IPS"], notableWork: "Clinical protocols for peptide-based hormone and immune system optimization" },
  { id: "yurth", name: "Elizabeth Yurth, MD", credentials: "MD", country: "USA", specialty: "Regenerative & Musculoskeletal Peptide Therapy", domain: "peptide_science", keyContributions: ["Expert in BPC-157 and TB-500 applications", "Clinical researcher in regenerative peptide therapy"], affiliations: ["Boulder Longevity Institute"], notableWork: "Clinical research on BPC-157 and TB-500 for tissue repair and recovery" },
  { id: "de-la-fuente", name: "C\u00e9sar de la Fuente, PhD", credentials: "PhD", country: "USA/Spain", specialty: "AI-Designed Antimicrobial Peptides", domain: "peptide_science", keyContributions: ["Pioneer in AI/ML-designed therapeutic peptides", "Research on antimicrobial peptides for resistant infections"], affiliations: ["University of Pennsylvania"], notableWork: "Used AI to discover novel antimicrobial peptides — pioneering AI and peptide therapy intersection" },
];

// ═══ FUNCTIONAL MEDICINE ═══
export const FUNCTIONAL_MEDICINE_EXPERTS: ExpertAuthority[] = [
  { id: "bland", name: "Jeffrey S. Bland, PhD", credentials: "PhD", country: "USA", specialty: "Functional Medicine & Systems Biology", domain: "functional_medicine", keyContributions: ["'Father of Functional Medicine'", "Co-founder of IFM", "40+ years in nutritional science and systems biology"], affiliations: ["Institute for Functional Medicine (IFM)", "PLMI", "Big Bold Health"], publicationCount: "100s", notableWork: "Created the functional medicine framework connecting upstream root causes to downstream symptom clusters" },
  { id: "hyman", name: "Mark Hyman, MD", credentials: "MD", country: "USA", specialty: "Functional Medicine & Personalized Nutrition", domain: "functional_medicine", keyContributions: ["IFM Senior Advisor", "Founded Cleveland Clinic Center for Functional Medicine", "15x NYT bestselling author"], affiliations: ["Cleveland Clinic", "The UltraWellness Center", "IFM"], publicationCount: "100+", notableWork: "Popularized root-cause cluster analysis and personalized supplement protocols for millions" },
];

// ═══ TRADITIONAL CHINESE MEDICINE ═══
export const TCM_EXPERTS: ExpertAuthority[] = [
  { id: "lao", name: "Lixing Lao, PhD, MD, LAc", credentials: "PhD, MD, LAc", country: "USA/China", specialty: "TCM Integration with Western Medicine", domain: "tcm", keyContributions: ["Former ISCM president", "200+ publications on TCM integration", "Pioneered evidence-based acupuncture research"], affiliations: ["ISCM", "Virginia University of Integrative Medicine", "University of Maryland"], publicationCount: "200+", notableWork: "Bridges TCM pattern recognition with functional and genomic insights" },
  { id: "hong-jin", name: "Hong Jin, PhD, LAc", credentials: "PhD, LAc", country: "China/USA", specialty: "Evidence-Based TCM & Classical Formulas", domain: "tcm", keyContributions: ["Evidence-based classical formula integration", "Combines traditional formulas with nutraceutical protocols"], affiliations: ["Capital TCM Research Institute"], notableWork: "Demonstrated how classical TCM formulas can be validated through pharmacogenomic research" },
];

// ═══ AYURVEDIC MEDICINE ═══
export const AYURVEDIC_EXPERTS: ExpertAuthority[] = [
  { id: "kodikannath", name: "Jayarajan Kodikannath, BAMS", credentials: "BAMS", country: "India/USA", specialty: "Ayurveda-Genomics Integration & Dosha Typing", domain: "ayurvedic", keyContributions: ["NAMA President", "Pioneer in genomics-informed dosha typing", "Bridges Prakriti assessment with SNP personalization"], affiliations: ["National Ayurvedic Medical Association (NAMA)"], notableWork: "Established framework for mapping Ayurvedic dosha types to genetic variants" },
  { id: "halpern", name: "Marc Halpern, DC, CAS", credentials: "DC, CAS", country: "USA", specialty: "Clinical Ayurveda & Dosha-Specific Protocols", domain: "ayurvedic", keyContributions: ["Founder of California College of Ayurveda", "30+ years translating Ayurvedic principles to clinical practice"], affiliations: ["California College of Ayurveda (CCA)"], notableWork: "Created clinical methodology for dosha-specific herbal and lifestyle protocols" },
];

// ═══ HERBAL MEDICINE & PHYTOTHERAPY ═══
export const HERBAL_MEDICINE_EXPERTS: ExpertAuthority[] = [
  { id: "blumenthal", name: "Mark Blumenthal", credentials: "Founder, ABC", country: "USA", specialty: "Herbal Science Standards & Evidence", domain: "herbal_medicine", keyContributions: ["Founder of American Botanical Council (ABC)", "40+ years setting herbal safety and efficacy standards", "Publisher of HerbalGram"], affiliations: ["American Botanical Council (ABC)"], publicationCount: "1000+ (through ABC)", notableWork: "Sets global standards for herbal supplement quality, safety, and efficacy" },
  { id: "winston", name: "David Winston, RH (AHG)", credentials: "RH (AHG)", country: "USA", specialty: "Clinical Herbalism & Functional Integration", domain: "herbal_medicine", keyContributions: ["Master herbalist with 50+ years of practice", "Founder of Herbal Therapeutics Research Library", "Integrates herbalism with functional medicine"], affiliations: ["American Herbalists Guild (AHG)"], publicationCount: "50+", notableWork: "Created clinical protocols combining adaptogenic herbs with functional medicine" },
  { id: "low-dog", name: "Tieraona Low Dog, MD", credentials: "MD", country: "USA", specialty: "Evidence-Based Herbal Medicine & Women's Health", domain: "herbal_medicine", keyContributions: ["Former Andrew Weil Center faculty", "Leading voice in evidence-based herbal medicine", "Expert in women's health herbal supplementation"], affiliations: ["Medicine Lodge Ranch"], notableWork: "Established evidence base for integrating herbal medicine with conventional pharmacology" },
];

// ═══ MEDICAL CANNABIS / CANNABINOID SCIENCE ═══
export const CANNABIS_SCIENCE_EXPERTS: ExpertAuthority[] = [
  { id: "grant", name: "Igor Grant, MD", credentials: "MD", country: "USA", specialty: "Cannabinoid Therapeutics Research", domain: "cannabis_science", keyContributions: ["Director of CMCR at UC San Diego", "100s of cannabinoid studies", "Gold standard for medical cannabis research"], affiliations: ["Center for Medicinal Cannabis Research (CMCR)", "UC San Diego"], publicationCount: "100s", notableWork: "Leads the largest academic cannabinoid research program in the US" },
  { id: "mechoulam", name: "Raphael Mechoulam, PhD (1930\u20132023)", credentials: "PhD", country: "Israel", specialty: "Endocannabinoid System Discovery", domain: "cannabis_science", keyContributions: ["Discovered THC (1964) and the endocannabinoid system", "Identified anandamide and 2-AG", "Legacy authority for all cannabinoid science"], affiliations: ["Hebrew University of Jerusalem"], publicationCount: "400+", notableWork: "Discovered the endocannabinoid system \, foundation for all cannabinoid supplement recommendations" },
];

// ═══ VITAMINS & MINERALS / MICRONUTRIENT THERAPY ═══
export const MICRONUTRIENT_EXPERTS: ExpertAuthority[] = [
  { id: "bailey", name: "Regan Bailey, PhD, MPH, RD", credentials: "PhD, MPH, RD", country: "USA", specialty: "Micronutrient Epidemiology & Personalized Supplementation", domain: "vitamins_minerals", keyContributions: ["Formerly NIH Office of Dietary Supplements", "NHANES micronutrient analysis", "Bridges vitamins/minerals with genomics"], affiliations: ["Purdue University", "NIH ODS (former)"], publicationCount: "150+", notableWork: "Established epidemiological framework for identifying micronutrient gaps" },
  { id: "holick", name: "Michael F. Holick, MD, PhD", credentials: "MD, PhD", country: "USA", specialty: "Vitamin D Metabolism & Deficiency", domain: "vitamins_minerals", keyContributions: ["World's leading vitamin D authority", "Discovered active form of vitamin D", "Research on VDR genetic variants"], affiliations: ["Boston University School of Medicine"], publicationCount: "500+", notableWork: "Defined how VDR genetic variants determine individual vitamin D requirements" },
  { id: "ames", name: "Bruce Ames, PhD", credentials: "PhD", country: "USA", specialty: "Micronutrient Triage Theory & Aging", domain: "vitamins_minerals", keyContributions: ["Developed Triage Theory of micronutrient allocation", "Pioneer in subclinical deficiencies and aging", "Research on genetic variants and nutrient priorities"], affiliations: ["UC Berkeley", "CHORI"], publicationCount: "550+", notableWork: "Created Triage Theory explaining why subclinical nutrient deficiencies cause long-term disease" },
];

// ═══ UNIFIED EXPORTS ═══
export const ALL_EXPERTS = [...NUTRITIONAL_GENOMICS_EXPERTS, ...PEPTIDE_SCIENCE_EXPERTS, ...FUNCTIONAL_MEDICINE_EXPERTS, ...TCM_EXPERTS, ...AYURVEDIC_EXPERTS, ...HERBAL_MEDICINE_EXPERTS, ...CANNABIS_SCIENCE_EXPERTS, ...MICRONUTRIENT_EXPERTS];

export const DOMAIN_CONFIG: Record<string, { label: string; shortLabel: string; color: string }> = {
  nutritional_genomics: { label: "Nutritional Genomics", shortLabel: "Genomics", color: "teal-400" },
  peptide_science: { label: "Peptide Science", shortLabel: "Peptide", color: "purple-400" },
  functional_medicine: { label: "Functional Medicine", shortLabel: "Functional", color: "blue-400" },
  tcm: { label: "Traditional Chinese Medicine", shortLabel: "TCM", color: "red-400" },
  ayurvedic: { label: "Ayurvedic Medicine", shortLabel: "Ayurveda", color: "amber-400" },
  herbal_medicine: { label: "Herbal Medicine", shortLabel: "Herbal", color: "emerald-400" },
  cannabis_science: { label: "Cannabinoid Science", shortLabel: "Cannabis", color: "green-400" },
  vitamins_minerals: { label: "Vitamins & Minerals", shortLabel: "Micronutrient", color: "orange-400" },
};

export const EXPERT_BY_ID = Object.fromEntries(ALL_EXPERTS.map(e => [e.id, e]));

export function getExpertsByDomain(domain: string): ExpertAuthority[] {
  return ALL_EXPERTS.filter(e => e.domain === domain);
}

export function getExpertsForRecommendation(productName: string, geneNutrientPairs?: string[]): ExpertAuthority[] {
  const matched: ExpertAuthority[] = [];
  const n = productName.toLowerCase();
  const add = (id: string) => { const e = EXPERT_BY_ID[id]; if (e && !matched.find(m => m.id === id)) matched.push(e); };

  // Gene-nutrient pair matching
  if (geneNutrientPairs) {
    for (const expert of NUTRITIONAL_GENOMICS_EXPERTS) {
      if (expert.relevantGeneNutrientPairs?.some(p => geneNutrientPairs.some(gnp => p.toLowerCase().includes(gnp.toLowerCase())))) add(expert.id);
    }
  }

  // Product category matching
  if (n.includes("omega") || n.includes("dha") || n.includes("epa")) { add("simopoulos"); add("ordovas"); }
  if (n.includes("methyl") || n.includes("folate") || n.includes("b12") || n.includes("b complex")) { add("joffe"); add("kohlmeier"); }
  if (n.includes("vitamin d")) { add("el-sohemy"); add("holick"); }
  if (n.includes("peptide") || n.includes("bpc") || n.includes("thymosin")) { add("seeds"); add("yurth"); }
  if (n.includes("collagen")) { add("fields"); }
  if (n.includes("ashwagandha") || n.includes("rhodiola") || n.includes("adaptogen") || n.includes("holy basil")) { add("winston"); add("blumenthal"); }
  if (n.includes("turmeric") || n.includes("curcumin") || n.includes("milk thistle") || n.includes("echinacea")) { add("blumenthal"); add("low-dog"); }
  if (n.includes("cbd") || n.includes("cbg") || n.includes("cannabin") || n.includes("cannabis")) { add("grant"); add("mechoulam"); }
  if (n.includes("magnesium") || n.includes("zinc") || n.includes("selenium") || n.includes("iron")) { add("bailey"); add("ames"); }
  if (n.includes("coq10") || n.includes("nad") || n.includes("mitochon")) { add("ames"); add("bland"); }
  if (n.includes("probiotic") || n.includes("gut") || n.includes("digestive")) { add("hyman"); add("bland"); }

  return matched.filter(Boolean).slice(0, 5);
}
