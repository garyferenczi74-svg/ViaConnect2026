import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { geneVariants, supplementRecommendations, healthReports } from "@/lib/mock-data";

export default function WellnessDashboard() {
  const riskVariants = geneVariants.filter((v) => v.impact === "risk").length;
  const essentialSupps = supplementRecommendations.filter((s) => s.priority === "essential").length;
  const completedReports = healthReports.filter((r) => r.status === "complete").length;

  return (
    <div>
      <Header
        portal="wellness"
        title="Wellness Dashboard"
        subtitle="Your personalized genomic health overview"
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Gene Variants Analyzed"
            value={geneVariants.length}
            detail="From whole genome panel"
            colorClass="text-green-700"
          />
          <StatCard
            label="Actionable Risk Variants"
            value={riskVariants}
            detail="Requiring nutritional intervention"
            colorClass="text-red-600"
          />
          <StatCard
            label="Essential Supplements"
            value={essentialSupps}
            detail="Genetically prioritized"
            colorClass="text-blue-700"
          />
          <StatCard
            label="Reports Completed"
            value={`${completedReports}/${healthReports.length}`}
            detail="Pathway analyses"
            colorClass="text-purple-700"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Top Risk Variants</h3>
            <div className="space-y-3">
              {geneVariants
                .filter((v) => v.impact === "risk")
                .slice(0, 4)
                .map((v) => (
                  <div key={v.rsid} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <span className="font-semibold text-gray-800">{v.gene}</span>
                      <span className="text-gray-400 text-sm ml-2">{v.rsid}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{v.genotype}</span>
                      <StatusBadge status={v.impact} />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Reports</h3>
            <div className="space-y-3">
              {healthReports.slice(0, 4).map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{report.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{report.date}</p>
                  </div>
                  <StatusBadge status={report.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
