import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const constitutionalTypes = [
  {
    name: "Sanguine",
    element: "Air",
    traits: "Warm, moist, social, energetic",
  },
  {
    name: "Choleric",
    element: "Fire",
    traits: "Warm, dry, driven, decisive",
  },
  {
    name: "Melancholic",
    element: "Earth",
    traits: "Cool, dry, analytical, detail-oriented",
  },
  {
    name: "Phlegmatic",
    element: "Water",
    traits: "Cool, moist, calm, steady",
  },
];

export default async function ConstitutionalPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Constitutional Typing
            </h1>
            <p className="mt-1 text-gray-400">
              Assess and classify patient constitutional types
            </p>
          </div>
          <Link
            href="/naturopath/dashboard"
            className="text-sm text-sage hover:text-sage/80"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Assessment Interface Placeholder */}
        <div className="glass mb-8 rounded-xl border border-dark-border p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            New Constitutional Assessment
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Select a patient to begin their constitutional assessment. The
            questionnaire evaluates physical characteristics, temperament,
            dietary tendencies, and health patterns.
          </p>
          <div className="flex items-center gap-4">
            <div className="h-10 flex-1 rounded-lg bg-white/5 px-4 py-2 text-gray-400">
              Search patient to assess...
            </div>
            <div className="rounded-lg bg-sage/20 px-4 py-2 text-sm font-medium text-sage">
              Start Assessment
            </div>
          </div>
        </div>

        {/* Constitutional Types Reference */}
        <h2 className="mb-4 text-lg font-semibold text-white">
          Type Classification Reference
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {constitutionalTypes.map((type) => (
            <div
              key={type.name}
              className="glass rounded-xl border border-dark-border p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {type.name}
                </h3>
                <span className="rounded-full bg-sage/10 px-3 py-1 text-xs font-medium text-sage">
                  {type.element}
                </span>
              </div>
              <p className="text-sm text-gray-400">{type.traits}</p>
            </div>
          ))}
        </div>

        {/* Recent Assessments Placeholder */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Assessments
          </h2>
          <div className="glass rounded-xl border border-dark-border p-6">
            <p className="text-center text-sm text-gray-400">
              No assessments completed yet. Start a new assessment above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
