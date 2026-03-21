import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const complianceMetrics = [
  { label: "Audit Score", value: "98.5%", trend: "up" },
  { label: "Open Issues", value: "2", trend: "down" },
  { label: "Last Audit", value: "Mar 14, 2026", trend: "neutral" },
  { label: "Data Requests", value: "0 pending", trend: "neutral" },
];

const recentLogs = [
  {
    action: "Patient record accessed",
    user: "Dr. practitioner",
    timestamp: "2026-03-21 09:14 AM",
    resource: "Patient #1042",
  },
  {
    action: "Protocol created",
    user: "Dr. practitioner",
    timestamp: "2026-03-21 08:47 AM",
    resource: "Adrenal Recovery Protocol",
  },
  {
    action: "Formula exported",
    user: "Dr. practitioner",
    timestamp: "2026-03-20 04:32 PM",
    resource: "Liver Support Tincture",
  },
  {
    action: "Patient record accessed",
    user: "Dr. practitioner",
    timestamp: "2026-03-20 02:15 PM",
    resource: "Patient #1038",
  },
  {
    action: "Consent form signed",
    user: "Patient #1038",
    timestamp: "2026-03-20 02:10 PM",
    resource: "HIPAA Authorization",
  },
];

export default async function CompliancePage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              HIPAA Audit Dashboard
            </h1>
            <p className="mt-1 text-gray-400">
              Compliance metrics, audit logs, and data access reports
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Compliance Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {complianceMetrics.map((metric) => (
            <div
              key={metric.label}
              className="glass rounded-xl border border-dark-border p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-sage">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Audit Log Viewer */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Audit Logs
          </h2>
          <div className="glass rounded-xl border border-dark-border">
            {/* Search / Filter Bar */}
            <div className="border-b border-dark-border p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 flex-1 rounded-lg bg-white/5 px-4 py-2 text-gray-400">
                  Filter logs by action, user, or resource...
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                    All Actions
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400">
                    Today
                  </span>
                </div>
              </div>
            </div>

            {/* Log Entries */}
            <div className="divide-y divide-dark-border">
              {recentLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/10 text-xs font-bold text-sage">
                      {log.action.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {log.action}
                      </p>
                      <p className="text-xs text-gray-400">
                        {log.resource} &middot; {log.user}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-gray-400">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Access Reports */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">
            Data Access Reports
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="glass rounded-xl border border-dark-border p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Records Accessed (30d)
              </h3>
              <p className="text-2xl font-bold text-white">147</p>
              <p className="mt-1 text-xs text-gray-400">
                Across 32 unique patients
              </p>
            </div>
            <div className="glass rounded-xl border border-dark-border p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Data Exports (30d)
              </h3>
              <p className="text-2xl font-bold text-white">12</p>
              <p className="mt-1 text-xs text-gray-400">
                All authorized and logged
              </p>
            </div>
            <div className="glass rounded-xl border border-dark-border p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Consent Forms
              </h3>
              <p className="text-2xl font-bold text-white">98%</p>
              <p className="mt-1 text-xs text-gray-400">
                Active patients with signed HIPAA forms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
