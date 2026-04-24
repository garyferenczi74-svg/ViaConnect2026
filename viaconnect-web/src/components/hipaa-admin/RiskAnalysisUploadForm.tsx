'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Upload, Loader2, ShieldAlert } from 'lucide-react';

export default function RiskAnalysisUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!file) { setErr('Pick a PDF'); return; }
    const fd = new FormData(e.currentTarget);
    fd.delete('file');
    fd.append('file', file);
    setSubmitting(true);
    try {
      const res = await fetch('/api/hipaa/risk-analysis', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
      (e.currentTarget as HTMLFormElement).reset();
      setFile(null);
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Version (integer)" htmlFor="version" required>
          <input id="version" name="version" type="number" min="1" required disabled={submitting} className={inputClasses} />
        </Field>
        <Field label="Valid from" htmlFor="validFrom" required>
          <input id="validFrom" name="validFrom" type="date" required disabled={submitting} className={inputClasses} />
        </Field>
        <Field label="Valid until (optional)" htmlFor="validUntil">
          <input id="validUntil" name="validUntil" type="date" disabled={submitting} className={inputClasses} />
        </Field>
      </div>
      <Field label="Scope summary" htmlFor="scopeSummary" required>
        <textarea id="scopeSummary" name="scopeSummary" rows={2} required minLength={20} disabled={submitting} className={inputClasses}
                  placeholder="Covered entities, data categories, systems in scope" />
      </Field>
      <Field label="Methodology summary" htmlFor="methodologySummary" required>
        <textarea id="methodologySummary" name="methodologySummary" rows={2} required minLength={20} disabled={submitting} className={inputClasses}
                  placeholder="Framework used, assessors, quantitative vs. qualitative" />
      </Field>
      <Field label="PDF file" htmlFor="file" required>
        <label htmlFor="file" className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition px-4 py-6 text-sm cursor-pointer">
          <Upload className="w-5 h-5 text-white/60" strokeWidth={1.5} aria-hidden />
          <span className="text-white/80">{file ? file.name : 'Pick a PDF (up to 100 MB)'}</span>
          <input id="file" name="file" type="file" accept="application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                 disabled={submitting} className="sr-only" />
        </label>
      </Field>
      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}
      <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {submitting ? 'Uploading' : 'Upload Risk Analysis'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';

function Field({ label, htmlFor, required, children }: { label: string; htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/80 mb-1.5">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}
