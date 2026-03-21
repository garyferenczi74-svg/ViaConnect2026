import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const tabs = [
  "Overview",
  "Constitutional Type",
  "Botanicals",
  "Protocols",
  "Notes",
];

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/naturopath/patients"
            className="mb-4 inline-block text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Patient Roster
          </Link>
          <h1 className="text-3xl font-bold text-white">Patient Detail</h1>
          <p className="mt-1 text-gray-400">
            Patient ID: <span className="font-mono text-sage">{params.id}</span>
          </p>
        </div>

        {/* Tabbed Interface */}
        <div className="glass mb-6 rounded-xl border border-dark-border">
          {/* Tab Bar */}
          <div className="flex border-b border-dark-border">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                className={`px-5 py-3 text-sm font-medium transition-colors ${
                  i === 0
                    ? "border-b-2 border-sage text-sage"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Placeholder */}
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Patient Info Card */}
              <div className="rounded-xl border border-dark-border bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Patient Information
                </h3>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/10" />
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                </div>
              </div>

              {/* Vitals Card */}
              <div className="rounded-xl border border-dark-border bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Current Vitals
                </h3>
                <div className="space-y-3">
                  <div className="h-4 w-1/2 rounded bg-white/10" />
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="h-4 w-1/3 rounded bg-white/10" />
                </div>
              </div>

              {/* Active Protocols */}
              <div className="rounded-xl border border-dark-border bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Active Protocols
                </h3>
                <div className="space-y-2">
                  <div className="h-8 w-full rounded bg-white/10" />
                  <div className="h-8 w-full rounded bg-white/10" />
                </div>
              </div>

              {/* Upcoming Appointments */}
              <div className="rounded-xl border border-dark-border bg-white/5 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  Upcoming Appointments
                </h3>
                <div className="space-y-2">
                  <div className="h-8 w-full rounded bg-white/10" />
                  <div className="h-8 w-full rounded bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
