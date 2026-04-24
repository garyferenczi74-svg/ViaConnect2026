'use client';

// Prompt #127 P6: ISO 27001 ISMS scope upload form.
// Mirrors the HIPAA RiskAnalysisUploadForm pattern: multipart POST with
// PDF + scope description + included boundaries + exclusions. Version is
// auto-bumped server-side.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Upload, Loader2, ShieldAlert } from 'lucide-react';

export default function IsmsScopeUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (!file) { setErr('Pick a PDF'); return; }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.delete('file');
    fd.append('file', file);

    // Convert newline-separated boundaries/exclusions textareas to JSON arrays.
    const toArr = (raw: string) =>
      raw.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
    fd.set('includedBoundaries', JSON.stringify(toArr(String(fd.get('includedBoundariesRaw') ?? ''))));
    fd.set('exclusions', JSON.stringify(toArr(String(fd.get('exclusionsRaw') ?? ''))));
    fd.delete('includedBoundariesRaw');
    fd.delete('exclusionsRaw');

    setSubmitting(true);
    try {
      const res = await fetch('/api/iso/isms-scope', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      form.reset();
      setFile(null);
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" encType="multipart/form-data">
      <div>
        <label htmlFor="scopeDescription" className="block text-xs font-medium text-white/80 mb-1.5">Scope description *</label>
        <textarea id="scopeDescription" name="scopeDescription" rows={3} required minLength={50} disabled={submitting}
                  placeholder="Boundaries of the ISMS, products and services in scope, physical and organizational units covered"
                  className={inputClasses} />
      </div>

      <div>
        <label htmlFor="includedBoundariesRaw" className="block text-xs font-medium text-white/80 mb-1.5">Included boundaries (one per line)</label>
        <textarea id="includedBoundariesRaw" name="includedBoundariesRaw" rows={3} disabled={submitting}
                  placeholder={'Production Supabase project\nVercel deployments\nGitHub org'}
                  className={inputClasses} />
      </div>

      <div>
        <label htmlFor="exclusionsRaw" className="block text-xs font-medium text-white/80 mb-1.5">Exclusions (one per line)</label>
        <textarea id="exclusionsRaw" name="exclusionsRaw" rows={2} disabled={submitting}
                  placeholder={'Corporate laptop fleet\nNon-production training environment'}
                  className={inputClasses} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="effectiveFrom" className="block text-xs font-medium text-white/80 mb-1.5">Effective from *</label>
          <input id="effectiveFrom" name="effectiveFrom" type="date" required disabled={submitting} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="effectiveUntil" className="block text-xs font-medium text-white/80 mb-1.5">Effective until (optional)</label>
          <input id="effectiveUntil" name="effectiveUntil" type="date" disabled={submitting} className={inputClasses} />
        </div>
      </div>

      <div>
        <label htmlFor="file" className="block text-xs font-medium text-white/80 mb-1.5">PDF file *</label>
        <label htmlFor="file" className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition px-4 py-6 text-sm cursor-pointer">
          <Upload className="w-5 h-5 text-white/60" strokeWidth={1.5} aria-hidden />
          <span className="text-white/80">{file ? file.name : 'Pick a PDF (up to 100 MB)'}</span>
          <input id="file" name="file" type="file" accept="application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                 disabled={submitting} className="sr-only" />
        </label>
      </div>

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}

      <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {submitting ? 'Uploading' : 'Upload ISMS Scope'}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
