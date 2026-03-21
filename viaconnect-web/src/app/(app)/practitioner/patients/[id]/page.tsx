import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const tabs = ["Overview", "Genetics", "Protocols", "Notes", "Messages"];

export default async function PatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link
            href="/practitioner/patients"
            className="hover:text-portal-green transition-colors"
          >
            Patients
          </Link>
          <span>/</span>
          <span className="text-white">Patient {params.id}</span>
        </div>

        {/* Patient Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green text-xl font-bold">
                P{params.id}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Patient Detail
                </h1>
                <p className="text-gray-400 text-sm">
                  Patient ID: {params.id}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="bg-dark-surface border border-dark-border text-gray-300 px-4 py-2 rounded-lg text-sm hover:border-portal-green/50 transition-colors">
                Edit Patient
              </button>
              <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
                New Protocol
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-dark-border">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                i === 0
                  ? "text-portal-green border-portal-green"
                  : "text-gray-400 border-transparent hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Placeholder — Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Patient Information
            </h3>
            {["Full Name", "Email", "Date of Birth", "Phone", "Blood Type"].map(
              (field) => (
                <div key={field}>
                  <p className="text-xs text-gray-500">{field}</p>
                  <div className="h-4 w-36 bg-dark-surface rounded mt-1 animate-pulse" />
                </div>
              )
            )}
          </div>

          {/* Genetic Summary */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Genetic Summary
            </h3>
            {["MTHFR", "COMT", "CYP1A2", "APOE", "VDR"].map((gene) => (
              <div key={gene} className="flex items-center justify-between">
                <span className="text-white text-sm font-mono">{gene}</span>
                <div className="h-4 w-20 bg-dark-surface rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Active Protocols */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Active Protocols
            </h3>
            <div className="text-center py-8 text-gray-500 text-sm">
              No active protocols yet.
              <br />
              <Link
                href="/practitioner/protocols/builder"
                className="text-portal-green hover:underline"
              >
                Create one now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
