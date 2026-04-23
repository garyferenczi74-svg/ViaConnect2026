"use client";

import { useState } from "react";
import { Radar, ShieldCheck } from "lucide-react";
import DraftInputPane from "./DraftInputPane";
import FindingCard, { type FindingCardData } from "./FindingCard";
import ReceiptCard from "./ReceiptCard";
import SessionStatusPill from "./SessionStatusPill";

interface ScanResponse {
  sessionId: string;
  publicSessionId: string;
  status: string;
  findings: Array<FindingCardData & { excerpt: string; remediation: { summary: string } }>;
  worstSeverity: string | null;
  cleared: boolean;
  receipt?: { receiptId: string; issuedAt: string; expiresAt: string; signingKeyId: string; draftHashSha256: string };
  summary: { p0: number; p1: number; p2: number; p3: number; advisory: number };
}

export default function PrecheckWorkspace() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastText, setLastText] = useState("");

  const scan = async (text: string, platform: string) => {
    setError(null);
    setScanning(true);
    setLastText(text);
    try {
      const r = await fetch("/api/marshall/precheck/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetPlatform: platform, source: "portal" }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ScanResponse;
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const requestRewrite = async (finding: FindingCardData) => {
    if (!result) return;
    const updated = result.findings.map((f) => (f.findingId === finding.findingId ? { ...f } : f));
    try {
      const r = await fetch("/api/marshall/precheck/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, fullDraft: lastText }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { rewrite?: string; rationale?: string; clean: boolean };
      if (data.rewrite) {
        for (const f of updated) {
          if (f.findingId === finding.findingId) {
            f.proposedRewrite = data.rewrite;
            f.rationale = data.rationale;
          }
        }
      }
      setResult({ ...result, findings: updated });
    } catch {
      // best-effort; leave finding unremediated visually
    }
  };

  const applyFix = (finding: FindingCardData) => {
    if (!result || !finding.proposedRewrite) return;
    setLastText((prev) => prev.replace(result.findings.find((f) => f.findingId === finding.findingId)?.excerpt ?? "", finding.proposedRewrite ?? ""));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radar className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Draft</h2>
        </div>
        <DraftInputPane onScan={scan} scanning={scanning} defaultText={lastText} />
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </section>

      <section className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-white">Marshall findings</h2>
          {result && <SessionStatusPill status={result.status} />}
        </div>

        {!result && <p className="text-xs text-white/40">Paste a draft on the left and click Scan. Clean drafts receive a signed clearance receipt.</p>}

        {result && result.findings.length === 0 && (
          <p className="text-xs text-emerald-300">Clean. No findings. Receipt attached below.</p>
        )}

        {result && result.findings.map((f) => (
          <FindingCard
            key={f.findingId}
            finding={f}
            originalSpan={f.excerpt}
            onAccept={() => applyFix(f)}
            onDismiss={() => {
              if (!result) return;
              setResult({ ...result, findings: result.findings.filter((x) => x.findingId !== f.findingId) });
            }}
            onDispute={() => {
              /* stub: hit dispute endpoint in a follow-up UI */
            }}
            onRequestRewrite={() => requestRewrite(f)}
          />
        ))}

        {result?.receipt && (
          <ReceiptCard
            receiptId={result.receipt.receiptId}
            issuedAt={result.receipt.issuedAt}
            expiresAt={result.receipt.expiresAt}
            draftHashSha256={result.receipt.draftHashSha256}
            signingKeyId={result.receipt.signingKeyId}
          />
        )}
      </section>
    </div>
  );
}
