"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, TrendingUp, Search, Info, RefreshCw, Check, ArrowRight } from "lucide-react";

/* ═══ TYPES ═══ */
interface TopSymptom { name: string; category: "physical" | "neurological" | "emotional"; severity: number; patientDescription: string; clinicalContext: string; trend: "stable" | "concerning" | "monitor" }
interface Cluster { name: string; symptoms: string[]; possibleConnection: string; suggestedInvestigation: string }
interface Correlation { factor: string; finding: string; impact: string }
interface RootCause { suggestion: string; relatedSymptoms: string[]; evidenceStrength: string; action: string }
interface ActionItem { priority: number; action: string; category: string; timeframe: string }
interface SymptomProfileData {
  overallBurdenScore: number; burdenTier: string; topSymptoms: TopSymptom[];
  symptomClusters: Cluster[]; lifestyleCorrelations: Correlation[];
  medicationFlags: { medication: string; possibleSideEffects: string[]; recommendation: string }[];
  rootCauseSuggestions: RootCause[]; actionItems: ActionItem[];
  summary: string; disclaimer: string; status?: string;
}

const CAT_COLORS = {
  physical: { bg: "bg-blue-400/5", border: "border-blue-400/15", text: "text-blue-400", label: "Physical" },
  neurological: { bg: "bg-purple-400/5", border: "border-purple-400/15", text: "text-purple-400", label: "Neurological" },
  emotional: { bg: "bg-pink-400/5", border: "border-pink-400/15", text: "text-pink-400", label: "Emotional" },
};

/* ═══ MAIN VIEW ═══ */
export function SymptomProfileView({ data, caqCompleted }: { data: SymptomProfileData | null; caqCompleted: boolean }) {
  if (!caqCompleted || !data || data.status === "no_data") {
    return (
      <div className="p-6 md:p-8 text-center py-16">
        <Search className="w-10 h-10 text-white/15 mx-auto mb-4" strokeWidth={1.5} />
        <p className="text-base text-white/40 mb-2">Symptom Profile Not Yet Available</p>
        <p className="text-xs text-white/25 mb-6 max-w-md mx-auto">Complete your Clinical Assessment Questionnaire to generate your personalized Symptom Profile with AI-powered analysis.</p>
        <a href="/onboarding/i-caq-intro" className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/15 transition-all">
          Start Assessment <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </a>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-8">
      {/* BURDEN SCORE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <BurdenGauge score={data.overallBurdenScore} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">Symptom Burden: {data.burdenTier}</h3>
          <p className="text-sm text-white/40 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {/* TOP SYMPTOMS */}
      {data.topSymptoms?.length > 0 && (
        <div>
          <h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Top Symptoms by Severity</h4>
          <div className="space-y-2">{data.topSymptoms.map((s, i) => <TopSymptomCard key={i} symptom={s} rank={i + 1} />)}</div>
        </div>
      )}

      {/* CLUSTERS */}
      {data.symptomClusters?.length > 0 && (
        <div>
          <h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Symptom Clusters Identified</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{data.symptomClusters.map((c, i) => <ClusterCard key={i} cluster={c} />)}</div>
        </div>
      )}

      {/* LIFESTYLE */}
      {data.lifestyleCorrelations?.length > 0 && (
        <div>
          <h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Lifestyle Correlations</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{data.lifestyleCorrelations.map((c, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white capitalize">{c.factor}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-semibold ${c.impact === "high" ? "bg-red-400/10 text-red-400" : c.impact === "moderate" ? "bg-yellow-400/10 text-yellow-400" : "bg-green-400/10 text-green-400"}`}>{c.impact}</span>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">{c.finding}</p>
            </div>
          ))}</div>
        </div>
      )}

      {/* ROOT CAUSES */}
      {data.rootCauseSuggestions?.length > 0 && (
        <div>
          <h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Possible Root Causes to Investigate</h4>
          <div className="space-y-3">{data.rootCauseSuggestions.map((r, i) => (
            <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h5 className="text-sm font-semibold text-white">{r.suggestion}</h5>
                <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-semibold flex-shrink-0 ${r.evidenceStrength === "strong" ? "bg-teal-400/10 text-teal-400" : "bg-yellow-400/10 text-yellow-400"}`}>{r.evidenceStrength}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">{r.relatedSymptoms.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30 capitalize">{s}</span>)}</div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                <Search className="w-3 h-3 text-orange-400/50" strokeWidth={1.5} />
                <p className="text-[10px] text-orange-400/50">{r.action}</p>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {/* ACTION ITEMS */}
      {data.actionItems?.length > 0 && (
        <div>
          <h4 className="text-xs text-white/20 uppercase tracking-wider font-semibold mb-4">Recommended Actions</h4>
          <div className="space-y-2">{data.actionItems.sort((a, b) => a.priority - b.priority).map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3">
              <span className="text-xs font-bold text-white/20 w-5 mt-0.5">{item.priority}</span>
              <div className="flex-1">
                <p className="text-sm text-white/60">{item.action}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase ${item.category === "practitioner" ? "bg-teal-400/10 text-teal-400" : item.category === "lab_work" ? "bg-blue-400/10 text-blue-400" : item.category === "lifestyle" ? "bg-green-400/10 text-green-400" : "bg-orange-400/10 text-orange-400"}`}>{item.category.replace("_", " ")}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-white/20">{item.timeframe.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="rounded-xl bg-orange-400/5 border border-orange-400/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-orange-400/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-white/30 leading-relaxed">{data.disclaimer}</p>
        </div>
      </div>

      {/* RETAKE */}
      <RetakeButton />
    </div>
  );
}

/* ═══ BURDEN GAUGE ═══ */
function BurdenGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#EF4444" : score >= 50 ? "#F59E0B" : score >= 30 ? "#FBBF24" : score >= 15 ? "#60A5FA" : "#2DA5A0";
  const r = 42; const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * circ} ${circ}`} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[8px] text-white/25">/100</span>
      </div>
    </div>
  );
}

/* ═══ TOP SYMPTOM CARD ═══ */
function TopSymptomCard({ symptom, rank }: { symptom: TopSymptom; rank: number }) {
  const [open, setOpen] = useState(false);
  const cat = CAT_COLORS[symptom.category] || CAT_COLORS.physical;
  const sevColor = symptom.severity >= 7 ? "text-red-400" : symptom.severity >= 4 ? "text-yellow-400" : "text-green-400";
  const barColor = symptom.severity >= 7 ? "bg-red-400" : symptom.severity >= 4 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className={`rounded-xl ${cat.bg} border ${cat.border} overflow-hidden cursor-pointer transition-all`} onClick={() => setOpen(!open)}>
      <div className="flex items-center gap-4 px-4 md:px-5 py-3.5 min-h-[44px]">
        <span className="text-lg font-bold text-white/15 w-6 text-center">{rank}</span>
        <div className="w-16 flex-shrink-0">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${symptom.severity * 10}%` }} /></div>
          <span className={`text-[10px] font-bold ${sevColor} mt-0.5 block text-center`}>{symptom.severity}/10</span>
        </div>
        <p className="flex-1 text-sm font-medium text-white/80 capitalize min-w-0">{symptom.name}</p>
        <span className={`text-[9px] px-2 py-0.5 rounded-full ${cat.text} bg-white/[0.05] uppercase tracking-wider font-semibold hidden sm:inline`}>{cat.label}</span>
        {symptom.trend === "concerning" && <TrendingUp className="w-4 h-4 text-red-400/60 flex-shrink-0" strokeWidth={1.5} />}
        <ChevronDown className={`w-4 h-4 text-white/15 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 md:px-5 pb-4 pt-2 border-t border-white/5 space-y-2">
              {symptom.patientDescription && <div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Your Description</p><p className="text-xs text-white/50 italic leading-relaxed">&ldquo;{symptom.patientDescription}&rdquo;</p></div>}
              <div><p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Clinical Context</p><p className="text-xs text-white/40 leading-relaxed">{symptom.clinicalContext}</p></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ CLUSTER CARD ═══ */
function ClusterCard({ cluster }: { cluster: Cluster }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 md:p-5">
      <h5 className="text-sm font-semibold text-white mb-2">{cluster.name}</h5>
      <div className="flex flex-wrap gap-1.5 mb-3">{cluster.symptoms.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400/60 capitalize">{s}</span>)}</div>
      <p className="text-xs text-white/30 leading-relaxed mb-2">{cluster.possibleConnection}</p>
      <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
        <Search className="w-3 h-3 text-orange-400/50" strokeWidth={1.5} />
        <p className="text-[10px] text-orange-400/50">{cluster.suggestedInvestigation}</p>
      </div>
    </div>
  );
}

/* ═══ RETAKE BUTTON ═══ */
function RetakeButton() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-5 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0"><div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#B75E1833" }} /><div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B75E1833, #B75E181A, transparent)", border: "1px solid #B75E1826" }}><RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} /></div></div>
          <div><h4 className="text-sm font-semibold text-white">Update Your Assessment</h4><p className="text-xs text-white/30 mt-0.5">Retake the CAQ to update your symptom profile</p></div>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 w-full sm:w-auto justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Retake Assessment
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <a href="/onboarding/i-caq-intro" className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-all flex items-center gap-2 justify-center">
              <Check className="w-4 h-4" strokeWidth={2} /> Yes, Start Over
            </a>
            <button onClick={() => setConfirming(false)} className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm hover:bg-white/[0.08] transition-all flex items-center justify-center">Cancel</button>
          </div>
        )}
      </div>
      {confirming && <p className="text-xs text-white/25 mt-3">Your previous answers will be available. Update only what has changed.</p>}
    </div>
  );
}
