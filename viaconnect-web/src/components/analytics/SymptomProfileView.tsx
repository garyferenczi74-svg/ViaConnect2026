"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, TrendingUp, Search, Info, RefreshCw, Check, ArrowRight,
  ShieldAlert, Stethoscope, Leaf, Activity, Brain, Heart, Flame,
  Shield, Zap, Bone, Droplets,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ═══ TYPES ═══ */
interface TopSymptom { name: string; category: "physical" | "neurological" | "emotional"; severity: number; patientDescription: string; expertAnalysis: string; connectedSymptoms: string[]; trend: "stable" | "concerning" | "monitor" }
interface MasterPattern { name: string; confidence: string; symptomsInvolved: string[]; explanation: string; westernPerspective: string; easternPerspective: string; functionalPerspective: string; genomicRelevance: string; nutritionalGaps: string[]; herbsToConsider: string[]; supplementProtocol: { product: string; dosage: string; timing: string; rationale: string }[]; lifestyleInterventions: string[]; labsToRequest: string[]; urgency: string }
interface SystemStatus { status: string; findings: string; flags: string[] }
interface ActionItem { action: string; rationale: string; category: string; expectedTimeframe: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SymptomProfileData { overallBurdenScore: number; burdenTier: string; executiveSummary: string; masterPatterns: MasterPattern[]; topSymptoms: TopSymptom[]; symptomClusters: any[]; systemBySystemAnalysis: Record<string, SystemStatus>; lifestyleCorrelations: any[]; medicationInterplay: any[]; easternMedicineInsights: { tcmPattern: string; tcmExplanation: string; doshaAssessment: string; doshaExplanation: string; recommendedPractices: string[] }; actionPlan: { immediate: ActionItem[]; thisWeek: ActionItem[]; thisMonth: ActionItem[]; ongoing: ActionItem[] }; farmceuticaProtocolSuggestion: { summary: string; products: { product: string; dosage: string; timing: string; rationale: string }[] }; disclaimer: string; status?: string }

function PIcon({ icon: Icon, color, size = "sm" }: { icon: LucideIcon; color: string; size?: "sm" | "md" }) {
  const s = size === "md" ? { box: "w-10 h-10", ico: "w-5 h-5" } : { box: "w-8 h-8", ico: "w-4 h-4" };
  return (<div className="relative flex-shrink-0"><div className={`relative ${s.box} rounded-lg flex items-center justify-center`} style={{ background: `linear-gradient(135deg, ${color}26, transparent)`, border: `1px solid ${color}1A` }}><Icon className={s.ico} style={{ color }} strokeWidth={1.5} /></div></div>);
}

const CAT = { physical: { bg: "bg-blue-400/5", border: "border-blue-400/15", text: "text-blue-400", label: "Physical" }, neurological: { bg: "bg-purple-400/5", border: "border-purple-400/15", text: "text-purple-400", label: "Neurological" }, emotional: { bg: "bg-pink-400/5", border: "border-pink-400/15", text: "text-pink-400", label: "Emotional" } };

const SYS_ICONS: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  endocrine: { icon: Zap, color: "#FBBF24", label: "Endocrine" }, neurological: { icon: Brain, color: "#A855F7", label: "Neurological" },
  digestive: { icon: Flame, color: "#F97316", label: "Digestive" }, immune: { icon: Shield, color: "#2DA5A0", label: "Immune" },
  musculoskeletal: { icon: Bone, color: "#60A5FA", label: "Musculoskeletal" }, mental_emotional: { icon: Heart, color: "#EC4899", label: "Mental/Emotional" },
  metabolic: { icon: Activity, color: "#34D399", label: "Metabolic" }, cardiovascular: { icon: Droplets, color: "#EF4444", label: "Cardiovascular" },
};

const STATUS_COLORS: Record<string, string> = { optimal: "bg-teal-400", suboptimal: "bg-yellow-400", compromised: "bg-red-400", not_assessed: "bg-white/20" };

/* ═══ MAIN VIEW ═══ */
export function SymptomProfileView({ data, caqCompleted }: { data: SymptomProfileData | null; caqCompleted: boolean }) {
  if (!caqCompleted || !data || data.status === "no_data") {
    return (<div className="p-6 md:p-8 text-center py-16"><Search className="w-10 h-10 text-white/15 mx-auto mb-4" strokeWidth={1.5} /><p className="text-base text-white/40 mb-2">Symptom Profile Not Yet Available</p><p className="text-xs text-white/25 mb-6 max-w-md mx-auto">Complete your Clinical Assessment Questionnaire to generate your personalized Symptom Profile.</p><a href="/onboarding/i-caq-intro" className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium">Start Assessment <ArrowRight className="w-4 h-4" strokeWidth={1.5} /></a></div>);
  }

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* HEADER WITH RETAKE BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div><h3 className="text-base md:text-lg font-semibold text-white">Symptom Profile</h3><p className="text-xs text-white/30 mt-0.5">AI-powered multi-disciplinary analysis</p></div>
        <a href="/onboarding/i-caq-intro" className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/25 text-orange-400 text-xs font-medium hover:bg-orange-400/15 hover:border-orange-400/35 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0">
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} /> Retake Assessment
        </a>
      </div>

      {/* 1. EXECUTIVE SUMMARY */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <BurdenGauge score={data.overallBurdenScore} />
        <div className="flex-1"><h3 className="text-lg font-semibold text-white mb-1">Symptom Burden: {data.burdenTier}</h3><p className="text-sm text-white/50 leading-relaxed">{data.executiveSummary}</p></div>
      </div>

      {/* 2. MASTER PATTERNS */}
      {data.masterPatterns?.length > 0 && (<div><h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Master Patterns Identified</h4><div className="space-y-4">{data.masterPatterns.map((p, i) => <MasterPatternCard key={i} pattern={p} index={i + 1} total={data.masterPatterns.length} />)}</div></div>)}

      {/* 3. TOP SYMPTOMS */}
      {data.topSymptoms?.length > 0 && (<div><h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Top Symptoms by Severity</h4><div className="space-y-2">{data.topSymptoms.map((s, i) => <TopSymptomCard key={i} symptom={s} rank={i + 1} />)}</div></div>)}

      {/* 4. SYSTEM-BY-SYSTEM */}
      {data.systemBySystemAnalysis && (<div><h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Body Systems Overview</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{Object.entries(data.systemBySystemAnalysis).map(([key, sys]) => { const cfg = SYS_ICONS[key]; if (!cfg) return null; const pct = sys.status === "optimal" ? 90 : sys.status === "suboptimal" ? 55 : sys.status === "compromised" ? 30 : 0; return (<div key={key} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-center gap-3"><PIcon icon={cfg.icon} color={cfg.color} /><div className="flex-1 min-w-0"><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium text-white/60">{cfg.label}</span><span className={`text-[9px] px-2 py-0.5 rounded-full capitalize ${sys.status === "optimal" ? "bg-teal-400/10 text-teal-400" : sys.status === "compromised" ? "bg-red-400/10 text-red-400" : sys.status === "suboptimal" ? "bg-yellow-400/10 text-yellow-400" : "bg-white/5 text-white/20"}`}>{sys.status.replace("_", " ")}</span></div><div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${STATUS_COLORS[sys.status] || "bg-white/10"}`} style={{ width: `${pct}%` }} /></div></div></div>); })}</div></div>)}

      {/* 5. LIFESTYLE CORRELATIONS */}
      {data.lifestyleCorrelations?.length > 0 && (<div><h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Lifestyle Correlations</h4><div className="space-y-3">{data.lifestyleCorrelations.map((c: { factor: string; currentStatus: string; symptomImpact: string; impact: string; specificRecommendation: string }, i: number) => (<div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-white capitalize">{c.factor}</span><span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-semibold ${c.impact === "high" ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>{c.impact} impact</span></div><p className="text-xs text-white/40 mb-2">{c.symptomImpact}</p><div className="rounded-lg bg-teal-400/5 border border-teal-400/10 p-3"><p className="text-xs text-teal-400/80">{c.specificRecommendation}</p></div></div>))}</div></div>)}

      {/* 6. EASTERN MEDICINE */}
      {data.easternMedicineInsights && (<div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6 space-y-4"><div className="flex items-center gap-3 mb-2"><PIcon icon={Leaf} color="#34D399" size="md" /><h4 className="text-base font-semibold text-white">Eastern Medicine Perspective</h4></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-1">TCM Pattern</p><p className="text-sm font-medium text-emerald-400 mb-1">{data.easternMedicineInsights.tcmPattern}</p><p className="text-xs text-white/35 leading-relaxed">{data.easternMedicineInsights.tcmExplanation}</p></div><div><p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-1">Ayurvedic Assessment</p><p className="text-sm font-medium text-amber-400 mb-1">{data.easternMedicineInsights.doshaAssessment}</p><p className="text-xs text-white/35 leading-relaxed">{data.easternMedicineInsights.doshaExplanation}</p></div></div>{data.easternMedicineInsights.recommendedPractices?.length > 0 && (<div className="pt-3 border-t border-white/5"><p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">Recommended Practices</p><div className="space-y-1.5">{data.easternMedicineInsights.recommendedPractices.map((p, i) => <p key={i} className="text-xs text-white/40 flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-emerald-400/40 mt-1.5 flex-shrink-0" />{p}</p>)}</div></div>)}</div>)}

      {/* 7. ACTION PLAN */}
      {data.actionPlan && (<div><h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Your Action Plan</h4><div className="space-y-4">{[{ label: "Start Today", items: data.actionPlan.immediate, color: "#EF4444" }, { label: "This Week", items: data.actionPlan.thisWeek, color: "#F59E0B" }, { label: "This Month", items: data.actionPlan.thisMonth, color: "#60A5FA" }, { label: "Ongoing", items: data.actionPlan.ongoing, color: "#2DA5A0" }].filter(g => g.items?.length > 0).map((group) => (<div key={group.label}><div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} /><span className="text-xs font-semibold text-white/50">{group.label}</span></div><div className="space-y-2 ml-4">{group.items.map((item, i) => (<div key={i} className="rounded-xl bg-white/[0.02] border border-white/5 p-4"><p className="text-sm text-white/70 mb-1">{item.action}</p><p className="text-xs text-white/30">{item.rationale}</p><div className="flex gap-2 mt-2"><span className={`text-[9px] px-2 py-0.5 rounded-full ${item.category === "supplement" ? "bg-teal-400/10 text-teal-400" : item.category === "lifestyle" ? "bg-green-400/10 text-green-400" : item.category === "lab_work" ? "bg-blue-400/10 text-blue-400" : item.category === "practitioner" ? "bg-purple-400/10 text-purple-400" : "bg-orange-400/10 text-orange-400"}`}>{item.category.replace("_", " ")}</span><span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/20">{item.expectedTimeframe}</span></div></div>))}</div></div>))}</div></div>)}

      {/* 8. DISCLAIMER */}
      <div className="rounded-xl bg-orange-400/5 border border-orange-400/15 p-5 md:p-6">
        <div className="flex items-start gap-4"><PIcon icon={ShieldAlert} color="#B75E18" size="md" /><div><h4 className="text-sm font-semibold text-orange-400 mb-2">Review With Your Practitioner</h4><p className="text-xs text-white/40 leading-relaxed mb-3">{data.disclaimer}</p><div className="flex flex-wrap gap-2"><a href="/supplements" className="min-h-[44px] px-4 py-2 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-400 text-xs font-medium flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" strokeWidth={1.5} />Find a Physician</a><a href="/supplements" className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-medium flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" strokeWidth={1.5} />Find a Naturopath</a></div></div></div>
      </div>

      {/* 9. RETAKE */}
      <RetakeButton />
    </div>
  );
}

/* ═══ BURDEN GAUGE ═══ */
function BurdenGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#EF4444" : score >= 50 ? "#F59E0B" : score >= 30 ? "#FBBF24" : score >= 15 ? "#60A5FA" : "#2DA5A0";
  const r = 42; const circ = 2 * Math.PI * r;
  return (<div className="relative w-24 h-24 flex-shrink-0"><svg viewBox="0 0 100 100" className="w-full h-full -rotate-90"><circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" /><circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * circ} ${circ}`} className="transition-all duration-1000" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold" style={{ color }}>{score}</span><span className="text-[8px] text-white/25">/100</span></div></div>);
}

/* ═══ MASTER PATTERN CARD ═══ */
function MasterPatternCard({ pattern, index, total }: { pattern: MasterPattern; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-teal-400/15 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 md:p-5 min-h-[44px]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div><span className="text-[10px] text-white/20 uppercase tracking-wider">Pattern {index} of {total}</span><h4 className="text-sm md:text-base font-bold text-white mt-0.5">{pattern.name}</h4></div>
          <div className="flex items-center gap-2 flex-shrink-0"><span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-semibold ${pattern.confidence === "high" ? "bg-teal-400/10 text-teal-400" : "bg-yellow-400/10 text-yellow-400"}`}>{pattern.confidence}</span><span className={`text-[9px] px-2 py-0.5 rounded-full uppercase ${pattern.urgency === "investigate_soon" ? "bg-red-400/10 text-red-400" : "bg-white/5 text-white/25"}`}>{pattern.urgency.replace("_", " ")}</span><ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} /></div>
        </div>
        <div className="flex flex-wrap gap-1.5">{pattern.symptomsInvolved.slice(0, 6).map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400/60 capitalize">{s}</span>)}</div>
      </button>
      <AnimatePresence>
        {open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
          <div className="px-4 md:px-5 pb-5 pt-2 border-t border-white/5 space-y-5">
            <p className="text-sm text-white/50 leading-relaxed">{pattern.explanation}</p>
            {[{ label: "Western Medicine View", text: pattern.westernPerspective, color: "#60A5FA" }, { label: "Eastern Medicine View", text: pattern.easternPerspective, color: "#34D399" }, { label: "Functional Medicine View", text: pattern.functionalPerspective, color: "#F59E0B" }, { label: "Genomic Relevance", text: pattern.genomicRelevance, color: "#A855F7" }].map(v => (<div key={v.label} className="rounded-lg bg-white/[0.02] border border-white/5 p-3"><p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: v.color }}>{v.label}</p><p className="text-xs text-white/40 leading-relaxed">{v.text}</p></div>))}
            {pattern.supplementProtocol?.length > 0 && (<div><p className="text-[10px] text-teal-400 uppercase tracking-wider font-semibold mb-2">FarmCeutica Protocol</p><div className="space-y-2">{pattern.supplementProtocol.map((s, i) => (<div key={i} className="rounded-lg bg-teal-400/[0.03] border border-teal-400/10 p-3"><p className="text-xs font-medium text-white/70">{s.product} — {s.dosage} ({s.timing})</p><p className="text-[11px] text-white/30 mt-0.5">{s.rationale}</p></div>))}</div></div>)}
            {pattern.labsToRequest?.length > 0 && (<div><p className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold mb-2">Labs to Request</p><div className="flex flex-wrap gap-1.5">{pattern.labsToRequest.map(l => <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400/60">{l}</span>)}</div></div>)}
          </div>
        </motion.div>)}
      </AnimatePresence>
    </div>
  );
}

/* ═══ TOP SYMPTOM CARD ═══ */
function TopSymptomCard({ symptom, rank }: { symptom: TopSymptom; rank: number }) {
  const [open, setOpen] = useState(false);
  const cat = CAT[symptom.category] || CAT.physical;
  const sev = symptom.severity >= 7 ? "text-red-400" : symptom.severity >= 4 ? "text-yellow-400" : "text-green-400";
  const bar = symptom.severity >= 7 ? "bg-red-400" : symptom.severity >= 4 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className={`rounded-xl ${cat.bg} border ${cat.border} overflow-hidden cursor-pointer`} onClick={() => setOpen(!open)}>
      <div className="flex items-center gap-3 px-4 md:px-5 py-3 min-h-[44px]">
        <span className="text-base font-bold text-white/15 w-5 text-center">{rank}</span>
        <div className="w-14 flex-shrink-0"><div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${bar}`} style={{ width: `${symptom.severity * 10}%` }} /></div><span className={`text-[10px] font-bold ${sev} mt-0.5 block text-center`}>{symptom.severity}/10</span></div>
        <p className="flex-1 text-sm font-medium text-white/80 capitalize min-w-0">{symptom.name}</p>
        <span className={`text-[9px] px-2 py-0.5 rounded-full ${cat.text} bg-white/[0.05] uppercase tracking-wider font-semibold hidden sm:inline`}>{cat.label}</span>
        {symptom.trend === "concerning" && <TrendingUp className="w-4 h-4 text-red-400/60 flex-shrink-0" strokeWidth={1.5} />}
        <ChevronDown className={`w-4 h-4 text-white/15 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </div>
      <AnimatePresence>{open && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><div className="px-4 md:px-5 pb-4 pt-2 border-t border-white/5 space-y-2">{symptom.patientDescription && <div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Your Description</p><p className="text-xs text-white/50 italic">&ldquo;{symptom.patientDescription}&rdquo;</p></div>}<div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Expert Analysis</p><p className="text-xs text-white/40 leading-relaxed">{symptom.expertAnalysis}</p></div>{symptom.connectedSymptoms?.length > 0 && <div className="flex flex-wrap gap-1.5 pt-1">{symptom.connectedSymptoms.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25 capitalize">{s}</span>)}</div>}</div></motion.div>)}</AnimatePresence>
    </div>
  );
}

/* ═══ RETAKE BUTTON ═══ */
function RetakeButton() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <PIcon icon={RefreshCw} color="#B75E18" />
          <div>
            <h4 className="text-sm font-semibold text-white">Update Your Assessment</h4>
            <p className="text-xs text-white/30 mt-1 leading-relaxed max-w-md">Health changes over time. Retake the Clinical Assessment Questionnaire to update your Symptom Profile, supplement protocol, and AI recommendations with your current health status.</p>
          </div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0"><RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Retake Assessment</button>
        ) : (
          <div className="w-full sm:w-auto space-y-3">
            <div className="rounded-lg bg-orange-400/5 border border-orange-400/10 px-4 py-3">
              <p className="text-xs text-white/40 leading-relaxed">This will take you through all 7 phases of the Clinical Assessment Questionnaire. Your previous answers will be <span className="text-white/60 font-medium">pre-filled</span> so you only need to update what has changed.</p>
              <p className="text-[10px] text-white/25 mt-2">After completion, your Symptom Profile, Bio Optimization score, supplement protocol, and all analytics will regenerate.</p>
            </div>
            <div className="flex gap-2">
              <a href="/onboarding/i-caq-intro" className="min-h-[44px] flex-1 px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all flex items-center gap-2 justify-center"><Check className="w-4 h-4" strokeWidth={2} /> Yes, Start Assessment</a>
              <button onClick={() => setConfirming(false)} className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
