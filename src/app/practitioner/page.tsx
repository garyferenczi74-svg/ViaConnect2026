import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { patients, protocols } from "@/lib/mock-data";

export default function PractitionerDashboard() {
  const activePatients = patients.filter((p) => p.status === "active").length;
  const activeProtocols = protocols.filter((p) => p.status === "active").length;
  const totalSnps = patients.reduce((sum, p) => sum + p.snpsAnalyzed, 0);

  return (
    <div>
      <Header
        portal="practitioner"
        title="Practitioner Dashboard"
        subtitle="Clinical genomics overview and patient management"
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Total Patients"
            value={patients.length}
            detail={`${activePatients} active`}
            colorClass="text-blue-700"
          />
          <StatCard
            label="Active Protocols"
            value={activeProtocols}
            detail="Supplement protocols"
            colorClass="text-green-700"
          />
          <StatCard
            label="SNPs Analyzed"
            value={totalSnps}
            detail="Across all patients"
            colorClass="text-purple-700"
          />
          <StatCard
            label="Pending Reviews"
            value={patients.filter((p) => p.status === "pending").length}
            detail="Awaiting genetic data"
            colorClass="text-yellow-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Patients</h3>
            <div className="space-y-3">
              {patients.slice(0, 4).map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{patient.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last visit: {patient.lastVisit} · {patient.snpsAnalyzed} SNPs
                    </p>
                  </div>
                  <StatusBadge status={patient.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Active Protocols</h3>
            <div className="space-y-3">
              {protocols.map((protocol) => (
                <div key={protocol.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{protocol.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {protocol.patientName} · {protocol.supplements.length} supplements
                    </p>
                  </div>
                  <StatusBadge status={protocol.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
