"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Dna,
  FlaskConical,
  Beaker,
  Brain,
  Flame,
  Shield,
  Heart,
  Sun,
  Pill,
  Droplets,
  Wind,
  Syringe,
  Users,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Protocol {
  id: string
  name: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  activePatients: number
  genes: string[]
}

// ─── Mock Protocol Data ─────────────────────────────────────────────────────

const PROTOCOLS: Protocol[] = [
  {
    id: "methylation",
    name: "Methylation",
    description: "MTHFR, MTR, MTRR optimization for homocysteine metabolism and methyl group transfer efficiency.",
    icon: Dna,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    activePatients: 47,
    genes: ["MTHFR", "MTR", "MTRR", "BHMT"],
  },
  {
    id: "phase-i-detox",
    name: "Phase I Detox",
    description: "CYP450 enzyme support for oxidation, reduction, and hydrolysis reactions in hepatic biotransformation.",
    icon: FlaskConical,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
    activePatients: 32,
    genes: ["CYP1A2", "CYP2D6", "CYP3A4", "CYP2C19"],
  },
  {
    id: "phase-ii-detox",
    name: "Phase II Detox",
    description: "Conjugation pathway support including glucuronidation, sulfation, glutathione conjugation, and acetylation.",
    icon: Beaker,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    activePatients: 28,
    genes: ["GSTM1", "GSTP1", "NAT2", "UGT1A1"],
  },
  {
    id: "neurotransmitter",
    name: "Neurotransmitter Metabolism",
    description: "COMT, MAO, and GAD support for optimal catecholamine and GABA neurotransmitter balance.",
    icon: Brain,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-50",
    activePatients: 39,
    genes: ["COMT", "MAO-A", "GAD1", "TPH2"],
  },
  {
    id: "inflammation",
    name: "Inflammation Response",
    description: "TNF-alpha, IL-6, NF-kappaB modulation to manage chronic inflammatory cascades and immune regulation.",
    icon: Flame,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    activePatients: 53,
    genes: ["TNF", "IL-6", "IL-1B", "NF-kB"],
  },
  {
    id: "oxidative-stress",
    name: "Oxidative Stress",
    description: "SOD2, GPX1, and CAT support to enhance antioxidant defense systems and reduce oxidative damage.",
    icon: Shield,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    activePatients: 36,
    genes: ["SOD2", "GPX1", "CAT", "NRF2"],
  },
  {
    id: "lipid-metabolism",
    name: "Lipid Metabolism & Neuroprotection",
    description: "APOE, PCSK9 management for cardiovascular risk reduction and neurological protection strategies.",
    icon: Heart,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    activePatients: 41,
    genes: ["APOE", "PCSK9", "LDLR", "CETP"],
  },
  {
    id: "vitamin-d",
    name: "Vitamin D Function",
    description: "VDR, CYP2R1 optimization for calcium homeostasis, immune modulation, and gene transcription.",
    icon: Sun,
    iconColor: "text-yellow-600",
    iconBg: "bg-yellow-50",
    activePatients: 62,
    genes: ["VDR", "CYP2R1", "CYP27B1", "GC"],
  },
  {
    id: "hormone-metabolism",
    name: "Hormone Metabolism",
    description: "CYP19A1, SRD5A2, SHBG support for estrogen metabolism, androgen balance, and hormone clearance.",
    icon: Pill,
    iconColor: "text-fuchsia-600",
    iconBg: "bg-fuchsia-50",
    activePatients: 44,
    genes: ["CYP19A1", "SRD5A2", "SHBG", "CYP1B1"],
  },
  {
    id: "iron-metabolism",
    name: "Iron Metabolism",
    description: "HFE, TFR2 monitoring for iron absorption regulation, ferritin management, and hemochromatosis risk.",
    icon: Droplets,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    activePatients: 19,
    genes: ["HFE", "TFR2", "SLC40A1", "HAMP"],
  },
  {
    id: "histamine",
    name: "Histamine Metabolism",
    description: "DAO, HNMT, ABP1 support for histamine degradation, mast cell stabilization, and tolerance management.",
    icon: Wind,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    activePatients: 27,
    genes: ["DAO", "HNMT", "ABP1", "MTHFR"],
  },
  {
    id: "peptide-response",
    name: "Peptide Response (PeptideIQ\u2122)",
    description: "BPC-157, Thymosin optimization for tissue repair, immune modulation, and peptide therapy protocols.",
    icon: Syringe,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-50",
    activePatients: 15,
    genes: ["GHR", "IGF1R", "TMSB4X", "EGF"],
  },
]

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProtocolsPage() {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search.trim()) return PROTOCOLS
    const q = search.toLowerCase()
    return PROTOCOLS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.genes.some((g) => g.toLowerCase().includes(q))
    )
  }, [search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinical Protocols</h1>
        <p className="mt-1 text-sm text-gray-500">
          Evidence-based clinical pathways for genomic-guided supplementation and lifestyle optimization.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search protocols by name, gene, or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          className="w-full sm:max-w-md"
        />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>
            {PROTOCOLS.reduce((sum, p) => sum + p.activePatients, 0)} patients on active protocols
          </span>
        </div>
      </div>

      {/* Protocol Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-gray-900">No protocols found</p>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((protocol) => {
            const Icon = protocol.icon
            return (
              <Card key={protocol.id} className="flex flex-col transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${protocol.iconBg}`}
                    >
                      <Icon className={`h-5 w-5 ${protocol.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{protocol.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        {protocol.activePatients} active patients
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pb-3">
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {protocol.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {protocol.genes.map((gene) => (
                      <Badge
                        key={gene}
                        variant="outline"
                        className="text-[11px] font-normal"
                      >
                        {gene}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/protocols/${protocol.id}`} className="w-full">
                    <Button variant="ghost" size="sm" className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                      View Protocol
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
