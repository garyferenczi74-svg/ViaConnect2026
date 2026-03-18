"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Dna,
  Apple,
  Activity,
  Clock,
  FlaskConical,
  Leaf,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectOption } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ---------------------------------------------------------------------------
// Panel metadata
// ---------------------------------------------------------------------------

interface PanelMeta {
  name: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  tabs: { value: string; label: string }[]
}

const PANEL_META: Record<string, PanelMeta> = {
  "genex-m": {
    name: "GENEX-M\u2122",
    description:
      "Methylation & Core SNP Panel \u2014 Comprehensive analysis of 25+ single nucleotide polymorphisms across methylation, detoxification, neurotransmitter, and metabolic pathways.",
    icon: Dna,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    tabs: [
      { value: "snps", label: "SNP Results" },
      { value: "pathways", label: "Pathway Risk" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "nutrigen-dx": {
    name: "NUTRIGEN-DX\u2122",
    description:
      "Nutrigenomic Profile \u2014 Genetic determinants of vitamin, mineral, macronutrient, and essential fatty acid metabolism and requirements.",
    icon: Apple,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    tabs: [
      { value: "snps", label: "Nutrient Variants" },
      { value: "pathways", label: "Nutrient Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "hormone-iq": {
    name: "HormoneIQ\u2122",
    description:
      "Hormone Metabolism Panel \u2014 40+ hormones and metabolites analyzed via DUTCH Complete testing methodology.",
    icon: Activity,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    tabs: [
      { value: "snps", label: "Hormone Variants" },
      { value: "pathways", label: "Metabolic Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "epigen-hq": {
    name: "EpigenHQ\u2122",
    description:
      "Epigenetic Age Analysis \u2014 853,307 CpG sites analyzed using Illumina EPIC array for biological age determination.",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    tabs: [
      { value: "snps", label: "Aging Markers" },
      { value: "pathways", label: "Age Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "peptide-iq": {
    name: "PeptideIQ\u2122",
    description:
      "Peptide Response Optimization \u2014 Genetic profiling for BPC-157, Thymosin Beta-4, CJC-1295, and Ipamorelin response prediction.",
    icon: FlaskConical,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    tabs: [
      { value: "snps", label: "Response Variants" },
      { value: "pathways", label: "Response Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
  "cannabis-iq": {
    name: "CannabisIQ\u2122",
    description:
      "Cannabinoid Response Profile \u2014 Endocannabinoid system genetics including CNR1, FAAH, MGLL, and CYP2C9 variants.",
    icon: Leaf,
    color: "text-green-600",
    bgColor: "bg-green-50",
    tabs: [
      { value: "snps", label: "ECS Variants" },
      { value: "pathways", label: "ECS Pathways" },
      { value: "summary", label: "Clinical Summary" },
      { value: "recommendations", label: "Recommendations" },
    ],
  },
}

// ---------------------------------------------------------------------------
// Mock patients
// ---------------------------------------------------------------------------

const PATIENTS = [
  { id: "pt-001", name: "Maria Gonzalez" },
  { id: "pt-002", name: "James Chen" },
  { id: "pt-003", name: "Aisha Patel" },
  { id: "pt-004", name: "Robert Williams" },
  { id: "pt-005", name: "Elena Vasquez" },
  { id: "pt-006", name: "David Nakamura" },
  { id: "pt-007", name: "Sarah Thompson" },
  { id: "pt-008", name: "Michael O'Brien" },
]

// ---------------------------------------------------------------------------
// SNP results mock data (GENEX-M default; shared for all panels for demo)
// ---------------------------------------------------------------------------

type Genotype = "wildtype" | "heterozygous" | "homozygous"

interface SNPResult {
  gene: string
  rsId: string
  variant: string
  genotype: Genotype
  alleles: string
  phenotype: string
  clinicalImpact: string
}

const GENOTYPE_STYLES: Record<Genotype, { bg: string; text: string; label: string }> = {
  wildtype: { bg: "bg-green-100", text: "text-green-800", label: "Normal" },
  heterozygous: { bg: "bg-amber-100", text: "text-amber-800", label: "+/\u2212" },
  homozygous: { bg: "bg-red-100", text: "text-red-800", label: "+/+" },
}

const SNP_DATA: SNPResult[] = [
  {
    gene: "MTHFR",
    rsId: "rs1801133",
    variant: "C677T",
    genotype: "heterozygous",
    alleles: "CT",
    phenotype: "~65% enzyme activity",
    clinicalImpact: "Moderate reduction in folate metabolism; consider methylfolate supplementation",
  },
  {
    gene: "MTHFR",
    rsId: "rs1801131",
    variant: "A1298C",
    genotype: "wildtype",
    alleles: "AA",
    phenotype: "Normal enzyme function",
    clinicalImpact: "No clinical intervention required for this variant",
  },
  {
    gene: "COMT",
    rsId: "rs4680",
    variant: "V158M",
    genotype: "homozygous",
    alleles: "AA",
    phenotype: "Slow COMT \u2014 high dopamine/estrogen",
    clinicalImpact: "Reduced catecholamine clearance; avoid high-dose methyl donors; magnesium support",
  },
  {
    gene: "CYP1A2",
    rsId: "rs762551",
    variant: "*1F",
    genotype: "heterozygous",
    alleles: "AC",
    phenotype: "Intermediate caffeine metabolizer",
    clinicalImpact: "Moderate caffeine sensitivity; limit to 200mg/day",
  },
  {
    gene: "CYP2D6",
    rsId: "rs3892097",
    variant: "*4",
    genotype: "wildtype",
    alleles: "GG",
    phenotype: "Extensive metabolizer",
    clinicalImpact: "Normal drug metabolism through CYP2D6 pathway",
  },
  {
    gene: "VDR",
    rsId: "rs731236",
    variant: "TaqI",
    genotype: "heterozygous",
    alleles: "TC",
    phenotype: "Reduced VDR expression",
    clinicalImpact: "May require higher vitamin D dosing; target 60\u201380 ng/mL 25(OH)D",
  },
  {
    gene: "VDR",
    rsId: "rs1544410",
    variant: "BsmI",
    genotype: "homozygous",
    alleles: "AA",
    phenotype: "Decreased calcium absorption",
    clinicalImpact: "Increased osteoporosis risk; optimize vitamin D and calcium co-factors",
  },
  {
    gene: "APOE",
    rsId: "rs429358/rs7412",
    variant: "\u03b53/\u03b54",
    genotype: "heterozygous",
    alleles: "TC/CT",
    phenotype: "APOE \u03b53/\u03b54 carrier",
    clinicalImpact: "Elevated CVD and Alzheimer\u2019s risk; emphasize anti-inflammatory diet, omega-3s",
  },
  {
    gene: "FTO",
    rsId: "rs9939609",
    variant: "A allele",
    genotype: "homozygous",
    alleles: "AA",
    phenotype: "Increased adiposity risk",
    clinicalImpact: "Higher obesity susceptibility; structured exercise and caloric monitoring critical",
  },
  {
    gene: "SOD2",
    rsId: "rs4880",
    variant: "A16V",
    genotype: "heterozygous",
    alleles: "CT",
    phenotype: "Moderate mitochondrial antioxidant",
    clinicalImpact: "Support with manganese, CoQ10, and mitochondrial cofactors",
  },
  {
    gene: "GPX1",
    rsId: "rs1050450",
    variant: "P198L",
    genotype: "wildtype",
    alleles: "CC",
    phenotype: "Normal glutathione peroxidase",
    clinicalImpact: "Adequate selenium utilization; no additional intervention needed",
  },
  {
    gene: "CAT",
    rsId: "rs1001179",
    variant: "C-262T",
    genotype: "heterozygous",
    alleles: "CT",
    phenotype: "Reduced catalase activity",
    clinicalImpact: "Increased H\u2082O\u2082 susceptibility; support with catalase-rich foods, NAC",
  },
  {
    gene: "MAOA",
    rsId: "rs6323",
    variant: "R297R",
    genotype: "homozygous",
    alleles: "TT",
    phenotype: "High MAOA activity",
    clinicalImpact: "Rapid serotonin/dopamine turnover; consider 5-HTP and B6 cofactor support",
  },
  {
    gene: "CBS",
    rsId: "rs234706",
    variant: "C699T",
    genotype: "heterozygous",
    alleles: "CT",
    phenotype: "Upregulated CBS",
    clinicalImpact: "Potential sulfur sensitivity and taurine excess; monitor ammonia, limit sulfur amino acids",
  },
  {
    gene: "PEMT",
    rsId: "rs7946",
    variant: "G5465A",
    genotype: "wildtype",
    alleles: "GG",
    phenotype: "Normal phosphatidylcholine synthesis",
    clinicalImpact: "Adequate endogenous choline production; standard dietary intake sufficient",
  },
  {
    gene: "MTRR",
    rsId: "rs1801394",
    variant: "A66G",
    genotype: "homozygous",
    alleles: "GG",
    phenotype: "Reduced methionine synthase reductase",
    clinicalImpact: "Impaired B12 recycling; consider hydroxocobalamin or adenosylcobalamin forms",
  },
]

// ---------------------------------------------------------------------------
// Pathway risk scores
// ---------------------------------------------------------------------------

interface PathwayRisk {
  name: string
  score: number
  description: string
}

const PATHWAY_RISKS: PathwayRisk[] = [
  { name: "Methylation Cycle", score: 62, description: "MTHFR C677T heterozygous + MTRR homozygous driving moderate-high risk" },
  { name: "Transsulfuration", score: 45, description: "CBS upregulation with compensated glutathione synthesis" },
  { name: "Neurotransmitter Balance", score: 74, description: "COMT slow + MAOA fast creating catecholamine imbalance" },
  { name: "Detoxification Phase I", score: 28, description: "CYP1A2 intermediate with otherwise intact Phase I enzymes" },
  { name: "Detoxification Phase II", score: 38, description: "Moderate GST/NAT2 efficiency; adequate conjugation capacity" },
  { name: "Oxidative Stress Defense", score: 52, description: "SOD2 heterozygous and CAT reduction increasing ROS vulnerability" },
  { name: "Vitamin D Metabolism", score: 68, description: "VDR TaqI + BsmI variants reducing receptor sensitivity" },
  { name: "Lipid Metabolism", score: 71, description: "APOE \u03b53/\u03b54 and FTO homozygous elevating cardiovascular markers" },
  { name: "Folate Cycle", score: 55, description: "MTHFR heterozygous with intact DHFR and SHMT pathways" },
  { name: "Histamine Clearance", score: 33, description: "DAO and HNMT within normal functional ranges" },
  { name: "Estrogen Metabolism", score: 58, description: "COMT slow variant shifting 4-OH pathway ratios" },
  { name: "Mitochondrial Function", score: 42, description: "SOD2 heterozygous with preserved Complex I\u2013IV activity" },
]

// ---------------------------------------------------------------------------
// Clinical summary
// ---------------------------------------------------------------------------

const CLINICAL_SUMMARY = `## Key Genomic Findings

This patient presents a compound methylation challenge with **MTHFR C677T heterozygous** status combined with **MTRR A66G homozygous** variants, resulting in approximately 65% methylation efficiency. The methylation cycle impairment is further complicated by a **COMT V158M homozygous (slow)** genotype, indicating reduced catecholamine and estrogen clearance.

### Priority Findings

1. **Methylation-Neurotransmitter Axis**: The combination of reduced methylation capacity (MTHFR) with slow COMT creates a clinical picture where methyl donor supplementation must be carefully titrated. High-dose methylfolate may exacerbate anxiety and mood disturbances due to catecholamine accumulation.

2. **Cardiovascular-Metabolic Risk**: APOE \u03b53/\u03b54 carrier status combined with FTO rs9939609 homozygous (AA) places this patient in an elevated risk category for dyslipidemia and metabolic syndrome. Aggressive dietary and lifestyle interventions are recommended.

3. **Vitamin D Resistance**: Dual VDR variants (TaqI heterozygous + BsmI homozygous) suggest functional vitamin D resistance. Standard supplementation doses may be insufficient; target serum 25(OH)D of 60\u201380 ng/mL with regular monitoring.

4. **Oxidative Stress Vulnerability**: SOD2 heterozygous and CAT heterozygous variants indicate moderate mitochondrial and peroxisomal antioxidant impairment. Targeted antioxidant support is clinically indicated.

### Low-Risk Pathways
- CYP2D6 extensive metabolizer status (normal drug metabolism)
- GPX1 wildtype (normal selenium utilization)
- PEMT wildtype (adequate choline synthesis)`

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

interface Recommendation {
  category: string
  items: { supplement: string; dose: string; rationale: string }[]
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    category: "Methylation Support",
    items: [
      { supplement: "L-Methylfolate (5-MTHF)", dose: "400\u2013800 mcg/day", rationale: "MTHFR C677T heterozygous; start low to avoid methyl trapping with slow COMT" },
      { supplement: "Hydroxocobalamin (B12)", dose: "2,000 mcg sublingual", rationale: "MTRR A66G homozygous; hydroxo- preferred over methyl-B12 with slow COMT" },
      { supplement: "Riboflavin (B2)", dose: "25\u201350 mg/day", rationale: "MTHFR cofactor; enhances residual enzyme activity" },
      { supplement: "TMG (Betaine)", dose: "500\u20131,000 mg/day", rationale: "Alternative methylation via BHMT pathway to compensate for MTHFR reduction" },
    ],
  },
  {
    category: "Neurotransmitter Balance",
    items: [
      { supplement: "Magnesium Glycinate", dose: "400\u2013600 mg/day", rationale: "COMT cofactor; supports catecholamine clearance and GABAergic tone" },
      { supplement: "Phosphatidylserine", dose: "200 mg/day", rationale: "Cortisol modulation and dopaminergic support with slow COMT" },
      { supplement: "5-HTP", dose: "50\u2013100 mg at bedtime", rationale: "MAOA fast variant depleting serotonin; support serotonin precursor availability" },
    ],
  },
  {
    category: "Cardiovascular & Metabolic",
    items: [
      { supplement: "Omega-3 (EPA/DHA)", dose: "2\u20133 g/day combined", rationale: "APOE \u03b54 carrier; anti-inflammatory and lipid-modulating support" },
      { supplement: "Berberine", dose: "500 mg 2x/day with meals", rationale: "FTO homozygous; AMPK activation for metabolic support" },
      { supplement: "CoQ10 (Ubiquinol)", dose: "200 mg/day", rationale: "SOD2 heterozygous; mitochondrial electron transport chain support" },
    ],
  },
  {
    category: "Vitamin D & Bone",
    items: [
      { supplement: "Vitamin D3", dose: "5,000\u201310,000 IU/day", rationale: "VDR TaqI + BsmI variants; higher dose needed to overcome receptor resistance" },
      { supplement: "Vitamin K2 (MK-7)", dose: "200 mcg/day", rationale: "VDR BsmI homozygous with calcium absorption deficit; direct calcium to bone" },
    ],
  },
  {
    category: "Antioxidant Support",
    items: [
      { supplement: "NAC (N-Acetyl Cysteine)", dose: "600\u20131,200 mg/day", rationale: "CAT heterozygous; glutathione precursor to offset H\u2082O\u2082 clearance reduction" },
      { supplement: "Manganese", dose: "2\u20135 mg/day", rationale: "SOD2 cofactor; supports mitochondrial superoxide dismutase activity" },
      { supplement: "Selenium (Selenomethionine)", dose: "200 mcg/day", rationale: "GPX cofactor to maintain glutathione peroxidase despite oxidative stress load" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helper: risk color
// ---------------------------------------------------------------------------

function riskColor(score: number) {
  if (score < 30) return { bar: "bg-green-500", text: "text-green-700", badge: "success" as const }
  if (score <= 60) return { bar: "bg-amber-500", text: "text-amber-700", badge: "warning" as const }
  return { bar: "bg-red-500", text: "text-red-700", badge: "destructive" as const }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelDetailPage() {
  const params = useParams<{ panelId: string }>()
  const panelId = params.panelId ?? "genex-m"
  const panel = PANEL_META[panelId] ?? PANEL_META["genex-m"]!
  const Icon = panel!.icon

  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0]!.id)
  const [activeTab, setActiveTab] = useState(panel!.tabs[0]!.value)

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="space-y-4">
        <Link href="/genex360">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500">
            <ArrowLeft className="h-4 w-4" />
            Back to GeneX360
          </Button>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                panel.bgColor
              )}
            >
              <Icon className={cn("h-6 w-6", panel.color)} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {panel.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {panel.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Share with Patient
            </Button>
          </div>
        </div>
      </div>

      {/* Patient selector */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-gray-700">Patient:</label>
          <Select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full sm:w-64"
          >
            {PATIENTS.map((p) => (
              <SelectOption key={p.id} value={p.id}>
                {p.name}
              </SelectOption>
            ))}
          </Select>
          <Badge variant="success" className="ml-auto">
            Results Available
          </Badge>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {panel.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ---- SNP Results Tab ---- */}
        <TabsContent value="snps">
          <Card>
            <CardHeader>
              <CardTitle>SNP Variant Results</CardTitle>
              <CardDescription>
                Individual genotyping results with clinical interpretation.
                Color coding: <span className="font-medium text-green-700">green = wildtype</span>,{" "}
                <span className="font-medium text-amber-700">yellow = heterozygous</span>,{" "}
                <span className="font-medium text-red-700">red = homozygous variant</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gene</TableHead>
                    <TableHead>rsID</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Genotype</TableHead>
                    <TableHead>Phenotype</TableHead>
                    <TableHead className="min-w-[280px]">Clinical Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SNP_DATA.map((snp, idx) => {
                    const style = GENOTYPE_STYLES[snp.genotype]
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-gray-900">
                          {snp.gene}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {snp.rsId}
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {snp.variant}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              style.bg,
                              style.text
                            )}
                          >
                            {snp.alleles}
                            <span className="text-[10px] opacity-75">
                              {style.label}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {snp.phenotype}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {snp.clinicalImpact}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Pathway Risk Scores Tab ---- */}
        <TabsContent value="pathways">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pathway Risk Scores</CardTitle>
                <CardDescription>
                  Aggregate risk scoring across 12 metabolic pathways based on
                  combined variant impact. Scores: 0\u201329 low, 30\u201360
                  moderate, 61\u2013100 elevated.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PATHWAY_RISKS.map((pathway) => {
                const colors = riskColor(pathway.score)
                return (
                  <Card key={pathway.name}>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {pathway.name}
                        </h3>
                        <span
                          className={cn(
                            "text-lg font-bold",
                            colors.text
                          )}
                        >
                          {pathway.score}
                        </span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            colors.bar
                          )}
                          style={{ width: `${pathway.score}%` }}
                        />
                      </div>
                      <p className="text-xs leading-relaxed text-gray-500">
                        {pathway.description}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ---- Clinical Summary Tab ---- */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-emerald-600" />
                <CardTitle>AI-Generated Clinical Summary</CardTitle>
              </div>
              <CardDescription>
                This summary is generated from genomic variant analysis and
                should be reviewed by the ordering practitioner before clinical
                application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
                <div className="flex items-start gap-2 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    Report generated on March 10, 2026 \u2014 reviewed by
                    laboratory director.
                  </span>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="prose prose-sm max-w-none text-gray-700">
                {CLINICAL_SUMMARY.split("\n\n").map((block, i) => {
                  if (block.startsWith("## ")) {
                    return (
                      <h2
                        key={i}
                        className="mb-3 mt-6 text-lg font-bold text-gray-900"
                      >
                        {block.replace("## ", "")}
                      </h2>
                    )
                  }
                  if (block.startsWith("### ")) {
                    return (
                      <h3
                        key={i}
                        className="mb-2 mt-5 text-base font-semibold text-gray-800"
                      >
                        {block.replace("### ", "")}
                      </h3>
                    )
                  }
                  if (block.startsWith("1. ") || block.startsWith("- ")) {
                    const items = block.split("\n")
                    const isOrdered = block.startsWith("1. ")
                    const Tag = isOrdered ? "ol" : "ul"
                    return (
                      <Tag
                        key={i}
                        className={cn(
                          "my-2 space-y-2 pl-5",
                          isOrdered ? "list-decimal" : "list-disc"
                        )}
                      >
                        {items.map((item, j) => {
                          const text = item.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "")
                          return (
                            <li key={j} className="text-gray-700">
                              {text.split("**").map((part, k) =>
                                k % 2 === 1 ? (
                                  <strong key={k} className="font-semibold text-gray-900">
                                    {part}
                                  </strong>
                                ) : (
                                  <span key={k}>{part}</span>
                                )
                              )}
                            </li>
                          )
                        })}
                      </Tag>
                    )
                  }
                  return (
                    <p key={i} className="my-2 leading-relaxed">
                      {block.split("**").map((part, k) =>
                        k % 2 === 1 ? (
                          <strong key={k} className="font-semibold text-gray-900">
                            {part}
                          </strong>
                        ) : (
                          <span key={k}>{part}</span>
                        )
                      )}
                    </p>
                  )
                })}
              </div>

              <Separator className="my-6" />

              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm">
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Disclaimer:</strong> Genomic results should be
                    interpreted in the context of the patient&apos;s complete
                    clinical picture, family history, and current laboratory
                    values. This report does not constitute a diagnosis.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Recommendations Tab ---- */}
        <TabsContent value="recommendations">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Genotype-Based Recommendations</CardTitle>
                <CardDescription>
                  Targeted supplement and lifestyle recommendations derived from
                  SNP analysis. All recommendations should be clinically
                  validated before prescribing.
                </CardDescription>
              </CardHeader>
            </Card>

            {RECOMMENDATIONS.map((cat) => (
              <Card key={cat.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{cat.category}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplement</TableHead>
                        <TableHead>Recommended Dose</TableHead>
                        <TableHead className="min-w-[300px]">
                          Rationale
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-gray-900">
                            {item.supplement}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.dose}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.rationale}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Clinical Note:</strong> These recommendations are
                  based on genomic variants alone. Consider drug-nutrient
                  interactions, current medications, renal/hepatic function,
                  and patient preferences before implementing. Periodic
                  reassessment of biomarkers is recommended.
                </span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
