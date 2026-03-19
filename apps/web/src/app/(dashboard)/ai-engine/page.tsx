"use client"

import { useState, useCallback, useRef } from "react"
import {
  Brain,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  ThumbsUp,
  Pencil,
  X,
  ExternalLink,
  Clock,
  Flame,
  Wind,
  BarChart3,
  Dna,
  BookOpen,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type ProcessingStep = 0 | 1 | 2 | 3
type ActionState = "pending" | "accepted" | "modified" | "rejected"

interface CAQScore {
  label: string
  value: number
  max: number
}

interface GenomicHighlight {
  gene: string
  variant: string
  risk: "HIGH" | "MOD" | "LOW"
}

interface Protocol {
  name: string
  dose: string
}

interface Recommendation {
  rank: number
  name: string
  relevance: number
  genes: string[]
  geneTags: string[]
  evidence: string
  dosing: { standard: string; adjusted: string; direction: "up" | "down" | "same" }
  citationCount: number
  citations: { title: string; pmid: string }[]
  cypNote: string
}

interface AuditEntry {
  timestamp: string
  recName: string
  action: ActionState
  rationale: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const CAQ_SCORES: CAQScore[] = [
  { label: "Energy", value: 6, max: 10 },
  { label: "Sleep", value: 4, max: 10 },
  { label: "Digestion", value: 7, max: 10 },
  { label: "Mood", value: 5, max: 10 },
  { label: "Cognition", value: 7, max: 10 },
]

const GENOMIC_HIGHLIGHTS: GenomicHighlight[] = [
  { gene: "MTHFR", variant: "C677T", risk: "MOD" },
  { gene: "CYP2D6", variant: "*4/*41", risk: "HIGH" },
  { gene: "COMT", variant: "Val158Met", risk: "MOD" },
]

const PROTOCOLS: Protocol[] = [
  { name: "Methylation Support Protocol", dose: "Active" },
  { name: "Neuro-Balance Program", dose: "Active" },
  { name: "Sleep Optimization v2", dose: "Active" },
]

const SYMPTOMS = ["Poor sleep", "Brain fog", "Joint pain", "Low energy"]

const RECOMMENDATIONS: Recommendation[] = [
  {
    rank: 1,
    name: "MTHFR+ Complex",
    relevance: 92,
    genes: ["MTHFR"],
    geneTags: ["MTHFR-Support", "Methylation"],
    evidence:
      "Homozygous C677T with ~30% residual MTHFR activity. Methylfolate bypass recommended with B2 cofactor for residual enzyme stabilization.",
    dosing: { standard: "5mg", adjusted: "7.5mg BID", direction: "up" },
    citationCount: 12,
    citations: [
      { title: "MTHFR polymorphisms and folate metabolism", pmid: "PMC8234105" },
      { title: "Methylfolate supplementation in C677T carriers", pmid: "PMC7891234" },
    ],
    cypNote: "No CYP450 interaction",
  },
  {
    rank: 2,
    name: "COMT+ Support",
    relevance: 87,
    genes: ["COMT"],
    geneTags: ["COMT-Impact", "Catecholamine"],
    evidence:
      "Val158Met heterozygous — intermediate catechol-O-methyltransferase activity. Magnesium glycinate as cofactor support with SAMe precursor modulation.",
    dosing: { standard: "200mg", adjusted: "150mg Daily", direction: "down" },
    citationCount: 8,
    citations: [
      { title: "COMT Val158Met and catecholamine metabolism", pmid: "PMC6928371" },
      { title: "Magnesium as COMT cofactor: clinical review", pmid: "PMC8012456" },
    ],
    cypNote: "CYP2D6 intermediate: reduce by 25%",
  },
  {
    rank: 3,
    name: "RELAX+ Formula",
    relevance: 81,
    genes: ["MAOA", "GAD1"],
    geneTags: ["MAOA-Calm", "GABAergic"],
    evidence:
      "MAOA fast variant with GAD1 polymorphism — rapid serotonin turnover and altered GABA synthesis. L-theanine + phosphatidylserine for calming pathway support.",
    dosing: { standard: "400mg", adjusted: "300mg BID", direction: "down" },
    citationCount: 6,
    citations: [
      { title: "MAOA genotype and serotonin-related anxiety", pmid: "PMC7234891" },
      { title: "GAD1 variants and GABAergic function", pmid: "PMC6102938" },
    ],
    cypNote: "CYP1A2 substrate — monitor caffeine",
  },
  {
    rank: 4,
    name: "NAD+ Boost",
    relevance: 78,
    genes: ["SIRT1"],
    geneTags: ["SIRT1-Mito", "Longevity"],
    evidence:
      "SIRT1 variant affecting NAD+-dependent deacetylase activity. NR (nicotinamide riboside) supplementation to support mitochondrial biogenesis and cellular repair.",
    dosing: { standard: "250mg", adjusted: "375mg Daily", direction: "up" },
    citationCount: 5,
    citations: [
      { title: "SIRT1 polymorphisms and NAD+ metabolism", pmid: "PMC8891204" },
    ],
    cypNote: "No significant CYP interaction",
  },
  {
    rank: 5,
    name: "FOCUS+ Nootropic",
    relevance: 74,
    genes: ["COMT", "DRD2"],
    geneTags: ["Dopaminergic", "Cognitive"],
    evidence:
      "COMT intermediate + DRD2 Taq1A — altered dopamine receptor density with moderate catecholamine clearance. CDP-choline for acetylcholine/dopamine modulation.",
    dosing: { standard: "200mg", adjusted: "200mg Daily", direction: "same" },
    citationCount: 7,
    citations: [
      { title: "DRD2 Taq1A and dopaminergic function", pmid: "PMC5928371" },
      { title: "CDP-choline in cognitive support", pmid: "PMC7012834" },
    ],
    cypNote: "CYP2D6 intermediate: standard dose acceptable",
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskColor(risk: "HIGH" | "MOD" | "LOW") {
  switch (risk) {
    case "HIGH":
      return "bg-red-500/20 border-red-500/30 text-red-400"
    case "MOD":
      return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
    case "LOW":
      return "bg-green-500/20 border-green-500/30 text-green-400"
  }
}

function caqColor(value: number, max: number) {
  const pct = value / max
  if (pct >= 0.6) return { bar: "from-[#4ade80]/40 to-[#4ade80]", text: "text-[#4ade80]" }
  if (pct >= 0.4) return { bar: "from-yellow-400/40 to-yellow-400", text: "text-yellow-400" }
  return { bar: "from-[#ffb3ad]/40 to-[#ffb3ad]", text: "text-[#ffb3ad]" }
}

// ─── Relevance Gauge SVG ────────────────────────────────────────────────────

function RelevanceGauge({ pct }: { pct: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 85 ? "#4ade80" : pct >= 75 ? "#facc15" : "#f87171"

  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={r} fill="transparent"
          stroke="currentColor" strokeWidth="4"
          className="text-[#2e3545]"
        />
        <circle
          cx="32" cy="32" r={r} fill="transparent"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          className="transition-all duration-700"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AIEnginePage() {
  const [processing, setProcessing] = useState(false)
  const [step, setStep] = useState<ProcessingStep>(0)
  const [generated, setGenerated] = useState(false)
  const [actions, setActions] = useState<Record<number, ActionState>>({})
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleGenerate = useCallback(() => {
    if (processing) return
    setProcessing(true)
    setGenerated(false)
    setStep(0)
    setActions({})

    const t1 = setTimeout(() => setStep(1), 100)
    const t2 = setTimeout(() => setStep(2), 2200)
    const t3 = setTimeout(() => setStep(3), 4400)
    const t4 = setTimeout(() => {
      setProcessing(false)
      setGenerated(true)
    }, 6000)

    timerRef.current = [t1, t2, t3, t4]
  }, [processing])

  function handleAction(rank: number, action: ActionState, name: string) {
    setActions((prev) => ({ ...prev, [rank]: action }))
    const now = new Date()
    const ts = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setAuditLog((prev) => [
      {
        timestamp: ts,
        recName: name,
        action,
        rationale:
          action === "accepted"
            ? "Clinical alignment confirmed"
            : action === "modified"
            ? "Dose adjustment per patient response"
            : "Contraindicated per current protocol",
      },
      ...prev,
    ])
  }

  const STEPS = [
    "Analyzing genetic profile & patient history...",
    "Cross-referencing evidence across 3 AI models...",
    "Building consensus recommendations...",
  ]

  const STEP_LABELS = ["ANALYZING GENETICS", "CROSS-REFERENCING", "BUILDING CONSENSUS"]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* ═══════════════════════════════════════════════════════════
          LEFT COLUMN — PATIENT CONTEXT
         ═══════════════════════════════════════════════════════════ */}
      <section className="xl:col-span-4 space-y-6">
        {/* Patient Context Card */}
        <div className="bg-[#141b2b] p-6 rounded-xl border border-white/[0.04]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] text-[#4ade80] uppercase tracking-[0.2em] font-bold">
                Active Patient
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">Jane Smith</h3>
              <p className="text-white/50 text-xs font-mono">MRN: 1042 | 38y Female</p>
            </div>
            <button className="p-2 rounded-lg bg-[#232a3a] text-white/70 hover:text-[#4ade80] transition-colors">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* CAQ Score Bars */}
          <div className="space-y-4 mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              CAQ Symptom Clusters
            </h4>
            <div className="space-y-3">
              {CAQ_SCORES.map((s) => {
                const colors = caqColor(s.value, s.max)
                return (
                  <div key={s.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-bold tracking-wider uppercase text-white/70">{s.label}</span>
                      <span className={`font-bold ${colors.text}`}>
                        {s.value}/{s.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2e3545] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${(s.value / s.max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Genomic Highlights */}
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
              <Dna className="h-3.5 w-3.5" />
              Genomic Risk Factors
            </h4>
            <div className="flex flex-wrap gap-2">
              {GENOMIC_HIGHLIGHTS.map((g) => (
                <span
                  key={g.gene}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-tight border ${riskColor(g.risk)}`}
                >
                  {g.gene} ({g.variant})
                </span>
              ))}
            </div>
          </div>

          {/* Current Protocols */}
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
              Active Protocols
            </h4>
            <ul className="space-y-2">
              {PROTOCOLS.map((p) => (
                <li key={p.name} className="text-xs flex items-center gap-2 text-white/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
                  {p.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Symptoms */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
              Reported Symptoms
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOMS.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-white/60 font-medium border border-white/10"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Constitutional Advisor Card */}
        <div className="bg-[#141b2b] rounded-xl border-l-4 border-[#f472b6] overflow-hidden">
          <div className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#f472b6]" />
                Constitutional Advisor
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#f472b6]/20 text-[#f472b6] text-[10px] font-bold">
                Vata-Pitta
              </span>
            </div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Patient displays <span className="text-[#f472b6] font-semibold">Vata-Pitta</span> dominant
              constitution with nervous system activation and metabolic heat tendencies.
              Prioritize warming, grounding compounds.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <Flame className="h-3.5 w-3.5 text-[#f472b6] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-[#f472b6] uppercase block mb-0.5">Warming</span>
                  <p className="text-[11px] text-white/50">Ashwagandha 600mg, Ginger root extract, Cinnamon bark</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <Wind className="h-3.5 w-3.5 text-[#a78bfa] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-[#a78bfa] uppercase block mb-0.5">Grounding</span>
                  <p className="text-[11px] text-white/50">Shatavari 500mg, Licorice root, Tulsi</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                <Sparkles className="h-3.5 w-3.5 text-[#4ade80] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase block mb-0.5">Nervine</span>
                  <p className="text-[11px] text-white/50">Bacopa 300mg, Jatamansi, Brahmi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT COLUMN — AI ENGINE
         ═══════════════════════════════════════════════════════════ */}
      <section className="xl:col-span-8 space-y-8">
        {/* Protocol Generation Engine Header + Button */}
        <div className="bg-[#141b2b] p-8 rounded-2xl border border-[#4ade80]/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Protocol Generation Engine
              </h2>
              <p className="text-white/60 text-sm max-w-md">
                Multi-model consensus engine cross-referencing genomic data with current CAQ symptoms.
              </p>
            </div>
            {!processing && !generated && (
              <button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-[#4ade80] to-[#22c55e] text-[#111827] font-bold px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(74,222,128,0.3)] hover:scale-[1.02] transition-transform active:scale-95 flex items-center gap-3 shrink-0"
              >
                <Brain className="h-5 w-5" />
                Generate AI Recommendations
              </button>
            )}
            {generated && (
              <button
                onClick={handleGenerate}
                className="bg-[#232a3a] text-[#4ade80] font-bold px-6 py-3 rounded-xl border border-[#4ade80]/20 hover:bg-[#4ade80]/10 transition-colors flex items-center gap-2 shrink-0 text-sm"
              >
                <Brain className="h-4 w-4" />
                Regenerate
              </button>
            )}
          </div>

          {/* Processing State View */}
          {processing && (
            <div className="mt-8 pt-8 border-t border-white/[0.06]">
              <div className="flex justify-between items-end mb-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#4ade80] uppercase tracking-[0.2em] font-bold flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Current Engine Step
                  </span>
                  <p className="text-xs font-bold text-white">
                    {step >= 1 && step <= 3 ? STEPS[step - 1] : "Initializing..."}
                  </p>
                </div>
                <span className="text-xs font-mono text-[#4ade80]/70">
                  Step {Math.min(step, 3)}/3
                </span>
              </div>
              {/* 3-segment progress bar */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="h-1 rounded-full overflow-hidden bg-[#2e3545]">
                    {step >= s ? (
                      <div className="h-full bg-[#4ade80] rounded-full w-full" />
                    ) : step === s - 1 ? (
                      <div className="h-full bg-[#4ade80] rounded-full animate-pulse w-1/2" />
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-white/30 font-bold tracking-wider">
                {STEP_LABELS.map((label, i) => (
                  <span
                    key={label}
                    className={step >= i + 1 ? "text-[#4ade80]" : step === i ? "text-white/70" : ""}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {/* Step checklist */}
              <div className="mt-6 space-y-3">
                {STEPS.map((label, i) => {
                  const stepNum = i + 1
                  const done = step > stepNum
                  const active = step === stepNum
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          done
                            ? "bg-[#4ade80] text-[#111827]"
                            : active
                            ? "border-2 border-[#4ade80] text-[#4ade80]"
                            : "border border-[#2e3545] text-[#2e3545]"
                        }`}
                      >
                        {done ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className="text-[10px] font-bold">{stepNum}</span>
                        )}
                      </div>
                      <span
                        className={`text-sm transition-colors duration-300 ${
                          done ? "text-[#4ade80]" : active ? "text-white" : "text-white/20"
                        }`}
                      >
                        {label}
                      </span>
                      {active && (
                        <Loader2 className="h-3 w-3 text-[#4ade80] animate-spin ml-auto" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RECOMMENDATION CARDS ────────────────────────────── */}
        {generated && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-lg text-white">Ranked Recommendations</h3>
              <span className="text-xs text-white/40">Sorted by Relevance</span>
            </div>

            {RECOMMENDATIONS.map((rec) => {
              const action = actions[rec.rank]
              return (
                <div
                  key={rec.rank}
                  className={`bg-[#2e3545]/40 backdrop-blur-xl p-6 rounded-xl border transition-all hover:border-[#4ade80]/30 ${
                    action === "accepted"
                      ? "border-[#4ade80]/30 bg-[#4ade80]/5"
                      : action === "rejected"
                      ? "opacity-40 border-white/[0.04]"
                      : "border-white/[0.04]"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-3">
                        {/* Rank circle */}
                        <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-[#4ade80] font-bold text-sm shrink-0">
                          {rec.rank}
                        </div>
                        <h4 className="text-xl font-bold text-white">{rec.name}</h4>
                        <div className="flex gap-2 flex-wrap">
                          {rec.geneTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/10"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Evidence */}
                      <p className="text-xs text-white/60 mb-4 leading-relaxed">{rec.evidence}</p>

                      {/* Dosing & Citations grid */}
                      <div className="grid grid-cols-2 gap-4 bg-[#0c1322]/50 p-3 rounded-lg border border-white/[0.03]">
                        <div>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold block mb-1">
                            Dosing Strategy
                          </span>
                          <p className="text-xs font-mono text-white flex items-center gap-1.5">
                            <span className="text-white/40 line-through">{rec.dosing.standard}</span>
                            <span className="text-white/30">&rarr;</span>
                            <span
                              className={`font-bold ${
                                rec.dosing.direction === "up"
                                  ? "text-[#4ade80]"
                                  : rec.dosing.direction === "down"
                                  ? "text-red-400"
                                  : "text-white/60"
                              }`}
                            >
                              {rec.dosing.adjusted}
                            </span>
                            {rec.dosing.direction !== "same" && (
                              <span className="text-[#4ade80] text-[10px]">+ CYP Adj</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] text-white/30 uppercase tracking-wider font-bold block mb-1">
                            Evidence Base
                          </span>
                          <p className="text-xs text-white/70 flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3 text-blue-400" />
                            <span className="text-blue-400">{rec.citationCount} PubMed Citations</span>
                          </p>
                        </div>
                      </div>

                      {/* Expanded citations */}
                      <div className="mt-2 space-y-1">
                        {rec.citations.map((c) => (
                          <div key={c.pmid} className="flex items-center gap-1.5 text-[10px]">
                            <ExternalLink className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                            <span className="text-blue-400 hover:underline cursor-pointer truncate">
                              {c.title}
                            </span>
                            <span className="text-white/30 font-mono shrink-0">{c.pmid}</span>
                          </div>
                        ))}
                        <p className="text-[9px] text-white/20 font-mono mt-1">{rec.cypNote}</p>
                      </div>
                    </div>

                    {/* Right: Gauge + Actions */}
                    <div className="flex flex-row lg:flex-col items-center justify-between lg:w-32 gap-4 shrink-0">
                      <RelevanceGauge pct={rec.relevance} />
                      {!action ? (
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={() => handleAction(rec.rank, "accepted", rec.name)}
                            className="w-full py-2 bg-[#4ade80]/10 hover:bg-[#4ade80] text-[#4ade80] hover:text-[#111827] text-[10px] font-bold rounded-lg transition-all"
                          >
                            ACCEPT
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAction(rec.rank, "modified", rec.name)}
                              className="flex-1 py-1.5 bg-[#232a3a] hover:bg-[#2e3545] text-white/60 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              MOD
                            </button>
                            <button
                              onClick={() => handleAction(rec.rank, "rejected", rec.name)}
                              className="flex-1 py-1.5 bg-[#232a3a] hover:bg-red-500/20 text-white/60 hover:text-red-400 text-[10px] font-bold rounded-lg transition-colors"
                            >
                              REJ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span
                          className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${
                            action === "accepted"
                              ? "bg-[#4ade80]/20 text-[#4ade80]"
                              : action === "modified"
                              ? "bg-yellow-400/20 text-yellow-400"
                              : "bg-red-400/20 text-red-400"
                          }`}
                        >
                          {action}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── OVERRIDE AUDIT TRAIL ────────────────────────────── */}
        {auditLog.length > 0 && (
          <div className="bg-[#141b2b] rounded-xl p-5 border border-white/[0.04]">
            <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Override Audit Trail
            </h3>
            <div className="space-y-2.5">
              {auditLog.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-[11px] p-2 rounded-lg bg-white/[0.02]"
                >
                  <span className="text-white/30 font-mono shrink-0 w-20">{entry.timestamp}</span>
                  <span
                    className={`font-bold shrink-0 uppercase text-[9px] px-2.5 py-0.5 rounded-full ${
                      entry.action === "accepted"
                        ? "bg-[#4ade80]/20 text-[#4ade80]"
                        : entry.action === "modified"
                        ? "bg-yellow-400/20 text-yellow-400"
                        : "bg-red-400/20 text-red-400"
                    }`}
                  >
                    {entry.action}
                  </span>
                  <span className="text-white font-semibold">{entry.recName}</span>
                  <span className="text-white/40 hidden sm:inline">&mdash; {entry.rationale}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
