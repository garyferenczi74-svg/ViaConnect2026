import { createClient } from "@/lib/supabase/server";

const connectedSystems = [
  {
    name: "Epic MyChart",
    status: "connected",
    lastSync: "2 hours ago",
    records: 142,
  },
  {
    name: "Cerner",
    status: "disconnected",
    lastSync: "Never",
    records: 0,
  },
  {
    name: "Allscripts",
    status: "disconnected",
    lastSync: "Never",
    records: 0,
  },
  {
    name: "athenahealth",
    status: "pending",
    lastSync: "Never",
    records: 0,
  },
];

const statusStyles: Record<string, string> = {
  connected: "bg-portal-green/20 text-portal-green",
  disconnected: "bg-gray-500/20 text-gray-400",
  pending: "bg-yellow-500/20 text-yellow-400",
};

export default async function EHRPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              EHR Integration Hub
            </h1>
            <p className="text-gray-400 mt-1">
              Connect and manage Electronic Health Record systems
            </p>
          </div>
          <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
            + Connect System
          </button>
        </div>

        {/* Connected EHR Systems */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Connected Systems
          </h2>
          <div className="space-y-3">
            {connectedSystems.map((system) => (
              <div
                key={system.name}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center text-gray-400 text-sm font-bold">
                    EHR
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{system.name}</h3>
                    <p className="text-gray-500 text-sm">
                      Last sync: {system.lastSync}{" "}
                      {system.records > 0 &&
                        `| ${system.records} records synced`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      statusStyles[system.status]
                    }`}
                  >
                    {system.status}
                  </span>
                  <button className="text-gray-400 hover:text-portal-green text-sm transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sync Status */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Data Sync Status
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: "Total Records Synced", value: "142" },
              { label: "Last Sync", value: "2 hours ago" },
              { label: "Sync Errors", value: "0" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-portal-green">
                  {stat.value}
                </p>
                <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Import / Export */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Import Data</h2>
            <p className="text-gray-500 text-sm">
              Import patient records from connected EHR systems or upload FHIR /
              HL7 files
            </p>
            <div className="h-32 bg-dark-surface/50 rounded-xl border border-dashed border-dark-border flex items-center justify-center">
              <p className="text-gray-600 text-sm">
                Drag and drop files or click to browse
              </p>
            </div>
            <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
              Import Records
            </button>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Export Data</h2>
            <p className="text-gray-500 text-sm">
              Export patient data and protocol records in FHIR, HL7, or CSV
              format
            </p>
            <div className="space-y-3">
              {["FHIR R4 (JSON)", "HL7 v2 (Pipe-delimited)", "CSV Export"].map(
                (format) => (
                  <div
                    key={format}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-surface/50 border border-dark-border"
                  >
                    <span className="text-white text-sm">{format}</span>
                    <button className="text-portal-green text-sm hover:underline">
                      Export
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
