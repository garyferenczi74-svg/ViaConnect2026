import {
  GeneVariant,
  SupplementRecommendation,
  HealthReport,
  Patient,
  Protocol,
  HerbalFormulation,
} from "./types";

export const geneVariants: GeneVariant[] = [
  {
    gene: "MTHFR",
    rsid: "rs1801133",
    genotype: "CT",
    impact: "risk",
    category: "Methylation",
    description:
      "Heterozygous C677T variant reduces enzyme activity by ~35%. May affect folate metabolism and homocysteine levels.",
  },
  {
    gene: "VDR",
    rsid: "rs1544410",
    genotype: "CT",
    impact: "risk",
    category: "Vitamin D Metabolism",
    description:
      "BsmI polymorphism associated with reduced vitamin D receptor efficiency. May require higher vitamin D intake.",
  },
  {
    gene: "COMT",
    rsid: "rs4680",
    genotype: "AG",
    impact: "neutral",
    category: "Neurotransmitter Metabolism",
    description:
      "Val/Met heterozygous. Intermediate catechol-O-methyltransferase activity affecting dopamine and estrogen clearance.",
  },
  {
    gene: "CYP1A2",
    rsid: "rs762551",
    genotype: "AA",
    impact: "beneficial",
    category: "Detoxification",
    description:
      "Fast caffeine metabolizer. Efficient Phase I liver detoxification of xenobiotics.",
  },
  {
    gene: "SOD2",
    rsid: "rs4880",
    genotype: "TT",
    impact: "risk",
    category: "Antioxidant Defense",
    description:
      "Ala16Val homozygous variant. Reduced mitochondrial superoxide dismutase activity increases oxidative stress susceptibility.",
  },
  {
    gene: "APOE",
    rsid: "rs429358",
    genotype: "CT",
    impact: "risk",
    category: "Lipid Metabolism",
    description:
      "APOE ε3/ε4 carrier. Affects cholesterol transport and may influence cardiovascular and cognitive health strategies.",
  },
  {
    gene: "NOS3",
    rsid: "rs1799983",
    genotype: "GT",
    impact: "risk",
    category: "Cardiovascular",
    description:
      "Glu298Asp heterozygous. Reduced nitric oxide synthase activity may affect vascular function and blood pressure regulation.",
  },
  {
    gene: "FUT2",
    rsid: "rs601338",
    genotype: "AG",
    impact: "neutral",
    category: "Gut Health",
    description:
      "Secretor status heterozygous. Influences gut microbiome composition and B12 absorption efficiency.",
  },
  {
    gene: "CBS",
    rsid: "rs234706",
    genotype: "AG",
    impact: "neutral",
    category: "Methylation",
    description:
      "C699T heterozygous. Intermediate cystathionine beta-synthase activity in transsulfuration pathway.",
  },
  {
    gene: "GST",
    rsid: "GSTM1",
    genotype: "del/+",
    impact: "risk",
    category: "Detoxification",
    description:
      "GSTM1 heterozygous deletion. Partial reduction in glutathione S-transferase activity affecting Phase II detoxification.",
  },
];

export const supplementRecommendations: SupplementRecommendation[] = [
  {
    name: "Methylfolate (5-MTHF)",
    dosage: "800mcg",
    frequency: "Daily",
    reason:
      "Bypasses MTHFR C677T variant to support methylation and homocysteine metabolism",
    genes: ["MTHFR"],
    priority: "essential",
  },
  {
    name: "Vitamin D3 + K2",
    dosage: "5000 IU D3 / 200mcg K2",
    frequency: "Daily with fat-containing meal",
    reason: "VDR polymorphism reduces receptor efficiency; higher intake needed for optimal serum levels",
    genes: ["VDR"],
    priority: "essential",
  },
  {
    name: "Magnesium Glycinate",
    dosage: "400mg elemental",
    frequency: "Evening, daily",
    reason:
      "Cofactor for COMT enzyme activity and supports 300+ enzymatic reactions including methylation",
    genes: ["COMT", "MTHFR"],
    priority: "essential",
  },
  {
    name: "CoQ10 (Ubiquinol)",
    dosage: "200mg",
    frequency: "Daily with meal",
    reason:
      "Supports mitochondrial function and compensates for increased oxidative stress from SOD2 variant",
    genes: ["SOD2"],
    priority: "recommended",
  },
  {
    name: "N-Acetyl Cysteine (NAC)",
    dosage: "600mg",
    frequency: "Twice daily",
    reason:
      "Glutathione precursor to support Phase II detoxification compromised by GSTM1 deletion",
    genes: ["GST"],
    priority: "recommended",
  },
  {
    name: "Methylcobalamin (B12)",
    dosage: "1000mcg sublingual",
    frequency: "Daily",
    reason:
      "Active B12 form supports methylation cycle; FUT2 variant may reduce absorption",
    genes: ["MTHFR", "FUT2"],
    priority: "essential",
  },
  {
    name: "Omega-3 (EPA/DHA)",
    dosage: "2g combined EPA+DHA",
    frequency: "Daily with meal",
    reason:
      "Supports NOS3-related vascular function and modulates APOE-related lipid metabolism",
    genes: ["NOS3", "APOE"],
    priority: "recommended",
  },
  {
    name: "Riboflavin (B2)",
    dosage: "100mg",
    frequency: "Daily",
    reason:
      "FAD cofactor for MTHFR enzyme; shown to reduce homocysteine in C677T carriers",
    genes: ["MTHFR"],
    priority: "recommended",
  },
];

export const healthReports: HealthReport[] = [
  {
    id: "rpt-001",
    title: "Methylation Pathway Analysis",
    date: "2026-03-15",
    category: "Methylation",
    summary:
      "MTHFR C677T heterozygous with compensated CBS activity. Recommend methylfolate and B12 support.",
    status: "complete",
  },
  {
    id: "rpt-002",
    title: "Oxidative Stress & Detoxification Panel",
    date: "2026-03-10",
    category: "Detoxification",
    summary:
      "SOD2 and GSTM1 variants indicate increased oxidative burden. NAC and CoQ10 protocol initiated.",
    status: "complete",
  },
  {
    id: "rpt-003",
    title: "Cardiovascular Genomic Risk Profile",
    date: "2026-03-01",
    category: "Cardiovascular",
    summary:
      "NOS3 and APOE variants present moderate cardiovascular risk. Omega-3 and lifestyle modifications recommended.",
    status: "in-review",
  },
  {
    id: "rpt-004",
    title: "Nutrigenomic Absorption Analysis",
    date: "2026-02-20",
    category: "Nutrient Absorption",
    summary:
      "VDR and FUT2 variants affecting vitamin D and B12 utilization. Dosage adjustments recommended.",
    status: "complete",
  },
  {
    id: "rpt-005",
    title: "Neurotransmitter Balance Report",
    date: "2026-02-10",
    category: "Neurological",
    summary:
      "COMT Val/Met status with intermediate dopamine clearance. Awaiting additional SAMe pathway data.",
    status: "pending",
  },
];

export const patients: Patient[] = [
  {
    id: "pat-001",
    name: "Sarah Mitchell",
    email: "sarah.m@email.com",
    dob: "1985-06-12",
    lastVisit: "2026-03-14",
    status: "active",
    conditions: ["Hypothyroidism", "MTHFR heterozygous"],
    snpsAnalyzed: 47,
  },
  {
    id: "pat-002",
    name: "James Rodriguez",
    email: "j.rodriguez@email.com",
    dob: "1978-11-03",
    lastVisit: "2026-03-10",
    status: "active",
    conditions: ["Cardiovascular risk", "Elevated homocysteine"],
    snpsAnalyzed: 52,
  },
  {
    id: "pat-003",
    name: "Emily Chen",
    email: "emily.chen@email.com",
    dob: "1992-03-28",
    lastVisit: "2026-02-28",
    status: "active",
    conditions: ["Chronic fatigue", "Detox pathway variants"],
    snpsAnalyzed: 38,
  },
  {
    id: "pat-004",
    name: "Michael Thompson",
    email: "m.thompson@email.com",
    dob: "1970-09-15",
    lastVisit: "2026-01-20",
    status: "inactive",
    conditions: ["Type 2 diabetes risk", "APOE ε4 carrier"],
    snpsAnalyzed: 61,
  },
  {
    id: "pat-005",
    name: "Lisa Nakamura",
    email: "l.nakamura@email.com",
    dob: "1988-12-07",
    lastVisit: "2026-03-16",
    status: "pending",
    conditions: ["Anxiety", "COMT slow metabolizer"],
    snpsAnalyzed: 0,
  },
];

export const protocols: Protocol[] = [
  {
    id: "prot-001",
    name: "Methylation Support Protocol",
    patientId: "pat-001",
    patientName: "Sarah Mitchell",
    supplements: supplementRecommendations.filter((s) =>
      s.genes.includes("MTHFR")
    ),
    createdDate: "2026-03-14",
    status: "active",
    notes:
      "Start with half doses for 2 weeks. Monitor homocysteine at 6 weeks.",
  },
  {
    id: "prot-002",
    name: "Cardiovascular Protection Protocol",
    patientId: "pat-002",
    patientName: "James Rodriguez",
    supplements: supplementRecommendations.filter(
      (s) => s.genes.includes("NOS3") || s.genes.includes("APOE")
    ),
    createdDate: "2026-03-10",
    status: "active",
    notes:
      "Combine with Mediterranean diet. Recheck lipid panel in 3 months.",
  },
  {
    id: "prot-003",
    name: "Detox & Antioxidant Protocol",
    patientId: "pat-003",
    patientName: "Emily Chen",
    supplements: supplementRecommendations.filter(
      (s) => s.genes.includes("SOD2") || s.genes.includes("GST")
    ),
    createdDate: "2026-02-28",
    status: "active",
    notes:
      "Support glutathione pathways. Add cruciferous vegetables for NRF2 activation.",
  },
];

export const herbalFormulations: HerbalFormulation[] = [
  {
    id: "form-001",
    name: "Methylation Support Tincture",
    herbs: [
      { name: "Gotu Kola", amount: "2ml", form: "1:2 tincture" },
      { name: "Rosemary", amount: "1.5ml", form: "1:2 tincture" },
      { name: "Nettle Leaf", amount: "2ml", form: "1:1 fluid extract" },
      { name: "Schisandra", amount: "1ml", form: "1:2 tincture" },
    ],
    indication:
      "MTHFR variants with suboptimal methylation. Supports folate utilization and homocysteine clearance.",
    contraindications: ["Pregnancy", "Anticoagulant therapy"],
    geneTargets: ["MTHFR", "CBS"],
    createdDate: "2026-03-12",
  },
  {
    id: "form-002",
    name: "Antioxidant Defense Formula",
    herbs: [
      { name: "Turmeric", amount: "3ml", form: "1:1 fluid extract" },
      { name: "Green Tea", amount: "2ml", form: "standardized extract" },
      { name: "Milk Thistle", amount: "2ml", form: "1:1 fluid extract" },
      { name: "Astragalus", amount: "1.5ml", form: "1:2 tincture" },
    ],
    indication:
      "SOD2 and GSTM1 variants with reduced antioxidant capacity. Supports NRF2 pathway and glutathione conjugation.",
    contraindications: [
      "Iron overload conditions",
      "Immunosuppressive therapy",
    ],
    geneTargets: ["SOD2", "GST"],
    createdDate: "2026-03-08",
  },
  {
    id: "form-003",
    name: "Cardiovascular Tonic",
    herbs: [
      { name: "Hawthorn Berry", amount: "3ml", form: "1:2 tincture" },
      { name: "Coleus forskohlii", amount: "1ml", form: "standardized extract" },
      { name: "Dan Shen (Salvia)", amount: "2ml", form: "1:2 tincture" },
      { name: "Ginkgo", amount: "1.5ml", form: "standardized extract" },
    ],
    indication:
      "NOS3 variants with reduced nitric oxide production. Supports endothelial function and peripheral circulation.",
    contraindications: [
      "Concurrent blood thinning medication",
      "Scheduled surgery within 2 weeks",
    ],
    geneTargets: ["NOS3", "APOE"],
    createdDate: "2026-02-25",
  },
  {
    id: "form-004",
    name: "Neuro-Calm Adaptogen Blend",
    herbs: [
      { name: "Ashwagandha", amount: "2ml", form: "KSM-66 extract" },
      { name: "Passionflower", amount: "2ml", form: "1:2 tincture" },
      { name: "Lemon Balm", amount: "1.5ml", form: "1:1 fluid extract" },
      { name: "Rhodiola", amount: "1ml", form: "standardized extract" },
    ],
    indication:
      "COMT slow metabolizers with elevated catecholamines. Supports GABAergic pathways and HPA axis modulation.",
    contraindications: ["Thyroid medication (space 2hrs)", "SSRI therapy (consult prescriber)"],
    geneTargets: ["COMT"],
    createdDate: "2026-02-18",
  },
];

export const wellnessNavItems = [
  { label: "Dashboard", href: "/wellness", icon: "home" },
  { label: "Genetic Profile", href: "/wellness/genetic-profile", icon: "dna" },
  { label: "Supplements", href: "/wellness/supplements", icon: "pill" },
  { label: "Health Reports", href: "/wellness/reports", icon: "report" },
  { label: "Settings", href: "/wellness/settings", icon: "settings" },
];

export const practitionerNavItems = [
  { label: "Dashboard", href: "/practitioner", icon: "home" },
  { label: "Patients", href: "/practitioner/patients", icon: "patients" },
  { label: "Protocols", href: "/practitioner/protocols", icon: "protocol" },
  { label: "Genetic Reports", href: "/practitioner/genetic-reports", icon: "report" },
  { label: "Settings", href: "/practitioner/settings", icon: "settings" },
];

export const naturopathNavItems = [
  { label: "Dashboard", href: "/naturopath", icon: "home" },
  { label: "Clients", href: "/naturopath/clients", icon: "patients" },
  { label: "Herbal Protocols", href: "/naturopath/herbal-protocols", icon: "herb" },
  { label: "Formulations", href: "/naturopath/formulations", icon: "formula" },
  { label: "Genetic Analysis", href: "/naturopath/genetic-analysis", icon: "dna" },
  { label: "Settings", href: "/naturopath/settings", icon: "settings" },
];
