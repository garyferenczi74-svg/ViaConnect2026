import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const phases = [
  {
    number: 1,
    name: "Health History",
    description: "Medical background, family history, and current conditions",
  },
  {
    number: 2,
    name: "Lifestyle & Environment",
    description: "Diet, exercise, sleep patterns, and environmental exposures",
  },
  {
    number: 3,
    name: "Symptom Assessment",
    description: "Current symptoms, severity, and onset timeline",
  },
  {
    number: 4,
    name: "Supplement History",
    description: "Previous and current supplement and medication usage",
  },
  {
    number: 5,
    name: "Goals & Priorities",
    description: "Wellness objectives and treatment preferences",
  },
];

export default async function AssessmentPage() {
  const supabase = createClient();
  await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/dashboard" className="text-copper hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/profile" className="text-copper hover:underline">
              Profile
            </Link>
            <span>/</span>
            <span className="text-white">Assessment</span>
          </div>
          <h1 className="text-3xl font-bold text-white mt-4">
            Clinical Assessment Questionnaire
          </h1>
          <p className="text-gray-400 mt-2">
            Your 5-phase CAQ results — used to personalize your formulations and
            clinical recommendations.
          </p>
        </div>

        {/* Phase cards */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <div
              key={phase.number}
              className="glass rounded-2xl p-6 border border-dark-border flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-dark-surface border border-copper border-opacity-40 flex items-center justify-center">
                <span className="text-copper font-bold text-sm">
                  {phase.number}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{phase.name}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {phase.description}
                </p>
                <span className="inline-block mt-3 text-xs text-gray-500 bg-dark-surface px-3 py-1 rounded-full border border-dark-border">
                  Not completed
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="glass rounded-2xl p-6 border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-2">
            Assessment Summary
          </h3>
          <p className="text-gray-400 text-sm">
            Complete all 5 phases to unlock your full clinical profile. Your
            results will be shared with your practitioner (if connected) to
            guide personalized supplement formulation.
          </p>
          <button className="mt-4 bg-copper hover:bg-copper/80 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Begin Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
