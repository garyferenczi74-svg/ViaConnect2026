"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  ShieldCheck,
  Info,
  X,
  Plus,
  FileDown,
  Search,
  BookOpen,
  ExternalLink,
  Pill,
  History,
  Grid3X3,
  Bell,
  ChevronRight,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Beaker,
  Dna,
  MessageSquareWarning,
  Clock,
  Stethoscope,
  Lightbulb,
  FileText,
  ShieldAlert,
  ArrowRight,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type Severity = "critical" | "moderate" | "minor" | "none"
type EvidenceLevel = "Strong" | "Moderate" | "Limited"

interface DrugEntry {
  name: string
  dosage: string
  rxnorm: string
}

interface SupplementEntry {
  name: string
  dosage: string
  farmceutica: boolean
}

interface Interaction {
  id: string
  drug: string
  supplement: string
  severity: Severity
  title: string
  mechanism: string
  mechanismType: string
  onset: string
  clinicalSignificance: string
  mitigation: string
  evidenceLevel: EvidenceLevel
  pmid: string
}

interface HistoryEntry {
  id: string
  date: string
  patient: string
  combinations: number
  results: string
  overrides: number
}

// ─── Drug & Supplement Catalogs ─────────────────────────────────────────────

const DRUG_CATALOG: Record<string, { dosage: string; rxnorm: string }> = {
  Metformin: { dosage: "500mg", rxnorm: "RxNorm: 861007" },
  Lisinopril: { dosage: "10mg", rxnorm: "RxNorm: 314076" },
  Atorvastatin: { dosage: "20mg", rxnorm: "RxNorm: 259255" },
  Warfarin: { dosage: "5mg", rxnorm: "RxNorm: 855332" },
  Levothyroxine: { dosage: "50mcg", rxnorm: "RxNorm: 966247" },
  Amlodipine: { dosage: "5mg", rxnorm: "RxNorm: 197361" },
  Omeprazole: { dosage: "20mg", rxnorm: "RxNorm: 198053" },
  Losartan: { dosage: "50mg", rxnorm: "RxNorm: 979480" },
  Clopidogrel: { dosage: "75mg", rxnorm: "RxNorm: 309362" },
  Sertraline: { dosage: "50mg", rxnorm: "RxNorm: 312940" },
  Fluoxetine: { dosage: "20mg", rxnorm: "RxNorm: 310385" },
  Gabapentin: { dosage: "300mg", rxnorm: "RxNorm: 310430" },
  Prednisone: { dosage: "10mg", rxnorm: "RxNorm: 312617" },
  Metoprolol: { dosage: "25mg", rxnorm: "RxNorm: 866514" },
  Simvastatin: { dosage: "20mg", rxnorm: "RxNorm: 312961" },
}

const SUPP_CATALOG: Record<string, { dosage: string; farmceutica: boolean }> = {
  CoQ10: { dosage: "200mg", farmceutica: true },
  "Omega-3": { dosage: "2000mg", farmceutica: true },
  "Magnesium Glycinate": { dosage: "400mg", farmceutica: true },
  NAC: { dosage: "600mg", farmceutica: false },
  "Vitamin D3": { dosage: "5000 IU", farmceutica: true },
  "B-Complex": { dosage: "1 cap", farmceutica: false },
  Methylfolate: { dosage: "800mcg", farmceutica: true },
  Curcumin: { dosage: "500mg", farmceutica: false },
  Probiotics: { dosage: "50B CFU", farmceutica: true },
  Zinc: { dosage: "30mg", farmceutica: false },
  "Alpha Lipoic Acid": { dosage: "300mg", farmceutica: false },
  Berberine: { dosage: "500mg", farmceutica: false },
  Ashwagandha: { dosage: "600mg", farmceutica: false },
  "St. John's Wort": { dosage: "300mg", farmceutica: false },
  "Vitamin K": { dosage: "100mcg", farmceutica: false },
  Resveratrol: { dosage: "250mg", farmceutica: false },
  "Fish Oil": { dosage: "1000mg", farmceutica: true },
}

// ─── Mock Interactions ──────────────────────────────────────────────────────

const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: "int-001",
    drug: "Metformin",
    supplement: "CoQ10",
    severity: "minor",
    title: "Potential Synergistic Benefit",
    mechanism: "Metformin inhibits mitochondrial complex I, potentially depleting CoQ10 levels. Supplementation may help mitigate metformin-associated mitochondrial dysfunction and modestly improve glycemic control via enhanced mitochondrial bioenergetics.",
    mechanismType: "Mitochondrial Complex I Interaction",
    onset: "Gradual (2-4 weeks)",
    clinicalSignificance: "Low — Generally beneficial interaction. CoQ10 may offset metformin-related mitochondrial stress without affecting drug efficacy.",
    mitigation: "CoQ10 supplementation at 100-200mg/day is appropriate. Monitor blood glucose as minor hypoglycemic effect is possible. No dose adjustment of metformin typically required.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 31284923",
  },
  {
    id: "int-002",
    drug: "Metformin",
    supplement: "Omega-3",
    severity: "none",
    title: "Improved Lipid Profile Support",
    mechanism: "No significant pharmacokinetic interaction identified. Omega-3 fatty acids and metformin have complementary effects on metabolic syndrome parameters — triglyceride reduction and insulin sensitization respectively.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Combination is safe. May see enhanced reduction in triglycerides and fasting glucose compared to either agent alone.",
    mitigation: "No special precautions needed. Monitor fasting lipid panel at baseline and 8-12 weeks. Fish oil at 1-4g/day EPA+DHA is appropriate.",
    evidenceLevel: "Strong",
    pmid: "PMID: 33098214",
  },
  {
    id: "int-003",
    drug: "Metformin",
    supplement: "Magnesium Glycinate",
    severity: "none",
    title: "No Significant Interaction",
    mechanism: "No clinically significant pharmacokinetic or pharmacodynamic interaction identified. Magnesium may provide complementary insulin-sensitizing effects at cellular level.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Safe combination. Magnesium supplementation may support glucose metabolism independently.",
    mitigation: "Take magnesium 2 hours apart from metformin to prevent potential minor absorption interference. Monitor electrolytes routinely.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 28526383",
  },
  {
    id: "int-004",
    drug: "Metformin",
    supplement: "NAC",
    severity: "none",
    title: "No Known Interaction",
    mechanism: "N-acetylcysteine operates via glutathione synthesis pathway. No overlap with metformin's AMPK-mediated mechanism. No clinically relevant pharmacokinetic interaction documented.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Safe to co-administer. NAC may offer hepatoprotective benefits for patients on metformin.",
    mitigation: "No dose adjustments or special monitoring needed beyond routine care.",
    evidenceLevel: "Limited",
    pmid: "PMID: 29847501",
  },
  {
    id: "int-005",
    drug: "Lisinopril",
    supplement: "CoQ10",
    severity: "minor",
    title: "Mild Blood Pressure Reduction",
    mechanism: "CoQ10 has modest antihypertensive properties via improved endothelial function and reduced peripheral vascular resistance. Combined with ACE inhibition, may produce additive 5-10mmHg systolic BP reduction.",
    mechanismType: "Additive Pharmacodynamic Effect",
    onset: "Gradual (2-4 weeks)",
    clinicalSignificance: "Low — Typically beneficial. Monitor for orthostatic symptoms, particularly in elderly or volume-depleted patients.",
    mitigation: "Monitor blood pressure during initial co-administration. Consider dose adjustment of lisinopril if symptomatic hypotension occurs. Usually no intervention needed.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 28768407",
  },
  {
    id: "int-006",
    drug: "Lisinopril",
    supplement: "Omega-3",
    severity: "minor",
    title: "Potential Additive Hypotension",
    mechanism: "Omega-3 fatty acids may modestly reduce blood pressure (2-4mmHg systolic) through improved endothelial nitric oxide synthesis and reduced vascular resistance. Effect is additive with ACE inhibition.",
    mechanismType: "Additive Pharmacodynamic Effect",
    onset: "Gradual (4-8 weeks)",
    clinicalSignificance: "Low — Generally beneficial combination for cardiovascular risk reduction. Rarely causes clinically significant hypotension.",
    mitigation: "Monitor blood pressure. Adjust lisinopril dose if symptomatic. No restriction on omega-3 supplementation needed at standard doses.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 31842478",
  },
  {
    id: "int-007",
    drug: "Lisinopril",
    supplement: "Magnesium Glycinate",
    severity: "none",
    title: "No Significant Interaction",
    mechanism: "No pharmacokinetic interaction identified. Magnesium glycinate does not significantly affect ACE inhibitor absorption or activity. Some evidence of mild complementary vasodilatory effect.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Combination is safe. Monitor serum magnesium as ACE inhibitors may alter renal magnesium handling.",
    mitigation: "No special precautions required. Take at least 1 hour apart if GI concerns exist.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 26404370",
  },
  {
    id: "int-008",
    drug: "Lisinopril",
    supplement: "NAC",
    severity: "none",
    title: "No Known Interaction",
    mechanism: "NAC does not interact with ACE inhibitor pharmacology. Both drugs have complementary antioxidant properties with no overlapping metabolic pathways.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Safe combination. NAC may provide additive renal protection in some populations.",
    mitigation: "No interventions needed. Continue standard ACE inhibitor monitoring.",
    evidenceLevel: "Limited",
    pmid: "PMID: 30128741",
  },
  {
    id: "int-009",
    drug: "Atorvastatin",
    supplement: "CoQ10",
    severity: "moderate",
    title: "Statin-Induced CoQ10 Depletion",
    mechanism: "Statins inhibit HMG-CoA reductase, reducing mevalonate pathway flux which also synthesizes CoQ10. Atorvastatin can decrease serum CoQ10 by 40%. Supplementation may mitigate statin-associated myopathy.",
    mechanismType: "Mevalonate Pathway Suppression",
    onset: "Gradual (2-12 weeks)",
    clinicalSignificance: "Moderate — Clinically relevant in patients with myalgia symptoms. CoQ10 supplementation may reduce statin intolerance risk.",
    mitigation: "Consider CoQ10 supplementation (100-200mg/day) in patients reporting muscle symptoms. Ubiquinol form may have superior bioavailability. Monitor CK levels if symptomatic.",
    evidenceLevel: "Strong",
    pmid: "PMID: 29067627",
  },
  {
    id: "int-010",
    drug: "Atorvastatin",
    supplement: "Omega-3",
    severity: "none",
    title: "Complementary Lipid Management",
    mechanism: "No pharmacokinetic interaction. Omega-3 reduces triglycerides via PPAR-alpha activation while atorvastatin lowers LDL via HMG-CoA reductase inhibition. Mechanisms are complementary and non-overlapping.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Beneficial combination for mixed dyslipidemia. FDA-approved omega-3 prescriptions (Vascepa, Lovaza) are used alongside statins.",
    mitigation: "Standard lipid panel monitoring. No dose adjustments needed. Omega-3 at 2-4g/day for therapeutic triglyceride lowering.",
    evidenceLevel: "Strong",
    pmid: "PMID: 30879339",
  },
  {
    id: "int-011",
    drug: "Atorvastatin",
    supplement: "Magnesium Glycinate",
    severity: "none",
    title: "No Significant Interaction",
    mechanism: "No clinically significant pharmacokinetic interaction. Magnesium salts may minimally reduce statin absorption if taken simultaneously, but glycinate form has minimal chelation potential.",
    mechanismType: "No Direct Interaction",
    onset: "N/A",
    clinicalSignificance: "Negligible — Safe combination. Separate dosing by 2 hours as a precaution only if GI absorption is a concern.",
    mitigation: "No monitoring changes needed. Standard lipid panel and hepatic function tests per statin protocol.",
    evidenceLevel: "Limited",
    pmid: "PMID: 27138188",
  },
  {
    id: "int-012",
    drug: "Atorvastatin",
    supplement: "NAC",
    severity: "moderate",
    title: "Hepatoprotective Interaction",
    mechanism: "NAC replenishes glutathione reserves in hepatocytes. May mitigate statin-associated hepatotoxicity by enhancing Phase II detoxification. Some evidence suggests reduced transaminase elevations with concurrent NAC use.",
    mechanismType: "Hepatic Glutathione Modulation",
    onset: "Gradual (1-4 weeks)",
    clinicalSignificance: "Moderate — Potentially beneficial for liver protection. Monitor hepatic function as NAC may alter the interpretation of liver enzyme trends.",
    mitigation: "Monitor AST/ALT at baseline, 12 weeks, and annually. If using NAC prophylactically for statin hepatotoxicity, standard dose of 600mg BID is appropriate. Document concurrent use.",
    evidenceLevel: "Moderate",
    pmid: "PMID: 31847520",
  },
]

// ─── History Data ───────────────────────────────────────────────────────────

const HISTORY_DATA: HistoryEntry[] = [
  { id: "h1", date: "2026-03-18", patient: "Patient #8211", combinations: 12, results: "2 Avoid, 3 Monitor, 7 Safe", overrides: 1 },
  { id: "h2", date: "2026-03-17", patient: "Patient #9928", combinations: 8, results: "0 Avoid, 2 Monitor, 6 Safe", overrides: 0 },
  { id: "h3", date: "2026-03-17", patient: "Self-Check", combinations: 4, results: "0 Avoid, 0 Monitor, 4 Safe", overrides: 0 },
  { id: "h4", date: "2026-03-16", patient: "Patient #4821", combinations: 15, results: "1 Avoid, 4 Monitor, 10 Safe", overrides: 1 },
  { id: "h5", date: "2026-03-15", patient: "Patient #3917", combinations: 6, results: "1 Avoid, 3 Monitor, 2 Safe", overrides: 0 },
]

// ─── DNA Helix Spinner ──────────────────────────────────────────────────────

function DnaSpinner() {
  return (
    <div className="relative w-6 h-6">
      <Dna className="h-6 w-6 text-gray-900 animate-spin" style={{ animationDuration: "1.5s" }} />
    </div>
  )
}

// ─── Severity Dot ───────────────────────────────────────────────────────────

function SeverityDot({ severity, size = "md" }: { severity: Severity; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"
  if (severity === "critical")
    return <span className={`${s} rounded-full bg-[#f87171] inline-block animate-pulse`} />
  if (severity === "moderate")
    return <span className={`${s} rounded-full bg-[#fbbf24] inline-block`} />
  if (severity === "minor")
    return <span className={`${s} rounded-full bg-blue-400 inline-block`} />
  return <span className={`${s} rounded-full bg-[#4ade80]/20 border border-[#4ade80]/40 inline-block`} />
}

function severityLabel(s: Severity) {
  return s === "critical" ? "AVOID" : s === "moderate" ? "MONITOR" : s === "minor" ? "MONITOR" : "SAFE"
}

function severityColor(s: Severity) {
  return s === "critical" ? "text-[#f87171]" : s === "moderate" ? "text-[#fbbf24]" : s === "minor" ? "text-blue-400" : "text-[#4ade80]"
}

function severityBgColor(s: Severity) {
  return s === "critical" ? "bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/25"
    : s === "moderate" ? "bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/25"
    : s === "minor" ? "bg-blue-400/15 text-blue-400 border border-blue-400/25"
    : "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/25"
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function InteractionsPage() {
  // Input state
  const [drugs, setDrugs] = useState<DrugEntry[]>([
    { name: "Metformin", dosage: "500mg", rxnorm: "RxNorm: 861007" },
    { name: "Lisinopril", dosage: "10mg", rxnorm: "RxNorm: 314076" },
    { name: "Atorvastatin", dosage: "20mg", rxnorm: "RxNorm: 259255" },
  ])
  const [supplements, setSupplements] = useState<SupplementEntry[]>([
    { name: "CoQ10", dosage: "200mg", farmceutica: true },
    { name: "Omega-3", dosage: "2000mg", farmceutica: true },
    { name: "Magnesium Glycinate", dosage: "400mg", farmceutica: true },
    { name: "NAC", dosage: "600mg", farmceutica: false },
  ])

  // Search state
  const [drugSearch, setDrugSearch] = useState("")
  const [suppSearch, setSuppSearch] = useState("")
  const [showDrugSuggestions, setShowDrugSuggestions] = useState(false)
  const [showSuppSuggestions, setShowSuppSuggestions] = useState(false)

  // Results state
  const [isChecking, setIsChecking] = useState(false)
  const [checkProgress, setCheckProgress] = useState(0)
  const [results, setResults] = useState<Interaction[] | null>(null)

  // Detail panel
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideJustification, setOverrideJustification] = useState("")

  // Tooltip
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const drugNames = drugs.map((d) => d.name)
  const suppNames = supplements.map((s) => s.name)
  const totalCombinations = drugs.length * supplements.length

  // Filtered suggestions
  const filteredDrugs = Object.keys(DRUG_CATALOG).filter(
    (d) => d.toLowerCase().includes(drugSearch.toLowerCase()) && !drugNames.includes(d)
  )
  const filteredSupps = Object.keys(SUPP_CATALOG).filter(
    (s) => s.toLowerCase().includes(suppSearch.toLowerCase()) && !suppNames.includes(s)
  )

  function addDrug(name: string) {
    const cat = DRUG_CATALOG[name]
    if (cat && !drugNames.includes(name)) {
      setDrugs((p) => [...p, { name, dosage: cat.dosage, rxnorm: cat.rxnorm }])
    }
    setDrugSearch("")
    setShowDrugSuggestions(false)
  }

  function removeDrug(name: string) {
    setDrugs((p) => p.filter((d) => d.name !== name))
    setResults(null)
    closePanel()
  }

  function addSupplement(name: string) {
    const cat = SUPP_CATALOG[name]
    if (cat && !suppNames.includes(name)) {
      setSupplements((p) => [...p, { name, dosage: cat.dosage, farmceutica: cat.farmceutica }])
    }
    setSuppSearch("")
    setShowSuppSuggestions(false)
  }

  function removeSupplement(name: string) {
    setSupplements((p) => p.filter((s) => s.name !== name))
    setResults(null)
    closePanel()
  }

  function closePanel() {
    setPanelOpen(false)
    setShowOverrideForm(false)
    setOverrideJustification("")
    setTimeout(() => setSelectedInteraction(null), 300)
  }

  function openDetail(interaction: Interaction) {
    setSelectedInteraction(interaction)
    setPanelOpen(true)
    setShowOverrideForm(false)
    setOverrideJustification("")
  }

  const handleCheck = useCallback(() => {
    if (drugs.length === 0 || supplements.length === 0) return
    setIsChecking(true)
    setResults(null)
    setCheckProgress(0)
    closePanel()

    const total = drugs.length * supplements.length
    let current = 0
    progressRef.current = setInterval(() => {
      current++
      setCheckProgress(current)
      if (current >= total) {
        if (progressRef.current) clearInterval(progressRef.current)
      }
    }, 1500 / total)

    setTimeout(() => {
      if (progressRef.current) clearInterval(progressRef.current)
      setCheckProgress(total)
      const found = MOCK_INTERACTIONS.filter(
        (i) => drugNames.includes(i.drug) && suppNames.includes(i.supplement)
      )
      setResults(found)
      setIsChecking(false)
    }, 1800)
  }, [drugs, supplements, drugNames, suppNames])

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [])

  // Matrix helper
  function getInteraction(drug: string, supplement: string): Interaction | undefined {
    return results?.find((r) => r.drug === drug && r.supplement === supplement)
  }

  // Result counts
  const criticalCount = results?.filter((r) => r.severity === "critical").length ?? 0
  const moderateCount = results?.filter((r) => r.severity === "moderate").length ?? 0
  const minorCount = results?.filter((r) => r.severity === "minor").length ?? 0
  const safeCount = results?.filter((r) => r.severity === "none").length ?? 0

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 pb-24 relative">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#111827]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#4ade80]/10 p-1.5 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-[#4ade80]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-tight">
                ViaConnect <span className="text-[#4ade80]">GeneX360</span>
              </span>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">Drug-Supplement Safety</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#f87171] rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ade80] to-emerald-600 border border-[#4ade80]/20 flex items-center justify-center text-xs font-bold text-gray-900">
              DR
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── PAGE TITLE ───────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="bg-[#4ade80]/10 p-2 rounded-lg">
            <ShieldAlert className="h-6 w-6 text-[#4ade80]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Drug-Supplement Interaction Checker</h1>
            <p className="text-xs text-slate-500 mt-0.5">Identify potential interactions using evidence-based clinical data</p>
          </div>
        </div>

        {/* ── DUAL INPUT PANELS ────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Medications */}
          <section className="bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#4ade80] font-semibold text-sm">
                <Pill className="h-4 w-4" />
                Current Medications
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{drugs.length} active</span>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={drugSearch}
                    onChange={(e) => { setDrugSearch(e.target.value); setShowDrugSuggestions(true) }}
                    onFocus={() => setShowDrugSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDrugSuggestions(false), 200)}
                    placeholder="Search prescriptions..."
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80]/40 focus:ring-1 focus:ring-[#4ade80]/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => { if (drugSearch.trim() && DRUG_CATALOG[drugSearch.trim()]) addDrug(drugSearch.trim()) }}
                  className="border border-[#4ade80]/30 text-[#4ade80] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#4ade80]/10 transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {showDrugSuggestions && drugSearch && filteredDrugs.length > 0 && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/95 backdrop-blur-sm shadow-2xl overflow-hidden">
                  {filteredDrugs.slice(0, 5).map((drug) => (
                    <button
                      key={drug}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-slate-300 hover:bg-[#4ade80]/10 hover:text-[#4ade80] transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addDrug(drug)}
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3 opacity-50" />
                        {drug}
                      </span>
                      <span className="text-[10px] text-slate-600">{DRUG_CATALOG[drug]?.dosage}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drug List */}
            <div className="space-y-2 min-h-[80px]">
              {drugs.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                  No medications added
                </div>
              ) : (
                drugs.map((drug) => (
                  <div
                    key={drug.name}
                    className="flex items-center justify-between bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-2.5 group hover:border-[#4ade80]/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{drug.name}</span>
                          <span className="text-xs text-slate-400">{drug.dosage}</span>
                        </div>
                        <span className="text-[10px] text-[#4ade80]/60 font-mono">{drug.rxnorm}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDrug(drug.name)}
                      className="rounded-md p-1 text-slate-600 hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Supplements */}
          <section className="bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#fbbf24] font-semibold text-sm">
                <Beaker className="h-4 w-4" />
                Supplements
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{supplements.length} active</span>
            </div>

            {/* Search */}
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={suppSearch}
                    onChange={(e) => { setSuppSearch(e.target.value); setShowSuppSuggestions(true) }}
                    onFocus={() => setShowSuppSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuppSuggestions(false), 200)}
                    placeholder="Search supplements..."
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#fbbf24]/40 focus:ring-1 focus:ring-[#fbbf24]/20 transition-all"
                  />
                </div>
                <button
                  onClick={() => { if (suppSearch.trim() && SUPP_CATALOG[suppSearch.trim()]) addSupplement(suppSearch.trim()) }}
                  className="border border-[#fbbf24]/30 text-[#fbbf24] px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#fbbf24]/10 transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              {showSuppSuggestions && suppSearch && filteredSupps.length > 0 && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-800/95 backdrop-blur-sm shadow-2xl overflow-hidden">
                  {filteredSupps.slice(0, 5).map((supp) => (
                    <button
                      key={supp}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-slate-300 hover:bg-[#fbbf24]/10 hover:text-[#fbbf24] transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addSupplement(supp)}
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3 opacity-50" />
                        {supp}
                        {SUPP_CATALOG[supp]?.farmceutica && (
                          <span className="bg-purple-400/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-semibold">FC</span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-600">{SUPP_CATALOG[supp]?.dosage}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Supplement List */}
            <div className="space-y-2 min-h-[80px]">
              {supplements.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                  No supplements added
                </div>
              ) : (
                supplements.map((supp) => (
                  <div
                    key={supp.name}
                    className="flex items-center justify-between bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-2.5 group hover:border-[#fbbf24]/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{supp.name}</span>
                          <span className="text-xs text-slate-400">{supp.dosage}</span>
                          {supp.farmceutica && (
                            <span className="bg-purple-400/20 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                              FarmCeutica
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSupplement(supp.name)}
                      className="rounded-md p-1 text-slate-600 hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── CHECK BUTTON ─────────────────────────────────────── */}
        <div className="flex justify-center">
          <button
            onClick={handleCheck}
            disabled={drugs.length === 0 || supplements.length === 0 || isChecking}
            className="bg-[#4ade80] text-gray-900 font-bold rounded-full px-8 py-3 shadow-[0_0_24px_rgba(74,222,128,0.3)] hover:shadow-[0_0_32px_rgba(74,222,128,0.45)] hover:bg-[#6ee7a0] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center gap-3 text-sm"
          >
            {isChecking ? (
              <>
                <DnaSpinner />
                <span>Checking {checkProgress} of {totalCombinations} combinations...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Run Interaction Check
              </>
            )}
          </button>
        </div>

        {/* ── RESULTS MATRIX ───────────────────────────────────── */}
        {results !== null && (
          <>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl p-6 overflow-x-auto">
              <h3 className="font-semibold mb-5 flex items-center gap-2 text-sm">
                <Grid3X3 className="h-4 w-4 text-[#4ade80]" />
                Interaction Matrix
                <span className="text-[10px] text-slate-500 ml-2 font-normal">
                  {totalCombinations} combinations analyzed
                </span>
              </h3>
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="text-left pb-4 pr-6" />
                    {drugs.map((drug) => (
                      <th key={drug.name} className="pb-4 px-4">
                        <div className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">{drug.name}</div>
                        <div className="text-[9px] text-slate-600 font-normal mt-0.5">{drug.dosage}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {supplements.map((supp) => (
                    <tr key={supp.name} className="group">
                      <td className="py-4 text-left pr-6 whitespace-nowrap">
                        <div className="text-slate-400 font-medium uppercase text-[10px] tracking-wider">{supp.name}</div>
                        <div className="text-[9px] text-slate-600 mt-0.5">{supp.dosage}</div>
                      </td>
                      {drugs.map((drug) => {
                        const ix = getInteraction(drug.name, supp.name)
                        const severity = ix?.severity ?? "none"
                        return (
                          <td key={`${drug.name}-${supp.name}`} className="py-4 px-4">
                            <div className="relative inline-flex">
                              <button
                                onClick={() => ix && openDetail(ix)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setTooltip({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 8,
                                    text: ix ? `${ix.title} (${severityLabel(severity)})` : "No interaction data",
                                  })
                                }}
                                onMouseLeave={() => setTooltip(null)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 ${
                                  ix ? "cursor-pointer hover:bg-slate-700/50 hover:scale-110" : "cursor-default"
                                } ${selectedInteraction?.id === ix?.id ? "bg-slate-700/60 ring-1 ring-white/20" : ""}`}
                              >
                                <SeverityDot severity={severity} />
                              </button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-5 pt-4 border-t border-slate-800/40 text-[10px] text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><SeverityDot severity="critical" size="sm" /> Avoid</span>
                <span className="flex items-center gap-1.5"><SeverityDot severity="moderate" size="sm" /> Monitor</span>
                <span className="flex items-center gap-1.5"><SeverityDot severity="minor" size="sm" /> Minor</span>
                <span className="flex items-center gap-1.5"><SeverityDot severity="none" size="sm" /> Safe</span>
              </div>
            </div>

            {/* ── SUMMARY BAR ──────────────────────────────────── */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl px-6 py-4">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <span className="text-slate-400 font-medium">Results:</span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80] inline-block" />
                  <span className="font-bold text-[#4ade80]">{safeCount}</span>
                  <span className="text-slate-500">Safe</span>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] inline-block" />
                  <span className="font-bold text-[#fbbf24]">{moderateCount + minorCount}</span>
                  <span className="text-slate-500">Monitor</span>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] inline-block" />
                  <span className="font-bold text-[#f87171]">{criticalCount}</span>
                  <span className="text-slate-500">Avoid</span>
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── INTERACTION HISTORY ──────────────────────────────── */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-[#4ade80]/15 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              Interaction History
            </h3>
            <button className="text-xs text-[#4ade80] hover:text-[#6ee7a0] transition-colors flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/30 text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Patient</th>
                  <th className="px-6 py-3 font-semibold">Combinations Checked</th>
                  <th className="px-6 py-3 font-semibold">Results Summary</th>
                  <th className="px-6 py-3 font-semibold">Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {HISTORY_DATA.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors cursor-pointer">
                    <td className="px-6 py-3.5 text-slate-400 font-mono">{entry.date}</td>
                    <td className="px-6 py-3.5 font-medium text-white">{entry.patient}</td>
                    <td className="px-6 py-3.5 text-slate-400">{entry.combinations}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-slate-300">{entry.results}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      {entry.overrides > 0 ? (
                        <span className="bg-[#f87171]/15 text-[#f87171] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {entry.overrides} override{entry.overrides > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── TOOLTIP ────────────────────────────────────────────── */}
      {tooltip && (
        <div
          className="fixed z-[60] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-slate-200 shadow-xl pointer-events-none whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
        </div>
      )}

      {/* ── SLIDE-IN DETAIL PANEL ──────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          panelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-[56] h-full w-full max-w-md bg-[#111827] border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedInteraction && (
          <div className="p-6 space-y-6">
            {/* Panel Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${severityBgColor(selectedInteraction.severity)}`}>
                  {selectedInteraction.severity === "none" ? "Safe" : selectedInteraction.severity === "critical" ? "Avoid" : "Monitor"}
                </span>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pair Title */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {selectedInteraction.drug}
                <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
                {selectedInteraction.supplement}
              </h3>
              <p className="text-xs text-slate-400 italic">{selectedInteraction.title}</p>
            </div>

            {/* Severity Badge Large */}
            <div className={`rounded-xl p-4 ${
              selectedInteraction.severity === "critical" ? "bg-[#f87171]/10 border border-[#f87171]/20" :
              selectedInteraction.severity === "moderate" ? "bg-[#fbbf24]/10 border border-[#fbbf24]/20" :
              selectedInteraction.severity === "minor" ? "bg-blue-400/10 border border-blue-400/20" :
              "bg-[#4ade80]/10 border border-[#4ade80]/20"
            }`}>
              <div className="flex items-center gap-3">
                <SeverityDot severity={selectedInteraction.severity} />
                <div>
                  <span className={`text-sm font-bold ${severityColor(selectedInteraction.severity)}`}>
                    {selectedInteraction.severity === "critical" ? "HIGH RISK — Avoid Combination" :
                     selectedInteraction.severity === "moderate" ? "MODERATE — Monitor Closely" :
                     selectedInteraction.severity === "minor" ? "LOW — Routine Monitoring" :
                     "SAFE — No Intervention Required"}
                  </span>
                </div>
              </div>
            </div>

            {/* Detail Sections */}
            <div className="space-y-5">
              {/* Mechanism */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mechanism</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedInteraction.mechanism}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">{selectedInteraction.mechanismType}</p>
              </div>

              {/* Onset */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Onset</span>
                </div>
                <p className="text-sm text-slate-300">{selectedInteraction.onset}</p>
              </div>

              {/* Clinical Significance */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Clinical Significance</span>
                </div>
                <p className={`text-sm leading-relaxed ${selectedInteraction.severity === "critical" ? "text-[#f87171]" : "text-slate-300"}`}>
                  {selectedInteraction.clinicalSignificance}
                </p>
              </div>

              {/* Mitigation Strategy */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Mitigation Strategy</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedInteraction.mitigation}</p>
              </div>

              {/* Evidence */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Evidence</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Level: <span className="font-semibold text-white">{selectedInteraction.evidenceLevel}</span></span>
                  <span className="text-slate-700">|</span>
                  <span className="text-sm text-[#4ade80] flex items-center gap-1.5 cursor-pointer hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    {selectedInteraction.pmid}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              {selectedInteraction.severity === "critical" && !showOverrideForm && (
                <button
                  onClick={() => setShowOverrideForm(true)}
                  className="w-full bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#f87171]/20 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  Override — Requires Justification
                </button>
              )}

              {showOverrideForm && (
                <div className="space-y-3 bg-[#f87171]/5 border border-[#f87171]/20 rounded-xl p-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#f87171] block">
                    Clinical Justification Required
                  </label>
                  <textarea
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    placeholder="Provide clinical rationale for overriding this interaction warning..."
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f87171]/40 resize-none h-24"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={overrideJustification.trim().length < 10}
                      className="flex-1 bg-[#f87171] text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Confirm Override
                    </button>
                    <button
                      onClick={() => { setShowOverrideForm(false); setOverrideJustification("") }}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={closePanel}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── FIXED FOOTER ───────────────────────────────────────── */}
      <footer className="fixed bottom-0 w-full bg-gray-800/80 backdrop-blur-xl border-t border-slate-800 h-14 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex gap-5 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#4ade80] inline-block" />
              {results ? safeCount : 0} Safe
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#fbbf24] inline-block" />
              {results ? moderateCount + minorCount : 0} Monitor
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f87171] inline-block" />
              {results ? criticalCount : 0} Avoid
            </div>
          </div>
          <button className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-700">
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </footer>
    </div>
  )
}
