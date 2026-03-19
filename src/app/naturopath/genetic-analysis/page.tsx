import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { geneVariants, herbalFormulations } from "@/lib/mock-data";

export default function GeneticAnalysisPage() {
  return (
    <div>
      <Header
        portal="naturopath"
        title="Genetic Analysis"
        subtitle="Analyze gene variants to identify targeted herbal and natural interventions"
      />
      <div className="p-8 space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          This analysis maps genetic variants to naturopathic interventions including herbal medicine, nutritional therapy, and lifestyle modifications rooted in traditional and evidence-based natural medicine.
        </div>

        <div className="grid grid-cols-1 gap-6">
          {geneVariants.map((variant) => {
            const matchingFormulations = herbalFormulations.filter((f) =>
              f.geneTargets.includes(variant.gene)
            );

            return (
              <div key={variant.rsid} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-bold text-gray-900 text-lg">{variant.gene}</h4>
                      <StatusBadge status={variant.impact} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">SNP:</span>{" "}
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{variant.rsid}</code>
                      </div>
                      <div>
                        <span className="text-gray-400">Genotype:</span>{" "}
                        <span className="font-mono font-bold">{variant.genotype}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Pathway:</span>{" "}
                        <span>{variant.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">{variant.description}</p>
                  </div>

                  <div className="lg:col-span-2">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">
                      Naturopathic Interventions
                    </h5>

                    {matchingFormulations.length > 0 ? (
                      <div className="space-y-3">
                        {matchingFormulations.map((form) => (
                          <div key={form.id} className="bg-green-50 rounded-lg p-4">
                            <p className="font-medium text-green-800 text-sm mb-2">
                              {form.name}
                            </p>
                            <p className="text-xs text-gray-600 mb-2">{form.indication}</p>
                            <div className="flex flex-wrap gap-1">
                              {form.herbs.map((h) => (
                                <span
                                  key={h.name}
                                  className="text-xs bg-white text-green-700 px-2 py-0.5 rounded border border-green-200"
                                >
                                  {h.name} ({h.amount})
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">
                          No specific herbal formulation currently targets this variant.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Consider general pathway support through diet and lifestyle modifications.
                        </p>
                        <div className="mt-3">
                          <button className="text-xs text-amber-600 font-medium hover:text-amber-700">
                            + Create Formulation for {variant.gene}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
