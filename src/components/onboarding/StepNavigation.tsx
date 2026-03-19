"use client";

import { useOnboarding } from "@/lib/onboarding-context";

export default function StepNavigation() {
  const { currentStep, totalSteps, nextStep, prevStep, canProceed } = useOnboarding();

  if (currentStep === totalSteps) return null;

  return (
    <div className="flex justify-between items-center pt-8 border-t border-gray-100 mt-8">
      {currentStep > 1 ? (
        <button
          onClick={prevStep}
          className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
      ) : (
        <div />
      )}

      {currentStep < totalSteps && (
        <button
          onClick={nextStep}
          disabled={!canProceed}
          className={`px-8 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            canProceed
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {currentStep === totalSteps - 1 ? "Complete Setup" : "Continue"}
        </button>
      )}
    </div>
  );
}
