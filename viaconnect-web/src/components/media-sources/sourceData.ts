// =============================================================================
// ViaConnect Media Sources — Complete 49-Source Definition File
// =============================================================================

export interface MediaSource {
  id: string;
  name: string;
  description: string;
  category: SourceCategory;
  tags: string[];
  color: string;
  icon: string;
  logoUrl: string | null;
  logoType: "square" | "wide" | "round";
  url: string;
  rssUrl: string | null;
  mockHeadlines: { title: string; date: string; summary: string }[];
}

export interface SocialPlatformSource extends MediaSource {
  platformType: string;
  curatedAccounts?: { handle: string; description: string; followers: string }[];
  curatedCommunities?: { handle: string; description: string; members: string }[];
}

export const CATEGORIES = [
  "All",
  "News",
  "Journals",
  "Nutrition",
  "Nutrigenomics",
  "Hormones",
  "Telomeres",
  "Peptides",
  "Cannabis",
  "Cancer",
  "Methylation",
  "Lifestyle",
  "Wellness",
  "Platforms",
] as const;

export type SourceCategory = (typeof CATEGORIES)[number];

export const SOURCES: (MediaSource | SocialPlatformSource)[] = [
  // ===========================================================================
  // NEWS (2)
  // ===========================================================================
  {
    id: "nutraingredients",
    name: "NutraIngredients",
    description: "Leading news source for the dietary supplements and functional food industry across global markets.",
    category: "News",
    tags: ["Supplements", "Functional Foods", "Industry News", "Regulation"],
    color: "#2DA5A0",
    icon: "NI",
    logoUrl: "https://logo.clearbit.com/nutraingredients.com",
    logoType: "wide",
    url: "https://www.nutraingredients.com",
    rssUrl: "https://www.nutraingredients.com/rss",
    mockHeadlines: [
      {
        title: "Global Supplement Market to Reach $300B by 2028",
        date: "2026-03-25",
        summary: "New market analysis projects rapid growth driven by personalized nutrition and AI-powered formulations.",
      },
      {
        title: "EU Regulatory Update: Novel Food Approvals Accelerate",
        date: "2026-03-22",
        summary: "European Commission streamlines approval process for bioactive compounds and functional ingredients.",
      },
      {
        title: "Ashwagandha Demand Surges Amid Clinical Trial Confirmations",
        date: "2026-03-18",
        summary: "Multiple RCTs validate adaptogenic benefits, driving 40% YoY increase in raw material sourcing.",
      },
    ],
  },
  {
    id: "nutraworld",
    name: "Nutraceutical World",
    description: "Industry publication covering nutraceutical manufacturing, formulation, and market trends.",
    category: "News",
    tags: ["Nutraceuticals", "Manufacturing", "Market Trends", "Formulation"],
    color: "#F59E0B",
    icon: "NW",
    logoUrl: "https://logo.clearbit.com/nutraceuticalsworld.com",
    logoType: "wide",
    url: "https://www.nutraceuticalsworld.com",
    rssUrl: "https://www.nutraceuticalsworld.com/rss",
    mockHeadlines: [
      {
        title: "Liposomal Delivery Systems Revolutionize Bioavailability",
        date: "2026-03-25",
        summary: "Next-gen encapsulation technologies achieve 8x absorption rates for traditionally low-bioavailability nutrients.",
      },
      {
        title: "Clean Label Movement Reshapes Supplement Formulation",
        date: "2026-03-22",
        summary: "Consumer demand for transparency drives 60% of manufacturers to eliminate artificial excipients.",
      },
      {
        title: "Contract Manufacturing Capacity Expands in North America",
        date: "2026-03-19",
        summary: "Three major CDMOs announce $500M combined investment in GMP-certified production facilities.",
      },
    ],
  },

  // ===========================================================================
  // JOURNALS (5)
  // ===========================================================================
  {
    id: "examine",
    name: "Examine.com",
    description: "Independent, evidence-based resource analyzing the latest research on supplements and nutrition.",
    category: "Journals",
    tags: ["Evidence-Based", "Supplements", "Clinical Research", "Meta-Analysis"],
    color: "#60A5FA",
    icon: "Ex",
    logoUrl: "https://logo.clearbit.com/examine.com",
    logoType: "square",
    url: "https://examine.com",
    rssUrl: "https://examine.com/rss",
    mockHeadlines: [
      {
        title: "Vitamin D and Immune Function: 2026 Meta-Analysis Update",
        date: "2026-03-24",
        summary: "Comprehensive review of 47 RCTs confirms dose-dependent immune modulation with optimal ranges identified.",
      },
      {
        title: "Creatine Beyond Muscle: Cognitive Benefits Confirmed",
        date: "2026-03-20",
        summary: "New systematic review shows significant cognitive enhancement in sleep-deprived and aging populations.",
      },
      {
        title: "Magnesium Glycinate vs. Threonate: Head-to-Head Comparison",
        date: "2026-03-16",
        summary: "First direct comparison trial reveals distinct neurological and systemic bioavailability profiles.",
      },
    ],
  },
  {
    id: "sciencedaily",
    name: "ScienceDaily",
    description: "Top science news aggregator covering breakthroughs in health, nutrition, and biomedical research.",
    category: "Journals",
    tags: ["Research News", "Health Science", "Biomedical", "Breakthroughs"],
    color: "#818CF8",
    icon: "SD",
    logoUrl: "https://logo.clearbit.com/sciencedaily.com",
    logoType: "wide",
    url: "https://www.sciencedaily.com",
    rssUrl: "https://www.sciencedaily.com/rss",
    mockHeadlines: [
      {
        title: "Gut Microbiome Diversity Linked to Longevity in New Study",
        date: "2026-03-26",
        summary: "Researchers identify specific microbial signatures associated with healthy aging in 10,000-person cohort.",
      },
      {
        title: "AI Discovers New Anti-Inflammatory Compounds in Common Foods",
        date: "2026-03-21",
        summary: "Machine learning model identifies 12 previously unknown bioactive compounds with therapeutic potential.",
      },
      {
        title: "Omega-3 Timing Matters: Morning Intake Shows Superior Absorption",
        date: "2026-03-17",
        summary: "Chronobiology study reveals 35% higher EPA/DHA plasma levels with AM dosing vs PM administration.",
      },
    ],
  },
  {
    id: "pubmed",
    name: "PubMed Central",
    description: "Free full-text archive of biomedical and life sciences journal literature from the NIH/NLM.",
    category: "Journals",
    tags: ["Peer-Reviewed", "Biomedical", "Clinical Trials", "Open Access"],
    color: "#27AE60",
    icon: "PM",
    logoUrl: "https://logo.clearbit.com/pubmed.ncbi.nlm.nih.gov",
    logoType: "square",
    url: "https://pubmed.ncbi.nlm.nih.gov",
    rssUrl: "https://pubmed.ncbi.nlm.nih.gov/rss",
    mockHeadlines: [
      {
        title: "Quercetin as Senolytic Agent: Phase II Trial Results Published",
        date: "2026-03-26",
        summary: "Randomized controlled trial demonstrates significant senescent cell clearance in osteoarthritis patients.",
      },
      {
        title: "NAD+ Precursors and Mitochondrial Function: Systematic Review",
        date: "2026-03-23",
        summary: "Analysis of 31 clinical studies maps dose-response relationships for NMN and NR supplementation.",
      },
      {
        title: "Berberine Glycemic Control Rivals Metformin in T2D Patients",
        date: "2026-03-19",
        summary: "Multi-center trial shows comparable HbA1c reduction with fewer gastrointestinal side effects.",
      },
    ],
  },
  {
    id: "nutrients",
    name: "Nutrients (MDPI)",
    description: "Open access peer-reviewed journal publishing research on human nutrition and nutritional science.",
    category: "Journals",
    tags: ["Peer-Reviewed", "Nutrition Science", "Open Access", "Human Studies"],
    color: "#A78BFA",
    icon: "NT",
    logoUrl: "https://logo.clearbit.com/mdpi.com",
    logoType: "square",
    url: "https://www.mdpi.com/journal/nutrients",
    rssUrl: "https://www.mdpi.com/journal/nutrients/rss",
    mockHeadlines: [
      {
        title: "Polyphenol-Rich Diets Reduce Cardiovascular Risk Markers by 28%",
        date: "2026-03-24",
        summary: "12-month intervention study shows significant improvement in endothelial function and lipid profiles.",
      },
      {
        title: "Zinc and Copper Balance: Critical for Immune Optimization",
        date: "2026-03-20",
        summary: "Review highlights importance of Zn:Cu ratio in immune cell differentiation and pathogen response.",
      },
      {
        title: "Fermented Foods and Mental Health: Gut-Brain Axis Evidence Grows",
        date: "2026-03-15",
        summary: "Prospective cohort study links daily fermented food intake to 32% lower depression risk scores.",
      },
    ],
  },
  {
    id: "nih-ods",
    name: "NIH Office of Dietary Supplements",
    description: "Authoritative federal resource for dietary supplement fact sheets, research, and safety data.",
    category: "Journals",
    tags: ["Government", "Safety Data", "Fact Sheets", "Reference"],
    color: "#2DD4BF",
    icon: "NIH",
    logoUrl: "https://logo.clearbit.com/nih.gov",
    logoType: "square",
    url: "https://ods.od.nih.gov",
    rssUrl: "https://ods.od.nih.gov/rss",
    mockHeadlines: [
      {
        title: "Updated Dietary Supplement Fact Sheet: Vitamin K2",
        date: "2026-03-25",
        summary: "Comprehensive revision includes new RDA recommendations and MK-7 vs MK-4 bioavailability data.",
      },
      {
        title: "NIH Launches $50M Research Initiative on Adaptogenic Herbs",
        date: "2026-03-21",
        summary: "Five-year program will fund rigorous clinical trials on ashwagandha, rhodiola, and holy basil.",
      },
      {
        title: "Safety Alert: Interactions Between Supplements and GLP-1 Medications",
        date: "2026-03-18",
        summary: "New guidance issued on nutrient absorption changes in patients taking semaglutide and tirzepatide.",
      },
    ],
  },

  // ===========================================================================
  // NUTRITION (5)
  // ===========================================================================
  {
    id: "nutrition-journal",
    name: "American Journal of Clinical Nutrition",
    description: "Premier peer-reviewed journal publishing original research on human nutrition and dietetics.",
    category: "Nutrition",
    tags: ["Clinical Nutrition", "Peer-Reviewed", "Human Studies", "Dietetics"],
    color: "#27AE60",
    icon: "AJCN",
    logoUrl: "https://logo.clearbit.com/academic.oup.com",
    logoType: "wide",
    url: "https://academic.oup.com/ajcn",
    rssUrl: "https://academic.oup.com/ajcn/rss",
    mockHeadlines: [
      {
        title: "High-Protein Diets and Kidney Function: 5-Year Follow-Up Data",
        date: "2026-03-25",
        summary: "Longitudinal study of 8,000 adults shows no adverse renal effects at intakes up to 2.0g/kg in healthy individuals.",
      },
      {
        title: "Time-Restricted Eating Improves Metabolic Markers Independent of Calorie Reduction",
        date: "2026-03-21",
        summary: "Controlled feeding study demonstrates 16:8 protocol benefits mediated by circadian alignment, not energy deficit.",
      },
      {
        title: "Maternal DHA Supplementation Linked to Offspring Cognitive Gains at Age 7",
        date: "2026-03-17",
        summary: "Follow-up of prenatal omega-3 RCT reveals sustained improvements in executive function and reading scores.",
      },
    ],
  },
  {
    id: "nutrition-reviews",
    name: "Nutrition Reviews",
    description: "Authoritative review journal synthesizing the latest advances in nutritional science.",
    category: "Nutrition",
    tags: ["Review Articles", "Nutrition Science", "Systematic Reviews", "Evidence Synthesis"],
    color: "#059669",
    icon: "NR",
    logoUrl: "https://logo.clearbit.com/academic.oup.com",
    logoType: "wide",
    url: "https://academic.oup.com/nutritionreviews",
    rssUrl: "https://academic.oup.com/nutritionreviews/rss",
    mockHeadlines: [
      {
        title: "Systematic Review: Probiotics and Atopic Dermatitis in Children",
        date: "2026-03-24",
        summary: "Meta-analysis of 29 RCTs identifies Lactobacillus rhamnosus GG as most effective strain for eczema prevention.",
      },
      {
        title: "Ultra-Processed Foods and All-Cause Mortality: Updated Evidence",
        date: "2026-03-20",
        summary: "Dose-response analysis across 14 cohort studies quantifies 14% increased risk per 10% UPF energy increment.",
      },
      {
        title: "Plant-Based Protein Quality Scoring: Beyond PDCAAS",
        date: "2026-03-16",
        summary: "Comprehensive review proposes new digestible indispensable amino acid score framework for plant proteins.",
      },
    ],
  },
  {
    id: "clinical-nutrition-espen",
    name: "Clinical Nutrition ESPEN",
    description: "European Society for Clinical Nutrition and Metabolism journal focused on clinical nutrition practice.",
    category: "Nutrition",
    tags: ["Clinical Practice", "ESPEN", "Medical Nutrition", "Patient Care"],
    color: "#10B981",
    icon: "CN",
    logoUrl: "https://logo.clearbit.com/espen.org",
    logoType: "wide",
    url: "https://www.clinicalnutritionespen.com",
    rssUrl: "https://www.clinicalnutritionespen.com/rss",
    mockHeadlines: [
      {
        title: "Immunonutrition in Cancer Surgery: Updated ESPEN Guidelines",
        date: "2026-03-26",
        summary: "New recommendations advocate arginine and omega-3 enriched formulas for 7 days pre-operatively in GI cancer.",
      },
      {
        title: "Sarcopenia Screening in Hospitalized Elderly: Nutrition Intervention Outcomes",
        date: "2026-03-22",
        summary: "Multi-center trial shows early HMB plus protein supplementation reduces length of stay by 2.3 days.",
      },
      {
        title: "Ketogenic Diet in Drug-Resistant Epilepsy: Long-Term Nutritional Safety",
        date: "2026-03-18",
        summary: "10-year follow-up confirms adequate growth and bone health with properly managed ketogenic protocols.",
      },
    ],
  },
  {
    id: "precision-nutrition",
    name: "Precision Nutrition",
    description: "Evidence-based nutrition coaching platform bridging research and practical application.",
    category: "Nutrition",
    tags: ["Coaching", "Practical Application", "Evidence-Based", "Behavior Change"],
    color: "#34D399",
    icon: "PN",
    logoUrl: "https://logo.clearbit.com/precisionnutrition.com",
    logoType: "wide",
    url: "https://www.precisionnutrition.com",
    rssUrl: "https://www.precisionnutrition.com/blog/feed",
    mockHeadlines: [
      {
        title: "The Science of Habit Formation: Why 90% of Diets Fail",
        date: "2026-03-25",
        summary: "Behavioral analysis reveals identity-based habit loops outperform willpower-driven approaches by 4:1.",
      },
      {
        title: "Coaching Through Menopause: Nutrition Strategies That Actually Work",
        date: "2026-03-21",
        summary: "Practitioner guide covers phytoestrogen timing, calcium needs, and protein optimization for perimenopause.",
      },
      {
        title: "Hand-Based Portion System Validated Against Weighed Food Records",
        date: "2026-03-17",
        summary: "Study of 1,200 adults confirms hand-portion method achieves 90% accuracy for macronutrient tracking.",
      },
    ],
  },
  {
    id: "food-nutrition-research",
    name: "Food & Nutrition Research",
    description: "Open access journal covering food science, nutrition, and dietary research methodology.",
    category: "Nutrition",
    tags: ["Food Science", "Open Access", "Dietary Research", "Methodology"],
    color: "#6EE7B7",
    icon: "FNR",
    logoUrl: null,
    logoType: "square",
    url: "https://foodandnutritionresearch.net",
    rssUrl: "https://foodandnutritionresearch.net/index.php/fnr/gateway/plugin/WebFeedGatewayPlugin/rss2",
    mockHeadlines: [
      {
        title: "Bioactive Peptides from Fermented Dairy: Beyond Calcium",
        date: "2026-03-24",
        summary: "Identification of ACE-inhibitory and antioxidant peptides in kefir and aged cheese varieties.",
      },
      {
        title: "Dietary Assessment in the Digital Age: AI Food Photography Accuracy",
        date: "2026-03-20",
        summary: "Validation study shows AI-powered photo analysis estimates energy intake within 8% of doubly labeled water.",
      },
      {
        title: "Nordic Diet and Inflammatory Markers: 6-Month Intervention",
        date: "2026-03-16",
        summary: "Randomized trial demonstrates significant CRP and IL-6 reduction with traditional Nordic dietary pattern.",
      },
    ],
  },

  // ===========================================================================
  // NUTRIGENOMICS (2)
  // ===========================================================================
  {
    id: "foundmyfitness",
    name: "FoundMyFitness",
    description: "Dr. Rhonda Patrick's platform exploring nutrigenomics, aging science, and personalized health.",
    category: "Nutrigenomics",
    tags: ["Nutrigenomics", "Longevity", "Personalized Health", "Genetics"],
    color: "#FB7185",
    icon: "FMF",
    logoUrl: "https://logo.clearbit.com/foundmyfitness.com",
    logoType: "square",
    url: "https://www.foundmyfitness.com",
    rssUrl: "https://www.foundmyfitness.com/rss",
    mockHeadlines: [
      {
        title: "MTHFR Variants and Folate Metabolism: Practical Supplementation Guide",
        date: "2026-03-26",
        summary: "Detailed analysis of methylfolate dosing strategies based on C677T and A1298C genotype combinations.",
      },
      {
        title: "Sulforaphane Activates Nrf2 Pathway: New Dose-Response Data",
        date: "2026-03-22",
        summary: "Broccoli sprout extract study reveals optimal dosing window for maximum antioxidant gene activation.",
      },
      {
        title: "Sauna Use and Heat Shock Proteins: Longevity Mechanism Explained",
        date: "2026-03-17",
        summary: "Molecular pathway analysis shows how regular heat exposure triggers cellular repair and autophagy.",
      },
    ],
  },
  {
    id: "conversation-nutrigenomics",
    name: "The Conversation – Nutrigenomics",
    description: "Academic experts provide accessible analysis of nutrigenomics and gene-diet interaction research.",
    category: "Nutrigenomics",
    tags: ["Nutrigenomics", "Gene-Diet", "Academic", "Science Communication"],
    color: "#D4721F",
    icon: "TC",
    logoUrl: "https://logo.clearbit.com/theconversation.com",
    logoType: "wide",
    url: "https://theconversation.com/topics/nutrigenomics",
    rssUrl: "https://theconversation.com/topics/nutrigenomics/rss",
    mockHeadlines: [
      {
        title: "Why Your DNA Determines Whether Coffee Is Good for You",
        date: "2026-03-24",
        summary: "CYP1A2 gene variants create dramatically different caffeine metabolism profiles affecting heart health.",
      },
      {
        title: "Nutrigenomics Is Making One-Size-Fits-All Diets Obsolete",
        date: "2026-03-19",
        summary: "Growing evidence shows genetic variation accounts for 40-60% of individual dietary response differences.",
      },
      {
        title: "The Promise and Pitfalls of DNA-Based Nutrition Apps",
        date: "2026-03-14",
        summary: "Expert analysis of commercial nutrigenomic testing accuracy and the gap between science and marketing.",
      },
    ],
  },

  // ===========================================================================
  // HORMONES (4)
  // ===========================================================================
  {
    id: "jcem-hormones",
    name: "Journal of Clinical Endocrinology & Metabolism",
    description: "Leading endocrinology journal publishing clinical research on hormones and metabolic disorders.",
    category: "Hormones",
    tags: ["Endocrinology", "Hormones", "Clinical Research", "Metabolism"],
    color: "#F472B6",
    icon: "JCEM",
    logoUrl: "https://logo.clearbit.com/academic.oup.com",
    logoType: "wide",
    url: "https://academic.oup.com/jcem",
    rssUrl: "https://academic.oup.com/jcem/rss",
    mockHeadlines: [
      {
        title: "Testosterone Replacement Therapy: 10-Year Cardiovascular Safety Data",
        date: "2026-03-26",
        summary: "Landmark long-term study confirms no increased CV risk in hypogonadal men with properly managed TRT.",
      },
      {
        title: "Cortisol Awakening Response Predicts Metabolic Syndrome Risk",
        date: "2026-03-22",
        summary: "Prospective study of 5,000 adults links flattened CAR to 2.3x higher risk of developing metabolic syndrome.",
      },
      {
        title: "Growth Hormone Secretagogues: Ipamorelin Safety Profile in Adults",
        date: "2026-03-18",
        summary: "Phase II trial demonstrates favorable safety with significant IGF-1 elevation and body composition improvement.",
      },
    ],
  },
  {
    id: "hormones-journal",
    name: "Hormones (SRCE)",
    description: "International journal of endocrinology and metabolism publishing translational research.",
    category: "Hormones",
    tags: ["Endocrinology", "Translational Research", "Metabolism", "Hormonal Disorders"],
    color: "#EC4899",
    icon: "HJ",
    logoUrl: null,
    logoType: "square",
    url: "https://link.springer.com/journal/42000",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Insulin Resistance and Brain Health: The Hormonal Connection",
        date: "2026-03-25",
        summary: "Review maps insulin signaling pathways in the CNS and implications for neurodegenerative disease prevention.",
      },
      {
        title: "Melatonin Beyond Sleep: Antioxidant and Immunomodulatory Roles",
        date: "2026-03-21",
        summary: "Comprehensive analysis reveals melatonin as master regulator of mitochondrial function and redox balance.",
      },
      {
        title: "DHEA Supplementation in Adrenal Insufficiency: Updated Guidelines",
        date: "2026-03-17",
        summary: "Evidence synthesis supports 25-50mg daily DHEA for quality of life improvement in adrenal-insufficient patients.",
      },
    ],
  },
  {
    id: "thyroid-research",
    name: "Thyroid Research",
    description: "Open access journal dedicated to thyroid physiology, disease, and therapeutic advances.",
    category: "Hormones",
    tags: ["Thyroid", "Autoimmune", "Open Access", "Endocrine Research"],
    color: "#DB2777",
    icon: "THY",
    logoUrl: null,
    logoType: "square",
    url: "https://thyroidresearchjournal.biomedcentral.com",
    rssUrl: "https://thyroidresearchjournal.biomedcentral.com/articles/most-recent/rss.xml",
    mockHeadlines: [
      {
        title: "Selenium and Hashimoto's Thyroiditis: Optimal Dosing Established",
        date: "2026-03-24",
        summary: "Multi-center RCT identifies 200mcg selenomethionine as optimal dose for TPO antibody reduction.",
      },
      {
        title: "Subclinical Hypothyroidism: To Treat or Monitor? New Decision Framework",
        date: "2026-03-20",
        summary: "Algorithm integrating TSH level, age, symptoms, and cardiovascular risk guides treatment initiation.",
      },
      {
        title: "Iodine Status Worldwide: 2026 Global Survey Results",
        date: "2026-03-16",
        summary: "WHO-partnered study reveals persistent deficiency in 32 countries despite salt iodization programs.",
      },
    ],
  },
  {
    id: "endocrine-society-news",
    name: "Endocrine Society News",
    description: "Professional society news covering endocrinology practice guidelines and research highlights.",
    category: "Hormones",
    tags: ["Professional Society", "Practice Guidelines", "Endocrinology", "CME"],
    color: "#FDA4AF",
    icon: "ES",
    logoUrl: "https://logo.clearbit.com/endocrine.org",
    logoType: "wide",
    url: "https://www.endocrine.org/news-and-advocacy",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "New Clinical Practice Guideline: Management of Adrenal Incidentalomas",
        date: "2026-03-26",
        summary: "Updated recommendations incorporate AI imaging analysis and refined biochemical testing protocols.",
      },
      {
        title: "ENDO 2026 Preview: Key Sessions on Peptide Hormones",
        date: "2026-03-22",
        summary: "Annual meeting to feature 47 abstract presentations on GLP-1, GIP, and novel incretin therapies.",
      },
      {
        title: "Endocrine Disrupting Chemicals: Society Position Statement Updated",
        date: "2026-03-18",
        summary: "Strengthened recommendations on BPA, PFAS, and phthalate exposure limits based on new epidemiological data.",
      },
    ],
  },

  // ===========================================================================
  // TELOMERES (4)
  // ===========================================================================
  {
    id: "aging-cell",
    name: "Aging Cell",
    description: "High-impact journal focused on the biology of aging, telomere dynamics, and cellular senescence.",
    category: "Telomeres",
    tags: ["Aging Biology", "Telomeres", "Senescence", "Cellular Aging"],
    color: "#2DD4BF",
    icon: "AC",
    logoUrl: "https://logo.clearbit.com/onlinelibrary.wiley.com",
    logoType: "square",
    url: "https://onlinelibrary.wiley.com/journal/14749726",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Telomerase Activation by TA-65: 5-Year Longitudinal Results",
        date: "2026-03-25",
        summary: "Extended follow-up shows sustained telomere length maintenance and reduced immune senescence markers.",
      },
      {
        title: "Senolytic Combination Therapy Reverses Age-Related Organ Decline",
        date: "2026-03-21",
        summary: "Dasatinib plus quercetin protocol demonstrates multi-organ rejuvenation in aged mouse model.",
      },
      {
        title: "Exercise Intensity and Telomere Length: HIIT vs. Endurance Training",
        date: "2026-03-17",
        summary: "Comparative study reveals HIIT produces superior telomerase activation versus moderate continuous exercise.",
      },
    ],
  },
  {
    id: "geroscience",
    name: "GeroScience",
    description: "Interdisciplinary journal bridging gerontology and biomedical science on aging mechanisms.",
    category: "Telomeres",
    tags: ["Gerontology", "Aging Mechanisms", "Interventions", "Biogerontology"],
    color: "#14B8A6",
    icon: "GS",
    logoUrl: null,
    logoType: "square",
    url: "https://link.springer.com/journal/11357",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Rapamycin Analogs Extend Healthspan Without Immunosuppression",
        date: "2026-03-26",
        summary: "Novel mTOR inhibitor achieves anti-aging benefits at doses 100x lower than immunosuppressive threshold.",
      },
      {
        title: "Epigenetic Clocks Validated as Clinical Endpoints for Anti-Aging Trials",
        date: "2026-03-22",
        summary: "FDA advisory committee recognizes DNA methylation age as acceptable surrogate endpoint in longevity studies.",
      },
      {
        title: "Caloric Restriction Mimetics: Comparative Efficacy in Human Biomarkers",
        date: "2026-03-18",
        summary: "Head-to-head trial of resveratrol, metformin, and spermidine measures effects on aging hallmarks.",
      },
    ],
  },
  {
    id: "longevity-technology",
    name: "Longevity.Technology",
    description: "Industry news and analysis covering the longevity science and anti-aging therapeutics sector.",
    category: "Telomeres",
    tags: ["Longevity Industry", "Anti-Aging", "Biotech", "Investment"],
    color: "#5EEAD4",
    icon: "LT",
    logoUrl: "https://logo.clearbit.com/longevity.technology",
    logoType: "wide",
    url: "https://www.longevity.technology",
    rssUrl: "https://www.longevity.technology/feed/",
    mockHeadlines: [
      {
        title: "Longevity Biotech Funding Hits $8.2B in Q1 2026",
        date: "2026-03-25",
        summary: "Record investment driven by clinical successes in senolytics, gene therapy, and epigenetic reprogramming.",
      },
      {
        title: "Consumer Longevity Market: Blood Testing Kits Mainstream",
        date: "2026-03-21",
        summary: "At-home biological age testing reaches 10M users globally as preventive health awareness accelerates.",
      },
      {
        title: "Bryan Johnson's Blueprint Protocol: Independent Scientific Review",
        date: "2026-03-17",
        summary: "Panel of aging researchers evaluates evidence behind the comprehensive anti-aging supplementation regimen.",
      },
    ],
  },
  {
    id: "life-extension-foundation",
    name: "Life Extension Foundation",
    description: "Nonprofit organization providing research updates on longevity science and evidence-based protocols.",
    category: "Telomeres",
    tags: ["Longevity", "Protocols", "Supplements", "Anti-Aging Research"],
    color: "#99F6E4",
    icon: "LE",
    logoUrl: "https://logo.clearbit.com/lifeextension.com",
    logoType: "wide",
    url: "https://www.lifeextension.com",
    rssUrl: "https://www.lifeextension.com/rss",
    mockHeadlines: [
      {
        title: "Fisetin Senolytic Protocol: Dosing and Cycling Recommendations",
        date: "2026-03-24",
        summary: "Updated protocol based on human pharmacokinetic data recommends intermittent high-dose approach.",
      },
      {
        title: "Mitochondrial CoQ10 Levels Decline 65% by Age 80: Supplementation Guide",
        date: "2026-03-20",
        summary: "Age-stratified analysis establishes coenzyme Q10 dosing recommendations across the lifespan.",
      },
      {
        title: "Blood Biomarker Panel for Biological Age: Optimal Ranges Defined",
        date: "2026-03-16",
        summary: "Life Extension identifies 15-marker panel with target ranges for comprehensive aging assessment.",
      },
    ],
  },

  // ===========================================================================
  // PEPTIDES (2)
  // ===========================================================================
  {
    id: "drug-target-review",
    name: "Drug Target Review",
    description: "Publication covering therapeutic peptides, drug discovery, and pharmaceutical target identification.",
    category: "Peptides",
    tags: ["Peptides", "Drug Discovery", "Therapeutics", "Pharma"],
    color: "#8B5CF6",
    icon: "DTR",
    logoUrl: "https://logo.clearbit.com/drugtargetreview.com",
    logoType: "wide",
    url: "https://www.drugtargetreview.com",
    rssUrl: "https://www.drugtargetreview.com/rss",
    mockHeadlines: [
      {
        title: "BPC-157 Mechanism of Action Finally Elucidated in Human Trial",
        date: "2026-03-25",
        summary: "First-in-human study maps gastric pentadecapeptide signaling cascade for tissue repair and angiogenesis.",
      },
      {
        title: "GLP-1 Peptide Analogs: Next Generation Shows Oral Bioavailability",
        date: "2026-03-21",
        summary: "Novel cyclic peptide modification achieves 40% oral absorption, eliminating injection requirement.",
      },
      {
        title: "Antimicrobial Peptides as Alternative to Antibiotics: Clinical Progress",
        date: "2026-03-16",
        summary: "Phase III trials show synthetic defensin analogs effective against multi-drug resistant infections.",
      },
    ],
  },
  {
    id: "genscript",
    name: "GenScript Peptide News",
    description: "Peptide synthesis leader providing research updates on therapeutic and research-grade peptides.",
    category: "Peptides",
    tags: ["Peptide Synthesis", "Research", "Biotech", "Custom Peptides"],
    color: "#2DD4BF",
    icon: "GS",
    logoUrl: "https://logo.clearbit.com/genscript.com",
    logoType: "wide",
    url: "https://www.genscript.com/peptide-news",
    rssUrl: "https://www.genscript.com/peptide-news/rss",
    mockHeadlines: [
      {
        title: "Solid-Phase Peptide Synthesis Achieves 99.8% Purity at Scale",
        date: "2026-03-26",
        summary: "Breakthrough in SPPS methodology enables pharmaceutical-grade production of complex therapeutic peptides.",
      },
      {
        title: "Stapled Peptides Show Promise for Intracellular Targets",
        date: "2026-03-22",
        summary: "Hydrocarbon stapling technique creates cell-permeable peptides targeting previously undruggable proteins.",
      },
      {
        title: "AI-Designed Peptide Libraries Accelerate Drug Discovery 10x",
        date: "2026-03-18",
        summary: "Machine learning platform generates optimized peptide candidates with predicted binding affinities.",
      },
    ],
  },

  // ===========================================================================
  // CANNABIS (4)
  // ===========================================================================
  {
    id: "cannabis-cannabinoid-research",
    name: "Cannabis and Cannabinoid Research",
    description: "Peer-reviewed journal publishing original research on cannabis science, endocannabinoid system, and therapeutics.",
    category: "Cannabis",
    tags: ["Cannabis", "Cannabinoids", "Endocannabinoid System", "Peer-Reviewed"],
    color: "#4ADE80",
    icon: "CCR",
    logoUrl: null,
    logoType: "square",
    url: "https://www.liebertpub.com/loi/can",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "CBD and THC Ratio Optimization for Chronic Pain: Phase III Results",
        date: "2026-03-26",
        summary: "Multi-center trial identifies 20:1 CBD:THC ratio as optimal for neuropathic pain without psychoactive effects.",
      },
      {
        title: "Endocannabinoid Tone and Gut Health: Microbiome Interactions Mapped",
        date: "2026-03-22",
        summary: "Landmark study reveals bidirectional communication between gut bacteria and the endocannabinoid system.",
      },
      {
        title: "Minor Cannabinoids CBG and CBN: Therapeutic Potential Reviewed",
        date: "2026-03-18",
        summary: "Systematic review of 85 studies highlights CBG for inflammation and CBN for sleep without significant side effects.",
      },
    ],
  },
  {
    id: "project-cbd",
    name: "Project CBD",
    description: "Nonprofit educational platform providing science-based information about cannabidiol and cannabis therapeutics.",
    category: "Cannabis",
    tags: ["CBD", "Education", "Therapeutics", "Science Communication"],
    color: "#22C55E",
    icon: "CBD",
    logoUrl: "https://logo.clearbit.com/projectcbd.org",
    logoType: "wide",
    url: "https://www.projectcbd.org",
    rssUrl: "https://www.projectcbd.org/rss.xml",
    mockHeadlines: [
      {
        title: "Full-Spectrum vs. Isolate CBD: Entourage Effect Quantified",
        date: "2026-03-25",
        summary: "Comparative bioassay demonstrates 3.5x greater anti-inflammatory activity with whole-plant extracts.",
      },
      {
        title: "CBD Dosing Guide Updated: Condition-Specific Recommendations",
        date: "2026-03-21",
        summary: "Evidence-based dosing matrix covers anxiety, pain, epilepsy, and sleep with titration protocols.",
      },
      {
        title: "Cannabis Terpenes and Their Synergistic Effects with Cannabinoids",
        date: "2026-03-17",
        summary: "Myrcene, linalool, and beta-caryophyllene shown to modulate cannabinoid receptor binding and efficacy.",
      },
    ],
  },
  {
    id: "leafly-science",
    name: "Leafly Science",
    description: "Cannabis platform's science editorial covering research, strain chemistry, and medical applications.",
    category: "Cannabis",
    tags: ["Cannabis Science", "Strain Chemistry", "Medical Cannabis", "Consumer Education"],
    color: "#16A34A",
    icon: "LF",
    logoUrl: "https://logo.clearbit.com/leafly.com",
    logoType: "square",
    url: "https://www.leafly.com/news/science-tech",
    rssUrl: "https://www.leafly.com/news/science-tech/feed",
    mockHeadlines: [
      {
        title: "Chemotype Classification Replaces Indica/Sativa: What Consumers Need to Know",
        date: "2026-03-24",
        summary: "Terpene and cannabinoid profiling provides more accurate prediction of effects than traditional strain categories.",
      },
      {
        title: "Cannabis and Athletic Recovery: NFL-Sponsored Study Results",
        date: "2026-03-20",
        summary: "First professional sports league-funded study shows reduced NSAID use and improved sleep in athletes using CBD.",
      },
      {
        title: "State of Cannabis Testing: Lab Accuracy Varies Widely",
        date: "2026-03-16",
        summary: "Round-robin testing reveals 30% variance in THC potency results across certified laboratories.",
      },
    ],
  },
  {
    id: "icrs-cannabinoid",
    name: "ICRS Cannabinoid Research",
    description: "International Cannabinoid Research Society news covering cutting-edge endocannabinoid science.",
    category: "Cannabis",
    tags: ["ICRS", "Research Society", "Endocannabinoid", "Basic Science"],
    color: "#86EFAC",
    icon: "ICRS",
    logoUrl: null,
    logoType: "square",
    url: "https://www.icrs.co",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Novel Endocannabinoid Receptor CB3 Identified in Immune Cells",
        date: "2026-03-26",
        summary: "Discovery of third cannabinoid receptor opens new therapeutic pathways for autoimmune conditions.",
      },
      {
        title: "ICRS 2026 Symposium: Cannabinoids in Neurodegenerative Disease",
        date: "2026-03-22",
        summary: "Annual meeting highlights THC microdosing as neuroprotective strategy in early Alzheimer's models.",
      },
      {
        title: "Endocannabinoid Deficiency Syndrome: Diagnostic Criteria Proposed",
        date: "2026-03-18",
        summary: "Working group establishes clinical framework for identifying and treating clinical endocannabinoid deficiency.",
      },
    ],
  },

  // ===========================================================================
  // CANCER (4)
  // ===========================================================================
  {
    id: "nature-cancer",
    name: "Nature Cancer",
    description: "High-impact journal publishing cutting-edge research across all areas of cancer biology and treatment.",
    category: "Cancer",
    tags: ["Cancer Research", "Oncology", "Nature", "High-Impact"],
    color: "#FB923C",
    icon: "NC",
    logoUrl: "https://logo.clearbit.com/nature.com",
    logoType: "square",
    url: "https://www.nature.com/natcancer",
    rssUrl: "https://www.nature.com/natcancer.rss",
    mockHeadlines: [
      {
        title: "Fasting-Mimicking Diet Enhances Immunotherapy Response in Melanoma",
        date: "2026-03-26",
        summary: "Clinical trial shows 5-day FMD cycles before checkpoint inhibitor therapy increase response rate by 40%.",
      },
      {
        title: "Circulating Tumor DNA Detects Cancer Recurrence 9 Months Earlier Than Imaging",
        date: "2026-03-22",
        summary: "Multi-cancer ctDNA panel achieves 92% sensitivity for detecting minimal residual disease post-surgery.",
      },
      {
        title: "Vitamin C Infusion Potentiates PARP Inhibitor Efficacy in Ovarian Cancer",
        date: "2026-03-18",
        summary: "Phase II trial demonstrates synergistic DNA damage in BRCA-mutated tumors with IV ascorbate combination.",
      },
    ],
  },
  {
    id: "cancer-research-uk",
    name: "Cancer Research UK",
    description: "World's largest independent cancer research charity providing research news and patient information.",
    category: "Cancer",
    tags: ["Cancer Charity", "Patient Information", "Research Funding", "UK"],
    color: "#F97316",
    icon: "CRUK",
    logoUrl: "https://logo.clearbit.com/cancerresearchuk.org",
    logoType: "wide",
    url: "https://www.cancerresearchuk.org",
    rssUrl: "https://www.cancerresearchuk.org/rss",
    mockHeadlines: [
      {
        title: "Personalised Cancer Vaccines Enter NHS Trials for First Time",
        date: "2026-03-25",
        summary: "mRNA-based neoantigen vaccines begin Phase II testing across 15 NHS trusts for colorectal cancer.",
      },
      {
        title: "Mediterranean Diet Reduces Breast Cancer Risk by 25%: UK Biobank Analysis",
        date: "2026-03-21",
        summary: "Analysis of 150,000 women identifies olive oil polyphenols and fibre as key protective components.",
      },
      {
        title: "Cancer Screening Revolution: Blood Test Could Replace Colonoscopy",
        date: "2026-03-17",
        summary: "Multi-gene blood test achieves 94% sensitivity for early-stage colorectal cancer detection in UK trial.",
      },
    ],
  },
  {
    id: "oncotarget",
    name: "Oncotarget",
    description: "Open access journal covering oncology research with focus on translational science and novel therapies.",
    category: "Cancer",
    tags: ["Oncology", "Translational", "Open Access", "Novel Therapies"],
    color: "#EA580C",
    icon: "OT",
    logoUrl: "https://logo.clearbit.com/oncotarget.com",
    logoType: "wide",
    url: "https://www.oncotarget.com",
    rssUrl: "https://www.oncotarget.com/feed/",
    mockHeadlines: [
      {
        title: "Metformin Repurposing in Pancreatic Cancer: Microbiome-Mediated Mechanism",
        date: "2026-03-24",
        summary: "Study reveals metformin alters gut bacteria to produce anti-tumorigenic metabolites affecting pancreatic tissue.",
      },
      {
        title: "Curcumin Nanoformulation Overcomes Bioavailability Barrier in Glioblastoma",
        date: "2026-03-20",
        summary: "Blood-brain barrier-penetrating nanoparticle delivers therapeutic curcumin concentrations to brain tumors.",
      },
      {
        title: "Senescence-Associated Secretory Phenotype as Cancer Therapy Target",
        date: "2026-03-16",
        summary: "Targeting SASP factors with combination senolytics shows tumor microenvironment remodeling in solid tumors.",
      },
    ],
  },
  {
    id: "asco-news",
    name: "ASCO News & Research",
    description: "American Society of Clinical Oncology news covering practice-changing oncology research and guidelines.",
    category: "Cancer",
    tags: ["ASCO", "Clinical Oncology", "Guidelines", "Professional Society"],
    color: "#FDBA74",
    icon: "ASCO",
    logoUrl: "https://logo.clearbit.com/asco.org",
    logoType: "wide",
    url: "https://www.asco.org/news",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "ASCO Guideline Update: Integrative Oncology for Symptom Management",
        date: "2026-03-26",
        summary: "Updated recommendations endorse acupuncture, meditation, and specific supplements for cancer-related fatigue.",
      },
      {
        title: "Liquid Biopsy Consensus Statement: Standardization of ctDNA Testing",
        date: "2026-03-22",
        summary: "Expert panel establishes quality standards and clinical utility criteria for circulating tumor DNA assays.",
      },
      {
        title: "Nutrition and Cancer Survivorship: New ASCO Evidence-Based Resource",
        date: "2026-03-18",
        summary: "Comprehensive guide covers dietary recommendations across cancer types with emphasis on plant-forward eating.",
      },
    ],
  },

  // ===========================================================================
  // METHYLATION (3)
  // ===========================================================================
  {
    id: "epigenetics-journal",
    name: "Epigenetics Journal",
    description: "Peer-reviewed journal dedicated to epigenetic mechanisms including DNA methylation and histone modification.",
    category: "Methylation",
    tags: ["Epigenetics", "DNA Methylation", "Histone Modification", "Gene Regulation"],
    color: "#C084FC",
    icon: "EPI",
    logoUrl: null,
    logoType: "square",
    url: "https://www.tandfonline.com/journals/kepi20",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Methyl Donor Nutrients Reverse Age-Related Epigenetic Drift",
        date: "2026-03-26",
        summary: "Folate, B12, and betaine supplementation shown to restore youthful methylation patterns at 200+ CpG sites.",
      },
      {
        title: "Transgenerational Epigenetic Inheritance: Paternal Diet Affects Offspring",
        date: "2026-03-22",
        summary: "Study reveals father's methyl-donor intake at conception influences child's metabolic gene expression.",
      },
      {
        title: "Exercise-Induced Epigenetic Remodeling in Skeletal Muscle: Single-Cell Analysis",
        date: "2026-03-18",
        summary: "Single-cell methylome sequencing reveals exercise produces cell-type-specific epigenetic adaptations.",
      },
    ],
  },
  {
    id: "methylation-research",
    name: "Methylation Research Hub",
    description: "Specialized resource covering the latest findings in biological methylation pathways and clinical applications.",
    category: "Methylation",
    tags: ["Methylation", "One-Carbon Metabolism", "SAMe", "Clinical Applications"],
    color: "#A855F7",
    icon: "MTH",
    logoUrl: null,
    logoType: "square",
    url: "https://methylationresearch.com",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "SAMe Supplementation Protocol for MTHFR C677T Homozygotes",
        date: "2026-03-25",
        summary: "Clinical protocol establishes optimal SAMe dosing with cofactors for individuals with impaired methylation.",
      },
      {
        title: "Homocysteine as Independent Risk Factor: Evidence Now Overwhelming",
        date: "2026-03-21",
        summary: "Mendelian randomization study confirms causal relationship between elevated homocysteine and cardiovascular events.",
      },
      {
        title: "Choline Deficiency More Common Than Previously Thought: NHANES Update",
        date: "2026-03-17",
        summary: "National survey data reveals 92% of Americans fail to meet adequate intake for this essential methyl donor.",
      },
    ],
  },
  {
    id: "clinical-epigenetics",
    name: "Clinical Epigenetics",
    description: "Open access journal bridging epigenetic research and clinical medicine with translational focus.",
    category: "Methylation",
    tags: ["Clinical Epigenetics", "Translational", "Biomarkers", "Open Access"],
    color: "#D8B4FE",
    icon: "CE",
    logoUrl: null,
    logoType: "square",
    url: "https://clinicalepigeneticsjournal.biomedcentral.com",
    rssUrl: "https://clinicalepigeneticsjournal.biomedcentral.com/articles/most-recent/rss.xml",
    mockHeadlines: [
      {
        title: "DNA Methylation Biomarker Panel Predicts Cancer Risk 10 Years in Advance",
        date: "2026-03-24",
        summary: "Prospective validation of 14-marker panel achieves 89% accuracy for multi-cancer early risk stratification.",
      },
      {
        title: "Prenatal Methyl Donor Status and Autism Spectrum Disorder Risk",
        date: "2026-03-20",
        summary: "Case-control study identifies critical window for maternal folate and B12 supplementation effect on ASD risk.",
      },
      {
        title: "Green Tea EGCG Modulates DNA Methyltransferase Activity: Clinical Implications",
        date: "2026-03-16",
        summary: "Mechanistic study shows EGCG selectively inhibits DNMT1 activity at tumor suppressor gene promoters.",
      },
    ],
  },

  // ===========================================================================
  // LIFESTYLE (3)
  // ===========================================================================
  {
    id: "huberman-lab",
    name: "Huberman Lab",
    description: "Stanford neuroscientist Dr. Andrew Huberman's platform covering neuroscience-based health optimization.",
    category: "Lifestyle",
    tags: ["Neuroscience", "Health Optimization", "Protocols", "Science Communication"],
    color: "#60A5FA",
    icon: "HL",
    logoUrl: "https://logo.clearbit.com/hubermanlab.com",
    logoType: "square",
    url: "https://www.hubermanlab.com",
    rssUrl: "https://www.hubermanlab.com/rss",
    mockHeadlines: [
      {
        title: "Dopamine Optimization Protocol: Morning Routine Based on Neuroscience",
        date: "2026-03-26",
        summary: "Evidence-based morning protocol combining cold exposure, sunlight, and exercise for sustained dopamine release.",
      },
      {
        title: "Sleep Toolkit 2.0: Updated Supplement Stack and Behavioral Protocols",
        date: "2026-03-22",
        summary: "Revised recommendations add inositol and apigenin to magnesium threonate-based sleep optimization stack.",
      },
      {
        title: "Neuroplasticity and Learning: How to Rewire Your Brain at Any Age",
        date: "2026-03-18",
        summary: "Deep dive into BDNF, focus protocols, and deliberate practice strategies backed by current neuroscience.",
      },
    ],
  },
  {
    id: "biohackers-magazine",
    name: "Biohackers Magazine",
    description: "Publication covering biohacking, quantified self, and cutting-edge self-optimization strategies.",
    category: "Lifestyle",
    tags: ["Biohacking", "Quantified Self", "Optimization", "Technology"],
    color: "#3B82F6",
    icon: "BH",
    logoUrl: null,
    logoType: "square",
    url: "https://biohackersmagazine.com",
    rssUrl: "https://biohackersmagazine.com/feed/",
    mockHeadlines: [
      {
        title: "Continuous Glucose Monitors for Non-Diabetics: Useful or Overhyped?",
        date: "2026-03-25",
        summary: "Six-month n=500 study reveals CGMs help 73% of users identify and eliminate personal glycemic triggers.",
      },
      {
        title: "Red Light Therapy Deep Dive: Wavelengths, Dosing, and Device Comparison",
        date: "2026-03-21",
        summary: "Comprehensive review of PBM literature identifies 630-670nm and 810-850nm as optimal therapeutic windows.",
      },
      {
        title: "The Rise of At-Home Lab Testing: Building Your Personal Biomarker Dashboard",
        date: "2026-03-17",
        summary: "Guide to quarterly blood panels, hormone testing, and genetic testing for proactive health management.",
      },
    ],
  },
  {
    id: "examine-daily",
    name: "Examine Research Digest",
    description: "Examine.com's curated digest of the most impactful nutrition and supplement studies published weekly.",
    category: "Lifestyle",
    tags: ["Research Digest", "Curated", "Weekly", "Evidence Summaries"],
    color: "#93C5FD",
    icon: "ERD",
    logoUrl: "https://logo.clearbit.com/examine.com",
    logoType: "square",
    url: "https://examine.com/research-digest",
    rssUrl: "https://examine.com/research-digest/rss",
    mockHeadlines: [
      {
        title: "This Week in Research: Collagen Peptides, Ashwagandha, and Vitamin K2",
        date: "2026-03-26",
        summary: "Digest covers new collagen absorption study, KSM-66 cortisol data, and MK-7 arterial stiffness trial.",
      },
      {
        title: "Study Spotlight: Tongkat Ali Testosterone Effects in Aging Males",
        date: "2026-03-22",
        summary: "RCT of 200mg standardized extract shows 15% free testosterone increase in men over 50 after 12 weeks.",
      },
      {
        title: "Research Roundup: Probiotics, Sleep Quality, and Glycine Supplementation",
        date: "2026-03-18",
        summary: "Weekly analysis covers strain-specific probiotic sleep effects and glycine's role in core body temperature.",
      },
    ],
  },

  // ===========================================================================
  // WELLNESS (3)
  // ===========================================================================
  {
    id: "mercola",
    name: "Mercola",
    description: "Alternative health platform by Dr. Joseph Mercola covering natural health, supplements, and wellness.",
    category: "Wellness",
    tags: ["Alternative Health", "Natural Health", "Supplements", "Wellness"],
    color: "#F59E0B",
    icon: "MC",
    logoUrl: "https://logo.clearbit.com/mercola.com",
    logoType: "wide",
    url: "https://www.mercola.com",
    rssUrl: "https://www.mercola.com/rss",
    mockHeadlines: [
      {
        title: "Molecular Hydrogen: The Next Frontier in Antioxidant Therapy",
        date: "2026-03-26",
        summary: "Review of 100+ studies highlights H2 gas and hydrogen-rich water as selective antioxidant with zero toxicity.",
      },
      {
        title: "EMF Exposure and Mitochondrial Function: Protective Strategies",
        date: "2026-03-22",
        summary: "Analysis covers electromagnetic field effects on cellular energy production and practical mitigation steps.",
      },
      {
        title: "Fermented Vegetables vs. Probiotic Supplements: Which Delivers More?",
        date: "2026-03-18",
        summary: "Comparative analysis shows homemade ferments provide 100x more diverse organisms than commercial capsules.",
      },
    ],
  },
  {
    id: "healthline-nutrition",
    name: "Healthline Nutrition",
    description: "Evidence-based nutrition content reviewed by dietitians covering diet, supplements, and food science.",
    category: "Wellness",
    tags: ["Consumer Health", "Dietitian-Reviewed", "Nutrition Guides", "Accessibility"],
    color: "#EAB308",
    icon: "HL",
    logoUrl: "https://logo.clearbit.com/healthline.com",
    logoType: "wide",
    url: "https://www.healthline.com/nutrition",
    rssUrl: "https://www.healthline.com/nutrition/feed",
    mockHeadlines: [
      {
        title: "The 12 Best Supplements for Energy, According to Dietitians",
        date: "2026-03-25",
        summary: "Evidence-ranked guide covers CoQ10, iron, B12, creatine, and adaptogenic herbs for fatigue management.",
      },
      {
        title: "Seed Oils: Separating Science from Social Media Hype",
        date: "2026-03-21",
        summary: "Registered dietitians examine the evidence on omega-6 fatty acids, oxidation, and inflammatory claims.",
      },
      {
        title: "Gut Health 101: A Beginner's Guide to Prebiotics and Probiotics",
        date: "2026-03-17",
        summary: "Comprehensive guide covers strain selection, food sources, and evidence-based supplementation strategies.",
      },
    ],
  },
  {
    id: "mindbodygreen",
    name: "mindbodygreen",
    description: "Wellness media platform covering holistic health, nutrition, fitness, and mental wellbeing.",
    category: "Wellness",
    tags: ["Holistic Health", "Wellness Media", "Mind-Body", "Lifestyle"],
    color: "#FACC15",
    icon: "MBG",
    logoUrl: "https://logo.clearbit.com/mindbodygreen.com",
    logoType: "wide",
    url: "https://www.mindbodygreen.com",
    rssUrl: "https://www.mindbodygreen.com/rss",
    mockHeadlines: [
      {
        title: "Functional Medicine Doctors' Top 5 Supplements for 2026",
        date: "2026-03-26",
        summary: "Leading practitioners recommend magnesium, omega-3, vitamin D, probiotics, and adaptogenic mushrooms.",
      },
      {
        title: "The Connection Between Gut Health and Skin: Dermatologists Weigh In",
        date: "2026-03-22",
        summary: "Gut-skin axis research supports targeted probiotic strains for acne, eczema, and premature aging.",
      },
      {
        title: "Breathwork for Stress: How 5 Minutes a Day Changes Your Nervous System",
        date: "2026-03-18",
        summary: "HRV data shows cyclic sighing protocol shifts autonomic balance faster than meditation or cold exposure.",
      },
    ],
  },

  // ===========================================================================
  // SOCIAL (1 legacy)
  // ===========================================================================
  {
    id: "social-feeds",
    name: "Social Feeds",
    description: "Aggregated insights from nutrition and supplement thought leaders across social platforms.",
    category: "Platforms",
    tags: ["Social Media", "Thought Leaders", "Trending", "Community"],
    color: "#A0AEC0",
    icon: "SF",
    logoUrl: null,
    logoType: "round",
    url: "https://social.viaconnect.io",
    rssUrl: null,
    mockHeadlines: [
      {
        title: "Trending: Glycine + NAC Stack Gains Mainstream Attention",
        date: "2026-03-26",
        summary: "GlyNAC protocol goes viral after longevity researcher shares dramatic glutathione restoration results.",
      },
      {
        title: "Top KOLs Debate Optimal Protein Intake for Muscle Preservation Over 40",
        date: "2026-03-23",
        summary: "Leading nutrition influencers converge on 1.6-2.2g/kg recommendation with leucine threshold emphasis.",
      },
      {
        title: "Community Spotlight: Citizen Science Supplement Tracking Project",
        date: "2026-03-19",
        summary: "Open-source biomarker tracking initiative enrolls 50,000 participants sharing real-world supplement data.",
      },
    ],
  },

  // ===========================================================================
  // PLATFORMS (7 — SocialPlatformSource type)
  // ===========================================================================
  {
    id: "platform-x-twitter",
    name: "X (Twitter)",
    description: "Real-time health and nutrition discourse from leading researchers, clinicians, and science communicators.",
    category: "Platforms",
    tags: ["Social Media", "Real-Time", "Researchers", "Science Twitter"],
    color: "#000000",
    icon: "X",
    logoUrl: "/logos/platforms/x-twitter.svg",
    logoType: "square",
    url: "https://x.com",
    rssUrl: null,
    platformType: "microblog",
    curatedAccounts: [
      { handle: "@hubaborhidi", description: "Longevity researcher and biotech investor", followers: "320K" },
      { handle: "@FoundMyFitness", description: "Dr. Rhonda Patrick — nutrigenomics and aging science", followers: "850K" },
      { handle: "@PeterAttiaMD", description: "Physician focused on longevity and metabolic health", followers: "1.2M" },
      { handle: "@hubaborhidi", description: "Longevity science communicator", followers: "320K" },
      { handle: "@DrDomDAgostino", description: "Ketogenic diet and metabolic health researcher", followers: "280K" },
      { handle: "@ChrisMasterjohn", description: "Nutritional sciences PhD covering micronutrients", followers: "190K" },
      { handle: "@BenGreenfield", description: "Biohacking and human performance optimization", followers: "410K" },
      { handle: "@examine", description: "Evidence-based supplement and nutrition research", followers: "150K" },
      { handle: "@DavidSinclairPhD", description: "Harvard aging researcher and NMN advocate", followers: "1.5M" },
      { handle: "@andrewhuberman", description: "Stanford neuroscientist — protocols for health optimization", followers: "4.2M" },
    ],
    mockHeadlines: [
      {
        title: "Trending: #NMNvsNR debate reignites after new pharmacokinetic data",
        date: "2026-03-26",
        summary: "Researchers share conflicting interpretations of NAD+ precursor bioavailability study across 50+ threads.",
      },
      {
        title: "Dr. Peter Attia shares updated blood biomarker panel recommendations",
        date: "2026-03-23",
        summary: "Thread detailing expanded Lipoprotein(a), ApoB, and insulin markers gains 15K reposts in 24 hours.",
      },
      {
        title: "Science Twitter debates new ultra-processed food definition framework",
        date: "2026-03-19",
        summary: "Nutrition researchers clash over NOVA classification system limitations in viral quote-tweet chain.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-youtube",
    name: "YouTube",
    description: "Long-form health and science content from top creators, researchers, and medical professionals.",
    category: "Platforms",
    tags: ["Video", "Long-Form", "Education", "Creators"],
    color: "#FF0000",
    icon: "YT",
    logoUrl: "/logos/platforms/youtube.svg",
    logoType: "square",
    url: "https://youtube.com",
    rssUrl: null,
    platformType: "video",
    curatedAccounts: [
      { handle: "@hubaborhidi", description: "Andrew Huberman — neuroscience-based health protocols", followers: "6.5M" },
      { handle: "@FoundMyFitness", description: "Dr. Rhonda Patrick — deep-dive nutrition science", followers: "1.8M" },
      { handle: "@ThomasDeLauerOfficial", description: "Intermittent fasting and metabolic health", followers: "3.2M" },
      { handle: "@DrEricBergDC", description: "Keto, fasting, and nutritional health content", followers: "12M" },
      { handle: "@MedCram", description: "Medical topics explained clearly by Dr. Seheult", followers: "2.1M" },
      { handle: "@NutritionMadeSimple", description: "Dr. Gil Carvalho — evidence-based nutrition reviews", followers: "520K" },
    ],
    mockHeadlines: [
      {
        title: "Huberman Lab: 'The Science of Magnesium' hits 8M views in first week",
        date: "2026-03-25",
        summary: "Comprehensive episode covering all 8 forms of magnesium becomes most-watched health video of March 2026.",
      },
      {
        title: "Dr. Rhonda Patrick releases 3-hour nutrigenomics masterclass",
        date: "2026-03-21",
        summary: "Free educational deep-dive covers MTHFR, COMT, and VDR polymorphisms with practical supplementation advice.",
      },
      {
        title: "Thomas DeLauer vs. Nutrition PhD: Carnivore Diet Debate Gets 5M Views",
        date: "2026-03-17",
        summary: "Respectful debate format examines clinical evidence for and against all-meat diets for metabolic health.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-reddit",
    name: "Reddit",
    description: "Community-driven health and nutrition discussions across specialized subreddits.",
    category: "Platforms",
    tags: ["Community", "Discussion", "Subreddits", "Peer Support"],
    color: "#FF4500",
    icon: "R",
    logoUrl: "/logos/platforms/reddit.svg",
    logoType: "round",
    url: "https://reddit.com",
    rssUrl: null,
    platformType: "forum",
    curatedCommunities: [
      { handle: "r/Supplements", description: "Supplement discussion, stacks, and experience reports", members: "680K" },
      { handle: "r/Nootropics", description: "Cognitive enhancement compounds and protocols", members: "420K" },
      { handle: "r/ScientificNutrition", description: "Evidence-based nutrition discussion requiring citations", members: "195K" },
      { handle: "r/Peptides", description: "Therapeutic peptide research and user experiences", members: "150K" },
      { handle: "r/Longevity", description: "Anti-aging science, senolytics, and lifespan extension", members: "280K" },
      { handle: "r/Biohackers", description: "Self-optimization, quantified self, and n=1 experiments", members: "310K" },
      { handle: "r/nutrition", description: "General nutrition questions and dietary guidance", members: "1.2M" },
      { handle: "r/NutritionalScience", description: "Academic and clinical nutrition research discussion", members: "95K" },
    ],
    mockHeadlines: [
      {
        title: "r/Supplements: 'My bloodwork after 6 months of the basic stack' goes viral",
        date: "2026-03-26",
        summary: "Detailed before/after lab results for D3+K2, magnesium, and omega-3 stack garners 12K upvotes and expert discussion.",
      },
      {
        title: "r/Longevity megathread: Interpreting the TAME Metformin Trial results",
        date: "2026-03-22",
        summary: "Community dissects landmark Targeting Aging with Metformin trial data with input from verified researchers.",
      },
      {
        title: "r/ScientificNutrition: Heated debate on seed oil oxidation products",
        date: "2026-03-18",
        summary: "Thread of 800+ comments features PhD-level discussion on linoleic acid metabolites and inflammatory pathways.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-tiktok",
    name: "TikTok",
    description: "Short-form health and nutrition content reaching younger demographics with science-based creators.",
    category: "Platforms",
    tags: ["Short-Form Video", "Trending", "Gen Z Health", "Creators"],
    color: "#000000",
    icon: "TT",
    logoUrl: "/logos/platforms/tiktok.svg",
    logoType: "square",
    url: "https://tiktok.com",
    rssUrl: null,
    platformType: "short-video",
    curatedAccounts: [
      { handle: "@dr.karanr", description: "NHS surgeon debunking health myths with humor", followers: "5.2M" },
      { handle: "@nutritionbysoph", description: "Registered dietitian covering evidence-based nutrition", followers: "1.8M" },
      { handle: "@jeffnippard", description: "Natural bodybuilder and science-based fitness", followers: "3.5M" },
      { handle: "@doctorjesss", description: "Pharmacist covering supplement interactions and safety", followers: "2.1M" },
      { handle: "@dr.idz", description: "Dr. Idrees Mughal — health myth debunking and evidence reviews", followers: "4.7M" },
    ],
    mockHeadlines: [
      {
        title: "#MagnesiumGirl trend reaches 500M views on TikTok",
        date: "2026-03-25",
        summary: "Viral trend of women sharing magnesium supplementation benefits drives 300% increase in search queries.",
      },
      {
        title: "Dietitian fact-checks viral 'raw carrot salad for estrogen' claim",
        date: "2026-03-21",
        summary: "Evidence review of the Ray Peat-inspired trend explains fiber's actual role in hormone metabolism.",
      },
      {
        title: "Science creators unite against dangerous 'dry fasting' trend",
        date: "2026-03-17",
        summary: "Multiple health professionals collaborate on response videos after dehydration-related hospitalizations.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-instagram",
    name: "Instagram",
    description: "Visual health and nutrition content from practitioners, coaches, and science communicators.",
    category: "Platforms",
    tags: ["Visual Content", "Infographics", "Practitioners", "Recipes"],
    color: "#E4405F",
    icon: "IG",
    logoUrl: "/logos/platforms/instagram.svg",
    logoType: "round",
    url: "https://instagram.com",
    rssUrl: null,
    platformType: "photo-video",
    curatedAccounts: [
      { handle: "@drmarkhyman", description: "Functional medicine pioneer and food-as-medicine advocate", followers: "2.8M" },
      { handle: "@laaborhidi", description: "Longevity-focused nutrition and biohacking", followers: "180K" },
      { handle: "@drjoshaxe", description: "Clinical nutritionist covering supplements and ancient nutrition", followers: "1.5M" },
      { handle: "@thenutritiontea", description: "Registered dietitian creating evidence-based infographics", followers: "620K" },
      { handle: "@drwillcole", description: "Functional medicine practitioner specializing in gut health", followers: "890K" },
    ],
    mockHeadlines: [
      {
        title: "Dr. Mark Hyman's 'Pegan Diet 2.0' carousel post reaches 2M shares",
        date: "2026-03-26",
        summary: "Updated paleo-vegan hybrid framework infographic becomes most-shared nutrition post of Q1 2026.",
      },
      {
        title: "Supplement label reading guide infographic goes viral among wellness creators",
        date: "2026-03-22",
        summary: "Step-by-step visual guide to identifying quality supplements shared across 500+ practitioner accounts.",
      },
      {
        title: "Before/after meal prep Reels drive anti-inflammatory diet interest",
        date: "2026-03-18",
        summary: "Trending Reel format showing weekly anti-inflammatory meal prep generates 100M+ collective views.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-linkedin",
    name: "LinkedIn",
    description: "Professional health and nutrition discourse from industry leaders, researchers, and clinicians.",
    category: "Platforms",
    tags: ["Professional", "Industry", "B2B", "Thought Leadership"],
    color: "#0A66C2",
    icon: "LI",
    logoUrl: "/logos/platforms/linkedin.svg",
    logoType: "square",
    url: "https://linkedin.com",
    rssUrl: null,
    platformType: "professional",
    curatedAccounts: [
      { handle: "Dr. Christopher Gardner", description: "Stanford nutrition scientist and plant-based diet researcher", followers: "95K" },
      { handle: "Eric Williamson", description: "Nutraceutical industry executive and formulation expert", followers: "42K" },
      { handle: "Dr. Sara Gottfried", description: "Precision medicine physician and hormone health author", followers: "180K" },
      { handle: "Jim Mattson", description: "Dietary supplement regulatory affairs and compliance leader", followers: "28K" },
    ],
    mockHeadlines: [
      {
        title: "Supplement industry CEO's post on GMP compliance failures sparks debate",
        date: "2026-03-25",
        summary: "Candid post about third-party testing gaps generates 3,000 comments from industry professionals.",
      },
      {
        title: "Stanford researcher shares preprint on personalized nutrition AI",
        date: "2026-03-21",
        summary: "Dr. Gardner's post previewing machine learning dietary recommendation engine reaches 500K impressions.",
      },
      {
        title: "Regulatory affairs update: FDA NDI notification backlog analysis",
        date: "2026-03-17",
        summary: "Industry compliance leader maps 18-month timeline and strategy for new dietary ingredient notifications.",
      },
    ],
  } as SocialPlatformSource,
  {
    id: "platform-facebook",
    name: "Facebook",
    description: "Health-focused community groups and professional networks for nutrition practitioners and enthusiasts.",
    category: "Platforms",
    tags: ["Communities", "Groups", "Practitioners", "Patient Support"],
    color: "#1877F2",
    icon: "FB",
    logoUrl: "/logos/platforms/facebook.svg",
    logoType: "square",
    url: "https://facebook.com",
    rssUrl: null,
    platformType: "social-network",
    curatedCommunities: [
      { handle: "Functional Medicine Practitioners Network", description: "Private group for licensed functional medicine providers", members: "85K" },
      { handle: "Evidence-Based Supplement Discussion", description: "Science-focused supplement discussion requiring source citations", members: "120K" },
      { handle: "Nutrigenomics & Personalized Nutrition", description: "Community for genetics-informed nutrition practitioners", members: "45K" },
      { handle: "Integrative Oncology Support", description: "Support group for cancer patients exploring integrative approaches", members: "62K" },
      { handle: "Longevity & Anti-Aging Science", description: "Discussion of aging research, senolytics, and lifespan interventions", members: "210K" },
    ],
    mockHeadlines: [
      {
        title: "Functional Medicine group debates optimal thyroid testing panel",
        date: "2026-03-26",
        summary: "Thread of 400+ practitioner comments establishes consensus on full thyroid panel including rT3 and antibodies.",
      },
      {
        title: "Evidence-Based Supplement group reviews high-dose vitamin C protocols",
        date: "2026-03-22",
        summary: "Moderated discussion dissects IV vs. liposomal vitamin C evidence with practitioner experience reports.",
      },
      {
        title: "Longevity group crowdsources biological age testing experiences",
        date: "2026-03-18",
        summary: "Members compare results from TruAge, GlycanAge, and Elysium Index biological age testing services.",
      },
    ],
  } as SocialPlatformSource,
];
