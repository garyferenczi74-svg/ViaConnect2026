"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { OnboardingData, initialOnboardingData, ONBOARDING_STEPS } from "./onboarding-types";

interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  updateData: (fields: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  canProceed: boolean;
  setCanProceed: (val: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [currentStep, setCurrentStep] = useState(1);
  const [canProceed, setCanProceed] = useState(false);

  const updateData = useCallback((fields: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...fields }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length));
    setCanProceed(false);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= ONBOARDING_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        totalSteps: ONBOARDING_STEPS.length,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        canProceed,
        setCanProceed,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
