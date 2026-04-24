import Link from 'next/link';
import { ChevronLeft, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import HipaaQuickForm, { type QuickFieldSpec } from '@/components/hipaa-admin/HipaaQuickForm';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  device_id: string;
  event_kind: string;
  event_date: string;
  method: string | null;
  notes: string | null;
  responsible_party: string | null;
  recorded_at: string;
}

const FIELDS: QuickFieldSpec[] = [
  { name: 'deviceId', label: 'Device identifier', type: 'text', required: true,
    placeholder: 'Asset tag, serial number, or internal device ID' },
  { name: 'eventKind', label: 'Event kind', type: 'select', required: true, options: [
    { value: 'received', label: 'Received' },
    { value: 'reissued', label: 'Reissued' },
    { value: 'disposed', label: 'Disposed' },
    { value: 'sanitized', label: 'Sanitized' },
    { value: 'reused', label: 'Reused' },
    { value: 'moved', label: 'Moved' },
    { value: 'lost', label: 'Lost' },
    { value: 'stolen', label: 'Stolen' },
  ]},
  { name: 'eventDate', label: 'Event date', type: 'date', required: true },
  { name: 'method', label: 'Method (optional)', type: 'text',
    placeholder: 'e.g., NIST 800-88 purge, physical shred, factory reset' },
  { name: 'notes', label: 'Notes (optional)', type: 'textarea',
    placeholder: 'Chain of custody details, witness, location' },
];

export default async function DeviceMediaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { data } = await supabase
    .from('hipaa_device_media_events')
    .select('id, device_id, event_kind, event_date, method, notes, responsible_party, recorded_at')
    .order('event_date', { ascending: false })
    .limit(100);
  const rows: Row[] = (data as Row[] | null) ?? [];
  const incidentKinds = new Set(['lost', 'stolen']);
  const incidents = rows.filter((r) => incidentKinds.has(r.event_kind)).length;

  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/[0.08]">
        <Link href="/admin/frameworks/hipaa" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
          HIPAA overview
        </Link>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 border border-[#B75E18]/33 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#B75E18]" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white">Device and media controls</h1>
            <p className="text-xs text-white/40">45 CFR 164.310(d). Required and Addressable. Disposal, reuse, accountability, data backup and storage.</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Record an event</h2>
          <HipaaQuickForm apiPath="/api/hipaa/device-media" fields={FIELDS} submitLabel="Record event" />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Recent events ({rows.length})</h2>
            {incidents > 0 ? (
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border border-red-400/30 bg-red-500/15 text-red-200">
                {incidents} loss or theft
              </span>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-white/50">No device events on file.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <article key={r.id} className="rounded-lg border border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-start gap-2 flex-wrap">
                    <KindBadge kind={r.event_kind} />
                    <span className="text-[11px] text-white/50">{r.event_date}</span>
                    <span className="ml-auto text-[11px] text-white/60 font-mono">{r.device_id}</span>
                  </div>
                  {r.method ? (
                    <div className="mt-2 text-xs text-white/80"><span className="text-white/50">Method:</span> {r.method}</div>
                  ) : null}
                  {r.notes ? (
                    <div className="mt-1 text-xs text-white/80"><span className="text-white/50">Notes:</span> {r.notes}</div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    received: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    reissued: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    disposed: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    sanitized: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
    reused: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    moved: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
    lost: 'bg-red-500/20 border-red-400/40 text-red-200',
    stolen: 'bg-red-500/20 border-red-400/40 text-red-200',
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${map[kind] ?? 'bg-white/[0.05] border-white/[0.12] text-white/70'}`}>
      {kind}
    </span>
  );
}
