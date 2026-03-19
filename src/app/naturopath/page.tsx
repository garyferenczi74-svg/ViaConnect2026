import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { patients, herbalFormulations } from "@/lib/mock-data";

export default function NaturopathDashboard() {
  const totalHerbs = herbalFormulations.reduce((sum, f) => sum + f.herbs.length, 0);
  const uniqueGeneTargets = [...new Set(herbalFormulations.flatMap((f) => f.geneTargets))].length;

  return (
    <div>
      <Header
        portal="naturopath"
        title="Naturopath Dashboard"
        subtitle="Herbal medicine practice guided by genomic insights"
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Active Clients"
            value={patients.filter((p) => p.status === "active").length}
            detail="Under naturopathic care"
            colorClass="text-amber-700"
          />
          <StatCard
            label="Formulations"
            value={herbalFormulations.length}
            detail="Custom herbal blends"
            colorClass="text-green-700"
          />
          <StatCard
            label="Herbs in Use"
            value={totalHerbs}
            detail="Across all formulations"
            colorClass="text-emerald-700"
          />
          <StatCard
            label="Gene Targets"
            value={uniqueGeneTargets}
            detail="Unique SNPs addressed"
            colorClass="text-purple-700"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Formulations</h3>
            <div className="space-y-3">
              {herbalFormulations.slice(0, 4).map((form) => (
                <div key={form.id} className="p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-800 text-sm">{form.name}</p>
                    <span className="text-xs text-gray-400">{form.createdDate}</span>
                  </div>
                  <p className="text-xs text-gray-500">{form.herbs.length} herbs · Targets: {form.geneTargets.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Clients Requiring Attention</h3>
            <div className="space-y-3">
              {patients
                .filter((p) => p.status === "active" || p.status === "pending")
                .slice(0, 4)
                .map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{client.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {client.conditions.join(", ")}
                      </p>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
