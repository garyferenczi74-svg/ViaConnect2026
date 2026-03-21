import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const panelMeta: Record<string, { name: string; description: string }> = {
  methylation: {
    name: "Methylation",
    description:
      "MTHFR, MTR, MTRR, COMT and folate cycle variants affecting methyl-group donation.",
  },
  detoxification: {
    name: "Detoxification",
    description:
      "GST, CYP450, NAT2 and phase I/II pathways governing toxin clearance.",
  },
  neurotransmitter: {
    name: "Neurotransmitter",
    description:
      "COMT, MAO-A, GAD1, BDNF variants influencing mood, focus and cognition.",
  },
  hormone: {
    name: "Hormone",
    description:
      "CYP19A1, SRD5A2, VDR and endocrine SNPs impacting hormone metabolism.",
  },
  cardiovascular: {
    name: "Cardiovascular",
    description:
      "APOE, LPA, MTHFR C677T and lipid/homocysteine markers for heart health.",
  },
  mitochondrial: {
    name: "Mitochondrial",
    description:
      "SOD2, NRF2, PGC-1a variants related to cellular energy and oxidative stress.",
  },
};

export default async function PanelDeepDivePage({
  params,
}: {
  params: { panelId: string };
}) {
  const supabase = createClient();
  await supabase.auth.getUser();

  const { panelId } = params;
  const panel = panelMeta[panelId] ?? {
    name: panelId,
    description: "Genetic panel data",
  };

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/dashboard" className="text-copper hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/genetics" className="text-copper hover:underline">
            GeneX360
          </Link>
          <span>/</span>
          <span className="text-white">{panel.name}</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">{panel.name} Panel</h1>
          <p className="text-gray-400 mt-2">{panel.description}</p>
        </div>

        {/* SNP Data Table Placeholder */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            SNP Data Table
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-dark-border text-gray-400">
                  <th className="py-3 pr-4">Gene / SNP</th>
                  <th className="py-3 pr-4">rsID</th>
                  <th className="py-3 pr-4">Genotype</th>
                  <th className="py-3 pr-4">Impact</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-gray-400 italic"
                  >
                    SNP results will populate once your genetic data has been
                    processed.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Assessment Visualization Placeholder */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Risk Assessment
          </h3>
          <div className="flex items-center justify-center h-48 border border-dashed border-dark-border rounded-xl">
            <p className="text-gray-400 text-sm">
              Risk visualization chart will render here based on your variant
              data.
            </p>
          </div>
        </div>

        {/* Recommended Supplements */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recommended Formulations
          </h3>
          <p className="text-gray-400 text-sm">
            Targeted supplement recommendations for this panel will appear once
            analysis is complete.
          </p>
          <Link
            href="/supplements"
            className="inline-block mt-4 text-sm text-copper hover:underline"
          >
            View full supplement protocol &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
