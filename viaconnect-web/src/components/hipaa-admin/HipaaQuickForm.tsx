'use client';

// Prompt #127 P4: shared quick-entry form for HIPAA subsections.
// Used by sanctions / contingency / emergency-access / device-media pages
// to avoid duplicating a form per page.

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2, ShieldAlert, Plus } from 'lucide-react';

export interface QuickFieldSpec {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'datetime-local' | 'number' | 'select';
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface HipaaQuickFormProps {
  apiPath: string;
  fields: QuickFieldSpec[];
  submitLabel: string;
}

export default function HipaaQuickForm({ apiPath, fields, submitLabel }: HipaaQuickFormProps) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = fd.get(f.name);
      if (f.type === 'number') {
        const n = Number.parseInt(String(raw ?? ''), 10);
        payload[f.name] = Number.isFinite(n) ? n : null;
      } else {
        payload[f.name] = String(raw ?? '').trim();
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      form.reset();
      router.refresh();
    } catch (submitErr) {
      setErr((submitErr as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="block text-xs font-medium text-white/80 mb-1.5">
            {f.label}{f.required ? ' *' : ''}
          </label>
          {f.type === 'textarea' ? (
            <textarea id={f.name} name={f.name} rows={3} required={f.required} minLength={f.minLength} disabled={submitting}
                      placeholder={f.placeholder} className={inputClasses} />
          ) : f.type === 'select' ? (
            <select id={f.name} name={f.name} required={f.required} disabled={submitting} className={inputClasses}>
              <option value="">Pick one</option>
              {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input id={f.name} name={f.name} type={f.type} required={f.required} minLength={f.minLength} disabled={submitting}
                   placeholder={f.placeholder} className={inputClasses} />
          )}
        </div>
      ))}
      {err ? (
        <div className="flex items-start gap-2 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
          <span>{err}</span>
        </div>
      ) : null}
      <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#B75E18] hover:bg-[#C96D1E] disabled:opacity-50 transition px-4 py-2 text-sm font-medium text-white">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} aria-hidden /> : <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden />}
        {submitting ? 'Recording' : submitLabel}
      </button>
    </form>
  );
}

const inputClasses = 'w-full rounded-md bg-white/[0.04] border border-white/[0.14] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30';
