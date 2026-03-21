import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const statusBadges: Record<string, string> = {
  active: "bg-portal-green/20 text-portal-green",
  draft: "bg-portal-yellow/20 text-portal-yellow",
  completed: "bg-gray-500/20 text-gray-400",
};

export default async function ProtocolsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">All Protocols</h1>
            <p className="text-gray-400 mt-1">
              Manage supplement protocols for your patients
            </p>
          </div>
          <Link
            href="/practitioner/protocols/builder"
            className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors"
          >
            + New Protocol
          </Link>
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 flex gap-3 flex-wrap">
          {["All", "Active", "Draft", "Completed"].map((filter, i) => (
            <button
              key={filter}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                i === 0
                  ? "bg-portal-green/20 text-portal-green"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Protocol List Placeholder */}
        <div className="space-y-4">
          {[
            { name: "MTHFR+ Support Protocol", status: "active", patients: 12 },
            { name: "COMT+ Optimization", status: "active", patients: 8 },
            { name: "Methylation Reset (30-day)", status: "draft", patients: 0 },
            { name: "NAD+ Recovery Program", status: "completed", patients: 5 },
            { name: "CYP1A2 Detox Support", status: "draft", patients: 0 },
          ].map((protocol) => (
            <div
              key={protocol.name}
              className="glass glass-hover rounded-2xl p-6 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-portal-green/10 flex items-center justify-center text-portal-green text-sm font-bold">
                  Rx
                </div>
                <div>
                  <h3 className="text-white font-medium">{protocol.name}</h3>
                  <p className="text-gray-500 text-sm">
                    {protocol.patients} patient
                    {protocol.patients !== 1 ? "s" : ""} assigned
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                    statusBadges[protocol.status]
                  }`}
                >
                  {protocol.status}
                </span>
                <button className="text-gray-400 hover:text-portal-green text-sm transition-colors">
                  View &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
