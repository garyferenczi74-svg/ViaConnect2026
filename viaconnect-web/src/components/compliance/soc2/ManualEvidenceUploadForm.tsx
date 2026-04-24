'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Upload, Loader2, ShieldAlert } from 'lucide-react';

export default function ManualEvidenceUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setFile(e.target.files?.[0] ?? null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setErr('Pick a file to upload.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.delete('file');
    fd.append('file', file);
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/soc2/manual-evidence', { method: 'POST', body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      router.push(`/admin/compliance/soc2/manual-evidence/${body.rowId}`);
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" encType="multipart/form-data">
      <Field label="Title" htmlFor="title" required>
        <input
          id="title" name="title" type="text" required maxLength={200} disabled={submitting}
          className={inputClasses}
          placeholder="Onboarding security training, Q1 2026"
        />
      </Field>
      <Field label="Controls (comma separated TSC codes, e.g. CC1.4, CC1.5)" htmlFor="controls" required>
        <input
          id="controls" name="controls" type="text" required maxLength={200} disabled={submitting}
          className={inputClasses}
          placeholder="CC1.4, CC1.5"
        />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Valid from (optional)" htmlFor="validFrom">
          <input id="validFrom" name="validFrom" type="date" disabled={submitting} className={inputClasses} />
        </Field>
        <Field label="Valid until (optional)" htmlFor="validUntil">
          <input id="validUntil" name="validUntil" type="date" disabled={submitting} className={inputClasses} />
        </Field>
      </div>
      <Field label="Source description" htmlFor="sourceDescription" required>
        <textarea
          id="sourceDescription" name="sourceDescription" rows={3} required maxLength={2000} disabled={submitting}
          className={inputClasses}
          placeholder="Who produced this document; where it came from; why it supports the cited controls."
        />
      </Field>
      <Field label="File" htmlFor="file" required>
        <label htmlFor="file" className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition px-4 py-6 text-sm cursor-pointer">
          <Upload className="w-5 h-5 text-white/60" strokeWidth={1.5} aria-hidden />
          <span className="text-white/80">{file ? file.name : 'Pick a file'}</span>
          <span className="text-xs text-white/40">PDF, DOCX, PNG, JPG, CSV, JSON, TXT, Markdown, XLSX, PPTX. Up to 100 MB.</span>
          <input id="file" name="file" type="file" onChange={onPick} disabled={submitting} className="sr-only"
                 accept="application/pdf,image/jpeg,image/png,image/webp,text/csv,text/plain,text/markdown,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" />
        </label>
      </Field>
      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 disabled:cursor-not-allowed transition px-4 py-2 text-sm font-medium text-white"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {submitting ? 'Uploading' : 'Upload evidence'}
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
