'use client';

// Prompt #106 §6.2 — primary binding swap queue.
//
// Lists non-primary bindings per SKU so the admin can preview side-by-side
// vs. the current primary and flip with a typed confirmation.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Binding {
  binding_id: string;
  sku: string;
  version: number;
  is_primary: boolean;
  archived_at: string | null;
  supplement_photo_inventory: {
    object_path: string;
    sha256_hash: string;
    byte_size: number;
  };
}

interface GroupedBindings {
  sku: string;
  primary: Binding | null;
  candidates: Binding[];
}

function publicUrlFor(bucket: string, objectPath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export default function ImageSwapPage() {
  const [groups, setGroups] = useState<GroupedBindings[]>([]);
  const [target, setTarget] = useState<{ binding: Binding; sku: string } | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = createClient() as unknown as any;
    const { data } = await sb.from('supplement_photo_bindings')
      .select(`
        binding_id, sku, version, is_primary, archived_at,
        supplement_photo_inventory!inner(object_path, sha256_hash, byte_size)
      `)
      .is('archived_at', null)
      .order('sku')
      .order('version', { ascending: false });

    const all = (data as Binding[] | null) ?? [];
    const bySku = new Map<string, GroupedBindings>();
    for (const b of all) {
      if (!bySku.has(b.sku)) bySku.set(b.sku, { sku: b.sku, primary: null, candidates: [] });
      const g = bySku.get(b.sku)!;
      if (b.is_primary) g.primary = b;
      else g.candidates.push(b);
    }
    const needsAttention = Array.from(bySku.values()).filter((g) => g.candidates.length > 0);
    setGroups(needsAttention);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSwap = async () => {
    if (!target) return;
    if (confirm !== 'APPROVE PRIMARY SWAP') { setMessage('Typed confirmation does not match'); return; }
    setBusy(true); setMessage(null);
    const sb = createClient();
    const { data, error } = await (sb as unknown as {
      functions: { invoke: (n: string, o: { body: unknown }) => Promise<{ data: unknown; error: { message: string } | null }> }
    }).functions.invoke('shop_primary_binding_swap', {
      body: { newBindingId: target.binding.binding_id, typedConfirmation: confirm },
    });
    setBusy(false); setConfirm(''); setTarget(null);
    if (error) { setMessage(`Error: ${error.message}`); return; }
    const d = data as { sku?: string };
    setMessage(`Primary swapped for ${d.sku}. Re-run bulk image URL update on reconciliation page.`);
    await load();
  };

  return (
    <div className="min-h-screen bg-[#0B1520] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Link href="/admin/shop" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Shop refresh
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-[#E8803A]" strokeWidth={1.5} />
          Image swap
        </h1>
        <p className="text-xs text-white/60">
          Versioned renders uploaded after an initial primary sit non-primary until you flip them.
          Side-by-side preview; swap requires APPROVE PRIMARY SWAP. Old primary retained, not deleted.
        </p>

        {message && (
          <div className="rounded-lg border border-white/[0.08] bg-[#1A2744]/40 p-3 text-xs text-white/85">{message}</div>
        )}

        {groups.length === 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-[#1A2744]/60 p-5">
            <p className="text-sm text-white/75">No pending swaps.</p>
            <p className="text-xs text-white/55 mt-1">
              Upload a -v{'{N}'} version of an existing bottle render to queue a swap here.
            </p>
          </div>
        )}

        {groups.map((g) => (
          <div key={g.sku} className="rounded-2xl border border-white/[0.08] bg-[#1A2744]/60 p-4 space-y-3">
            <p className="text-sm font-medium text-white/90">{g.sku}</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <p className="text-[10px] text-white/50 mb-2">Current primary</p>
                {g.primary ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrlFor('supplement-photos', g.primary.supplement_photo_inventory.object_path)}
                      alt={g.primary.supplement_photo_inventory.object_path}
                      className="w-full h-48 object-contain bg-white/5 rounded"
                    />
                    <p className="text-[10px] text-white/60 mt-2 font-mono">
                      v{g.primary.version} · {g.primary.supplement_photo_inventory.sha256_hash.slice(0, 12)}…
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-white/55 italic">No current primary</p>
                )}
              </div>

              <div className="space-y-3">
                {g.candidates.map((c) => (
                  <div key={c.binding_id} className="rounded-lg border border-[#E8803A]/30 bg-[#E8803A]/5 p-3">
                    <p className="text-[10px] text-[#E8803A] mb-2">Candidate v{c.version}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicUrlFor('supplement-photos', c.supplement_photo_inventory.object_path)}
                      alt={c.supplement_photo_inventory.object_path}
                      className="w-full h-36 object-contain bg-white/5 rounded"
                    />
                    <p className="text-[10px] text-white/60 mt-2 font-mono">
                      {c.supplement_photo_inventory.sha256_hash.slice(0, 12)}…
                    </p>
                    <button
                      onClick={() => { setTarget({ binding: c, sku: g.sku }); setConfirm(''); }}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100 px-2 py-1 text-[10px] font-medium"
                    >
                      <Check className="h-3 w-3" strokeWidth={1.5} /> Make primary
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {target && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-[#0B1520] border border-white/15 rounded-2xl p-5 max-w-md w-full space-y-3">
              <h2 className="text-sm font-semibold text-white">Swap primary for {target.sku}?</h2>
              <p className="text-xs text-white/65">
                Current primary will be demoted (not deleted). Candidate v{target.binding.version} becomes
                the new primary. Re-run bulk image URL update afterward so product_catalog picks up the new URL.
              </p>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="APPROVE PRIMARY SWAP"
                className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-2 text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={runSwap}
                  disabled={busy || confirm !== 'APPROVE PRIMARY SWAP'}
                  className="rounded-lg bg-violet-500/40 hover:bg-violet-500/60 disabled:opacity-40 text-white px-3 py-1.5 text-xs font-medium"
                >
                  Swap now
                </button>
                <button onClick={() => setTarget(null)} className="rounded-lg bg-white/10 hover:bg-white/20 text-white/85 px-3 py-1.5 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
