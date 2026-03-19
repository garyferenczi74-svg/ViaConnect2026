import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { patients, geneVariants } from "@/lib/mock-data";

export default function GeneticReportsPage() {
  return (
    <div>
      <Header
        portal="practitioner"
        title="Genetic Reports"
        subtitle="Patient genomic data for clinical decision-making"
      />
      <div className="p-8 space-y-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Select a patient to view their full genomic report. Variant interpretations follow ACMG/AMP guidelines adapted for nutrigenomics.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-gray-800 mb-4">Patients</h3>
            <div className="space-y-2">
              {patients
                .filter((p) => p.snpsAnalyzed > 0)
                .map((patient, idx) => (
                  <div
                    key={patient.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      idx === 0
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-100 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-800">{patient.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {patient.snpsAnalyzed} SNPs · {patient.conditions.join(", ")}
                    </p>
                  </div>
                ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                Genomic Report — {patients[0].name}
              </h3>
              <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                Export PDF
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-red-700">
                  {geneVariants.filter((v) => v.impact === "risk").length}
                </p>
                <p className="text-xs text-red-600">Risk Variants</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-700">
                  {geneVariants.filter((v) => v.impact === "neutral").length}
                </p>
                <p className="text-xs text-blue-600">Neutral</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-green-700">
                  {geneVariants.filter((v) => v.impact === "beneficial").length}
                </p>
                <p className="text-xs text-green-600">Beneficial</p>
              </div>
            </div>

            <div className="space-y-3">
              {geneVariants.map((variant) => (
                <div key={variant.rsid} className="bg-white rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{variant.gene}</span>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{variant.rsid}</code>
                      <span className="font-mono text-sm text-gray-500">{variant.genotype}</span>
                    </div>
                    <StatusBadge status={variant.impact} />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{variant.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Pathway: {variant.category}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
