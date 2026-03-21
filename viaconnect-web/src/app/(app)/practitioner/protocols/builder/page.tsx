import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const steps = [
  {
    number: 1,
    title: "Select Patient",
    description: "Choose a patient from your roster",
  },
  {
    number: 2,
    title: "Genetic Analysis",
    description: "Review patient SNP data and risk factors",
  },
  {
    number: 3,
    title: "Choose Supplements",
    description: "Select from 27 precision formulations",
  },
  {
    number: 4,
    title: "Review & Assign",
    description: "Confirm dosage, schedule, and assign protocol",
  },
];

export default async function ProtocolBuilderPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Link
              href="/practitioner/protocols"
              className="hover:text-portal-green transition-colors"
            >
              Protocols
            </Link>
            <span>/</span>
            <span className="text-white">Builder</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Protocol Builder Wizard
          </h1>
          <p className="text-gray-400 mt-1">
            Create a personalized supplement protocol in four steps
          </p>
        </div>

        {/* Step Indicator */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0
                        ? "bg-portal-green text-dark-bg"
                        : "bg-dark-surface text-gray-500 border border-dark-border"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="hidden md:block">
                    <p
                      className={`text-sm font-medium ${
                        i === 0 ? "text-portal-green" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-600">{step.description}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px bg-dark-border mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Patient (Active Placeholder) */}
        <div className="glass rounded-2xl p-8 space-y-6">
          <h2 className="text-xl font-semibold text-white">
            Step 1: Select Patient
          </h2>

          {/* Patient Search */}
          <div className="bg-dark-surface border border-dark-border rounded-lg px-4 py-3 text-gray-500 text-sm">
            Search for a patient by name or email...
          </div>

          {/* Patient List Placeholder */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-dark-surface/50 border border-dark-border hover:border-portal-green/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-border animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-dark-border rounded animate-pulse" />
                    <div className="h-3 w-44 bg-dark-border/60 rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-portal-green text-sm">Select</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/practitioner/protocols"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            &larr; Cancel
          </Link>
          <button className="bg-portal-green/20 text-portal-green border border-portal-green/30 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-portal-green/30 transition-colors opacity-50 cursor-not-allowed">
            Next: Genetic Analysis &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
