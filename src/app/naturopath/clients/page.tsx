import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { patients, herbalFormulations } from "@/lib/mock-data";

export default function ClientsPage() {
  return (
    <div>
      <Header
        portal="naturopath"
        title="Client Management"
        subtitle="Manage clients and their naturopathic treatment plans"
      />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
              + New Client
            </button>
            <input
              type="text"
              placeholder="Search clients..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-64"
            />
          </div>
        </div>

        <div className="space-y-4">
          {patients.map((client) => {
            const clientFormulations = herbalFormulations.filter((f) =>
              f.geneTargets.some((g) =>
                client.conditions.some((c) => c.toLowerCase().includes(g.toLowerCase()))
              )
            );

            return (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{client.name}</h4>
                      <StatusBadge status={client.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      <span>DOB: {client.dob}</span>
                      <span>Last visit: {client.lastVisit}</span>
                      <span>{client.snpsAnalyzed} SNPs analyzed</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {client.conditions.map((c) => (
                        <span key={c} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>

                    {clientFormulations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Active Formulations</p>
                        <div className="flex gap-2">
                          {clientFormulations.map((f) => (
                            <span key={f.id} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button className="text-sm text-amber-600 font-medium hover:text-amber-700">
                      View
                    </button>
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
