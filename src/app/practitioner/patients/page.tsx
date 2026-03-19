import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { patients } from "@/lib/mock-data";

export default function PatientsPage() {
  return (
    <div>
      <Header
        portal="practitioner"
        title="Patient Management"
        subtitle="View and manage patient genomic profiles and clinical data"
      />
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + Add Patient
            </button>
            <input
              type="text"
              placeholder="Search patients..."
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <div className="flex gap-2">
            {["all", "active", "pending", "inactive"].map((filter) => (
              <button
                key={filter}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 capitalize"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Conditions</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SNPs</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Last Visit</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800 text-sm">{patient.name}</p>
                    <p className="text-xs text-gray-400">{patient.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {patient.conditions.map((c) => (
                        <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-mono">{patient.snpsAnalyzed}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{patient.lastVisit}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={patient.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
