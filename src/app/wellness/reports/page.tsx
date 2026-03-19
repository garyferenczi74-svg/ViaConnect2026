import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { healthReports } from "@/lib/mock-data";

export default function ReportsPage() {
  return (
    <div>
      <Header
        portal="wellness"
        title="Health Reports"
        subtitle="Genomic pathway analyses and health assessments"
      />
      <div className="p-8 space-y-6">
        {healthReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <StatusBadge status={report.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <span>{report.date}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{report.category}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{report.summary}</p>
              </div>
            </div>
            {report.status === "complete" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="text-sm text-green-600 font-medium hover:text-green-700">
                  View Full Report →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
