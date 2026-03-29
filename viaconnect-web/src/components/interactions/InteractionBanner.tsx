"use client";

import { useState } from "react";
import { ShieldAlert, Phone, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

interface Interaction {
  id?: string;
  medication: string;
  interactsWith: string;
  severity: "major" | "moderate" | "minor" | "synergistic";
  mechanism: string;
  clinicalEffect?: string;
  mitigation?: string;
  evidenceLevel?: string;
}

interface InteractionBannerProps {
  interactions: Interaction[];
  onFindPractitioner?: () => void;
}

const SEVERITY_STYLES = {
  major: { bg: "bg-red-500/10", border: "border-red-500/20", badge: "bg-red-500/20 text-red-400", text: "text-red-400" },
  moderate: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", badge: "bg-yellow-500/20 text-yellow-400", text: "text-yellow-400" },
  minor: { bg: "bg-green-500/10", border: "border-green-500/20", badge: "bg-green-500/20 text-green-400", text: "text-green-400" },
  synergistic: { bg: "bg-blue-500/10", border: "border-blue-500/20", badge: "bg-blue-500/20 text-blue-400", text: "text-blue-400" },
};

export function InteractionBanner({ interactions, onFindPractitioner }: InteractionBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const major = interactions.filter((i) => i.severity === "major");
  const moderate = interactions.filter((i) => i.severity === "moderate");
  const significant = [...major, ...moderate];
  const synergistic = interactions.filter((i) => i.severity === "synergistic");

  if (significant.length === 0 && synergistic.length === 0) return null;

  if (significant.length === 0 && synergistic.length > 0) {
    return (
      <div className="rounded-xl border border-blue-400/15 bg-blue-400/5 p-4 mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-400 font-medium">{synergistic.length} Beneficial Combination{synergistic.length > 1 ? "s" : ""} Found</p>
            <p className="text-xs text-white/40 mt-0.5">Some of your medications and supplements work well together.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-l-red-400 bg-red-400/5 border border-red-400/15 p-5 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-400 mb-1">Medication Interaction{significant.length > 1 ? "s" : ""} Detected</h3>
          <p className="text-sm text-white/70 mb-3">
            We found {significant.length} potential interaction{significant.length > 1 ? "s" : ""} between your medications and supplements. Please consult a practitioner before making changes.
          </p>

          {/* Summary badges */}
          <div className="flex gap-2 mb-4">
            {major.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-semibold">{major.length} Major</span>}
            {moderate.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold">{moderate.length} Moderate</span>}
          </div>

          {/* Interaction cards (show first 2, expand for more) */}
          <div className="space-y-2 mb-4">
            {(expanded ? significant : significant.slice(0, 2)).map((interaction, i) => {
              const styles = SEVERITY_STYLES[interaction.severity];
              return (
                <div key={i} className={`rounded-lg p-3 ${styles.bg} border ${styles.border}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${styles.badge}`}>{interaction.severity}</span>
                    <span className="text-sm text-white/80">{interaction.medication} + {interaction.interactsWith}</span>
                  </div>
                  <p className="text-xs text-white/50">{interaction.mechanism}</p>
                  {interaction.mitigation && <p className="text-xs text-white/40 mt-1">Mitigation: {interaction.mitigation}</p>}
                </div>
              );
            })}
          </div>

          {significant.length > 2 && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 mb-4">
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show {significant.length - 2} more</>}
            </button>
          )}

          {/* Synergistic note */}
          {synergistic.length > 0 && (
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-blue-400/5 border border-blue-400/10">
              <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-400/80">{synergistic.length} beneficial combination{synergistic.length > 1 ? "s" : ""} also found</p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onFindPractitioner}
              className="px-4 py-2 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/15 transition-all flex items-center gap-2">
              <Phone className="w-4 h-4" /> Find a Practitioner
            </button>
            <button type="button" onClick={() => setExpanded(!expanded)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm hover:border-white/20 transition-all">
              {expanded ? "Collapse" : "View Full Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InteractionSummaryBadges({ summary }: { summary: { major: number; moderate: number; minor: number; synergistic: number } }) {
  if (summary.major + summary.moderate + summary.minor + summary.synergistic === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {summary.major > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-medium">{summary.major} Major</span>}
      {summary.moderate > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-medium">{summary.moderate} Moderate</span>}
      {summary.minor > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-medium">{summary.minor} Minor</span>}
      {summary.synergistic > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-medium">{summary.synergistic} Synergistic</span>}
    </div>
  );
}
