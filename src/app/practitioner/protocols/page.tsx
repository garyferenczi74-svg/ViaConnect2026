import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { protocols } from "@/lib/mock-data";

export default function ProtocolsPage() {
  return (
    <div>
      <Header
        portal="practitioner"
        title="Supplement Protocols"
        subtitle="Evidence-based nutraceutical protocols guided by patient genomics"
      />
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + Create Protocol
          </button>
        </div>

        {protocols.map((protocol) => (
          <div key={protocol.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{protocol.name}</h3>
                  <StatusBadge status={protocol.status} />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Patient: <span className="font-medium">{protocol.patientName}</span> · Created: {protocol.createdDate}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Clinical Notes</p>
              <p className="text-sm text-gray-600">{protocol.notes}</p>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Supplements ({protocol.supplements.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {protocol.supplements.map((supp) => (
                <div key={supp.name} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-800">{supp.name}</span>
                    <StatusBadge status={supp.priority} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {supp.dosage} — {supp.frequency}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {supp.genes.map((g) => (
                      <span key={g} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        {g}
                      </span>
                    ))}
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
