"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { id: "1", title: "Health Goals", description: "What are your primary wellness objectives?" },
  { id: "2", title: "Lifestyle", description: "Tell us about your daily habits and routines" },
  { id: "3", title: "Medical History", description: "Share relevant health background" },
  { id: "4", title: "Supplements", description: "Current supplement and medication intake" },
  { id: "5", title: "Preferences", description: "Delivery format and notification settings" },
];

export default function OnboardingStepPage() {
  const params = useParams();
  const router = useRouter();
  const stepId = params.step as string;
  const currentIndex = STEPS.findIndex((s) => s.id === stepId);
  const step = STEPS[currentIndex];

  if (!step) {
    router.replace("/onboarding/1");
    return null;
  }

  const isLast = currentIndex === STEPS.length - 1;
  const nextHref = isLast ? "/dashboard" : `/onboarding/${STEPS[currentIndex + 1].id}`;
  const prevHref = currentIndex > 0 ? `/onboarding/${STEPS[currentIndex - 1].id}` : null;

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">
          <span className="text-copper">Via</span>Connect
        </h1>
        <p className="text-gray-400 mt-2">Clinical Assessment Questionnaire</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? "bg-copper" : "bg-dark-border"
            }`}
          />
        ))}
      </div>

      <div className="glass rounded-2xl p-8 space-y-6">
        <div>
          <p className="text-xs text-copper font-medium uppercase tracking-wider">
            Step {step.id} of {STEPS.length}
          </p>
          <h2 className="text-xl font-semibold text-white mt-1">{step.title}</h2>
          <p className="text-sm text-gray-400 mt-1">{step.description}</p>
        </div>

        <div className="min-h-[200px] flex items-center justify-center border border-dashed border-dark-border rounded-xl">
          <p className="text-sm text-gray-500">CAQ Phase {step.id} form fields</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back
            </Link>
          ) : (
            <div />
          )}
          <Link
            href={nextHref}
            className="bg-copper hover:bg-copper/80 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {isLast ? "Complete" : "Continue"}
          </Link>
        </div>
      </div>
    </>
  );
}
