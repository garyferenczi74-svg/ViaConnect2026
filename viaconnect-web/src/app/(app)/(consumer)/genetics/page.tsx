import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const panels = [
  {
    id: "methylation",
    name: "Methylation",
    description: "MTHFR, MTR, MTRR, COMT and folate cycle variants",
    color: "border-teal",
  },
  {
    id: "detoxification",
    name: "Detoxification",
    description: "GST, CYP450, NAT2 and phase I/II detox pathways",
    color: "border-copper",
  },
  {
    id: "neurotransmitter",
    name: "Neurotransmitter",
    description: "COMT, MAO-A, GAD1, BDNF and mood/cognition variants",
    color: "border-plum",
  },
  {
    id: "hormone",
    name: "Hormone",
    description: "CYP19A1, SRD5A2, VDR and endocrine-related SNPs",
    color: "border-rose",
  },
  {
    id: "cardiovascular",
    name: "Cardiovascular",
    description: "APOE, LPA, MTHFR C677T and heart-health markers",
    color: "border-teal",
  },
  {
    id: "mitochondrial",
    name: "Mitochondrial",
    description: "SOD2, NRF2, PGC-1a and cellular energy variants",
    color: "border-copper",
  },
];

export default async function GeneticsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-copper hover:underline"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">
            GeneX360 Results Overview
          </h1>
          <p className="text-gray-400 mt-2">
            Your 6-panel genetic analysis — comprehensive SNP profiling across
            core metabolic pathways.
          </p>
        </div>

        {/* Panel grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((panel) => (
            <Link
              key={panel.id}
              href={`/genetics/${panel.id}`}
              className={`glass rounded-2xl p-6 border ${panel.color} border-opacity-40 hover:border-opacity-100 transition-all`}
            >
              <h2 className="text-lg font-semibold text-white">
                {panel.name}
              </h2>
              <p className="text-gray-400 mt-2 text-sm">{panel.description}</p>
              <span className="inline-block mt-4 text-xs text-copper font-medium">
                View Panel &rarr;
              </span>
            </Link>
          ))}
        </div>

        {/* Status banner */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-2">
            Test Status
          </h3>
          <p className="text-gray-400 text-sm">
            Upload your raw genetic data or order a GENEX360 test kit
            ($288.88 – $988.88) to unlock your full panel results.
          </p>
        </div>
      </div>
    </div>
  );
}
