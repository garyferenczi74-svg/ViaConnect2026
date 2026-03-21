"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp, ExternalLink, Dna } from "lucide-react";
import { Card, Badge, DataTable, Avatar } from "@/components/ui";
import type { Column } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";

// ─── Quick Filter Tags ───────────────────────────────────────────────────────

const quickFilters = [
  "MTHFR C677T",
  "COMT V158M",
  "CYP1A2 *1F",
  "APOE E4",
  "VDR Taq1",
  "CBS C699T",
];

// ─── Mock Variant Data ───────────────────────────────────────────────────────

type VariantRow = {
  gene: string;
  variant: string;
  rsID: string;
  patientName: string;
  patientInitials: string;
  genotype: string;
  riskLevel: "High" | "Moderate" | "Low";
  currentProtocol: string;
};

const variantData: VariantRow[] = [
  { gene: "MTHFR", variant: "C677T", rsID: "rs1801133", patientName: "Sarah Mitchell", patientInitials: "SM", genotype: "CT", riskLevel: "Moderate", currentProtocol: "MTHFR+ Stack" },
  { gene: "MTHFR", variant: "C677T", rsID: "rs1801133", patientName: "James Robertson", patientInitials: "JR", genotype: "TT", riskLevel: "High", currentProtocol: "MTHFR+ Stack" },
  { gene: "COMT", variant: "V158M", rsID: "rs4680", patientName: "Anika Patel", patientInitials: "AP", genotype: "AG", riskLevel: "Moderate", currentProtocol: "COMT+ Stack" },
  { gene: "CYP1A2", variant: "*1F", rsID: "rs762551", patientName: "Marcus Thompson", patientInitials: "MT", genotype: "AC", riskLevel: "Moderate", currentProtocol: "None" },
  { gene: "APOE", variant: "E4", rsID: "rs429358", patientName: "Emily Zhao", patientInitials: "EZ", genotype: "CT", riskLevel: "High", currentProtocol: "NAD+ Stack" },
  { gene: "VDR", variant: "Taq1", rsID: "rs731236", patientName: "David Nguyen", patientInitials: "DN", genotype: "TC", riskLevel: "Low", currentProtocol: "VDR Support" },
  { gene: "MTHFR", variant: "A1298C", rsID: "rs1801131", patientName: "Rachel Kim", patientInitials: "RK", genotype: "AC", riskLevel: "Moderate", currentProtocol: "MTHFR+ Stack" },
  { gene: "CBS", variant: "C699T", rsID: "rs234706", patientName: "Carlos Rivera", patientInitials: "CR", genotype: "CT", riskLevel: "Moderate", currentProtocol: "None" },
  { gene: "COMT", variant: "V158M", rsID: "rs4680", patientName: "Lisa Anderson", patientInitials: "LA", genotype: "GG", riskLevel: "Low", currentProtocol: "COMT+ Stack" },
  { gene: "APOE", variant: "E4", rsID: "rs429358", patientName: "Michael Chen", patientInitials: "MC", genotype: "TT", riskLevel: "High", currentProtocol: "NAD+ Stack" },
  { gene: "MTHFR", variant: "C677T", rsID: "rs1801133", patientName: "Jennifer Wu", patientInitials: "JW", genotype: "CT", riskLevel: "Moderate", currentProtocol: "MTHFR+ Stack" },
  { gene: "CYP1A2", variant: "*1F", rsID: "rs762551", patientName: "Robert Taylor", patientInitials: "RT", genotype: "AA", riskLevel: "High", currentProtocol: "FOCUS+ Stack" },
  { gene: "VDR", variant: "Taq1", rsID: "rs731236", patientName: "Sophia Brown", patientInitials: "SB", genotype: "TT", riskLevel: "Moderate", currentProtocol: "None" },
  { gene: "COMT", variant: "V158M", rsID: "rs4680", patientName: "William Harris", patientInitials: "WH", genotype: "AA", riskLevel: "High", currentProtocol: "COMT+ Stack" },
  { gene: "MTHFR", variant: "C677T", rsID: "rs1801133", patientName: "Olivia Martin", patientInitials: "OM", genotype: "TT", riskLevel: "High", currentProtocol: "MTHFR+ Stack" },
];

// ─── Population Stats ────────────────────────────────────────────────────────

const populationStats = [
  { variant: "MTHFR C677T", count: 14, total: 47, pct: 30 },
  { variant: "COMT V158M", count: 10, total: 47, pct: 21 },
  { variant: "CYP1A2 *1F", count: 8, total: 47, pct: 17 },
  { variant: "APOE E4", count: 7, total: 47, pct: 15 },
  { variant: "VDR Taq1", count: 5, total: 47, pct: 11 },
];

// ─── Clinical Evidence Library ───────────────────────────────────────────────

const clinicalEvidence = [
  {
    gene: "MTHFR",
    description:
      "Methylenetetrahydrofolate reductase is a key enzyme in folate metabolism and the methylation cycle. Variants reduce enzyme activity, impacting homocysteine metabolism, DNA repair, and neurotransmitter synthesis.",
    variants: ["C677T (rs1801133)", "A1298C (rs1801131)"],
    implications: [
      "Elevated homocysteine levels increasing cardiovascular risk",
      "Impaired methylation affecting mood and cognitive function",
      "Reduced conversion of folic acid to active 5-MTHF form",
      "Potential impact on detoxification pathways",
    ],
    evidenceLevel: "Strong",
  },
  {
    gene: "COMT",
    description:
      "Catechol-O-methyltransferase metabolizes catecholamine neurotransmitters (dopamine, epinephrine, norepinephrine). The V158M variant determines enzyme activity speed, affecting stress response and cognitive performance.",
    variants: ["V158M (rs4680)", "H62H (rs4633)"],
    implications: [
      "Slow COMT (Met/Met): higher dopamine, better memory but increased anxiety",
      "Fast COMT (Val/Val): lower dopamine, stress resilience but reduced focus",
      "Impacts estrogen metabolism and breast cancer risk",
      "Influences pain sensitivity and opioid response",
    ],
    evidenceLevel: "Strong",
  },
  {
    gene: "CYP1A2",
    description:
      "Cytochrome P450 1A2 is a major drug-metabolizing enzyme responsible for the metabolism of caffeine, certain medications, and environmental toxins. The *1F variant affects metabolizer speed.",
    variants: ["*1F (rs762551)", "*1K (rs12720461)"],
    implications: [
      "Slow metabolizers at higher risk from caffeine and certain drugs",
      "Affects metabolism of clozapine, theophylline, and melatonin",
      "Impacts detoxification of environmental carcinogens",
      "Guides personalized caffeine and medication recommendations",
    ],
    evidenceLevel: "Moderate",
  },
  {
    gene: "APOE",
    description:
      "Apolipoprotein E plays a central role in lipid metabolism and neuronal repair. The E4 allele is the strongest known genetic risk factor for late-onset Alzheimer's disease and cardiovascular disease.",
    variants: ["E2 (rs7412)", "E4 (rs429358)"],
    implications: [
      "E4 carriers have 3-12x increased risk for Alzheimer's disease",
      "Impacts cholesterol transport and lipid metabolism",
      "Influences response to dietary fat and statin therapy",
      "Affects neuroinflammation and blood-brain barrier integrity",
    ],
    evidenceLevel: "Strong",
  },
];

// ─── Risk Badge Mapping ─────────────────────────────────────────────────────

const riskBadgeVariant: Record<string, "danger" | "warning" | "active"> = {
  High: "danger",
  Moderate: "warning",
  Low: "active",
};

// ─── Table Columns ───────────────────────────────────────────────────────────

const columns: Column<VariantRow>[] = [
  { key: "gene", header: "Gene", sortable: true },
  { key: "variant", header: "Variant", sortable: true },
  { key: "rsID", header: "rsID" },
  {
    key: "patientName",
    header: "Patient",
    sortable: true,
    render: (row: VariantRow) => (
      <div className="flex items-center gap-2">
        <Avatar fallback={row.patientInitials} size="sm" />
        <span>{row.patientName}</span>
      </div>
    ),
  },
  { key: "genotype", header: "Genotype" },
  {
    key: "riskLevel",
    header: "Risk Level",
    render: (row: VariantRow) => (
      <Badge variant={riskBadgeVariant[row.riskLevel]}>{row.riskLevel}</Badge>
    ),
  },
  {
    key: "currentProtocol",
    header: "Current Protocol",
    render: (row: VariantRow) => (
      <span className={row.currentProtocol === "None" ? "text-gray-500" : "text-gray-300"}>
        {row.currentProtocol}
      </span>
    ),
  },
  {
    key: "actions" as keyof VariantRow,
    header: "Actions",
    render: () => (
      <button className="text-portal-purple hover:text-portal-purple/80 text-xs font-medium flex items-center gap-1 transition-colors">
        View Patient <ExternalLink className="w-3 h-3" />
      </button>
    ),
  },
];

// ─── Evidence Level Badge ────────────────────────────────────────────────────

const evidenceBadgeVariant: Record<string, "active" | "pending"> = {
  Strong: "active",
  Moderate: "pending",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GenomicsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGenes, setExpandedGenes] = useState<Set<string>>(new Set());

  const filteredData = searchQuery
    ? variantData.filter(
        (row) =>
          row.gene.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.variant.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.rsID.toLowerCase().includes(searchQuery.toLowerCase()) ||
          row.patientName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : variantData;

  function toggleGene(gene: string) {
    setExpandedGenes((prev) => {
      const next = new Set(prev);
      if (next.has(gene)) {
        next.delete(gene);
      } else {
        next.add(gene);
      }
      return next;
    });
  }

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <StaggerChild>
        <div>
          <h1 className="text-2xl font-bold text-white">Genomics Database</h1>
          <p className="text-gray-400 mt-1">
            Search variants across all patients in your practice
          </p>
        </div>
        </StaggerChild>

        {/* Search Section */}
        <StaggerChild>
        <Card hover={false} className="p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by gene name, rsID, or variant..."
              className="w-full h-11 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-portal-purple/50 focus:ring-1 focus:ring-portal-purple/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            {quickFilters.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  searchQuery === tag
                    ? "bg-portal-purple/20 text-portal-purple border-portal-purple/30"
                    : "bg-white/[0.04] text-gray-400 border-white/[0.08] hover:border-portal-purple/30 hover:text-portal-purple"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </Card>
        </StaggerChild>

        {/* Results Table */}
        <StaggerChild>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">
              Variant Results{" "}
              <span className="text-gray-500 font-normal">({filteredData.length} records)</span>
            </h2>
          </div>
          <DataTable<VariantRow> columns={columns} data={filteredData} pageSize={10} />
        </div>
        </StaggerChild>

        {/* Population Statistics */}
        <StaggerChild>
        <Card hover={false} className="p-5">
          <h2 className="text-sm font-semibold text-white mb-1">
            Variant Frequency in Your Practice
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            How common each variant is across your 47-patient cohort
          </p>
          <div className="space-y-4">
            {populationStats.map((stat) => (
              <div key={stat.variant}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-300">{stat.variant}</span>
                  <span className="text-xs text-gray-500">
                    {stat.count}/{stat.total} patients ({stat.pct}%)
                  </span>
                </div>
                <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-portal-purple transition-all duration-500"
                    style={{ width: `${stat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        </StaggerChild>

        {/* Clinical Evidence Library */}
        <StaggerChild>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Dna className="w-5 h-5 text-portal-purple" />
            <h2 className="text-lg font-semibold text-white">Clinical Evidence Library</h2>
          </div>
          <div className="space-y-3">
            {clinicalEvidence.map((entry) => {
              const isExpanded = expandedGenes.has(entry.gene);
              return (
                <Card key={entry.gene} hover={false} className="overflow-hidden">
                  <button
                    onClick={() => toggleGene(entry.gene)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-portal-purple/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-portal-purple">
                          {entry.gene.slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{entry.gene}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {entry.variants.length} key variants
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={evidenceBadgeVariant[entry.evidenceLevel]}>
                        {entry.evidenceLevel} Evidence
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-white/[0.06] pt-4 space-y-4">
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {entry.description}
                      </p>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Key Variants
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {entry.variants.map((v) => (
                            <span
                              key={v}
                              className="px-2.5 py-1 rounded-md text-xs bg-portal-purple/10 text-portal-purple border border-portal-purple/20"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Clinical Implications
                        </h4>
                        <ul className="space-y-1.5">
                          {entry.implications.map((imp, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-portal-purple/60 mt-1.5 shrink-0" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
