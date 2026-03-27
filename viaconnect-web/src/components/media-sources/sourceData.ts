export interface MediaSource {
  id: string;
  name: string;
  description: string;
  category: SourceCategory;
  tags: string[];
  color: string;
  icon: string;
  url: string;
  rssUrl: string;
  mockHeadlines: { title: string; date: string; summary: string }[];
}

export const CATEGORIES = ["All", "News", "Journals", "Peptides", "Nutrigenomics", "Social"] as const;
export type SourceCategory = (typeof CATEGORIES)[number];

export const SOURCES: MediaSource[] = [
  {
    id: "nutraingredients",
    name: "NutraIngredients",
    description: "Leading news source for the dietary supplements and functional food industry across global markets.",
    category: "News",
    tags: ["Supplements", "Functional Foods", "Industry News", "Regulation"],
    color: "#2DA5A0",
    icon: "NI",
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
    id: "examine",
    name: "Examine.com",
    description: "Independent, evidence-based resource analyzing the latest research on supplements and nutrition.",
    category: "Journals",
    tags: ["Evidence-Based", "Supplements", "Clinical Research", "Meta-Analysis"],
    color: "#60A5FA",
    icon: "Ex",
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
    id: "nutraworld",
    name: "Nutraceutical World",
    description: "Industry publication covering nutraceutical manufacturing, formulation, and market trends.",
    category: "News",
    tags: ["Nutraceuticals", "Manufacturing", "Market Trends", "Formulation"],
    color: "#F59E0B",
    icon: "NW",
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
  {
    id: "pubmed",
    name: "PubMed Central",
    description: "Free full-text archive of biomedical and life sciences journal literature from the NIH/NLM.",
    category: "Journals",
    tags: ["Peer-Reviewed", "Biomedical", "Clinical Trials", "Open Access"],
    color: "#27AE60",
    icon: "PM",
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
  {
    id: "foundmyfitness",
    name: "FoundMyFitness",
    description: "Dr. Rhonda Patrick's platform exploring nutrigenomics, aging science, and personalized health.",
    category: "Nutrigenomics",
    tags: ["Nutrigenomics", "Longevity", "Personalized Health", "Genetics"],
    color: "#FB7185",
    icon: "FMF",
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
  {
    id: "drug-target-review",
    name: "Drug Target Review",
    description: "Publication covering therapeutic peptides, drug discovery, and pharmaceutical target identification.",
    category: "Peptides",
    tags: ["Peptides", "Drug Discovery", "Therapeutics", "Pharma"],
    color: "#8B5CF6",
    icon: "DTR",
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
  {
    id: "social-feeds",
    name: "Social Feeds",
    description: "Aggregated insights from nutrition and supplement thought leaders across social platforms.",
    category: "Social",
    tags: ["Social Media", "Thought Leaders", "Trending", "Community"],
    color: "#A0AEC0",
    icon: "SF",
    url: "https://social.viaconnect.io",
    rssUrl: "https://social.viaconnect.io/rss",
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
];
