"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileWarning, Loader2 } from "lucide-react";

const CLAIM_TYPES = [
  { value: "dispute_attribution", label: "This is not my account / not my content" },
  { value: "dispute_interpretation", label: "I disagree with the rule interpretation" },
  { value: "already_remediated", label: "I have already remediated this" },
  { value: "other", label: "Other reason" },
];

export default function AppealPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [claimType, setClaimType] = useState("dispute_interpretation");
  const [rebuttal, setRebuttal] = useState("");
  const [supportingLinks, setSupportingLinks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!rebuttal.trim()) { setError("Please explain your appeal"); return; }
    if (rebuttal.length > 2000) { setError("Keep the rebuttal under 2,000 characters"); return; }
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch(`/api/practitioner/compliance/notices/${params.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimType,
          rebuttal: rebuttal.trim(),
          supportingLinks: supportingLinks
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      router.push(`/practitioner/compliance/notices/${params.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2744] px-4 md:px-8 py-6">
      <Link href={`/practitioner/compliance/notices/${params.id}`} className="text-white/50 hover:text-white flex items-center gap-1 text-xs mb-4">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
      </Link>
      <div className="flex items-center gap-2 mb-4">
        <FileWarning className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} />
        <h1 className="text-lg md:text-xl font-bold text-white">Submit an appeal</h1>
      </div>
      <p className="text-xs text-white/50 mb-4">
        Your appeal pauses the remediation clock while Steve Rica reviews. You will receive a response
        in the portal and via email.
      </p>
      <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 space-y-3">
        <label className="block">
          <span className="text-xs text-white/60">Claim type</span>
          <select value={claimType} onChange={(e) => setClaimType(e.target.value)} className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none">
            {CLAIM_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Rebuttal (up to 2,000 characters)</span>
          <textarea value={rebuttal} onChange={(e) => setRebuttal(e.target.value)} rows={6} className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 resize-none" placeholder="Explain why you believe the finding is incorrect, or what you have already done to remediate." />
          <span className="text-[10px] text-white/40 mt-1 block">{rebuttal.length} / 2000</span>
        </label>
        <label className="block">
          <span className="text-xs text-white/60">Supporting links (one per line)</span>
          <textarea value={supportingLinks} onChange={(e) => setSupportingLinks(e.target.value)} rows={3} className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 resize-none" placeholder="https://..." />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-end">
          <button onClick={submit} disabled={submitting || !rebuttal.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#B75E18]/20 text-[#B75E18] hover:bg-[#B75E18]/30 disabled:opacity-30 flex items-center gap-2">
            {submitting && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />} Submit appeal
          </button>
        </div>
      </div>
    </div>
  );
}
