"use client"

import * as React from "react"
import {
  Heart,
  Shield,
  Brain,
  Moon,
  Dumbbell,
  Bone,
  Flame,
  Search,
  GripVertical,
  CheckCircle2,
  Check,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Pill,
  Zap,
  X,
  ChevronDown,
  Plus,
  FileText,
  Save,
  Send,
  Loader2,
  Clock,
  Beaker,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type CategoryId = "cardio" | "immune" | "neuro" | "sleep" | "musculo" | "gi" | "metabolic"

interface ProtocolTemplate {
  id: string
  name: string
  category: CategoryId
  icon: React.ReactNode
  description: string
  suppCount: number
}

interface SupplementItem {
  id: string
  name: string
  defaultDose: number
  unit: string
  category: CategoryId
  cypAdjusted?: { dose: number; status: string }
}

interface SelectedSupplement extends SupplementItem {
  dose: number
  frequency: string
  timing: string[]
  duration: number
}

interface InteractionResult {
  id: string
  severity: "green" | "yellow" | "red"
  pair: string
  title: string
  mechanism?: string
  mitigation?: string
}

interface PatientOption {
  id: string
  name: string
  patientId: string
}

type StepId = "template" | "indication" | "supplements" | "dosage" | "interactions" | "notes" | "monitoring" | "assign"

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS: { id: StepId; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "indication", label: "Indication" },
  { id: "supplements", label: "Supplements" },
  { id: "dosage", label: "Dosage" },
  { id: "interactions", label: "Interactions" },
  { id: "notes", label: "Notes" },
  { id: "monitoring", label: "Monitoring" },
  { id: "assign", label: "Assign" },
]

const TEMPLATES: ProtocolTemplate[] = [
  { id: "t1", name: "Cardiovascular Support", category: "cardio", icon: <Heart className="h-7 w-7" />, description: "Lipid optimization, arterial health, and blood pressure management protocol.", suppCount: 8 },
  { id: "t2", name: "Immune Defense", category: "immune", icon: <Shield className="h-7 w-7" />, description: "Immune modulation with targeted antioxidant and antimicrobial support.", suppCount: 6 },
  { id: "t3", name: "Sleep & Recovery", category: "sleep", icon: <Moon className="h-7 w-7" />, description: "Circadian rhythm optimization with GABAergic and melatonin pathway support.", suppCount: 5 },
  { id: "t4", name: "Musculoskeletal", category: "musculo", icon: <Bone className="h-7 w-7" />, description: "Bone density, joint health, and collagen synthesis support protocol.", suppCount: 7 },
  { id: "t5", name: "GI & Microbiome", category: "gi", icon: <Stethoscope className="h-7 w-7" />, description: "Gut barrier integrity, microbiome diversity, and digestive enzyme support.", suppCount: 6 },
  { id: "t6", name: "Cognitive Enhancement", category: "neuro", icon: <Brain className="h-7 w-7" />, description: "Nootropic stack for memory, focus, and neuroprotective pathways.", suppCount: 5 },
  { id: "t7", name: "Metabolic & Energy", category: "metabolic", icon: <Flame className="h-7 w-7" />, description: "Mitochondrial support, glucose metabolism, and sustained energy production.", suppCount: 7 },
]

const SUPPLEMENT_CATALOG: SupplementItem[] = [
  { id: "s01", name: "CoQ10 (Ubiquinol)", defaultDose: 200, unit: "mg", category: "cardio", cypAdjusted: { dose: 300, status: "Poor CYP2D6 Metabolizer" } },
  { id: "s02", name: "Omega-3 EPA/DHA", defaultDose: 2000, unit: "mg", category: "cardio" },
  { id: "s03", name: "Magnesium Glycinate", defaultDose: 400, unit: "mg", category: "cardio" },
  { id: "s04", name: "Nattokinase", defaultDose: 2000, unit: "FU", category: "cardio" },
  { id: "s05", name: "Vitamin D3", defaultDose: 5000, unit: "IU", category: "immune" },
  { id: "s06", name: "Vitamin C (Liposomal)", defaultDose: 1000, unit: "mg", category: "immune" },
  { id: "s07", name: "Zinc Picolinate", defaultDose: 30, unit: "mg", category: "immune" },
  { id: "s08", name: "NAC (N-Acetyl Cysteine)", defaultDose: 600, unit: "mg", category: "immune", cypAdjusted: { dose: 900, status: "CYP1A2 Ultra-rapid" } },
  { id: "s09", name: "Quercetin", defaultDose: 500, unit: "mg", category: "immune" },
  { id: "s10", name: "Elderberry Extract", defaultDose: 600, unit: "mg", category: "immune" },
  { id: "s11", name: "Lion's Mane 8:1", defaultDose: 1000, unit: "mg", category: "neuro" },
  { id: "s12", name: "Phosphatidylserine", defaultDose: 100, unit: "mg", category: "neuro" },
  { id: "s13", name: "Alpha-GPC", defaultDose: 300, unit: "mg", category: "neuro" },
  { id: "s14", name: "Bacopa Monnieri", defaultDose: 300, unit: "mg", category: "neuro" },
  { id: "s15", name: "Magnesium L-Threonate", defaultDose: 2000, unit: "mg", category: "sleep" },
  { id: "s16", name: "L-Theanine", defaultDose: 200, unit: "mg", category: "sleep" },
  { id: "s17", name: "Apigenin", defaultDose: 50, unit: "mg", category: "sleep" },
  { id: "s18", name: "Ashwagandha KSM-66", defaultDose: 600, unit: "mg", category: "metabolic" },
  { id: "s19", name: "Berberine HCl", defaultDose: 500, unit: "mg", category: "metabolic" },
  { id: "s20", name: "Creatine Monohydrate", defaultDose: 5, unit: "g", category: "musculo" },
  { id: "s21", name: "Vitamin K2 MK-7", defaultDose: 200, unit: "mcg", category: "musculo" },
  { id: "s22", name: "Probiotics (Multi-Strain)", defaultDose: 50, unit: "B CFU", category: "gi" },
  { id: "s23", name: "L-Glutamine", defaultDose: 5, unit: "g", category: "gi" },
  { id: "s24", name: "Digestive Enzymes", defaultDose: 1, unit: "cap", category: "gi" },
  { id: "s25", name: "Rhodiola Rosea", defaultDose: 400, unit: "mg", category: "metabolic" },
  { id: "s26", name: "R-Alpha Lipoic Acid", defaultDose: 300, unit: "mg", category: "metabolic" },
  { id: "s27", name: "Curcumin (BCM-95)", defaultDose: 500, unit: "mg", category: "gi" },
  { id: "s28", name: "Collagen Peptides", defaultDose: 10, unit: "g", category: "musculo" },
]

const MOCK_INTERACTIONS: InteractionResult[] = [
  { id: "ix1", severity: "green", pair: "Vitamin D3 + Vitamin K2 MK-7", title: "Synergistic — No known interaction", mechanism: "K2 directs D3-absorbed calcium to bones, preventing arterial calcification." },
  { id: "ix2", severity: "green", pair: "NAC + Vitamin C", title: "Complementary — No known interaction", mechanism: "NAC regenerates glutathione; Vitamin C recycles oxidized glutathione." },
  { id: "ix3", severity: "green", pair: "Omega-3 + CoQ10", title: "Beneficial — No known interaction", mechanism: "Lipid-soluble CoQ10 absorption improved by concurrent omega-3 fatty acids." },
  { id: "ix4", severity: "yellow", pair: "Magnesium Glycinate + Zinc Picolinate", title: "Timing conflict — Monitor", mechanism: "Competitive absorption at divalent cation transporters in the duodenum.", mitigation: "Space doses by 2+ hours. Take zinc with meals, magnesium before bed." },
  { id: "ix5", severity: "yellow", pair: "Zinc Picolinate (30mg daily)", title: "Dose-dependent copper depletion", mechanism: "Zinc above 40mg/day induces metallothionein, binding dietary copper.", mitigation: "Monitor ceruloplasmin levels at 60-day mark. Consider 2mg copper supplement." },
  { id: "ix6", severity: "red", pair: "Ashwagandha KSM-66 + Levothyroxine (patient med)", title: "Contraindicated — Blocks save", mechanism: "Ashwagandha stimulates thyroid hormone production (T3/T4), may cause hyperthyroid crisis when combined with exogenous thyroid medication." },
]

const PATIENTS: PatientOption[] = [
  { id: "p1", name: "David Richardson", patientId: "8821" },
  { id: "p2", name: "Sarah Mitchell", patientId: "9928" },
  { id: "p3", name: "Marcus Johnson", patientId: "4821" },
  { id: "p4", name: "Elena Rodriguez", patientId: "3917" },
  { id: "p5", name: "James Thornton", patientId: "5512" },
]

const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Three times daily", "Every other day", "Weekly"]
const TIMING_OPTIONS = ["Morning", "Afternoon", "Evening", "With meals", "Empty stomach", "Before bed"]

// ─── Helpers ────────────────────────────────────────────────────────────────

function categoryLabel(id: CategoryId): string {
  const map: Record<CategoryId, string> = { cardio: "Cardio", immune: "Immune", neuro: "Neuro", sleep: "Sleep", musculo: "Musculo", gi: "GI", metabolic: "Metabolic" }
  return map[id]
}

function categoryColor(id: CategoryId): string {
  const map: Record<CategoryId, string> = { cardio: "text-pink-400", immune: "text-green-400", neuro: "text-purple-400", sleep: "text-blue-400", musculo: "text-yellow-400", gi: "text-orange-400", metabolic: "text-red-400" }
  return map[id]
}

function categoryBg(id: CategoryId): string {
  const map: Record<CategoryId, string> = { cardio: "bg-pink-400/10", immune: "bg-green-400/10", neuro: "bg-purple-400/10", sleep: "bg-blue-400/10", musculo: "bg-yellow-400/10", gi: "bg-orange-400/10", metabolic: "bg-red-400/10" }
  return map[id]
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProtocolBuilderPage() {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null)
  const [indication, setIndication] = React.useState("")
  const [indicationNotes, setIndicationNotes] = React.useState("")
  const [suppSearch, setSuppSearch] = React.useState("")
  const [selected, setSelected] = React.useState<SelectedSupplement[]>([])
  const [interactionLoading, setInteractionLoading] = React.useState(false)
  const [interactionsChecked, setInteractionsChecked] = React.useState(false)
  const [overrideText, setOverrideText] = React.useState<Record<string, string>>({})
  const [overridden, setOverridden] = React.useState<Set<string>>(new Set())
  const [expandedInteraction, setExpandedInteraction] = React.useState<Set<string>>(new Set())
  const [clinicalNotes, setClinicalNotes] = React.useState("")
  const [monitoringPlan, setMonitoringPlan] = React.useState("")
  const [selectedPatient, setSelectedPatient] = React.useState("")
  const [patientSearch, setPatientSearch] = React.useState("")
  const [saveAsTemplate, setSaveAsTemplate] = React.useState(false)
  const [draftSaved, setDraftSaved] = React.useState(false)
  const [draftTime, setDraftTime] = React.useState<string | null>(null)

  // Auto-save draft indicator
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (selected.length > 0 || selectedTemplate) {
        setDraftSaved(true)
        setDraftTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [selected.length, selectedTemplate])

  function saveDraft() {
    setDraftSaved(true)
    setDraftTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    setTimeout(() => setDraftSaved(false), 2000)
  }

  // Filter catalog for search
  const filteredCatalog = SUPPLEMENT_CATALOG.filter(
    (s) =>
      !selected.find((sel) => sel.id === s.id) &&
      (suppSearch === "" || s.name.toLowerCase().includes(suppSearch.toLowerCase()) || categoryLabel(s.category).toLowerCase().includes(suppSearch.toLowerCase()))
  )

  // Highlight text match
  function highlightMatch(text: string, query: string) {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-green-400/30 text-white rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  function addSupplement(item: SupplementItem) {
    setSelected((prev) => [
      ...prev,
      { ...item, dose: item.defaultDose, frequency: "Once daily", timing: ["Morning"], duration: 12 },
    ])
  }

  function removeSupplement(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id))
  }

  function updateSupplement(id: string, field: keyof SelectedSupplement, value: unknown) {
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  function toggleTiming(id: string, timing: string) {
    setSelected((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const has = s.timing.includes(timing)
        return { ...s, timing: has ? s.timing.filter((t) => t !== timing) : [...s.timing, timing] }
      })
    )
  }

  function runInteractionCheck() {
    setInteractionLoading(true)
    setInteractionsChecked(false)
    setTimeout(() => {
      setInteractionLoading(false)
      setInteractionsChecked(true)
    }, 2500)
  }

  function goNext() {
    if (currentStep === 4 && !interactionsChecked) {
      runInteractionCheck()
      return
    }
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  function goBack() {
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function goToStep(i: number) {
    setCurrentStep(i)
  }

  const greenCount = MOCK_INTERACTIONS.filter((i) => i.severity === "green").length
  const yellowCount = MOCK_INTERACTIONS.filter((i) => i.severity === "yellow").length
  const redCount = MOCK_INTERACTIONS.filter((i) => i.severity === "red").length
  const hasBlockingRed = MOCK_INTERACTIONS.some((i) => i.severity === "red" && !overridden.has(i.id))

  const filteredPatients = PATIENTS.filter(
    (p) => patientSearch === "" || p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.patientId.includes(patientSearch)
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 flex flex-col">
      {/* ── TOP BAR ──────────────────────────────────────────── */}
      <div className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-400 text-gray-900 p-1.5 rounded-lg">
              <Beaker className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Protocol Builder</h1>
              <p className="text-[10px] text-gray-500 font-mono">GeneX360 Practitioner Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {draftTime && (
              <span className={`text-[10px] font-mono transition-opacity duration-300 ${draftSaved ? "text-green-400 opacity-100" : "text-gray-500 opacity-70"}`}>
                {draftSaved ? (
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>
                ) : (
                  `Draft ${draftTime}`
                )}
              </span>
            )}
            <button onClick={saveDraft} className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors">
              <Save className="h-3 w-3" />
              Save Draft
            </button>
          </div>
        </div>
      </div>

      {/* ── STEP PROGRESS BAR ────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.id}>
                {/* Circle */}
                <button
                  onClick={() => goToStep(i)}
                  className="flex flex-col items-center gap-2 relative z-10"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < currentStep
                        ? "bg-green-400 text-gray-900"
                        : i === currentStep
                        ? "bg-green-400 text-gray-900 ring-2 ring-green-400/50 animate-pulse"
                        : "bg-gray-700 text-white/40"
                    }`}
                  >
                    {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-medium whitespace-nowrap ${
                      i <= currentStep ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {/* Connecting line */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 -mt-5 mx-1 ${i < currentStep ? "bg-green-400" : "bg-gray-700"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── STEP CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pb-28">

        {/* ── STEP 1: Template Selection ────────────────────── */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Choose a Protocol Template</h2>
                <button
                  onClick={() => { setSelectedTemplate(null); goNext() }}
                  className="text-green-400 text-sm hover:underline mt-1"
                >
                  Or start from blank
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-6 text-left transition-all hover:scale-[1.02] hover:border-green-400/50 group ${
                      isSelected ? "bg-green-400/10 border-green-400" : "border-green-400/15"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`${isSelected ? "text-green-400" : "text-gray-400 group-hover:text-green-400"} transition-colors`}>
                        {t.icon}
                      </span>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                    </div>
                    <h3 className="text-sm font-bold mb-1">{t.name}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{t.description}</p>
                    <span className="text-[10px] font-mono bg-gray-700/50 px-2 py-0.5 rounded-full text-gray-300">
                      {t.suppCount} supplements
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Indication ─────────────────────────────── */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold">Clinical Indication</h2>
            <p className="text-sm text-gray-400">Specify the primary indication and any relevant clinical notes for this protocol.</p>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-5">
              <div>
                <label className="text-xs text-gray-400 uppercase font-mono block mb-2">Primary Indication</label>
                <input
                  type="text"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g., Cardiovascular risk reduction, Immune support..."
                  className="w-full bg-gray-800 border border-green-400/15 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase font-mono block mb-2">Clinical Notes</label>
                <textarea
                  value={indicationNotes}
                  onChange={(e) => setIndicationNotes(e.target.value)}
                  rows={4}
                  placeholder="Relevant patient history, biomarker data, genomic findings..."
                  className="w-full bg-gray-800 border border-green-400/15 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Supplement Search & Add ────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Select Supplements</h2>
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Left: Search & Catalog */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={suppSearch}
                    onChange={(e) => setSuppSearch(e.target.value)}
                    placeholder="Search supplements..."
                    className="w-full bg-gray-800 border border-green-400/15 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40"
                  />
                </div>
                <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 hover:bg-gray-700/50 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium">{highlightMatch(item.name, suppSearch)}</p>
                        <span className={`text-[10px] font-mono ${categoryColor(item.category)}`}>
                          {categoryLabel(item.category)}
                        </span>
                      </div>
                      <button
                        onClick={() => addSupplement(item)}
                        className="px-3 py-1 text-xs bg-green-400/10 text-green-400 rounded-full hover:bg-green-400/20 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />Add
                      </button>
                    </div>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      {suppSearch ? "No supplements match your search." : "All supplements have been added."}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Selected Supplements */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  Selected Supplements
                  {selected.length > 0 && (
                    <span className="text-[10px] font-mono bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">{selected.length}</span>
                  )}
                </h3>
                {selected.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 text-sm">
                    <Pill className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    Add supplements from the left panel
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {selected.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-700/50 group"
                      >
                        <GripVertical className="h-4 w-4 text-gray-600 shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <span className={`text-[10px] font-mono ${categoryColor(s.category)}`}>
                            {categoryLabel(s.category)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSupplement(s.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Dosage Configuration ───────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Configure Dosage</h2>
            {selected.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-12 text-center text-gray-500">
                <Pill className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No supplements selected. Go back to add supplements.</p>
              </div>
            ) : (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/50 text-[10px] text-gray-500 uppercase font-mono">
                        <th className="text-left px-4 py-3">Supplement</th>
                        <th className="text-left px-4 py-3">Dosage</th>
                        <th className="text-left px-4 py-3">Frequency</th>
                        <th className="text-left px-4 py-3">Timing</th>
                        <th className="text-left px-4 py-3">Weeks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((s) => (
                        <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <div>
                              <span className="font-medium">{s.name}</span>
                              {s.cypAdjusted && (
                                <div className="mt-1">
                                  <span className="text-[10px] font-mono bg-purple-400/10 text-purple-400 border border-purple-400/20 rounded px-1.5 py-0.5">
                                    CYP-Adjusted: {s.cypAdjusted.dose}{s.unit} — {s.cypAdjusted.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={s.dose}
                                onChange={(e) => updateSupplement(s.id, "dose", Number(e.target.value))}
                                className="w-20 bg-gray-800 border border-green-400/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-400/40"
                              />
                              <span className="text-gray-500 text-xs">{s.unit}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={s.frequency}
                              onChange={(e) => updateSupplement(s.id, "frequency", e.target.value)}
                              className="bg-gray-800 border border-green-400/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-400/40 appearance-none"
                            >
                              {FREQUENCY_OPTIONS.map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {TIMING_OPTIONS.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => toggleTiming(s.id, t)}
                                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                                    s.timing.includes(t)
                                      ? "bg-green-400 text-gray-900 font-medium"
                                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={s.duration}
                              onChange={(e) => updateSupplement(s.id, "duration", Number(e.target.value))}
                              className="w-16 bg-gray-800 border border-green-400/15 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-green-400/40"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Interaction Check ──────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Interaction Analysis</h2>

            {interactionLoading && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-16 flex flex-col items-center justify-center text-center">
                {/* DNA Helix spinner */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                  <div className="absolute inset-2 border-4 border-purple-400/30 border-b-purple-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-300 font-medium">Analyzing interactions...</p>
                <p className="text-xs text-gray-500 mt-1">Checking {selected.length * (selected.length - 1) / 2 || 6} potential interactions</p>
              </div>
            )}

            {!interactionLoading && !interactionsChecked && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-12 text-center">
                <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-gray-600" />
                <p className="text-sm text-gray-400 mb-4">Click &quot;Run Check&quot; to analyze supplement interactions</p>
                <button
                  onClick={runInteractionCheck}
                  className="bg-green-400 text-gray-900 font-bold rounded-full px-6 py-2.5 text-sm hover:bg-green-300 transition-colors"
                >
                  Run Interaction Check
                </button>
              </div>
            )}

            {!interactionLoading && interactionsChecked && (
              <div className="space-y-3">
                {/* Summary bar */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />{greenCount} Green
                    </span>
                    <span className="flex items-center gap-1.5 text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />{yellowCount} Yellow
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="h-4 w-4" />{redCount} Red
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${hasBlockingRed ? "text-red-400" : "text-green-400"}`}>
                    {hasBlockingRed ? "Action required before proceeding" : "Protocol is safe to proceed"}
                  </span>
                </div>

                {/* Interaction results */}
                {MOCK_INTERACTIONS.map((ix) => {
                  const isExpanded = expandedInteraction.has(ix.id)
                  const isOverridden = overridden.has(ix.id)
                  return (
                    <div
                      key={ix.id}
                      className={`rounded-xl border p-4 transition-all ${
                        ix.severity === "green"
                          ? "bg-green-400/10 border-green-400/20"
                          : ix.severity === "yellow"
                          ? "bg-yellow-400/10 border-yellow-400/20"
                          : isOverridden
                          ? "bg-red-400/5 border-red-400/20 opacity-60"
                          : "bg-red-400/10 border-red-400/20"
                      }`}
                    >
                      <button
                        onClick={() =>
                          setExpandedInteraction((prev) => {
                            const next = new Set(prev)
                            next.has(ix.id) ? next.delete(ix.id) : next.add(ix.id)
                            return next
                          })
                        }
                        className="w-full text-left flex items-start gap-3"
                      >
                        {ix.severity === "green" && <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />}
                        {ix.severity === "yellow" && <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />}
                        {ix.severity === "red" && <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 font-mono mb-0.5">{ix.pair}</p>
                          <p className="text-sm font-medium">{ix.title}</p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="mt-3 ml-8 space-y-2">
                          {ix.mechanism && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Mechanism</p>
                              <p className="text-xs text-gray-300 leading-relaxed">{ix.mechanism}</p>
                            </div>
                          )}
                          {ix.mitigation && (
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Mitigation</p>
                              <p className="text-xs text-gray-300 leading-relaxed">{ix.mitigation}</p>
                            </div>
                          )}
                          {ix.severity === "red" && !isOverridden && (
                            <div className="pt-2 space-y-2">
                              <p className="text-[10px] text-red-400 uppercase font-mono">Override requires justification</p>
                              <textarea
                                value={overrideText[ix.id] || ""}
                                onChange={(e) => setOverrideText((p) => ({ ...p, [ix.id]: e.target.value }))}
                                placeholder="Enter clinical justification for override..."
                                rows={2}
                                className="w-full bg-gray-800 border border-red-400/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-red-400/40 resize-none"
                              />
                              <button
                                disabled={!overrideText[ix.id]?.trim()}
                                onClick={() => setOverridden((p) => new Set(p).add(ix.id))}
                                className="text-xs bg-red-400/20 text-red-400 rounded-lg px-4 py-1.5 hover:bg-red-400/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                Override Interaction
                              </button>
                            </div>
                          )}
                          {ix.severity === "red" && isOverridden && (
                            <p className="text-xs text-gray-500 italic">Overridden by practitioner</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: Clinical Notes ─────────────────────────── */}
        {currentStep === 5 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold">Clinical Notes</h2>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6">
              <label className="text-xs text-gray-400 uppercase font-mono block mb-2">Protocol Notes & Instructions</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={8}
                placeholder="Add clinical notes, patient instructions, special considerations..."
                className="w-full bg-gray-800 border border-green-400/15 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40 resize-none"
              />
              <p className="text-[10px] text-gray-500 mt-2">These notes will be included in the patient-facing protocol document.</p>
            </div>
          </div>
        )}

        {/* ── STEP 7: Monitoring ─────────────────────────────── */}
        {currentStep === 6 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold">Monitoring Plan</h2>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-5">
              <div>
                <label className="text-xs text-gray-400 uppercase font-mono block mb-2">Lab Tests & Biomarkers to Monitor</label>
                <textarea
                  value={monitoringPlan}
                  onChange={(e) => setMonitoringPlan(e.target.value)}
                  rows={5}
                  placeholder="e.g., Repeat lipid panel at 60 days, check 25-OH Vitamin D at 90 days..."
                  className="w-full bg-gray-800 border border-green-400/15 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Lipid Panel", "CMP", "CBC", "Vitamin D (25-OH)", "Thyroid Panel", "Iron Studies", "Ceruloplasmin", "hs-CRP"].map((lab) => (
                  <button
                    key={lab}
                    onClick={() => setMonitoringPlan((p) => p ? `${p}\n• ${lab}` : `• ${lab}`)}
                    className="text-xs bg-gray-800 border border-green-400/15 rounded-lg px-3 py-2 text-gray-400 hover:text-green-400 hover:border-green-400/30 transition-colors text-left flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" />{lab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 8: Review & Assign ────────────────────────── */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Review & Assign Protocol</h2>
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Protocol Summary — spans 2 cols */}
              <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-400" />
                  Protocol Summary
                </h3>

                {selectedTemplate && (
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Template: </span>
                    {TEMPLATES.find((t) => t.id === selectedTemplate)?.name || "Custom"}
                  </div>
                )}

                {indication && (
                  <div className="text-xs text-gray-400">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Indication: </span>
                    {indication}
                  </div>
                )}

                {selected.length > 0 ? (
                  <div className="border border-gray-700/50 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-900/50 text-[10px] text-gray-500 uppercase font-mono">
                          <th className="text-left px-3 py-2">Supplement</th>
                          <th className="text-left px-3 py-2">Dose</th>
                          <th className="text-left px-3 py-2">Frequency</th>
                          <th className="text-left px-3 py-2">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.map((s) => (
                          <tr key={s.id} className="border-t border-gray-800/50">
                            <td className="px-3 py-2 font-medium">{s.name}</td>
                            <td className="px-3 py-2 text-gray-400">{s.dose} {s.unit}</td>
                            <td className="px-3 py-2 text-gray-400">{s.frequency}</td>
                            <td className="px-3 py-2 text-gray-400">{s.duration} weeks</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No supplements configured.</p>
                )}

                {clinicalNotes && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Clinical Notes</p>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap bg-gray-900/30 rounded-lg p-3">{clinicalNotes}</p>
                  </div>
                )}

                {monitoringPlan && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-mono mb-1">Monitoring Plan</p>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap bg-gray-900/30 rounded-lg p-3">{monitoringPlan}</p>
                  </div>
                )}
              </div>

              {/* Assignment Panel */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6 space-y-5 self-start">
                <h3 className="text-sm font-bold">Assign to Patient</h3>

                {/* Searchable patient dropdown */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-mono block mb-1.5">Search Patient</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Name or ID..."
                      className="w-full bg-gray-800 border border-green-400/15 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-green-400/40"
                    />
                  </div>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p.id); setPatientSearch("") }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          selectedPatient === p.id
                            ? "bg-green-400/10 border border-green-400/30 text-green-400"
                            : "hover:bg-gray-700/50 text-gray-300"
                        }`}
                      >
                        {p.name} <span className="text-gray-500 font-mono">(ID: {p.patientId})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save as template toggle */}
                <button
                  onClick={() => setSaveAsTemplate(!saveAsTemplate)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full"
                >
                  {saveAsTemplate ? (
                    <ToggleRight className="h-5 w-5 text-green-400" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-500" />
                  )}
                  Save as reusable template
                </button>

                {/* CTAs */}
                <div className="space-y-2 pt-2">
                  <button
                    disabled={!selectedPatient}
                    className="w-full bg-green-400 text-gray-900 font-bold rounded-full px-8 py-3 text-sm flex items-center justify-center gap-2 hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    Assign Protocol &amp; Notify Patient
                  </button>
                  <button
                    onClick={saveDraft}
                    className="w-full border border-green-400/30 text-green-400 rounded-full px-8 py-2.5 text-sm hover:bg-green-400/5 transition-colors"
                  >
                    Save Draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAV ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 border-t border-gray-800 bg-gray-900/80 backdrop-blur-xl z-40 px-6 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="text-xs text-gray-500 font-mono">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]?.label}
          </div>
          <button
            onClick={goNext}
            disabled={currentStep >= STEPS.length - 1 || (currentStep === 4 && interactionLoading)}
            className="flex items-center gap-1.5 text-sm bg-green-400 text-gray-900 font-bold rounded-full px-6 py-2 hover:bg-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === 4 && !interactionsChecked ? "Run Check" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </div>
  )
}
