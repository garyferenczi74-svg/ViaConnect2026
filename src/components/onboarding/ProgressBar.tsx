"use client";

import { useOnboarding } from "@/lib/onboarding-context";
import { ONBOARDING_STEPS } from "@/lib/onboarding-types";

export default function ProgressBar() {
  const { currentStep, totalSteps } = useOnboarding();
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-400">
          {ONBOARDING_STEPS[currentStep - 1].title}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-green-500 via-blue-500 to-amber-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-3">
        {ONBOARDING_STEPS.map((step) => (
          <div
            key={step.id}
            className={`hidden md:flex flex-col items-center ${
              step.id <= currentStep ? "opacity-100" : "opacity-30"
            }`}
            style={{ width: `${100 / totalSteps}%` }}
          >
            <div
              className={`w-3 h-3 rounded-full mb-1 transition-colors ${
                step.id < currentStep
                  ? "bg-green-500"
                  : step.id === currentStep
                  ? "bg-blue-500 ring-4 ring-blue-100"
                  : "bg-gray-300"
              }`}
            />
            <span className="text-[10px] text-gray-500 text-center leading-tight">
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
