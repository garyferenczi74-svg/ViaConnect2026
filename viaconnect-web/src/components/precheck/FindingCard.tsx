"use client";

import { AlertTriangle, Sparkles, Check, X, Flag } from "lucide-react";
import DiffViewer from "./DiffViewer";

const SEV_STYLE: Record<string, string> = {
  P0: "bg-red-500/15 text-red-400",
  P1: "bg-orange-500/15 text-orange-400",
  P2: "bg-amber-500/15 text-amber-300",
  P3: "bg-blue-500/15 text-blue-300",
  ADVISORY: "bg-white/10 text-white/60",
};

export interface FindingCardData {
  findingId: string;
  ruleId: string;
  severity: string;
  confidence: number;
  message: string;
  citation: string;
  remediation: { summary: string };
  proposedRewrite?: string;
  rationale?: string;
  round: number;
}

export interface FindingCardProps {
  finding: FindingCardData;
  originalSpan: string;
  onAccept?: () => void;
  onDismiss?: () => void;
  onDispute?: () => void;
  onRequestRewrite?: () => void;
  remediationPending?: boolean;
}

export default function FindingCard({
  finding,
  originalSpan,
  onAccept,
  onDismiss,
  onDispute,
  onRequestRewrite,
  remediationPending,
}: FindingCardProps) {
  const sev = SEV_STYLE[finding.severity] ?? SEV_STYLE.ADVISORY;
  return (
    <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sev}`}>{finding.severity}</span>
            <span className="text-xs font-mono text-white/60">{finding.ruleId}</span>
            <span className="text-[10px] text-white/40">conf {finding.confidence.toFixed(2)}</span>
            <span className="text-[10px] text-white/30 ml-auto">round {finding.round}</span>
          </div>
          <p className="text-sm text-white mt-1">{finding.message}</p>
          <p className="text-[10px] text-white/40 mt-1">Citation: {finding.citation}</p>
          {finding.remediation.summary && (
            <p className="text-xs text-white/60 mt-2"><b className="text-white">Suggested:</b> {finding.remediation.summary}</p>
          )}
        </div>
      </div>

      {finding.proposedRewrite && (
        <div className="bg-[#0F172A] rounded-lg p-3 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-emerald-300">Marshall-checked rewrite</span>
          </div>
          <DiffViewer original={originalSpan} proposed={finding.proposedRewrite} />
          {finding.rationale && <p className="text-[11px] text-white/50 mt-2">{finding.rationale}</p>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {finding.proposedRewrite && (
          <button
            onClick={onAccept}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> Apply fix
          </button>
        )}
        {!finding.proposedRewrite && onRequestRewrite && (
          <button
            onClick={onRequestRewrite}
            disabled={remediationPending}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#B75E18]/15 text-[#B75E18] hover:bg-[#B75E18]/25 flex items-center gap-1 disabled:opacity-30"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} /> Propose rewrite
          </button>
        )}
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.5} /> Dismiss
        </button>
        <button
          onClick={onDispute}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 flex items-center gap-1"
        >
          <Flag className="w-3.5 h-3.5" strokeWidth={1.5} /> Dispute
        </button>
      </div>
    </div>
  );
}
