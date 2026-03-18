"use client"

import * as React from "react"
import Link from "next/link"
import {
  Heart,
  Shield,
  Brain,
  Moon,
  Dumbbell,
  Stethoscope,
  PlusCircle,
  Search,
  GripVertical,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Octagon,
  ArrowLeft,
  ArrowRight,
  Pill,
  Zap,
  Leaf,
  Flame,
  Droplets,
  Beaker,
  Atom,
  Sparkles,
  CircleDot,
  Loader2,
  FileDown,
  Send,
  X,
  ChevronDown,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type CategoryId = "cardio" | "immune" | "neuro" | "sleep" | "perf" | "gut" | "custom"

interface Category {
  id: CategoryId
  label: string
  icon: React.ReactNode
  suppCount: number
}

interface Supplement {
  id: string
  name: string
  dosage: string
  category: CategoryId
  selected: boolean
}

interface Interaction {
  id: string
  type: "safe" | "monitor" | "avoid"
  title: string
  description: string
}

type StepId = "template" | "biomarkers" | "select" | "analyze" | "interactions" | "schedule" | "review" | "assign"

interface Step {
  id: StepId
  label: string
  shortLabel: string
}

interface PatientOption {
  id: string
  name: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  { id: "template", label: "Template", shortLabel: "Temp" },
  { id: "biomarkers", label: "Biomarkers", shortLabel: "Bio" },
  { id: "select", label: "Select", shortLabel: "Select" },
  { id: "analyze", label: "Analyze", shortLabel: "Analyze" },
  { id: "interactions", label: "Interactions", shortLabel: "Int" },
  { id: "schedule", label: "Schedule", shortLabel: "Sched" },
  { id: "review", label: "Review", shortLabel: "Rev" },
  { id: "assign", label: "Assign", shortLabel: "Assign" },
]

const CATEGORIES: Category[] = [
  { id: "cardio", label: "Cardio", icon: <Heart className="h-6 w-6" />, suppCount: 12 },
  { id: "immune", label: "Immune", icon: <Shield className="h-6 w-6" />, suppCount: 15 },
  { id: "neuro", label: "Neuro", icon: <Brain className="h-6 w-6" />, suppCount: 9 },
  { id: "sleep", label: "Sleep", icon: <Moon className="h-6 w-6" />, suppCount: 8 },
  { id: "perf", label: "Perf", icon: <Dumbbell className="h-6 w-6" />, suppCount: 11 },
  { id: "gut", label: "Gut", icon: <Stethoscope className="h-6 w-6" />, suppCount: 14 },
  { id: "custom", label: "Custom", icon: <PlusCircle className="h-6 w-6" />, suppCount: 0 },
]

const ALL_SUPPLEMENTS: Supplement[] = [
  // Cardio
  { id: "s01", name: "CoQ10", dosage: "200mg", category: "cardio", selected: false },
  { id: "s02", name: "Omega-3 Fish Oil", dosage: "2000mg", category: "cardio", selected: false },
  { id: "s03", name: "Magnesium Taurate", dosage: "400mg", category: "cardio", selected: true },
  { id: "s04", name: "Nattokinase", dosage: "2000 FU", category: "cardio", selected: false },
  { id: "s05", name: "Hawthorn Berry", dosage: "500mg", category: "cardio", selected: false },
  { id: "s06", name: "L-Carnitine", dosage: "1000mg", category: "cardio", selected: false },
  // Immune
  { id: "s07", name: "Vitamin D3", dosage: "5000 IU", category: "immune", selected: true },
  { id: "s08", name: "Vitamin C", dosage: "1000mg", category: "immune", selected: false },
  { id: "s09", name: "Zinc Picolinate", dosage: "30mg", category: "immune", selected: true },
  { id: "s10", name: "Quercetin", dosage: "500mg", category: "immune", selected: false },
  { id: "s11", name: "Elderberry Extract", dosage: "600mg", category: "immune", selected: false },
  { id: "s12", name: "N-Acetyl Cysteine", dosage: "600mg", category: "immune", selected: true },
  { id: "s13", name: "Astragalus", dosage: "500mg", category: "immune", selected: false },
  { id: "s14", name: "Beta-Glucan", dosage: "250mg", category: "immune", selected: false },
  // Neuro
  { id: "s15", name: "Lion's Mane", dosage: "1000mg", category: "neuro", selected: false },
  { id: "s16", name: "Phosphatidylserine", dosage: "100mg", category: "neuro", selected: false },
  { id: "s17", name: "Alpha-GPC", dosage: "300mg", category: "neuro", selected: false },
  { id: "s18", name: "Bacopa Monnieri", dosage: "300mg", category: "neuro", selected: false },
  // Sleep
  { id: "s19", name: "Magnesium Glycinate", dosage: "400mg", category: "sleep", selected: false },
  { id: "s20", name: "L-Theanine", dosage: "200mg", category: "sleep", selected: false },
  { id: "s21", name: "Melatonin", dosage: "3mg", category: "sleep", selected: false },
  { id: "s22", name: "Apigenin", dosage: "50mg", category: "sleep", selected: false },
  // Perf
  { id: "s23", name: "Creatine Monohydrate", dosage: "5g", category: "perf", selected: false },
  { id: "s24", name: "Ashwagandha KSM-66", dosage: "600mg", category: "perf", selected: false },
  { id: "s25", name: "Rhodiola Rosea", dosage: "400mg", category: "perf", selected: false },
  // Gut
  { id: "s26", name: "Probiotics (Multi-Strain)", dosage: "50B CFU", category: "gut", selected: false },
  { id: "s27", name: "L-Glutamine", dosage: "5g", category: "gut", selected: false },
  { id: "s28", name: "Berberine", dosage: "500mg", category: "gut", selected: false },
  { id: "s29", name: "Digestive Enzymes", dosage: "1 cap", category: "gut", selected: false },
]

const INTERACTIONS: Interaction[] = [
  { id: "i1", type: "safe", title: "Synergistic Pair", description: "Vitamin D3 + K2 MK-7 improves calcium absorption and arterial clearance. Strong evidence base." },
  { id: "i2", type: "safe", title: "Complementary Action", description: "NAC + Vitamin C support glutathione recycling. Safe co-administration at standard doses." },
  { id: "i3", type: "monitor", title: "Timing Warning", description: "Space Magnesium and Zinc by 2 hours to avoid competitive absorption at mineral transporters." },
  { id: "i4", type: "monitor", title: "Dose-Dependent Interaction", description: "Zinc above 40mg/day may impair copper absorption. Monitor ceruloplasmin if extended use." },
  { id: "i5", type: "avoid", title: "Critical Interaction", description: "Ashwagandha may potentiate thyroid medication (levothyroxine). Contraindicated in current patient profile." },
  { id: "i6", type: "avoid", title: "Drug-Supplement Conflict", description: "Berberine inhibits CYP3A4 enzyme — may increase statin bioavailability to unsafe levels." },
]

const PATIENTS: PatientOption[] = [
  { id: "p1", name: "David Richardson (ID: 8821)" },
  { id: "p2", name: "Sarah Mitchell (ID: 9928)" },
  { id: "p3", name: "Marcus Johnson (ID: 4821)" },
  { id: "p4", name: "Elena Rodriguez (ID: 3917)" },
]

// ─── Supplement Icon ────────────────────────────────────────────────────────

function SuppIcon({ category }: { category: CategoryId }) {
  switch (category) {
    case "cardio": return <Heart className="h-3.5 w-3.5" />
    case "immune": return <Shield className="h-3.5 w-3.5" />
    case "neuro": return <Brain className="h-3.5 w-3.5" />
    case "sleep": return <Moon className="h-3.5 w-3.5" />
    case "perf": return <Dumbbell className="h-3.5 w-3.5" />
    case "gut": return <Stethoscope className="h-3.5 w-3.5" />
    default: return <Pill className="h-3.5 w-3.5" />
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ProtocolBuilderPage() {
  const [currentStep, setCurrentStep] = React.useState(3) // 0-indexed, step 4 = "analyze"
  const [activeCategory, setActiveCategory] = React.useState<CategoryId>("immune")
  const [supplements, setSupplements] = React.useState(ALL_SUPPLEMENTS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedPatient, setSelectedPatient] = React.useState("p1")

  // Derived
  const selectedSupps = supplements.filter((s) => s.selected)
  const selectedCount = selectedSupps.length
  const categorySupps = supplements.filter(
    (s) => s.category === activeCategory && (searchQuery === "" || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )
  const safeCount = INTERACTIONS.filter((i) => i.type === "safe").length
  const monitorCount = INTERACTIONS.filter((i) => i.type === "monitor").length
  const avoidCount = INTERACTIONS.filter((i) => i.type === "avoid").length

  function toggleSupplement(id: string) {
    setSupplements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    )
  }

  function goNext() {
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))
  }

  function goBack() {
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-[#111827] text-slate-100 font-[Inter,sans-serif] flex flex-col">
      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50 p-4 pb-2">
        <div className="max-w-7xl mx-auto">
          {/* Title row */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400 text-slate-900 p-1 rounded font-bold">
                <Zap className="h-4 w-4" />
              </span>
              <h1 className="font-bold">
                ViaConnect{" "}
                <span className="text-emerald-400 text-xs uppercase tracking-widest ml-1">Builder</span>
              </h1>
            </div>
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 text-emerald-400 animate-spin" />
              ID: VC-9921-X
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-1">
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                className="flex-1 h-1 rounded-full relative overflow-hidden cursor-pointer"
                onClick={() => setCurrentStep(i)}
                title={step.label}
              >
                {i < currentStep ? (
                  <div className="absolute inset-0 bg-emerald-400 rounded-full" />
                ) : i === currentStep ? (
                  <div className="absolute inset-0 bg-emerald-400/40 rounded-full">
                    <div className="absolute inset-0 bg-emerald-400 animate-pulse w-1/2 rounded-full" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-slate-700 rounded-full" />
                )}
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-between text-[8px] font-mono uppercase text-slate-500">
            {STEPS.map((step, i) => (
              <span
                key={step.id}
                className={`cursor-pointer transition-colors ${
                  i === currentStep ? "text-emerald-400" : "hover:text-slate-300"
                }`}
                onClick={() => setCurrentStep(i)}
              >
                {step.shortLabel}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-6">
        {/* Protocol Foundation — Category Selector */}
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-emerald-400" />
            Protocol Foundation
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`p-3 rounded-lg text-center transition-all group ${
                    isActive
                      ? "bg-emerald-400/5 border border-emerald-400/40"
                      : "bg-gray-800/50 backdrop-blur-sm border border-emerald-400/10 hover:bg-emerald-400/5 hover:border-emerald-400/30"
                  } ${cat.id === "custom" && !isActive ? "opacity-70" : ""}`}
                >
                  <span className={`mb-1 inline-block ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400"} transition-colors`}>
                    {cat.icon}
                  </span>
                  <p className={`text-[10px] font-medium ${isActive ? "text-emerald-400" : ""}`}>{cat.label}</p>
                  {cat.suppCount > 0 && (
                    <span className={`text-[8px] font-mono px-1.5 rounded-full ${
                      isActive ? "bg-emerald-400/20 text-emerald-400" : "bg-slate-800"
                    }`}>
                      {cat.suppCount} Supps
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Main Grid: Inventory + Analysis | Finalization Sidebar */}
        <div className="grid lg:grid-cols-12 gap-4">
          {/* Left Column — 8/12 */}
          <div className="lg:col-span-8 space-y-4">
            {/* Supplement Inventory */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-emerald-400/10 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold">Inventory</h3>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-800 border-0 rounded-md pl-7 pr-3 py-1.5 text-xs w-40 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {categorySupps.map((supp) => (
                  <button
                    key={supp.id}
                    onClick={() => toggleSupplement(supp.id)}
                    className={`p-2.5 rounded-lg flex items-center justify-between transition-all ${
                      supp.selected
                        ? "border border-emerald-400/30 bg-emerald-400/5"
                        : "border border-slate-700 bg-slate-800/30 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        supp.selected ? "bg-emerald-400/20 text-emerald-400" : "bg-slate-800 text-emerald-400"
                      }`}>
                        <SuppIcon category={supp.category} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold">{supp.name}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider">{supp.dosage}</p>
                      </div>
                    </div>
                    {supp.selected ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                  </button>
                ))}
                {categorySupps.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-slate-500 text-xs">
                    {searchQuery ? "No supplements match your search." : "No supplements in this category yet."}
                  </div>
                )}
              </div>
            </div>

            {/* Bio-Analysis */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-emerald-400/10 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold">Bio-Analysis</h3>
                <div className="flex gap-3 text-[8px] uppercase font-mono">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Safe ({safeCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                    Monitor ({monitorCount})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    Avoid ({avoidCount})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {INTERACTIONS.map((interaction) => {
                  const colorMap = {
                    safe: { border: "border-emerald-400", bg: "bg-emerald-400/5", icon: <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" /> },
                    monitor: { border: "border-yellow-500", bg: "bg-yellow-500/5", icon: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" /> },
                    avoid: { border: "border-red-500", bg: "bg-red-500/5", icon: <Octagon className="h-4 w-4 text-red-500 shrink-0" /> },
                  }
                  const cfg = colorMap[interaction.type]
                  return (
                    <div
                      key={interaction.id}
                      className={`flex gap-3 p-3 rounded-lg border-l-2 ${cfg.border} ${cfg.bg} hover:brightness-110 transition-all cursor-pointer`}
                    >
                      {cfg.icon}
                      <div className="text-[10px]">
                        <p className="font-bold">{interaction.title}</p>
                        <p className="text-slate-400 mt-0.5 leading-relaxed">{interaction.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar — 4/12 */}
          <aside className="lg:col-span-4 bg-gray-800/50 backdrop-blur-sm border border-emerald-400/10 p-4 rounded-xl self-start sticky top-36">
            <h3 className="text-sm font-semibold mb-4">Finalization</h3>
            <div className="space-y-4 text-xs">
              {/* Patient selector */}
              <div>
                <label className="text-[8px] text-slate-500 uppercase font-mono block mb-1">Patient</label>
                <div className="relative">
                  <select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full bg-slate-800 border-0 rounded-md py-2 px-3 text-xs text-white appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                  >
                    {PATIENTS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Selected supplements summary */}
              {selectedCount > 0 && (
                <div>
                  <label className="text-[8px] text-slate-500 uppercase font-mono block mb-1">Selected ({selectedCount})</label>
                  <div className="space-y-1">
                    {selectedSupps.map((s) => (
                      <div key={s.id} className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1.5">
                        <span className="text-[10px] font-medium">{s.name}</span>
                        <button
                          onClick={() => toggleSupplement(s.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="bg-slate-800/40 p-3 rounded-lg space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Supps</span>
                  <span>{selectedCount.toString().padStart(2, "0")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span>90 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Interactions</span>
                  <span className={avoidCount > 0 ? "text-red-400" : "text-emerald-400"}>
                    {avoidCount > 0 ? `${avoidCount} Avoid` : "Clear"}
                  </span>
                </div>
                <div className="border-t border-slate-700 pt-1.5 flex justify-between font-bold text-emerald-400">
                  <span>Est. Impact</span>
                  <span>+12%</span>
                </div>
              </div>

              {/* Action buttons */}
              <button className="w-full bg-emerald-400 text-slate-900 font-bold py-2.5 rounded-lg text-xs flex justify-center items-center gap-2 hover:bg-emerald-300 transition-colors">
                <Send className="h-3.5 w-3.5" />
                Assign &amp; Notify
              </button>
              <button className="w-full border border-slate-700 py-2.5 rounded-lg text-xs text-slate-400 hover:border-slate-500 hover:text-white transition-colors flex justify-center items-center gap-2">
                <FileDown className="h-3.5 w-3.5" />
                Export PDF
              </button>

              <p className="text-[8px] text-center text-slate-500 italic px-2 leading-tight">
                Review all contraindications before assigning. Critical interactions require practitioner override.
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ── BOTTOM NAV ───────────────────────────────────────────── */}
      <nav className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl p-4 sticky bottom-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="text-slate-500 hover:text-white flex items-center gap-1 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-1.5 border border-slate-700 rounded text-xs text-slate-400 hover:border-slate-500 hover:text-white transition-colors">
              Save Draft
            </button>
            <button
              onClick={goNext}
              disabled={currentStep >= STEPS.length - 1}
              className="px-6 py-1.5 bg-emerald-400 text-slate-900 rounded text-xs font-bold flex items-center gap-1 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}
