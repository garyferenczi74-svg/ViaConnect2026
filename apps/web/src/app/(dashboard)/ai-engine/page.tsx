"use client"

import { useState, useCallback, useRef } from "react"
import {
  Brain,
  Check,
  ChevronDown,
  Circle,
  Loader2,
  Dna,
  Pill,
  Sparkles,
  ThumbsUp,
  Pencil,
  X,
  ExternalLink,
  Clock,
  Flame,
  Wind,
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
  status: string
}

interface Recommendation {
  rank: number
  name: string
  relevance: number
  genes: string[]
  evidence: string
  dosing: { standard: string; adjusted: string; direction: "up" | "down" | "same" }
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
  { name: "Methylation Support Protocol", status: "active" },
  { name: "Neuro-Balance Program", status: "active" },
  { name: "Sleep Optimization v2", status: "active" },
]

const SYMPTOMS = ["Poor sleep", "Brain fog", "Joint pain", "Low energy"]

const RECOMMENDATIONS: Recommendation[] = [
  {
    rank: 1, name: "MTHFR+ Complex", relevance: 92,
    genes: ["MTHFR"],
    evidence: "Homozygous C677T with ~30% residual MTHFR activity. Methylfolate bypass recommended with B2 cofactor for residual enzyme stabilization.",
    dosing: { standard: "5mg", adjusted: "7.5mg", direction: "up" },
    citations: [
      { title: "MTHFR polymorphisms and folate metabolism", pmid: "PMC8234105" },
      { title: "Methylfolate supplementation in C677T carriers", pmid: "PMC7891234" },
    ],
    cypNote: "No CYP450 interaction",
  },
  {
    rank: 2, name: "COMT+ Support", relevance: 87,
    genes: ["COMT"],
    evidence: "Val158Met heterozygous — intermediate catechol-O-methyltransferase activity. Magnesium glycinate as cofactor support with SAMe precursor modulation.",
    dosing: { standard: "200mg", adjusted: "150mg", direction: "down" },
    citations: [
      { title: "COMT Val158Met and catecholamine metabolism", pmid: "PMC6928371" },
      { title: "Magnesium as COMT cofactor: clinical review", pmid: "PMC8012456" },
    ],
    cypNote: "CYP2D6 intermediate: reduce by 25%",
  },
  {
    rank: 3, name: "RELAX+ Formula", relevance: 81,
    genes: ["MAOA", "GAD1"],
    evidence: "MAOA fast variant with GAD1 polymorphism — rapid serotonin turnover and altered GABA synthesis. L-theanine + phosphatidylserine for calming pathway support.",
    dosing: { standard: "400mg", adjusted: "300mg", direction: "down" },
    citations: [
      { title: "MAOA genotype and serotonin-related anxiety", pmid: "PMC7234891" },
      { title: "GAD1 variants and GABAergic function", pmid: "PMC6102938" },
    ],
    cypNote: "CYP1A2 substrate — monitor caffeine",
  },
  {
    rank: 4, name: "NAD+ Boost", relevance: 78,
    genes: ["SIRT1"],
    evidence: "SIRT1 variant affecting NAD+-dependent deacetylase activity. NR (nicotinamide riboside) supplementation to support mitochondrial biogenesis and cellular repair.",
    dosing: { standard: "250mg", adjusted: "375mg", direction: "up" },
    citations: [
      { title: "SIRT1 polymorphisms and NAD+ metabolism", pmid: "PMC8891204" },
    ],
    cypNote: "No significant CYP interaction",
  },
  {
    rank: 5, name: "FOCUS+ Nootropic", relevance: 74,
    genes: ["COMT", "DRD2"],
    evidence: "COMT intermediate + DRD2 Taq1A — altered dopamine receptor density with moderate catecholamine clearance. CDP-choline for acetylcholine/dopamine modulation.",
    dosing: { standard: "200mg", adjusted: "200mg", direction: "same" },
    citations: [
      { title: "DRD2 Taq1A and dopaminergic function", pmid: "PMC5928371" },
      { title: "CDP-choline in cognitive support", pmid: "PMC7012834" },
    ],
    cypNote: "CYP2D6 intermediate: standard dose acceptable",
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskBadge(risk: "HIGH" | "MOD" | "LOW") {
  switch (risk) {
    case "HIGH": return "bg-red-400/20 text-red-400 border border-red-400/30"
    case "MOD":  return "bg-[#ffc640]/20 text-[#ffc640] border border-[#ffc640]/30"
    case "LOW":  return "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30"
  }
}

const glass = "bg-[#1f2937]/60 backdrop-blur-xl border border-white/5"

// ─── Relevance Gauge SVG ────────────────────────────────────────────────────

function RelevanceGauge({ pct }: { pct: number }) {
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 85 ? "#4ade80" : pct >= 75 ? "#ffc640" : "#f87171"

  return (
    <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#374151" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 30 30)"
        className="transition-all duration-700"
      />
      <text x="30" y="30" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="14" fontWeight="900">
        {pct}
      </text>
    </svg>
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
    const ts = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    setAuditLog((prev) => [
      { timestamp: ts, recName: name, action, rationale: action === "accepted" ? "Clinical alignment confirmed" : action === "modified" ? "Dose adjustment per patient response" : "Contraindicated per current protocol" },
      ...prev,
    ])
  }

  const STEPS = [
    "Analyzing genetic profile & patient history...",
    "Cross-referencing evidence across 3 AI models...",
    "Building consensus recommendations...",
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ═══════════════════════════════════════════════════════════
          LEFT SIDEBAR
         ═══════════════════════════════════════════════════════════ */}
      <aside className="lg:w-80 shrink-0 lg:sticky lg:top-24 lg:self-start space-y-5">
        {/* Patient Selector */}
        <div className={`${glass} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Patient</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full bg-[#4ade80] text-[#111827] font-bold text-sm flex items-center justify-center shrink-0">
              JS
            </div>
            <div>
              <p className="text-sm font-bold text-white">Jane Smith</p>
              <p className="text-[10px] text-slate-500 font-mono">MRN: 1042</p>
            </div>
          </div>
        </div>

        {/* CAQ Scores */}
        <div className={`${glass} rounded-2xl p-5`}>
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">CAQ Scores</h3>
          <div className="space-y-3">
            {CAQ_SCORES.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-slate-300">{s.label}</span>
                  <span className="text-[#4ade80]">{s.value}/{s.max}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-500"
                    style={{ width: `${(s.value / s.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Genomic Highlights */}
        <div className={`${glass} rounded-2xl p-5`}>
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Genomic Highlights</h3>
          <div className="space-y-2">
            {GENOMIC_HIGHLIGHTS.map((g) => (
              <div key={g.gene} className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">{g.gene}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5 font-mono">{g.variant}</span>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${riskBadge(g.risk)}`}>
                  {g.risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Protocols */}
        <div className={`${glass} rounded-2xl p-5`}>
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Current Protocols</h3>
          <div className="space-y-2.5">
            {PROTOCOLS.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.4)]" />
                <span className="text-xs text-slate-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Symptoms */}
        <div className={`${glass} rounded-2xl p-5`}>
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Reported Symptoms</h3>
          <div className="flex flex-wrap gap-1.5">
            {SYMPTOMS.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-slate-300 font-medium border border-white/10">
                {s}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter mb-2">AI Engine</h2>
          <p className="text-slate-500 text-sm">Consensus-driven recommendations from 3 AI models</p>
        </div>

        {/* ── GENERATE BUTTON / PROCESSING ────────────────────── */}
        {!generated && (
          <div>
            {!processing ? (
              <button
                onClick={handleGenerate}
                className="w-full py-4 rounded-xl bg-[#4ade80] text-[#111827] font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#4ade80]/20 hover:bg-[#6bfb9a] active:scale-[0.99] transition-all"
              >
                <Brain className="h-6 w-6" />
                Generate Recommendations
              </button>
            ) : (
              <div className={`${glass} rounded-2xl p-6 space-y-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="h-4 w-4 text-[#4ade80] animate-spin" />
                  <span className="text-sm font-bold text-[#4ade80]">Processing...</span>
                </div>
                {/* Progress bar */}
                <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] transition-all duration-[2000ms] ease-linear"
                    style={{ width: step >= 3 ? "100%" : step >= 2 ? "66%" : step >= 1 ? "33%" : "0%" }}
                  />
                </div>
                {/* Steps */}
                <div className="space-y-3">
                  {STEPS.map((label, i) => {
                    const stepNum = i + 1
                    const done = step > stepNum
                    const active = step === stepNum
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          done
                            ? "bg-[#4ade80] text-[#111827]"
                            : active
                            ? "border-2 border-[#4ade80] text-[#4ade80]"
                            : "border border-gray-600 text-gray-600"
                        }`}>
                          {done ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-[10px] font-bold">{stepNum}</span>
                          )}
                        </div>
                        <span className={`text-sm transition-colors duration-300 ${
                          done ? "text-[#4ade80]" : active ? "text-white" : "text-slate-600"
                        }`}>
                          {label}
                        </span>
                        {active && <Loader2 className="h-3 w-3 text-[#4ade80] animate-spin ml-auto" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── RECOMMENDATION CARDS ────────────────────────────── */}
        {generated && (
          <div className="space-y-4">
            {RECOMMENDATIONS.map((rec) => {
              const action = actions[rec.rank]
              return (
                <div
                  key={rec.rank}
                  className={`${glass} rounded-2xl p-6 transition-all ${
                    action === "accepted" ? "border-[#4ade80]/30 bg-[#4ade80]/5" :
                    action === "rejected" ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Left: Rank + Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        {/* Rank circle */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center text-white text-sm font-black shrink-0">
                          #{rec.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-extrabold text-white tracking-tight">{rec.name}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {rec.genes.map((g) => (
                              <span key={g} className="px-2 py-0.5 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] text-[9px] font-bold uppercase">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Evidence */}
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{rec.evidence}</p>

                      {/* Dosing */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Dosing</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 line-through">{rec.dosing.standard}</span>
                          <span className="text-white font-bold">&rarr;</span>
                          <span className={`font-black ${
                            rec.dosing.direction === "up" ? "text-[#4ade80]" :
                            rec.dosing.direction === "down" ? "text-red-400" : "text-slate-400"
                          }`}>
                            {rec.dosing.adjusted}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-mono">{rec.cypNote}</span>
                      </div>

                      {/* PubMed Citations */}
                      <div className="space-y-1">
                        {rec.citations.map((c) => (
                          <div key={c.pmid} className="flex items-center gap-1.5 text-[10px]">
                            <ExternalLink className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                            <span className="text-blue-400 hover:underline cursor-pointer">{c.title}</span>
                            <span className="text-slate-600 font-mono">{c.pmid}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Gauge + Actions */}
                    <div className="flex sm:flex-col items-center gap-3 sm:gap-4 shrink-0">
                      <RelevanceGauge pct={rec.relevance} />
                      {!action ? (
                        <div className="flex sm:flex-col gap-2">
                          <button
                            onClick={() => handleAction(rec.rank, "accepted", rec.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4ade80] text-[#111827] text-[10px] font-bold hover:bg-[#6bfb9a] transition-colors"
                          >
                            <ThumbsUp className="h-3 w-3" /> Accept
                          </button>
                          <button
                            onClick={() => handleAction(rec.rank, "modified", rec.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4ade80]/30 text-[#4ade80] text-[10px] font-bold hover:bg-[#4ade80]/10 transition-colors"
                          >
                            <Pencil className="h-3 w-3" /> Modify
                          </button>
                          <button
                            onClick={() => handleAction(rec.rank, "rejected", rec.name)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400 text-[10px] font-bold hover:bg-red-400/10 transition-colors"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                          action === "accepted" ? "bg-[#4ade80]/20 text-[#4ade80]" :
                          action === "modified" ? "bg-[#ffc640]/20 text-[#ffc640]" :
                          "bg-red-400/20 text-red-400"
                        }`}>
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

        {/* ── CONSTITUTIONAL ADVISOR ──────────────────────────── */}
        {generated && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-[#f472b6]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#f472b6]/10 p-2 rounded-xl">
                <Flame className="h-5 w-5 text-[#f472b6]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">Constitutional Advisor</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#a78bfa]/20 text-[#a78bfa] text-[9px] font-bold uppercase mt-1 inline-block">
                  Vata-Pitta Constitution
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Based on constitutional assessment and genomic markers, this patient presents a <span className="text-[#f472b6] font-semibold">Vata-Pitta</span> dominant constitution with tendencies toward nervous system activation and metabolic heat. Recommendations emphasize warming, grounding, and nervine support.
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Flame className="h-3.5 w-3.5 text-[#f472b6]" />
                  <span className="text-[10px] font-bold text-[#f472b6] uppercase">Warming</span>
                </div>
                <p className="text-[11px] text-slate-400">Ashwagandha 600mg, Ginger root extract, Cinnamon bark — support metabolic warmth and adrenal tone</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wind className="h-3.5 w-3.5 text-[#a78bfa]" />
                  <span className="text-[10px] font-bold text-[#a78bfa] uppercase">Grounding</span>
                </div>
                <p className="text-[11px] text-slate-400">Shatavari 500mg, Licorice root, Tulsi — calm Vata dispersion and stabilize nervous system</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#4ade80]" />
                  <span className="text-[10px] font-bold text-[#4ade80] uppercase">Nervine</span>
                </div>
                <p className="text-[11px] text-slate-400">Bacopa 300mg, Jatamansi, Brahmi — nourish neurotransmitter pathways per COMT/MAOA profile</p>
              </div>
            </div>
          </div>
        )}

        {/* ── OVERRIDE AUDIT TRAIL ────────────────────────────── */}
        {auditLog.length > 0 && (
          <div className={`${glass} rounded-2xl p-5`}>
            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Override Audit Trail
            </h3>
            <div className="space-y-2">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-600 font-mono shrink-0">{entry.timestamp}</span>
                  <span className={`font-bold shrink-0 uppercase text-[9px] px-2 py-0.5 rounded-full ${
                    entry.action === "accepted" ? "bg-[#4ade80]/20 text-[#4ade80]" :
                    entry.action === "modified" ? "bg-[#ffc640]/20 text-[#ffc640]" :
                    "bg-red-400/20 text-red-400"
                  }`}>
                    {entry.action}
                  </span>
                  <span className="text-white font-semibold">{entry.recName}</span>
                  <span className="text-slate-500">&mdash; {entry.rationale}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
