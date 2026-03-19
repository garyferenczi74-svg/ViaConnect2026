import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { geneVariants } from "@/lib/mock-data";

export default function GeneticProfilePage() {
  const categories = [...new Set(geneVariants.map((v) => v.category))];

  return (
    <div>
      <Header
        portal="wellness"
        title="Genetic Profile"
        subtitle="Your analyzed gene variants and their health implications"
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {geneVariants.filter((v) => v.impact === "beneficial").length}
            </p>
            <p className="text-sm text-green-600">Beneficial</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {geneVariants.filter((v) => v.impact === "neutral").length}
            </p>
            <p className="text-sm text-blue-600">Neutral</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">
              {geneVariants.filter((v) => v.impact === "risk").length}
            </p>
            <p className="text-sm text-red-600">Risk Variants</p>
          </div>
        </div>

        {categories.map((category) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{category}</h3>
            <div className="space-y-3">
              {geneVariants
                .filter((v) => v.category === category)
                .map((variant) => (
                  <div
                    key={variant.rsid}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-gray-900">{variant.gene}</h4>
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                            {variant.rsid}
                          </code>
                          <StatusBadge status={variant.impact} />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {variant.description}
                        </p>
                      </div>
                      <div className="ml-4 text-center">
                        <p className="text-xs text-gray-400 uppercase">Genotype</p>
                        <p className="text-2xl font-mono font-bold text-gray-800 mt-1">
                          {variant.genotype}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
