import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SupplementsPage() {
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
            Supplement Protocol
          </h1>
          <p className="text-gray-400 mt-2">
            Your personalized supplement stack — formulated from your GeneX360
            results with 10-27x bioavailability.
          </p>
        </div>

        {/* Active Protocol */}
        <div className="glass rounded-2xl p-6 border border-teal border-opacity-40">
          <h3 className="text-lg font-semibold text-white mb-4">
            Active Protocol
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Your current supplement regimen will appear here once your genetic
            analysis is complete and a formulation has been generated.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Morning", "Afternoon", "Evening"].map((time) => (
              <div
                key={time}
                className="glass rounded-xl p-4 border border-dark-border"
              >
                <h4 className="text-sm font-medium text-copper">{time}</h4>
                <p className="text-gray-400 text-xs mt-2">
                  No supplements scheduled
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Product Catalog */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-4">
            Product Catalog
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Browse our 27 precision supplements — each targeting specific
            genetic pathways.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              "MTHFR+",
              "COMT+",
              "FOCUS+",
              "BLAST+",
              "SHRED+",
              "NAD+",
              "PeptideIQ",
              "CannabisIQ",
            ].map((product) => (
              <div
                key={product}
                className="glass rounded-xl p-4 border border-dark-border text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-dark-surface border border-dark-border flex items-center justify-center">
                  <span className="text-copper text-xs font-bold">Rx</span>
                </div>
                <p className="text-white text-sm font-medium mt-3">
                  {product}
                </p>
                <p className="text-gray-400 text-xs mt-1">View details</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
