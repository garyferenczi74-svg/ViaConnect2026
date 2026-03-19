import Header from "@/components/Header";
import { herbalFormulations } from "@/lib/mock-data";

export default function FormulationsPage() {
  return (
    <div>
      <Header
        portal="naturopath"
        title="Formulation Builder"
        subtitle="Create and manage custom herbal formulations guided by genomic data"
      />
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <button className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
            + New Formulation
          </button>
        </div>

        {herbalFormulations.map((form) => (
          <div key={form.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{form.name}</h3>
                <p className="text-xs text-gray-400 mt-1">Created: {form.createdDate}</p>
              </div>
              <div className="flex gap-2">
                {form.geneTargets.map((g) => (
                  <span key={g} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Indication</p>
              <p className="text-sm text-gray-700">{form.indication}</p>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Ingredients ({form.herbs.length})
            </h4>
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Herb</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Amount</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {form.herbs.map((herb) => (
                    <tr key={herb.name}>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{herb.name}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{herb.amount}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{herb.form}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {form.contraindications.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Contraindications</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {form.contraindications.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
