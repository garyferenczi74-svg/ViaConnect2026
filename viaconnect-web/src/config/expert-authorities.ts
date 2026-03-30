// Expert Authority Database — Nutritional Genomics + Peptide Science

export interface ExpertAuthority {
  id: string;
  name: string;
  credentials: string;
  country: string;
  specialty: string;
  domain: "nutritional_genomics" | "peptide_science";
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

export const ALL_EXPERTS = [...NUTRITIONAL_GENOMICS_EXPERTS, ...PEPTIDE_SCIENCE_EXPERTS];

// Map gene-nutrient pairs to relevant experts
export function getExpertsForRecommendation(productName: string, geneNutrientPairs?: string[]): ExpertAuthority[] {
  const matched: ExpertAuthority[] = [];
  const nameLower = productName.toLowerCase();

  // Match by gene-nutrient pairs
  if (geneNutrientPairs) {
    for (const expert of NUTRITIONAL_GENOMICS_EXPERTS) {
      if (expert.relevantGeneNutrientPairs?.some(p => geneNutrientPairs.some(gnp => p.toLowerCase().includes(gnp.toLowerCase())))) {
        matched.push(expert);
      }
    }
  }

  // Match by product category
  if (nameLower.includes("omega") || nameLower.includes("dha") || nameLower.includes("epa")) {
    if (!matched.find(e => e.id === "simopoulos")) matched.push(NUTRITIONAL_GENOMICS_EXPERTS.find(e => e.id === "simopoulos")!);
    if (!matched.find(e => e.id === "ordovas")) matched.push(NUTRITIONAL_GENOMICS_EXPERTS.find(e => e.id === "ordovas")!);
  }
  if (nameLower.includes("methyl") || nameLower.includes("folate") || nameLower.includes("b12") || nameLower.includes("b complex")) {
    if (!matched.find(e => e.id === "joffe")) matched.push(NUTRITIONAL_GENOMICS_EXPERTS.find(e => e.id === "joffe")!);
    if (!matched.find(e => e.id === "kohlmeier")) matched.push(NUTRITIONAL_GENOMICS_EXPERTS.find(e => e.id === "kohlmeier")!);
  }
  if (nameLower.includes("vitamin d")) {
    if (!matched.find(e => e.id === "el-sohemy")) matched.push(NUTRITIONAL_GENOMICS_EXPERTS.find(e => e.id === "el-sohemy")!);
  }
  if (nameLower.includes("peptide") || nameLower.includes("bpc") || nameLower.includes("thymosin")) {
    matched.push(PEPTIDE_SCIENCE_EXPERTS.find(e => e.id === "seeds")!);
    matched.push(PEPTIDE_SCIENCE_EXPERTS.find(e => e.id === "yurth")!);
  }
  if (nameLower.includes("collagen")) {
    matched.push(PEPTIDE_SCIENCE_EXPERTS.find(e => e.id === "fields")!);
  }

  return matched.filter(Boolean).slice(0, 4);
}
