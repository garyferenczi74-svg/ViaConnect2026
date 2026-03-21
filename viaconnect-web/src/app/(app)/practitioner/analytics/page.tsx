import { createClient } from "@/lib/supabase/server";

const chartAreas = [
  {
    title: "Patient Outcomes",
    description: "Track improvement metrics across your patient base",
    height: "h-64",
  },
  {
    title: "Adherence Rates",
    description: "Protocol adherence over time by patient cohort",
    height: "h-64",
  },
  {
    title: "Revenue Metrics",
    description: "Monthly revenue, subscriptions, and product sales",
    height: "h-48",
  },
  {
    title: "Protocol Effectiveness",
    description: "Compare outcomes across different protocol types",
    height: "h-48",
  },
];

export default async function AnalyticsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Practice Analytics
            </h1>
            <p className="text-gray-400 mt-1">
              Data-driven insights for your practice
            </p>
          </div>
          <div className="flex gap-2">
            {["7D", "30D", "90D", "1Y"].map((period, i) => (
              <button
                key={period}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  i === 1
                    ? "bg-portal-green/20 text-portal-green"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Patients", value: "—", change: "+12%" },
            { label: "Avg Adherence", value: "—", change: "+5%" },
            { label: "Active Protocols", value: "—", change: "+8%" },
            { label: "Monthly Revenue", value: "—", change: "+18%" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-portal-green mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Chart Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartAreas.map((chart) => (
            <div key={chart.title} className="glass rounded-2xl p-6 space-y-3">
              <div>
                <h3 className="text-white font-medium">{chart.title}</h3>
                <p className="text-gray-500 text-sm">{chart.description}</p>
              </div>
              <div
                className={`${chart.height} bg-dark-surface/50 rounded-xl border border-dark-border/50 flex items-center justify-center`}
              >
                <p className="text-gray-600 text-sm">Chart placeholder</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
