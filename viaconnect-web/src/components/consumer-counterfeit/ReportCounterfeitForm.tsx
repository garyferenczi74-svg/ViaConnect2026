'use client';

// Prompt #124 P5: Consumer intake form.
//
// Honeypot field `honeypot` is visually hidden but present in the form;
// basic bots that blindly fill every input trip it and the server returns
// a fake success without inserting a row.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Upload, ShieldAlert, Loader2 } from 'lucide-react';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function ReportCounterfeitForm() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const next = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES);
    for (const f of next) {
      if (f.size > MAX_IMAGE_BYTES) {
        setErr(`${f.name} is larger than 10 MB. Please pick a smaller file.`);
        return;
      }
    }
    setFiles(next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!privacyAccepted) {
      setErr('Please acknowledge the privacy notice before submitting.');
      return;
    }
    if (files.length === 0) {
      setErr('Please add at least one photo of the suspect product.');
      return;
    }
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    fd.delete('images');
    for (const f of files) fd.append('images', f);

    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/marshall/vision/consumer-reports', {
        method: 'POST',
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      router.push(`/report-counterfeit/confirmation/${encodeURIComponent(body.reportId)}`);
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" encType="multipart/form-data">
      {/* Honeypot: visually hidden; screen readers can skip via aria. */}
      <div className="hidden" aria-hidden>
        <label>
          Do not fill this field
          <input type="text" name="honeypot" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field label="What concerns you about the product?" required htmlFor="concernDescription">
        <textarea
          id="concernDescription"
          name="concernDescription"
          rows={5}
          minLength={20}
          maxLength={2000}
          required
          disabled={submitting}
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          placeholder="Describe anything that looks different from the product you expected. For example: bottle shape, cap, label text, batch number, seller."
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Where did you buy it?" htmlFor="purchaseLocation">
          <input
            id="purchaseLocation"
            name="purchaseLocation"
            type="text"
            maxLength={200}
            disabled={submitting}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
            placeholder="Retailer, website, or location"
          />
        </Field>
        <Field label="When did you buy it?" htmlFor="purchaseDate">
          <input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            disabled={submitting}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Order number (optional)" htmlFor="orderNumber">
          <input
            id="orderNumber"
            name="orderNumber"
            type="text"
            maxLength={100}
            disabled={submitting}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label="Email for follow up (optional)" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            maxLength={254}
            disabled={submitting}
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>

      <Field label={`Photos of the product (1 to ${MAX_IMAGES})`} required htmlFor="images">
        <label
          htmlFor="images"
          className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition px-4 py-6 text-sm cursor-pointer"
        >
          <Upload className="w-5 h-5 text-white/60" strokeWidth={1.5} aria-hidden />
          <span className="text-white/80">Pick 1 to {MAX_IMAGES} photos</span>
          <span className="text-xs text-white/40">JPEG, PNG, WebP, or HEIC. Up to 10 MB each.</span>
          <input
            id="images"
            name="images"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
            multiple
            onChange={onPick}
            disabled={submitting}
            className="sr-only"
          />
        </label>
        {files.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-white/70">
            {files.map((f) => (
              <li key={f.name} className="font-mono truncate">{f.name} · {(f.size / 1024).toFixed(0)} KB</li>
            ))}
          </ul>
        ) : null}
      </Field>

      <label className="flex items-start gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={privacyAccepted}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
          disabled={submitting}
          className="mt-0.5 w-3.5 h-3.5"
        />
        <span>
          I have read the privacy notice above and consent to FarmCeutica reviewing my submission and retaining my photos for the period described.
        </span>
      </label>

      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 w-full md:w-auto rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition px-5 py-2.5 text-sm font-medium text-black"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
        {submitting ? 'Sending, please wait' : 'Submit report'}
      </button>
    </form>
  );
}

function Field({
  label, htmlFor, required, children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-white/80 mb-1.5">
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}
