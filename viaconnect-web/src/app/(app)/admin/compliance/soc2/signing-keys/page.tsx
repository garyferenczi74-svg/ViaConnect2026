import Link from 'next/link';
import { ChevronLeft, Key, CheckCircle2, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface KeyRow {
  id: string;
  alg: string;
  public_key_pem: string;
  private_key_ref: string;
  active: boolean;
  rotation_of: string | null;
  created_at: string;
  retired_at: string | null;
}

export default async function SigningKeysPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('soc2_signing_keys')
    .select('id, alg, public_key_pem, private_key_ref, active, rotation_of, created_at, retired_at')
    .order('created_at', { ascending: false });
  const rows: KeyRow[] = (data as KeyRow[] | null) ?? [];

  const activeKey = rows.find((r) => r.active);

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/compliance/soc2" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          SOC 2 overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Signing keys</h1>
            <p className="text-xs text-white/40">ES256 key ledger. Public keys published at /.well-known/soc2-packet-jwks.json. Private keys live in Vault.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 space-y-4">
        {activeKey ? (
          <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} aria-hidden />
              <span className="text-sm font-semibold">Active key</span>
              <span className="ml-auto font-mono text-xs">{activeKey.id}</span>
            </div>
            <div className="text-xs text-emerald-100/80 space-y-1">
              <div>Algorithm: <span className="font-mono text-white">{activeKey.alg}</span></div>
              <div>Created: <span className="text-white">{activeKey.created_at.slice(0, 10)}</span></div>
              <div>Private key ref: {activeKey.private_key_ref ? <span className="font-mono text-white">{activeKey.private_key_ref}</span> : <span className="text-amber-300">bootstrapped, not yet mirrored to Vault</span>}</div>
            </div>
          </section>
        ) : (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">
            No active signing key. A new ES256 keypair is generated automatically on the next packet run.
          </div>
        )}

        {rows.filter((r) => !r.active).length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-white mb-2">Retired keys</h2>
            <div className="space-y-2">
              {rows.filter((r) => !r.active).map((r) => (
                <div key={r.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <Archive className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
                    <span className="font-mono text-sm text-white">{r.id}</span>
                    <span className="ml-auto text-[11px] text-white/40">retired {r.retired_at?.slice(0, 10) ?? 'n/a'}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/60">
                    Created {r.created_at.slice(0, 10)}
                    {r.rotation_of ? <> · rotation of <span className="font-mono">{r.rotation_of}</span></> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
