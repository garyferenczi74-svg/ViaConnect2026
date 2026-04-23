// Prompt #112 — PHI redaction failure queue (admin).

import { createClient } from "@/lib/supabase/server";

interface Row {
  failure_id: string;
  occurred_at: string;
  event_code: string;
  channel: string;
  body_attempted: string;
  violations_json: Array<{ rule: string; match: string }>;
  resolved_at: string | null;
}

export default async function Page() {
  const sb = createClient();
  const { data } = await sb.from("notification_phi_redaction_failures")
    .select("failure_id, occurred_at, event_code, channel, body_attempted, violations_json, resolved_at")
    .order("occurred_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as Row[];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">PHI redaction failures</h2>
        <p className="text-sm text-slate-400">Every row here is a notification that was NOT delivered. Investigate root cause (template bug, emitter leak). Resolution is admin-only.</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">No PHI redaction failures recorded. System is clean.</div>
        )}
        {rows.map((r) => (
          <div key={r.failure_id} className={`rounded-xl border p-4 ${r.resolved_at ? "border-slate-800 bg-slate-950/40" : "border-rose-800 bg-rose-950/40"}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-slate-300">{r.event_code}</span>
                <span className="ml-2 text-xs text-slate-500">channel: {r.channel}</span>
              </div>
              <div className="text-xs text-slate-500">{new Date(r.occurred_at).toLocaleString()}</div>
            </div>
            <div className="mt-2 text-xs">
              <span className="font-medium text-slate-300">Violations:</span>{" "}
              {r.violations_json.map((v, i) => (
                <span key={i} className="mr-2 rounded bg-rose-900/50 px-1.5 py-0.5 text-rose-200">
                  {v.rule}: {v.match}
                </span>
              ))}
            </div>
            <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[11px] text-slate-300">{r.body_attempted}</pre>
          </div>
        ))}
      </div>
    </section>
  );
}
