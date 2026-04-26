'use client';

// Prompt #138a Phase 5a: Marshall pre-check result panel.
// Displays the per-rule findings returned by /api/marketing/variants/[id]/precheck.
// P0/P1 are blockers; P2/P3/ADVISORY are warnings.

import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export interface PreCheckFinding {
  ruleId: string;
  severity: string;
  message: string;
  remediation?: { summary?: string };
}

export interface PreCheckResultPanelProps {
  passed: boolean;
  blockerCount: number;
  warnCount: number;
  findings: PreCheckFinding[];
  wordCountOk?: boolean;
}

export function PreCheckResultPanel({
  passed, blockerCount, warnCount, findings, wordCountOk = true,
}: PreCheckResultPanelProps) {
  if (passed && warnCount === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-300 flex-none mt-0.5" strokeWidth={1.5} />
          <div className="text-sm text-emerald-100">
            <p className="font-semibold">Pre-check passed</p>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              No findings. Variant is eligible for Steve approval.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${
        blockerCount > 0
          ? 'border-rose-500/30 bg-rose-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {blockerCount > 0 ? (
          <AlertTriangle className="h-5 w-5 text-rose-300 flex-none mt-0.5" strokeWidth={1.5} />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-300 flex-none mt-0.5" strokeWidth={1.5} />
        )}
        <div className="text-sm flex-1">
          <p className={`font-semibold ${blockerCount > 0 ? 'text-rose-100' : 'text-amber-100'}`}>
            {blockerCount > 0 ? 'Pre-check blocked' : 'Pre-check passed with warnings'}
          </p>
          <p className={`text-xs mt-0.5 ${blockerCount > 0 ? 'text-rose-200/80' : 'text-amber-200/80'}`}>
            {blockerCount} blocker{blockerCount === 1 ? '' : 's'},
            {' '}{warnCount} warning{warnCount === 1 ? '' : 's'}
            {!wordCountOk && '; word-count budget exceeded'}
          </p>
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="space-y-2 pt-1">
          {findings.map((f, i) => (
            <li key={`${f.ruleId}-${i}`} className="rounded-xl bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge severity={f.severity} />
                <span className="text-[11px] font-mono text-white/60 truncate">
                  {f.ruleId}
                </span>
              </div>
              <p className="text-xs text-white/85">{f.message}</p>
              {f.remediation?.summary && (
                <p className="text-[11px] text-white/60 mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 flex-none mt-0.5" strokeWidth={1.5} />
                  {f.remediation.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === 'P0' ? 'bg-rose-500/30 text-rose-100'
    : severity === 'P1' ? 'bg-rose-500/15 text-rose-200'
    : severity === 'P2' ? 'bg-amber-500/15 text-amber-200'
    : severity === 'P3' ? 'bg-amber-500/10 text-amber-300'
    : 'bg-white/10 text-white/70';
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 ${tone}`}>
      {severity}
    </span>
  );
}
