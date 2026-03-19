import Header from "@/components/Header";
import { herbalFormulations, geneVariants } from "@/lib/mock-data";

export default function HerbalProtocolsPage() {
  const geneHerbMap = herbalFormulations.reduce<Record<string, { herbs: string[]; formulation: string }[]>>(
    (acc, form) => {
      form.geneTargets.forEach((gene) => {
        if (!acc[gene]) acc[gene] = [];
        acc[gene].push({
          herbs: form.herbs.map((h) => h.name),
          formulation: form.name,
        });
      });
      return acc;
    },
    {}
  );

  return (
    <div>
      <Header
        portal="naturopath"
        title="Herbal Protocols"
        subtitle="Gene-targeted herbal medicine protocols for naturopathic practice"
      />
      <div className="p-8 space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Herbal protocols are designed to address specific genetic variants through traditional and evidence-based botanical medicine. Each protocol targets specific SNP-related pathway dysfunction.
        </div>

        {Object.entries(geneHerbMap).map(([gene, entries]) => {
          const variant = geneVariants.find((v) => v.gene === gene);
          return (
            <div key={gene} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🧬</span>
                <div>
                  <h3 className="font-bold text-gray-900">{gene} Pathway Support</h3>
                  {variant && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {variant.rsid} · {variant.genotype} · {variant.category}
                    </p>
                  )}
                </div>
              </div>

              {variant && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{variant.description}</p>
              )}

              <h4 className="text-sm font-semibold text-gray-700 mb-3">Herbal Interventions</h4>
              <div className="space-y-3">
                {entries.map((entry, idx) => (
                  <div key={idx} className="bg-green-50 rounded-lg p-4">
                    <p className="font-medium text-green-800 text-sm mb-2">{entry.formulation}</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.herbs.map((herb) => (
                        <span key={herb} className="text-xs bg-white text-green-700 px-2 py-1 rounded-full border border-green-200">
                          🌿 {herb}
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
