"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  X,
  Plus,
  FileDown,
  UserPlus,
  Search,
  Loader2,
  BookOpen,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import { Separator } from "@/components/ui/separator"

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "minor"
type EvidenceLevel = "Strong" | "Moderate" | "Limited"

interface Interaction {
  id: string
  drug: string
  supplement: string
  severity: Severity
  title: string
  description: string
  clinicalRecommendation: string
  evidenceLevel: EvidenceLevel
  pmid: string
}

// ─── Mock Interaction Data ──────────────────────────────────────────────────

const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: "int-001",
    drug: "Warfarin",
    supplement: "Fish Oil",
    severity: "critical",
    title: "Increased Bleeding Risk",
    description:
      "Omega-3 fatty acids in fish oil inhibit platelet aggregation and may potentiate the anticoagulant effect of warfarin. Combined use significantly increases INR values and bleeding risk, particularly at fish oil doses exceeding 2g/day.",
    clinicalRecommendation:
      "Monitor INR closely if co-administration is necessary. Consider reducing warfarin dose by 10-15%. Educate patient on signs of bleeding. Schedule INR check within 5-7 days of initiating fish oil.",
    evidenceLevel: "Strong",
    pmid: "PMID: 34521897",
  },
  {
    id: "int-002",
    drug: "Warfarin",
    supplement: "CoQ10",
    severity: "moderate",
    title: "Reduced Anticoagulant Efficacy",
    description:
      "Coenzyme Q10 (ubiquinone) is structurally similar to vitamin K2 and may promote clotting factor synthesis, potentially reducing the anticoagulant effect of warfarin. Clinical reports suggest decreased INR with concurrent CoQ10 supplementation.",
    clinicalRecommendation:
      "Monitor INR weekly for the first month of co-administration. CoQ10 doses above 100mg/day carry greater interaction risk. Consider ubiquinol form which may have less vitamin K-like activity. Document baseline INR before initiating.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 29183744",
  },
  {
    id: "int-003",
    drug: "Metformin",
    supplement: "CoQ10",
    severity: "minor",
    title: "Potential Synergistic Benefit",
    description:
      "Metformin may deplete CoQ10 levels by inhibiting mitochondrial complex I. Supplementation with CoQ10 may help mitigate metformin-associated mitochondrial dysfunction and may modestly improve glycemic control via enhanced mitochondrial bioenergetics.",
    clinicalRecommendation:
      "CoQ10 supplementation at 100-200mg/day may be beneficial for patients on long-term metformin therapy. Monitor blood glucose as minor hypoglycemic effect is possible. No dose adjustment of metformin typically required.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 31284923",
  },
  {
    id: "int-004",
    drug: "Metformin",
    supplement: "Fish Oil",
    severity: "minor",
    title: "Improved Lipid Profile Support",
    description:
      "Fish oil and metformin may have complementary effects on metabolic syndrome parameters. Omega-3 fatty acids can improve triglyceride levels while metformin addresses insulin resistance. No significant pharmacokinetic interaction has been identified.",
    clinicalRecommendation:
      "Combination is generally safe. Monitor fasting lipid panel at baseline and 8-12 weeks. Fish oil at 1-4g/day EPA+DHA is appropriate. May see enhanced reduction in triglycerides and fasting glucose compared to either agent alone.",
    evidenceLevel: "Strong",
    pmid: "PMID: 33098214",
  },
  {
    id: "int-005",
    drug: "Warfarin",
    supplement: "Fish Oil",
    severity: "critical",
    title: "Altered Platelet Function",
    description:
      "EPA and DHA compete with arachidonic acid in the cyclooxygenase pathway, reducing thromboxane A2 production and platelet aggregation. This antiplatelet effect is additive to warfarin anticoagulant mechanism, creating a dual-pathway bleeding risk.",
    clinicalRecommendation:
      "If clinically indicated, start fish oil at lowest effective dose (1g/day) and titrate slowly. Avoid concomitant NSAIDs. Assess for bruising, epistaxis, and GI bleeding at each visit. Consider alternative omega-3 sources with lower EPA content.",
    evidenceLevel: "Strong",
    pmid: "PMID: 35672341",
  },
]

// ─── Available drugs and supplements for search ─────────────────────────────

const AVAILABLE_DRUGS = [
  "Warfarin", "Metformin", "Lisinopril", "Atorvastatin", "Levothyroxine",
  "Amlodipine", "Omeprazole", "Losartan", "Clopidogrel", "Sertraline",
  "Fluoxetine", "Gabapentin", "Prednisone", "Metoprolol", "Simvastatin",
]

const AVAILABLE_SUPPLEMENTS = [
  "CoQ10", "Fish Oil", "Vitamin D3", "Magnesium Glycinate", "B-Complex",
  "Methylfolate", "Curcumin", "Probiotics", "Zinc", "NAC",
  "Alpha Lipoic Acid", "Berberine", "Ashwagandha", "St. John's Wort", "Resveratrol",
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function severityConfig(severity: Severity) {
  switch (severity) {
    case "critical":
      return {
        label: "Critical",
        badge: "destructive" as const,
        bg: "bg-red-50 border-red-200",
        icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      }
    case "moderate":
      return {
        label: "Moderate",
        badge: "warning" as const,
        bg: "bg-amber-50 border-amber-200",
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      }
    case "minor":
      return {
        label: "Minor",
        badge: "info" as const,
        bg: "bg-blue-50 border-blue-200",
        icon: <Info className="h-5 w-5 text-blue-600" />,
      }
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function InteractionsPage() {
  const [drugs, setDrugs] = useState<string[]>(["Warfarin", "Metformin"])
  const [supplements, setSupplements] = useState<string[]>(["CoQ10", "Fish Oil"])
  const [drugSearch, setDrugSearch] = useState("")
  const [supplementSearch, setSupplementSearch] = useState("")
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false)
  const [showSupplementSuggestions, setShowSupplementSuggestions] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<Interaction[] | null>(null)

  const filteredDrugs = AVAILABLE_DRUGS.filter(
    (d) =>
      d.toLowerCase().includes(drugSearch.toLowerCase()) &&
      !drugs.includes(d)
  )

  const filteredSupplements = AVAILABLE_SUPPLEMENTS.filter(
    (s) =>
      s.toLowerCase().includes(supplementSearch.toLowerCase()) &&
      !supplements.includes(s)
  )

  function addDrug(drug: string) {
    if (!drugs.includes(drug)) {
      setDrugs((prev) => [...prev, drug])
    }
    setDrugSearch("")
    setShowDrugSuggestions(false)
  }

  function removeDrug(drug: string) {
    setDrugs((prev) => prev.filter((d) => d !== drug))
    setResults(null)
  }

  function addSupplement(supplement: string) {
    if (!supplements.includes(supplement)) {
      setSupplements((prev) => [...prev, supplement])
    }
    setSupplementSearch("")
    setShowSupplementSuggestions(false)
  }

  function removeSupplement(supplement: string) {
    setSupplements((prev) => prev.filter((s) => s !== supplement))
    setResults(null)
  }

  function handleCheckInteractions() {
    if (drugs.length === 0 || supplements.length === 0) return
    setIsChecking(true)
    setResults(null)

    setTimeout(() => {
      const found = MOCK_INTERACTIONS.filter(
        (i) => drugs.includes(i.drug) && supplements.includes(i.supplement)
      )
      setResults(found)
      setIsChecking(false)
    }, 1500)
  }

  const criticalCount = results?.filter((r) => r.severity === "critical").length ?? 0
  const moderateCount = results?.filter((r) => r.severity === "moderate").length ?? 0
  const minorCount = results?.filter((r) => r.severity === "minor").length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Drug-Supplement Interaction Checker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Identify potential interactions between medications and dietary supplements using evidence-based clinical data.
        </p>
      </div>

      {/* Input Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Medications Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Medications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <SearchInput
                placeholder="Search medications..."
                value={drugSearch}
                onChange={(e) => {
                  setDrugSearch(e.target.value)
                  setShowDrugSuggestions(true)
                }}
                onClear={() => {
                  setDrugSearch("")
                  setShowDrugSuggestions(false)
                }}
                onFocus={() => setShowDrugSuggestions(true)}
              />
              {showDrugSuggestions && drugSearch && filteredDrugs.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredDrugs.slice(0, 6).map((drug) => (
                    <button
                      key={drug}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      onClick={() => addDrug(drug)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {drug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-[80px] space-y-2">
              {drugs.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  No medications added
                </p>
              ) : (
                drugs.map((drug) => (
                  <div
                    key={drug}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">{drug}</span>
                    <button
                      type="button"
                      onClick={() => removeDrug(drug)}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Supplements Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Supplements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <SearchInput
                placeholder="Search supplements..."
                value={supplementSearch}
                onChange={(e) => {
                  setSupplementSearch(e.target.value)
                  setShowSupplementSuggestions(true)
                }}
                onClear={() => {
                  setSupplementSearch("")
                  setShowSupplementSuggestions(false)
                }}
                onFocus={() => setShowSupplementSuggestions(true)}
              />
              {showSupplementSuggestions && supplementSearch && filteredSupplements.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredSupplements.slice(0, 6).map((supp) => (
                    <button
                      key={supp}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      onClick={() => addSupplement(supp)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {supp}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-[80px] space-y-2">
              {supplements.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  No supplements added
                </p>
              ) : (
                supplements.map((supp) => (
                  <div
                    key={supp}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700">{supp}</span>
                    <button
                      type="button"
                      onClick={() => removeSupplement(supp)}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleCheckInteractions}
          disabled={drugs.length === 0 || supplements.length === 0 || isChecking}
          className="min-w-[220px]"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing Interactions...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Check Interactions
            </>
          )}
        </Button>
      </div>

      {/* Results Section */}
      {results !== null && (
        <div className="space-y-6">
          <Separator />

          {/* Summary Bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {criticalCount} Critical
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {moderateCount} Moderate
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {minorCount} Minor
                  </span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-gray-500">
                  {results.length} interaction{results.length !== 1 ? "s" : ""} found
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Interaction Cards */}
          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <ShieldAlert className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-900">No Interactions Found</p>
                <p className="mt-1 text-sm text-gray-500">
                  No known interactions were identified between the selected medications and supplements.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((interaction) => {
                const config = severityConfig(interaction.severity)
                return (
                  <Card key={interaction.id} className={`border ${config.bg}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        {config.icon}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={config.badge}>{config.label}</Badge>
                            <span className="text-sm font-semibold text-gray-900">
                              {interaction.drug}
                            </span>
                            <span className="text-xs text-gray-400">&harr;</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {interaction.supplement}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-700">
                            {interaction.title}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                          {interaction.description}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                          Clinical Recommendation
                        </p>
                        <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                          {interaction.clinicalRecommendation}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Evidence:{" "}
                            <span className="font-medium text-gray-700">
                              {interaction.evidenceLevel}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-emerald-600">
                            {interaction.pmid}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          {results.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <FileDown className="h-4 w-4" />
                Export Report
              </Button>
              <Button variant="outline">
                <UserPlus className="h-4 w-4" />
                Save to Patient
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
