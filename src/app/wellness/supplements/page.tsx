import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { supplementRecommendations } from "@/lib/mock-data";

export default function SupplementsPage() {
  const grouped = {
    essential: supplementRecommendations.filter((s) => s.priority === "essential"),
    recommended: supplementRecommendations.filter((s) => s.priority === "recommended"),
    optional: supplementRecommendations.filter((s) => s.priority === "optional"),
  };

  return (
    <div>
      <Header
        portal="wellness"
        title="Supplement Recommendations"
        subtitle="Personalized nutraceuticals based on your genetic variants"
      />
      <div className="p-8 space-y-8">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          These recommendations are generated from your genetic profile. Always consult your healthcare provider before starting any supplement regimen.
        </div>

        {(["essential", "recommended", "optional"] as const).map((priority) => {
          const items = grouped[priority];
          if (items.length === 0) return null;
          return (
            <div key={priority}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-800 capitalize">{priority}</h3>
                <span className="text-sm text-gray-400">({items.length} supplements)</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {items.map((supp) => (
                  <div
                    key={supp.name}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{supp.name}</h4>
                      <StatusBadge status={supp.priority} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-400">Dosage:</span>{" "}
                        <span className="text-gray-700 font-medium">{supp.dosage}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Frequency:</span>{" "}
                        <span className="text-gray-700 font-medium">{supp.frequency}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{supp.reason}</p>
                    <div className="mt-3 flex gap-2">
                      {supp.genes.map((g) => (
                        <span
                          key={g}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
