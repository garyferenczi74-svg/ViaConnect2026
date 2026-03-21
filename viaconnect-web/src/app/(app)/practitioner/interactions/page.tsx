import { createClient } from "@/lib/supabase/server";

export default async function InteractionsPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">
            Drug-Supplement Interaction Checker
          </h1>
          <p className="text-gray-400 mt-1">
            Check for interactions between prescription drugs and supplement
            formulations
          </p>
        </div>

        {/* Search Interface */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">
            Check Interactions
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drug Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Drug / Medication
              </label>
              <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-gray-500 text-sm">
                Enter drug name (e.g., Warfarin, Metformin, Lisinopril)...
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Warfarin", "Metformin", "Levothyroxine", "Atorvastatin"].map(
                  (drug) => (
                    <span
                      key={drug}
                      className="px-3 py-1 rounded-full text-xs bg-dark-surface border border-dark-border text-gray-400 cursor-pointer hover:border-portal-green/30 transition-colors"
                    >
                      {drug}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Supplement Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Supplement / Formulation
              </label>
              <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-gray-500 text-sm">
                Enter supplement name (e.g., MTHFR+, COMT+, NAD+)...
              </div>
              <div className="flex gap-2 flex-wrap">
                {["MTHFR+", "COMT+", "FOCUS+", "NAD+", "BLAST+"].map(
                  (supp) => (
                    <span
                      key={supp}
                      className="px-3 py-1 rounded-full text-xs bg-dark-surface border border-dark-border text-gray-400 cursor-pointer hover:border-portal-green/30 transition-colors"
                    >
                      {supp}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors">
            Check Interactions
          </button>
        </div>

        {/* Results Placeholder */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Results</h2>
          <div className="h-48 bg-dark-surface/50 rounded-xl border border-dark-border/50 flex items-center justify-center">
            <p className="text-gray-600 text-sm">
              Enter a drug and supplement above to check for interactions
            </p>
          </div>
        </div>

        {/* Severity Legend */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Interaction Severity Levels
          </h3>
          <div className="flex gap-6 flex-wrap">
            {[
              { level: "Critical", color: "bg-red-500/20 text-red-400" },
              { level: "Major", color: "bg-orange-500/20 text-orange-400" },
              { level: "Moderate", color: "bg-yellow-500/20 text-yellow-400" },
              { level: "Minor", color: "bg-portal-green/20 text-portal-green" },
            ].map((item) => (
              <div key={item.level} className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.color}`}
                >
                  {item.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
