"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";

const JURISDICTIONS = [
  { value: "ccpa", label: "California (CCPA/CPRA)" },
  { value: "gdpr", label: "EU / UK (GDPR)" },
  { value: "quebec", label: "Quebec (Law 25)" },
  { value: "colorado", label: "Colorado (CPA)" },
  { value: "connecticut", label: "Connecticut (CTDPA)" },
  { value: "virginia", label: "Virginia (VCDPA)" },
  { value: "utah", label: "Utah (UCPA)" },
  { value: "iowa", label: "Iowa (ICDPA)" },
  { value: "texas", label: "Texas (TDPSA)" },
  { value: "other", label: "Other" },
];

const REQUEST_TYPES = [
  { value: "access", label: "Access my data" },
  { value: "delete", label: "Delete my data" },
  { value: "port", label: "Port my data (JSON + CSV)" },
  { value: "correct", label: "Correct my data" },
  { value: "opt_out", label: "Opt out of sale/sharing" },
];

export default function DsarPage() {
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState("access");
  const [jurisdiction, setJurisdiction] = useState("ccpa");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) { setError("Email required"); return; }
    setError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/marshall/dsar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), requestType, jurisdiction, notes: notes.trim() }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1A2744] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1E3054] rounded-xl border border-white/[0.08] p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-white">Request received</h1>
          <p className="text-sm text-white/60 mt-2">
            Marshall has logged your request. We will respond within the SLA for your jurisdiction
            (45 days CCPA, 30 days GDPR). You will receive confirmation at the email you provided.
          </p>
          <Link href="/trust-compliance" className="text-xs text-[#B75E18] mt-4 inline-block hover:underline">Back to Trust and Compliance</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="max-w-md mx-auto px-4 md:px-8 py-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#B75E18]" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Privacy request</h1>
            <p className="text-sm text-white/50">Submit your DSAR.</p>
          </div>
        </div>

        <div className="bg-[#1E3054] rounded-xl border border-white/[0.08] p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-white/60">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Request type</span>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none"
            >
              {REQUEST_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Jurisdiction</span>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none"
            >
              {JURISDICTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full bg-[#0F172A] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none focus:border-white/20"
              placeholder="Any detail that helps us verify your identity or scope the request."
            />
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full px-4 py-2 rounded-lg bg-[#B75E18]/20 text-[#B75E18] text-sm font-medium hover:bg-[#B75E18]/30 transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />}
            Submit request
          </button>
        </div>

        <p className="text-[11px] text-white/30 mt-4">
          Marshall, Compliance Officer, ViaConnect. Cite. Remediate. Document.
        </p>
      </div>
    </div>
  );
}
