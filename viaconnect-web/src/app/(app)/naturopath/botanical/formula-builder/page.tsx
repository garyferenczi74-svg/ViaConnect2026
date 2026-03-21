import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const steps = [
  { number: 1, label: "Select Herbs", active: true },
  { number: 2, label: "Set Ratios", active: false },
  { number: 3, label: "Choose Preparation", active: false },
  { number: 4, label: "Review Formula", active: false },
];

const preparations = ["Tincture", "Tea", "Capsule", "Topical", "Powder"];

export default async function FormulaBuilderPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/naturopath/botanical"
            className="mb-4 inline-block text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Botanical Database
          </Link>
          <h1 className="text-3xl font-bold text-white">
            Herbal Formula Creator
          </h1>
          <p className="mt-1 text-gray-400">
            Build custom herbal formulations for your patients
          </p>
        </div>

        {/* Step Indicator */}
        <div className="glass mb-8 rounded-xl border border-dark-border p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      step.active
                        ? "bg-sage text-dark-bg"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      step.active ? "text-sage" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="mx-4 h-px w-12 bg-dark-border lg:w-24" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Herb Selection Panel */}
          <div className="glass rounded-xl border border-dark-border p-5 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Step 1: Select Herbs
            </h2>
            <div className="mb-4 h-10 rounded-lg bg-white/5 px-4 py-2 text-gray-400">
              Search herbs to add to your formula...
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-dark-border bg-white/5 p-3"
                >
                  <div>
                    <div className="h-4 w-32 rounded bg-white/10" />
                    <div className="mt-1 h-3 w-20 rounded bg-white/5" />
                  </div>
                  <div className="rounded bg-sage/20 px-3 py-1 text-xs text-sage">
                    + Add
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula Summary */}
          <div className="glass rounded-xl border border-dark-border p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Formula Summary
            </h2>

            <div className="mb-4 rounded-lg border border-dark-border bg-white/5 p-4">
              <p className="text-sm text-gray-400">
                No herbs selected yet. Search and add herbs to begin building
                your formula.
              </p>
            </div>

            {/* Preparation Type */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Preparation Type
              </h3>
              <div className="flex flex-wrap gap-2">
                {preparations.map((prep) => (
                  <span
                    key={prep}
                    className="cursor-pointer rounded-full border border-dark-border px-3 py-1 text-xs text-gray-400 hover:border-sage/40 hover:text-sage"
                  >
                    {prep}
                  </span>
                ))}
              </div>
            </div>

            <button className="mt-2 w-full rounded-lg bg-sage/20 py-2 text-sm font-medium text-sage hover:bg-sage/30">
              Review Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
