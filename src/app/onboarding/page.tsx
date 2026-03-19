"use client";

import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import ProgressBar from "@/components/onboarding/ProgressBar";
import StepNavigation from "@/components/onboarding/StepNavigation";
import Step1Welcome from "@/components/onboarding/steps/Step1Welcome";
import Step2AccountType from "@/components/onboarding/steps/Step2AccountType";
import Step3PersonalInfo from "@/components/onboarding/steps/Step3PersonalInfo";
import Step4HealthGoals from "@/components/onboarding/steps/Step4HealthGoals";
import Step5HealthHistory from "@/components/onboarding/steps/Step5HealthHistory";
import Step6CurrentSupplements from "@/components/onboarding/steps/Step6CurrentSupplements";
import Step7GeneticData from "@/components/onboarding/steps/Step7GeneticData";
import Step8Lifestyle from "@/components/onboarding/steps/Step8Lifestyle";
import Step9Allergies from "@/components/onboarding/steps/Step9Allergies";
import Step10Consent from "@/components/onboarding/steps/Step10Consent";
import Step11Review from "@/components/onboarding/steps/Step11Review";
import Step12Complete from "@/components/onboarding/steps/Step12Complete";
import Link from "next/link";

const stepComponents: Record<number, React.ComponentType> = {
  1: Step1Welcome,
  2: Step2AccountType,
  3: Step3PersonalInfo,
  4: Step4HealthGoals,
  5: Step5HealthHistory,
  6: Step6CurrentSupplements,
  7: Step7GeneticData,
  8: Step8Lifestyle,
  9: Step9Allergies,
  10: Step10Consent,
  11: Step11Review,
  12: Step12Complete,
};

function OnboardingFlow() {
  const { currentStep } = useOnboarding();
  const StepComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">
            Via<span className="text-green-600">Connect</span>
          </Link>
          <span className="text-sm text-gray-400">New Account Setup</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-6 pt-8">
          <ProgressBar />
        </div>

        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
          <StepComponent />
          <StepNavigation />
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        ViaConnect 2026 — Your data is encrypted and never shared without consent.
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
