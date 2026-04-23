// Prompt #112 — Quiet hours viewer.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Page() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("notification_quiet_hours")
    .select("day_of_week, start_local_time, end_local_time, timezone, active")
    .eq("practitioner_id", user.id).order("day_of_week");
  const rows = (data ?? []) as Array<{ day_of_week: number; start_local_time: string; end_local_time: string; timezone: string; active: boolean }>;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Quiet hours</h2>
        <p className="text-sm text-slate-400">Only urgent-priority events dispatch during quiet hours; others batch to a digest at end-of-window.</p>
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th><th className="px-3 py-2">Timezone</th><th className="px-3 py-2">Active</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No quiet hours configured. Default 22:00 to 07:00 will apply on first SMS dispatch.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.day_of_week}>
                <td className="px-3 py-2">{DOW[r.day_of_week]}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.start_local_time}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.end_local_time}</td>
                <td className="px-3 py-2 text-slate-400">{r.timezone}</td>
                <td className="px-3 py-2">{r.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
