// Prompt #112 — Admin overview dashboard.

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Page() {
  const sb = createClient();
  const c = async (table: string, filter?: (q: ReturnType<typeof sb.from>) => ReturnType<typeof sb.from>) => {
    let q: ReturnType<typeof sb.from> = sb.from(table);
    if (filter) q = filter(q);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (q as any).select("*", { count: "exact", head: true });
    return (r.count as number | null) ?? 0;
  };
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [dispatched24, dropped24, phiFail, optInToday, batchPending, registryEnabled] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notifications_dispatched", (q: any) => q.in("delivery_status", ["dispatched", "delivered"]).gte("occurred_at", since24)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notifications_dispatched", (q: any) => q.like("delivery_status", "dropped_%").gte("occurred_at", since24)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notification_phi_redaction_failures", (q: any) => q.is("resolved_at", null)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notification_sms_opt_in_log", (q: any) => q.gte("occurred_at", since24)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notification_batch_queue", (q: any) => q.is("dispatched_at", null)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c("notification_event_registry", (q: any) => q.eq("default_enabled", true)),
  ]);
  const cards = [
    { label: "Delivered (24h)",      value: dispatched24, href: "/admin/notifications/dispatch-monitor", tone: "emerald" },
    { label: "Dropped (24h)",        value: dropped24,    href: "/admin/notifications/dispatch-monitor?status=dropped", tone: "amber" },
    { label: "Unresolved PHI fails", value: phiFail,      href: "/admin/notifications/compliance/phi-failures", tone: "rose" },
    { label: "Opt-in events (24h)",  value: optInToday,   href: "/admin/notifications/compliance/opt-in-log", tone: "sky" },
    { label: "Batch queue pending",  value: batchPending, href: "/admin/notifications/batch-queue", tone: "slate" },
    { label: "Enabled event codes",  value: registryEnabled, href: "/admin/notifications/event-registry", tone: "teal" },
  ];
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 hover:border-teal-400 hover:bg-slate-900">
          <div className="text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
          <div className="mt-1 text-3xl font-semibold text-slate-100">{c.value.toLocaleString()}</div>
        </Link>
      ))}
    </section>
  );
}
