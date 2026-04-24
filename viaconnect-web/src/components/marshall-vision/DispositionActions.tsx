'use client';

// Prompt #124 P4: Disposition action bar.
//
// Steve's action row on a determination detail page. Every action routes
// through POST /api/marshall/vision/determinations/[id]/disposition. Steve
// types a confirmation note that accompanies every disposition — required
// for counterfeit confirmation and legal referral, encouraged elsewhere.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  Ban,
  HelpCircle,
  Package,
  Scale,
  Archive,
  Loader2,
} from 'lucide-react';

type Disposition =
  | 'confirmed_counterfeit'
  | 'confirmed_authentic'
  | 'confirmed_unauthorized_channel'
  | 'inconclusive_after_review'
  | 'requires_test_buy'
  | 'referred_to_legal'
  | 'dismissed';

const ACTIONS: Array<{ id: Disposition; label: string; icon: typeof Ban; requireNote: boolean; tone: string }> = [
  { id: 'confirmed_counterfeit',          label: 'Confirm counterfeit',          icon: Ban,          requireNote: true,  tone: 'bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30' },
  { id: 'confirmed_authentic',            label: 'Confirm authentic',            icon: ShieldCheck,  requireNote: false, tone: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30' },
  { id: 'confirmed_unauthorized_channel', label: 'Unauthorized channel',          icon: ShieldAlert,  requireNote: true,  tone: 'bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30' },
  { id: 'inconclusive_after_review',      label: 'Inconclusive',                 icon: HelpCircle,   requireNote: false, tone: 'bg-slate-500/20 border-slate-400/30 text-slate-200 hover:bg-slate-500/30' },
  { id: 'requires_test_buy',              label: 'Requires test buy',            icon: Package,      requireNote: false, tone: 'bg-blue-500/20 border-blue-400/30 text-blue-200 hover:bg-blue-500/30' },
  { id: 'referred_to_legal',              label: 'Refer to legal',               icon: Scale,        requireNote: true,  tone: 'bg-purple-500/20 border-purple-400/30 text-purple-200 hover:bg-purple-500/30' },
  { id: 'dismissed',                      label: 'Dismiss',                      icon: Archive,      requireNote: false, tone: 'bg-white/[0.08] border-white/20 text-white/70 hover:bg-white/[0.12]' },
];

export interface DispositionActionsProps {
  determinationId: string;
  modelVerdict: string;
}

export default function DispositionActions({ determinationId, modelVerdict }: DispositionActionsProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<Disposition | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(id: Disposition, requireNote: boolean) {
    if (requireNote && note.trim().length < 10) {
      setErr('This disposition requires a confirmation note of at least 10 characters.');
      return;
    }
    setErr(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/marshall/vision/determinations/${encodeURIComponent(determinationId)}/disposition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          disposition: id,
          confirmationNote: note.trim() || null,
          disagreedWithModel: disagreesWithModel(id, modelVerdict),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <div className="text-xs font-medium text-white/70 mb-1.5">Confirmation note</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-md bg-white/[0.04] border border-white/[0.12] text-sm text-white placeholder-white/30 px-3 py-2 focus:outline-none focus:border-white/30"
          placeholder="Cite packaging features, reference images compared, and any external evidence. Required for counterfeit confirmation and legal referral."
          disabled={busy !== null}
        />
      </label>
      {err ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 text-red-200 text-xs px-3 py-2">
          {err}
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => submit(a.id, a.requireNote)}
            disabled={busy !== null}
            className={`inline-flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs font-medium transition ${a.tone} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="inline-flex items-center gap-2">
              <a.icon className="w-4 h-4" strokeWidth={1.5} aria-hidden />
              <span>{a.label}</span>
            </span>
            {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
            {a.requireNote ? <span className="text-[10px] opacity-60">note required</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function disagreesWithModel(disposition: Disposition, modelVerdict: string): boolean {
  if (disposition === 'confirmed_counterfeit' && modelVerdict !== 'counterfeit_suspected') return true;
  if (disposition === 'confirmed_authentic' && modelVerdict !== 'authentic') return true;
  if (disposition === 'confirmed_unauthorized_channel' && modelVerdict !== 'unauthorized_channel_suspected') return true;
  return false;
}
