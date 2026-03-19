"use client";

import { useState } from "react";
import {
  Pill,
  Leaf,
  Plus,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Import,
} from "lucide-react";

/* ───────── Types ───────── */

interface Med {
  id: string;
  name: string;
  dosage: string;
}

interface Supp {
  id: string;
  name: string;
  dosage: string;
}

type Severity = "red" | "yellow" | "green";

interface Interaction {
  id: string;
  severity: Severity;
  pair: string;
  badge: string;
  mechanism: string;
  onset: string;
  severityLabel: string;
  evidence: string;
  mitigation: string;
}

/* ───────── Mock Data ───────── */

const initialMeds: Med[] = [
  { id: "m1", name: "Lisinopril", dosage: "10mg" },
  { id: "m2", name: "Metformin", dosage: "500mg" },
  { id: "m3", name: "Levothyroxine", dosage: "50mcg" },
];

const initialSupps: Supp[] = [
  { id: "s1", name: "MTHFR+", dosage: "5mg" },
  { id: "s2", name: "NAD+", dosage: "250mg" },
  { id: "s3", name: "COMT+", dosage: "10mg" },
];

const mockResults: Interaction[] = [
  {
    id: "r1",
    severity: "red",
    pair: "Levothyroxine ↔ IRON+",
    badge: "AVOID",
    mechanism: "Bivalent cation chelation reduces levothyroxine absorption by up to 70%. Iron forms insoluble complexes with T4 in the GI tract.",
    onset: "Immediate (same-dose window)",
    severityLabel: "Major — clinically significant",
    evidence: "PubMed PMID: 29368407",
    mitigation: "Separate administration by at least 4 hours. Take levothyroxine on empty stomach, iron with meals.",
  },
  {
    id: "r2",
    severity: "yellow",
    pair: "Metformin ↔ NAD+",
    badge: "MONITOR",
    mechanism: "Metformin may impair vitamin B12 absorption. NAD+ precursors (NMN/NR) compete for similar methylation cofactors.",
    onset: "Chronic (weeks to months)",
    severityLabel: "Moderate",
    evidence: "Clinical review — limited RCT data",
    mitigation: "Monitor serum B12 levels quarterly. Consider sublingual B12 supplementation.",
  },
  {
    id: "r3",
    severity: "yellow",
    pair: "Lisinopril ↔ MTHFR+",
    badge: "MONITOR",
    mechanism: "Theoretical interaction: ACE inhibitors may alter folate metabolism. Methylfolate could potentiate hypotensive effects.",
    onset: "Gradual",
    severityLabel: "Moderate — theoretical",
    evidence: "Case reports only",
    mitigation: "Monitor blood pressure after starting MTHFR+. Titrate if needed.",
  },
  {
    id: "r4",
    severity: "green",
    pair: "Lisinopril ↔ NAD+",
    badge: "SAFE",
    mechanism: "No known pharmacokinetic or pharmacodynamic interactions.",
    onset: "N/A",
    severityLabel: "None",
    evidence: "Comprehensive database review",
    mitigation: "No action required.",
  },
  {
    id: "r5",
    severity: "green",
    pair: "Metformin ↔ COMT+",
    badge: "SAFE",
    mechanism: "No overlapping metabolic pathways identified.",
    onset: "N/A",
    severityLabel: "None",
    evidence: "Database review",
    mitigation: "No action required.",
  },
  {
    id: "r6",
    severity: "green",
    pair: "Levothyroxine ↔ COMT+",
    badge: "SAFE",
    mechanism: "COMT+ does not affect thyroid hormone absorption or metabolism.",
    onset: "N/A",
    severityLabel: "None",
    evidence: "Database review",
    mitigation: "No action required.",
  },
];

/* ───────── Styles ───────── */

const severityStyles: Record<Severity, { card: string; badge: string; dot: string }> = {
  red: {
    card: "bg-red-400/10 border border-red-400/30",
    badge: "bg-red-400 text-gray-900",
    dot: "bg-red-400",
  },
  yellow: {
    card: "bg-yellow-400/10 border border-yellow-400/30",
    badge: "bg-yellow-400 text-gray-900",
    dot: "bg-yellow-400",
  },
  green: {
    card: "bg-green-400/10 border border-green-400/30",
    badge: "bg-green-400 text-gray-900",
    dot: "bg-green-400",
  },
};

const severityIcons: Record<Severity, typeof ShieldAlert> = {
  red: ShieldAlert,
  yellow: AlertTriangle,
  green: ShieldCheck,
};

/* ───────── Component ───────── */

export default function InteractionChecker() {
  const [meds, setMeds] = useState<Med[]>(initialMeds);
  const [supps, setSupps] = useState<Supp[]>(initialSupps);
  const [checking, setChecking] = useState(false);
  const [checkStep, setCheckStep] = useState(0);
  const [results, setResults] = useState<Interaction[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["r1"]));
  const [rationales, setRationales] = useState<Record<string, string>>({});

  const handleCheck = () => {
    setChecking(true);
    setCheckStep(0);
    const t1 = setTimeout(() => setCheckStep(1), 800);
    const t2 = setTimeout(() => setCheckStep(2), 1600);
    const t3 = setTimeout(() => {
      setChecking(false);
      setResults(mockResults);
      setExpanded(new Set(mockResults.filter((r) => r.severity === "red").map((r) => r.id)));
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addMed = () =>
    setMeds((p) => [...p, { id: `m${Date.now()}`, name: "", dosage: "" }]);
  const addSupp = () =>
    setSupps((p) => [...p, { id: `s${Date.now()}`, name: "", dosage: "" }]);

  const redCount = results?.filter((r) => r.severity === "red").length ?? 0;
  const yellowCount = results?.filter((r) => r.severity === "yellow").length ?? 0;
  const greenCount = results?.filter((r) => r.severity === "green").length ?? 0;

  const allRedRationales = results
    ?.filter((r) => r.severity === "red")
    .every((r) => (rationales[r.id] || "").trim().length > 0);

  return (
    <div className="space-y-6 pb-24">
      {/* ── Input Section ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medications */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-semibold text-white">
              Current Medications
            </h3>
          </div>
          <div className="space-y-3">
            {meds.map((m) => (
              <div key={m.id} className="flex gap-2">
                <input
                  value={m.name}
                  onChange={(e) =>
                    setMeds((p) =>
                      p.map((x) =>
                        x.id === m.id ? { ...x, name: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Medication name"
                  className="flex-1 bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
                <input
                  value={m.dosage}
                  onChange={(e) =>
                    setMeds((p) =>
                      p.map((x) =>
                        x.id === m.id ? { ...x, dosage: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Dosage"
                  className="w-24 bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
              </div>
            ))}
            <button
              onClick={addMed}
              className="w-full border-2 border-dashed border-gray-700/50 rounded-lg py-2 text-sm text-white/30 hover:text-white/50 hover:border-green-400/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add medication
            </button>
          </div>
        </div>

        {/* Supplements */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-400" />
              <h3 className="text-sm font-semibold text-white">Supplements</h3>
            </div>
            <button className="flex items-center gap-1 text-xs text-green-400 hover:underline">
              <Import className="w-3.5 h-3.5" /> Import from Patient
            </button>
          </div>
          <div className="space-y-3">
            {supps.map((s) => (
              <div key={s.id} className="flex gap-2">
                <input
                  value={s.name}
                  onChange={(e) =>
                    setSupps((p) =>
                      p.map((x) =>
                        x.id === s.id ? { ...x, name: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Supplement name"
                  className="flex-1 bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
                <input
                  value={s.dosage}
                  onChange={(e) =>
                    setSupps((p) =>
                      p.map((x) =>
                        x.id === s.id ? { ...x, dosage: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Dosage"
                  className="w-24 bg-gray-900/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
              </div>
            ))}
            <button
              onClick={addSupp}
              className="w-full border-2 border-dashed border-gray-700/50 rounded-lg py-2 text-sm text-white/30 hover:text-white/50 hover:border-green-400/20 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add supplement
            </button>
          </div>
        </div>
      </div>

      {/* ── Check Button ── */}
      {!results && (
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full bg-green-400 hover:bg-green-500 text-gray-900 font-bold text-lg py-4 rounded-xl shadow-lg shadow-green-400/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-3"
        >
          {checking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking interactions...
              <div className="flex gap-1.5 ml-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      checkStep >= i ? "bg-gray-900" : "bg-gray-900/30"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            "Check Interactions"
          )}
        </button>
      )}

      {/* ── Results ── */}
      {results && (
        <>
          {/* Summary strip */}
          <div className="flex items-center gap-4 bg-gray-800/50 border border-green-400/15 rounded-xl px-5 py-3">
            <span className="text-sm text-white/60">Results:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-sm text-white font-medium">{redCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-sm text-white font-medium">{yellowCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-sm text-white font-medium">{greenCount}</span>
            </div>
          </div>

          {/* Interaction cards */}
          <div className="space-y-3">
            {results.map((r) => {
              const s = severityStyles[r.severity];
              const Icon = severityIcons[r.severity];
              const isOpen = expanded.has(r.id);

              return (
                <div key={r.id} className={`${s.card} rounded-xl overflow-hidden`}>
                  <button
                    onClick={() => toggleExpand(r.id)}
                    className="w-full px-5 py-4 flex items-center gap-3 text-left"
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${s.badge} shrink-0`}
                    >
                      {r.badge}
                    </span>
                    <span className="text-sm font-medium text-white flex-1">
                      {r.pair}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 space-y-3 border-t border-white/5 pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">
                            Mechanism
                          </p>
                          <p className="text-white/70 text-xs">{r.mechanism}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">
                            Onset
                          </p>
                          <p className="text-white/70 text-xs">{r.onset}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">
                            Severity
                          </p>
                          <p className="text-white/70 text-xs">
                            {r.severityLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">
                            Evidence
                          </p>
                          <p className="text-white/70 text-xs flex items-center gap-1">
                            {r.evidence}
                            <ExternalLink className="w-3 h-3 text-green-400" />
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold mb-1">
                          Mitigation Strategy
                        </p>
                        <p className="text-white/70 text-xs">{r.mitigation}</p>
                      </div>

                      {r.severity === "red" && (
                        <div>
                          <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1">
                            Required Rationale
                          </p>
                          <textarea
                            rows={2}
                            value={rationales[r.id] || ""}
                            onChange={(e) =>
                              setRationales((p) => ({
                                ...p,
                                [r.id]: e.target.value,
                              }))
                            }
                            placeholder="Explain clinical rationale for proceeding..."
                            className="w-full bg-gray-900/60 border border-red-400/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-red-400/50 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky bottom */}
          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-800 border-t border-green-400/15 px-5 py-3 flex items-center justify-between z-40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-xs text-white/60">{redCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="text-xs text-white/60">{yellowCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-xs text-white/60">{greenCount}</span>
              </div>
            </div>
            <button
              disabled={!allRedRationales}
              className="bg-green-400 hover:bg-green-500 text-gray-900 font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Acknowledge &amp; Proceed
            </button>
          </div>
        </>
      )}
    </div>
  );
}
