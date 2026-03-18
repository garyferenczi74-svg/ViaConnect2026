"use client"

import { useState, useCallback } from "react"
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  X,
  Plus,
  FileDown,
  Search,
  Loader2,
  BookOpen,
  ExternalLink,
  Pill,
  History,
  Grid3X3,
  Zap,
  Bell,
  ChevronRight,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "minor" | "none"
type EvidenceLevel = "Strong" | "Moderate" | "Limited"

interface Interaction {
  id: string
  drug: string
  supplement: string
  severity: Severity
  title: string
  mechanism: string
  mechanismType: string
  clinicalAdvice: string
  evidenceLevel: EvidenceLevel
  pmid: string
}

interface HistoryEntry {
  id: string
  profile: string
  safety: "Critical" | "Warning" | "Safe"
  issues: string
  date: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: "int-001",
    drug: "Warfarin",
    supplement: "St. John's Wort",
    severity: "critical",
    title: "Decreased Anticoagulant Efficacy",
    mechanism: "St. John's Wort is a potent CYP3A4 and CYP2C9 inducer, accelerating warfarin metabolism. This dramatically reduces plasma warfarin concentrations and INR, increasing thromboembolic risk.",
    mechanismType: "Metabolic Interaction (CYP3A4/CYP2C9)",
    clinicalAdvice: "Avoid concurrent use. If St. John's Wort is discontinued, monitor INR closely for 2 weeks as warfarin levels will rise. Do not adjust warfarin dose preemptively.",
    evidenceLevel: "Strong",
    pmid: "PMID: 12493534",
  },
  {
    id: "int-002",
    drug: "Warfarin",
    supplement: "Vitamin K",
    severity: "critical",
    title: "Antagonized Anticoagulation",
    mechanism: "Vitamin K directly opposes warfarin's mechanism of action by serving as a cofactor for clotting factor carboxylation (II, VII, IX, X). Even moderate dietary variation can destabilize INR control.",
    mechanismType: "Pharmacodynamic Antagonism",
    clinicalAdvice: "Maintain consistent vitamin K intake. Supplementation above 25mcg/day may significantly reduce INR. If supplementation is needed, use lowest dose and check INR within 3-5 days.",
    evidenceLevel: "Strong",
    pmid: "PMID: 15821196",
  },
  {
    id: "int-003",
    drug: "Warfarin",
    supplement: "Fish Oil",
    severity: "critical",
    title: "Increased Bleeding Risk",
    mechanism: "Omega-3 fatty acids inhibit platelet aggregation via thromboxane A2 suppression and compete in the cyclooxygenase pathway. Combined with warfarin's anticoagulant effect, creates dual-pathway bleeding risk.",
    mechanismType: "Pharmacodynamic Interaction",
    clinicalAdvice: "Monitor INR closely. Start at lowest dose (1g/day). Educate patient on bleeding signs. Schedule INR check within 5-7 days of initiation. Avoid concurrent NSAIDs.",
    evidenceLevel: "Strong",
    pmid: "PMID: 34521897",
  },
  {
    id: "int-004",
    drug: "Warfarin",
    supplement: "CoQ10",
    severity: "moderate",
    title: "Reduced Anticoagulant Efficacy",
    mechanism: "CoQ10 (ubiquinone) is structurally similar to vitamin K2 and may promote clotting factor synthesis, potentially reducing warfarin's anticoagulant effect. Effect is dose-dependent.",
    mechanismType: "Structural Analog (Vitamin K-like)",
    clinicalAdvice: "Monitor INR weekly for first month. CoQ10 above 100mg/day carries greater risk. Consider ubiquinol form. Document baseline INR before initiating.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 29183744",
  },
  {
    id: "int-005",
    drug: "Warfarin",
    supplement: "Curcumin",
    severity: "moderate",
    title: "Potentiated Anticoagulation",
    mechanism: "Curcumin inhibits platelet aggregation and may inhibit CYP2C9, the primary enzyme metabolizing S-warfarin. This can increase warfarin exposure and INR.",
    mechanismType: "CYP2C9 Inhibition + Antiplatelet",
    clinicalAdvice: "Monitor INR if adding curcumin. Avoid doses above 500mg/day with warfarin. Watch for bruising, epistaxis, and GI bleeding.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 30721903",
  },
  {
    id: "int-006",
    drug: "Lisinopril",
    supplement: "St. John's Wort",
    severity: "none",
    title: "No Known Interaction",
    mechanism: "No significant pharmacokinetic or pharmacodynamic interaction identified. Lisinopril is renally eliminated and not significantly affected by CYP induction.",
    mechanismType: "N/A",
    clinicalAdvice: "Combination appears safe. Continue routine blood pressure monitoring.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 22847110",
  },
  {
    id: "int-007",
    drug: "Lisinopril",
    supplement: "Vitamin K",
    severity: "none",
    title: "No Known Interaction",
    mechanism: "Vitamin K supplementation does not affect ACE inhibitor pharmacology. No interaction identified in clinical literature.",
    mechanismType: "N/A",
    clinicalAdvice: "Safe to co-administer. No monitoring changes needed.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 18273562",
  },
  {
    id: "int-008",
    drug: "Lisinopril",
    supplement: "Fish Oil",
    severity: "minor",
    title: "Potential Additive Hypotension",
    mechanism: "Fish oil may modestly reduce blood pressure through improved endothelial function and reduced vascular resistance. Additive effect with ACE inhibition is generally mild.",
    mechanismType: "Additive Pharmacodynamic",
    clinicalAdvice: "Monitor blood pressure. Generally beneficial combination. Adjust lisinopril dose if symptomatic hypotension occurs.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 31842478",
  },
  {
    id: "int-009",
    drug: "Lisinopril",
    supplement: "CoQ10",
    severity: "minor",
    title: "Mild Blood Pressure Reduction",
    mechanism: "CoQ10 has modest antihypertensive properties. May provide additive blood pressure lowering with ACE inhibitors, typically 5-10mmHg systolic.",
    mechanismType: "Additive Pharmacodynamic",
    clinicalAdvice: "Monitor blood pressure during initial co-administration. Dose adjustment of lisinopril may be warranted if significant additional reduction observed.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 28768407",
  },
  {
    id: "int-010",
    drug: "Lisinopril",
    supplement: "Curcumin",
    severity: "none",
    title: "No Known Interaction",
    mechanism: "No significant pharmacokinetic or pharmacodynamic interaction identified between curcumin and ACE inhibitors.",
    mechanismType: "N/A",
    clinicalAdvice: "Combination is safe. Some evidence suggests curcumin may provide complementary anti-inflammatory cardiovascular benefits.",
    evidenceLevel: "Limited",
    pmid: "PMID: 33614521",
  },
]

const HISTORY: HistoryEntry[] = [
  { id: "h1", profile: "Patient #8211", safety: "Critical", issues: "2 High, 1 Mod", date: "Mar 18" },
  { id: "h2", profile: "Patient #9928", safety: "Warning", issues: "0 High, 2 Mod", date: "Mar 17" },
  { id: "h3", profile: "Self-Check", safety: "Safe", issues: "0 Issues", date: "Mar 17" },
  { id: "h4", profile: "Patient #4821", safety: "Safe", issues: "0 Issues", date: "Mar 16" },
  { id: "h5", profile: "Patient #3917", safety: "Critical", issues: "1 High, 3 Mod", date: "Mar 15" },
]

const AVAILABLE_DRUGS = [
  "Warfarin", "Metformin", "Lisinopril", "Atorvastatin", "Levothyroxine",
  "Amlodipine", "Omeprazole", "Losartan", "Clopidogrel", "Sertraline",
  "Fluoxetine", "Gabapentin", "Prednisone", "Metoprolol", "Simvastatin",
]

const AVAILABLE_SUPPLEMENTS = [
  "CoQ10", "Fish Oil", "Vitamin D3", "Magnesium Glycinate", "B-Complex",
  "Methylfolate", "Curcumin", "Probiotics", "Zinc", "NAC",
  "Alpha Lipoic Acid", "Berberine", "Ashwagandha", "St. John's Wort",
  "Vitamin K", "Resveratrol",
]

// ─── Severity dot component ────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: Severity }) {
  if (severity === "critical")
    return <span className="w-3 h-3 rounded-full bg-red-500 inline-block animate-pulse" />
  if (severity === "moderate")
    return <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
  if (severity === "minor")
    return <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
  return <span className="w-3 h-3 rounded-full bg-green-400/20 border border-green-400/40 inline-block" />
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function InteractionsPage() {
  const [drugs, setDrugs] = useState<string[]>(["Warfarin", "Lisinopril"])
  const [supplements, setSupplements] = useState<string[]>(["St. John's Wort"])
  const [drugSearch, setDrugSearch] = useState("")
  const [supplementSearch, setSupplementSearch] = useState("")
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false)
  const [showSuppSuggestions, setShowSuppSuggestions] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<Interaction[] | null>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null)

  // Filtered suggestion lists
  const filteredDrugs = AVAILABLE_DRUGS.filter(
    (d) => d.toLowerCase().includes(drugSearch.toLowerCase()) && !drugs.includes(d)
  )
  const filteredSupps = AVAILABLE_SUPPLEMENTS.filter(
    (s) => s.toLowerCase().includes(supplementSearch.toLowerCase()) && !supplements.includes(s)
  )

  function addDrug(drug: string) {
    if (!drugs.includes(drug)) setDrugs((p) => [...p, drug])
    setDrugSearch("")
    setShowDrugSuggestions(false)
  }

  function addSupplement(supp: string) {
    if (!supplements.includes(supp)) setSupplements((p) => [...p, supp])
    setSupplementSearch("")
    setShowSuppSuggestions(false)
  }

  function removeDrug(drug: string) {
    setDrugs((p) => p.filter((d) => d !== drug))
    setResults(null)
    setSelectedInteraction(null)
  }

  function removeSupplement(supp: string) {
    setSupplements((p) => p.filter((s) => s !== supp))
    setResults(null)
    setSelectedInteraction(null)
  }

  const handleCheck = useCallback(() => {
    if (drugs.length === 0 || supplements.length === 0) return
    setIsChecking(true)
    setResults(null)
    setSelectedInteraction(null)
    setTimeout(() => {
      const found = MOCK_INTERACTIONS.filter(
        (i) => drugs.includes(i.drug) && supplements.includes(i.supplement)
      )
      setResults(found)
      // Auto-select first critical interaction or first result
      const first = found.find((f) => f.severity === "critical") ?? found[0] ?? null
      setSelectedInteraction(first)
      setIsChecking(false)
    }, 1500)
  }, [drugs, supplements])

  // Counts
  const criticalCount = results?.filter((r) => r.severity === "critical").length ?? 0
  const moderateCount = results?.filter((r) => r.severity === "moderate").length ?? 0
  const minorCount = results?.filter((r) => r.severity === "minor").length ?? 0
  const safeCount = results?.filter((r) => r.severity === "none").length ?? 0
  const totalPairs = drugs.length * supplements.length

  // Build matrix data: for each supplement × drug pair, find severity
  function getMatrixSeverity(drug: string, supplement: string): Severity {
    const ix = results?.find((r) => r.drug === drug && r.supplement === supplement)
    return ix?.severity ?? "none"
  }

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 pb-20">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#111827]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-400/10 p-1.5 rounded">
              <ShieldCheck className="h-4 w-4 text-green-400" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              ViaConnect <span className="text-green-400">Safety</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-white transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 border border-green-400/20 flex items-center justify-center text-xs font-bold text-gray-900">
              DR
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {/* ── INPUT PANELS ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Medications */}
          <section className="bg-gray-800/70 backdrop-blur-sm border border-green-400/10 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <Pill className="h-4 w-4" />
              Medications
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={drugSearch}
                  onChange={(e) => { setDrugSearch(e.target.value); setShowDrugSuggestions(true) }}
                  onFocus={() => setShowDrugSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDrugSuggestions(false), 150)}
                  placeholder="Search prescriptions..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-green-400/40"
                />
                {showDrugSuggestions && drugSearch && filteredDrugs.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
                    {filteredDrugs.slice(0, 6).map((drug) => (
                      <button
                        key={drug}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-green-400/10 hover:text-green-400 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addDrug(drug)}
                      >
                        <Plus className="h-3 w-3" />{drug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { if (drugSearch.trim()) addDrug(drugSearch.trim()) }}
                className="bg-green-400 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-300 transition-colors shrink-0"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {drugs.map((drug) => (
                <span key={drug} className="bg-slate-800 px-2.5 py-1 rounded text-xs border border-slate-700 flex items-center gap-1.5">
                  {drug}
                  <button onClick={() => removeDrug(drug)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {drugs.length === 0 && <span className="text-xs text-slate-500 italic">No medications added</span>}
            </div>
          </section>

          {/* Supplements */}
          <section className="bg-gray-800/70 backdrop-blur-sm border border-green-400/10 p-4 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
              <Pill className="h-4 w-4" />
              Supplements
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={supplementSearch}
                  onChange={(e) => { setSupplementSearch(e.target.value); setShowSuppSuggestions(true) }}
                  onFocus={() => setShowSuppSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuppSuggestions(false), 150)}
                  placeholder="Search vitamins..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-yellow-400/40"
                />
                {showSuppSuggestions && supplementSearch && filteredSupps.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl overflow-hidden">
                    {filteredSupps.slice(0, 6).map((supp) => (
                      <button
                        key={supp}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addSupplement(supp)}
                      >
                        <Plus className="h-3 w-3" />{supp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => { if (supplementSearch.trim()) addSupplement(supplementSearch.trim()) }}
                className="bg-yellow-400 text-gray-900 px-3 py-2 rounded-lg text-sm font-bold hover:bg-yellow-300 transition-colors shrink-0"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {supplements.map((supp) => (
                <span key={supp} className="bg-slate-800 px-2.5 py-1 rounded text-xs border border-slate-700 flex items-center gap-1.5">
                  {supp}
                  <button onClick={() => removeSupplement(supp)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {supplements.length === 0 && <span className="text-xs text-slate-500 italic">No supplements added</span>}
            </div>
          </section>
        </div>

        {/* ── RUN CHECK BUTTON ──────────────────────────────── */}
        <button
          onClick={handleCheck}
          disabled={drugs.length === 0 || supplements.length === 0 || isChecking}
          className="w-full bg-green-400 text-gray-900 font-bold py-3.5 rounded-full shadow-[0_0_20px_rgba(74,222,128,0.3)] flex items-center justify-center gap-2 text-sm hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing {totalPairs} interactions...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              RUN INTERACTION CHECK
            </>
          )}
        </button>

        {/* ── RESULTS: Matrix + Detail ──────────────────────── */}
        {results !== null && (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Matrix — 2/3 */}
            <div className="lg:col-span-2 bg-gray-800/70 backdrop-blur-sm border border-green-400/10 p-4 rounded-xl overflow-x-auto">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <Grid3X3 className="h-4 w-4 text-green-400" />
                Interaction Matrix
              </h3>
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="text-slate-500 uppercase text-[10px] font-mono">
                    <th className="text-left pb-3 pr-4" />
                    {drugs.map((drug) => (
                      <th key={drug} className="pb-3 px-3 font-medium">{drug}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {supplements.map((supp) => (
                    <tr key={supp}>
                      <td className="py-3 text-left font-medium text-slate-400 uppercase text-[10px] tracking-wider pr-4 whitespace-nowrap">
                        {supp}
                      </td>
                      {drugs.map((drug) => {
                        const severity = getMatrixSeverity(drug, supp)
                        const ix = results.find((r) => r.drug === drug && r.supplement === supp)
                        return (
                          <td key={`${drug}-${supp}`} className="py-3 px-3">
                            <button
                              onClick={() => ix && setSelectedInteraction(ix)}
                              className={`inline-flex items-center justify-center ${ix ? "cursor-pointer hover:scale-125 transition-transform" : "cursor-default"}`}
                            >
                              <SeverityDot severity={severity} />
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800/50 text-[10px] text-slate-500 uppercase font-mono">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Moderate</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Minor</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400/20 border border-green-400/40 inline-block" />Safe</span>
              </div>
            </div>

            {/* Detail Panel — 1/3 */}
            <div className={`bg-gray-800/70 backdrop-blur-sm border-l-4 rounded-xl p-4 transition-all ${
              selectedInteraction
                ? selectedInteraction.severity === "critical"
                  ? "border-red-500 border border-red-500/20"
                  : selectedInteraction.severity === "moderate"
                  ? "border-yellow-400 border border-yellow-400/20"
                  : selectedInteraction.severity === "minor"
                  ? "border-blue-400 border border-blue-400/20"
                  : "border-green-400 border border-green-400/20"
                : "border-slate-700 border border-slate-700"
            }`}>
              {selectedInteraction ? (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      selectedInteraction.severity === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : selectedInteraction.severity === "moderate"
                        ? "bg-yellow-400/20 text-yellow-400"
                        : selectedInteraction.severity === "minor"
                        ? "bg-blue-400/20 text-blue-400"
                        : "bg-green-400/20 text-green-400"
                    }`}>
                      {selectedInteraction.severity === "none" ? "Safe" : `${selectedInteraction.severity} Severity`}
                    </span>
                    <Info className="h-4 w-4 text-slate-500" />
                  </div>

                  <h4 className="font-bold text-sm mt-3">
                    {selectedInteraction.drug} × {selectedInteraction.supplement}
                  </h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-4">
                    {selectedInteraction.mechanismType}
                  </p>

                  <div className="space-y-4 text-xs leading-relaxed">
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px] tracking-wider mb-1">Mechanism</span>
                      <p className="text-slate-300">{selectedInteraction.mechanism}</p>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px] tracking-wider mb-1">Clinical Advice</span>
                      <p className={selectedInteraction.severity === "critical" ? "text-red-400" : "text-slate-300"}>
                        {selectedInteraction.clinicalAdvice}
                      </p>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px] tracking-wider mb-1">Evidence</span>
                      <p className="text-slate-400">{selectedInteraction.evidenceLevel}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex items-center gap-1.5 text-green-400 text-xs">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{selectedInteraction.pmid}</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Info className="h-8 w-8 mb-3 opacity-30" />
                  <p className="text-xs text-center">Click a dot in the matrix to view interaction details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORY TABLE ─────────────────────────────────── */}
        <div className="bg-gray-800/70 backdrop-blur-sm border border-green-400/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              Recent Checks
            </h3>
            <button className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/30 text-slate-500 text-[10px] uppercase font-mono">
              <tr>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Safety</th>
                <th className="px-4 py-3">Issues</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {HISTORY.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium">{entry.profile}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      entry.safety === "Critical" ? "text-red-400" : entry.safety === "Warning" ? "text-yellow-400" : "text-green-400"
                    }`}>
                      {entry.safety}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{entry.issues}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── FIXED FOOTER ────────────────────────────────────── */}
      <footer className="fixed bottom-0 w-full bg-gray-800/70 backdrop-blur-xl border-t border-slate-800 h-14 z-50">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex gap-5 text-[10px] font-bold uppercase">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
              {results ? safeCount : 0} Safe
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
              {results ? moderateCount + minorCount : 0} Monitor
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              {results ? criticalCount : 0} Avoid
            </div>
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase transition-colors">
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </footer>
    </div>
  )
}
