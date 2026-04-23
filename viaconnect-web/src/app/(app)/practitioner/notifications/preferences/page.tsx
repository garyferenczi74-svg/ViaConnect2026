// Prompt #112 — Practitioner preferences grid (read-only view; edits via API).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface RegistryRow { event_code: string; display_name: string; default_priority: string; legal_ops_scope: boolean; default_enabled: boolean; source_prompt: string | null }
interface PrefRow { event_code: string; sms_enabled: boolean; slack_enabled: boolean; push_enabled: boolean; email_enabled: boolean; in_app_enabled: boolean; priority_override: string | null }

export default async function Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: registry } = await supabase.from("notification_event_registry")
    .select("event_code, display_name, default_priority, legal_ops_scope, default_enabled, source_prompt")
    .eq("default_enabled", true).eq("legal_ops_scope", false)
    .order("source_prompt").order("event_code");
  const { data: prefs } = await supabase.from("notification_preferences")
    .select("event_code, sms_enabled, slack_enabled, push_enabled, email_enabled, in_app_enabled, priority_override")
    .eq("practitioner_id", user.id);

  const byEvent = new Map<string, PrefRow>();
  for (const p of (prefs ?? []) as PrefRow[]) byEvent.set(p.event_code, p);

  const rows = (registry ?? []) as RegistryRow[];

  const cell = (on: boolean | undefined) => on === true
    ? <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-200">on</span>
    : <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">off</span>;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Preferences by event</h2>
          <p className="text-sm text-slate-400">In-app notifications are always on; external channels require setup.</p>
        </div>
        <div className="text-xs text-slate-500">{rows.length} events</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">SMS</th>
              <th className="px-3 py-2">Slack</th>
              <th className="px-3 py-2">Push</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">In-app</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => {
              const p = byEvent.get(r.event_code);
              const pri = p?.priority_override ?? r.default_priority;
              return (
                <tr key={r.event_code}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-100">{r.display_name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{r.event_code}</div>
                  </td>
                  <td className="px-3 py-2 capitalize">{pri}</td>
                  <td className="px-3 py-2">{cell(p?.sms_enabled)}</td>
                  <td className="px-3 py-2">{cell(p?.slack_enabled)}</td>
                  <td className="px-3 py-2">{cell(p?.push_enabled)}</td>
                  <td className="px-3 py-2">{cell(p?.email_enabled)}</td>
                  <td className="px-3 py-2">{cell(p?.in_app_enabled ?? true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
