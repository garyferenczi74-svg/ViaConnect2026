import { createClient } from "@/lib/supabase/server";

export default async function GenomicsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Population Genomics Search
          </h1>
          <p className="text-gray-400 mt-1">
            Explore SNP data, variant frequencies, and population-level genetic
            insights
          </p>
        </div>

        {/* SNP Search Interface */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">SNP Search</h2>
          <div className="flex gap-4">
            <div className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-4 py-2.5 text-gray-500 text-sm">
              Enter rsID (e.g., rs1801133) or gene name (e.g., MTHFR)...
            </div>
            <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
              Search
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["MTHFR C677T", "COMT V158M", "CYP1A2", "APOE", "VDR Taq1"].map(
              (tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-dark-surface border border-dark-border text-gray-400 cursor-pointer hover:border-portal-green/30 transition-colors"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>

        {/* Variant Frequency Analysis */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Variant Frequency Analysis
          </h2>
          <p className="text-gray-500 text-sm">
            Compare allele frequencies across your patient population vs.
            reference databases
          </p>
          <div className="h-64 bg-dark-surface/50 rounded-xl border border-dark-border/50 flex items-center justify-center">
            <p className="text-gray-600 text-sm">
              Frequency chart placeholder
            </p>
          </div>
        </div>

        {/* Population-Level Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Top SNP Variants",
              description: "Most common variants in your patient cohort",
            },
            {
              title: "Gene Pathway Analysis",
              description: "Methylation, detox, and neurotransmitter pathways",
            },
            {
              title: "Risk Stratification",
              description: "Patient risk grouping by genetic profile",
            },
          ].map((card) => (
            <div key={card.title} className="glass rounded-2xl p-6 space-y-3">
              <h3 className="text-white font-medium">{card.title}</h3>
              <p className="text-gray-500 text-sm">{card.description}</p>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-4 bg-dark-surface rounded animate-pulse"
                    style={{ width: `${100 - i * 15}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
