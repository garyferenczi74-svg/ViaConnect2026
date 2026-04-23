"use client";

import { ShieldCheck, Gavel, FileWarning, Scale } from "lucide-react";
import type { Finding } from "@/lib/compliance/engine/types";

const SEV_BADGE: Record<Finding["severity"], { bg: string; text: string; label: string }> = {
  P0: { bg: "bg-red-500/15", text: "text-red-400", label: "P0 Critical" },
  P1: { bg: "bg-orange-500/15", text: "text-orange-400", label: "P1 High" },
  P2: { bg: "bg-amber-500/15", text: "text-amber-300", label: "P2 Medium" },
  P3: { bg: "bg-blue-500/15", text: "text-blue-300", label: "P3 Low" },
  ADVISORY: { bg: "bg-white/10", text: "text-white/60", label: "Advisory" },
};

export interface MarshallNoticeProps {
  finding?: Finding;
  title?: string;
  severity?: Finding["severity"];
  message?: string;
  citation?: string;
  remediation?: string;
  compact?: boolean;
}

export default function MarshallNotice(props: MarshallNoticeProps) {
  const severity = props.finding?.severity ?? props.severity ?? "ADVISORY";
  const message = props.finding?.message ?? props.message ?? "Compliance notice from Marshall.";
  const citation = props.finding?.citation ?? props.citation ?? "";
  const remediation = props.finding?.remediation.summary ?? props.remediation ?? "";
  const sev = SEV_BADGE[severity];
  const Icon = severity === "P0" ? FileWarning : severity === "ADVISORY" ? ShieldCheck : Gavel;

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#1E3054] ${props.compact ? "p-3" : "p-4"}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0"
          aria-hidden
        >
          <Icon className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">
              {props.title ?? "Marshall Notice"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sev.bg} ${sev.text}`}>
              {sev.label}
            </span>
          </div>
          <p className="text-xs text-white/60 mt-1">{message}</p>
          {citation && <p className="text-[10px] text-white/40 mt-1">Cite: {citation}</p>}
          {remediation && <p className="text-[10px] text-white/50 mt-1">Remediation: {remediation}</p>}
          <p className="text-[10px] text-white/30 mt-2 flex items-center gap-1">
            <Scale className="w-3 h-3" strokeWidth={1.5} />
            Marshall, Compliance Officer, ViaConnect. Cite. Remediate. Document.
          </p>
        </div>
      </div>
    </div>
  );
}
