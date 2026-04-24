// Prompt #124 P4: Reasoning-trace renderer.
//
// Shows the ordered feature observations from a determination. Each row
// names the feature, the cited reference image, the observation, the match
// outcome, and the model note. This is the "show your work" panel Steve
// uses to confirm or dismiss a determination.

import { CheckCircle, XCircle, AlertTriangle, Circle } from 'lucide-react';

export interface ReasoningTraceEntry {
  feature: string;
  reference_image?: string;
  observation: string;
  match: string;
  note: string;
}

export interface ReasoningTraceProps {
  entries: readonly ReasoningTraceEntry[];
}

export default function ReasoningTrace({ entries }: ReasoningTraceProps) {
  if (entries.length === 0) {
    return (
      <div className="text-xs text-white/40 italic py-4">
        No feature observations recorded.
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {entries.map((e, i) => (
        <li key={`${e.feature}-${i}`} className="rounded-md border border-white/[0.08] bg-white/[0.02] p-2.5">
          <div className="flex items-start gap-2">
            <MatchIcon match={e.match} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-medium text-white font-mono">{e.feature}</span>
                <span className="text-[10px] text-white/50">
                  {e.observation}; {e.match}
                </span>
              </div>
              {e.reference_image ? (
                <div className="text-[10px] text-white/40 font-mono truncate mt-0.5">
                  ref: {e.reference_image}
                </div>
              ) : null}
              {e.note ? (
                <div className="text-xs text-white/70 mt-1">{e.note}</div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function MatchIcon({ match }: { match: string }) {
  if (match === 'geometry_match' || match === 'format_match' || match === 'color_match') {
    return <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" strokeWidth={1.5} aria-label="match" />;
  }
  if (match === 'mismatch' || match === 'format_mismatch' || match === 'color_mismatch') {
    return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" strokeWidth={1.5} aria-label="mismatch" />;
  }
  if (match === 'unknown') {
    return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" strokeWidth={1.5} aria-label="unknown" />;
  }
  return <Circle className="w-4 h-4 text-white/40 flex-shrink-0" strokeWidth={1.5} aria-hidden />;
}
