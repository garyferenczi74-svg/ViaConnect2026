import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const placeholderHerbs = [
  {
    name: "Ashwagandha",
    latin: "Withania somnifera",
    actions: ["Adaptogen", "Nervine", "Anti-inflammatory"],
    indications: ["Stress", "Fatigue", "Anxiety"],
  },
  {
    name: "Turmeric",
    latin: "Curcuma longa",
    actions: ["Anti-inflammatory", "Hepatoprotective", "Antioxidant"],
    indications: ["Joint pain", "Digestive issues", "Inflammation"],
  },
  {
    name: "Milk Thistle",
    latin: "Silybum marianum",
    actions: ["Hepatoprotective", "Antioxidant", "Cholagogue"],
    indications: ["Liver support", "Detoxification", "Gallbladder"],
  },
  {
    name: "Echinacea",
    latin: "Echinacea purpurea",
    actions: ["Immunostimulant", "Anti-microbial", "Vulnerary"],
    indications: ["Immune support", "Upper respiratory", "Wound healing"],
  },
  {
    name: "Valerian",
    latin: "Valeriana officinalis",
    actions: ["Sedative", "Anxiolytic", "Spasmolytic"],
    indications: ["Insomnia", "Anxiety", "Muscle tension"],
  },
  {
    name: "St. John's Wort",
    latin: "Hypericum perforatum",
    actions: ["Nervine", "Anti-depressant", "Anti-viral"],
    indications: ["Mild depression", "Nerve pain", "Seasonal affective"],
  },
];

export default async function BotanicalPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Botanical Database
            </h1>
            <p className="mt-1 text-gray-400">
              500+ Herb Database &mdash; Search, explore, and build formulas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/naturopath/botanical/formula-builder"
              className="rounded-lg bg-sage/20 px-4 py-2 text-sm font-medium text-sage hover:bg-sage/30"
            >
              Formula Builder
            </Link>
            <Link
              href="/naturopath/dashboard"
              className="text-sm text-sage hover:text-sage/80"
            >
              &larr; Dashboard
            </Link>
          </div>
        </div>

        {/* Search Interface Placeholder */}
        <div className="glass mb-6 rounded-xl border border-dark-border p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 flex-1 rounded-lg bg-white/5 px-4 py-2 text-gray-400">
              Search herbs by name, action, or indication...
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                Adaptogen
              </span>
              <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                Nervine
              </span>
              <span className="rounded-full bg-sage/10 px-3 py-1 text-xs text-sage">
                Hepatic
              </span>
            </div>
          </div>
        </div>

        {/* Herb Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {placeholderHerbs.map((herb) => (
            <div
              key={herb.name}
              className="glass rounded-xl border border-dark-border p-5 transition-all hover:border-sage/40"
            >
              <h3 className="text-lg font-semibold text-white">{herb.name}</h3>
              <p className="mb-3 text-sm italic text-sage">{herb.latin}</p>

              <div className="mb-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Actions
                </p>
                <div className="flex flex-wrap gap-1">
                  {herb.actions.map((action) => (
                    <span
                      key={action}
                      className="rounded-full bg-sage/10 px-2 py-0.5 text-xs text-sage"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Indications
                </p>
                <div className="flex flex-wrap gap-1">
                  {herb.indications.map((indication) => (
                    <span
                      key={indication}
                      className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400"
                    >
                      {indication}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
