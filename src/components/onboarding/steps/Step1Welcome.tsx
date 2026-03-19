"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

export default function Step1Welcome() {
  const { setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="text-6xl mb-6">🧬</div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to ViaConnect 2026
      </h2>
      <p className="text-lg text-gray-600 leading-relaxed mb-8">
        Precision nutraceuticals powered by your unique genome. We&apos;ll guide you through a
        short questionnaire to build your personalized health profile and connect you
        with the right genomic insights.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="bg-green-50 rounded-xl p-5">
          <div className="text-2xl mb-3">💊</div>
          <h3 className="font-semibold text-green-800 mb-2">Personalized</h3>
          <p className="text-sm text-green-700">
            Supplement recommendations matched to your SNPs — not generic advice.
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5">
          <div className="text-2xl mb-3">🔬</div>
          <h3 className="font-semibold text-blue-800 mb-2">Evidence-Based</h3>
          <p className="text-sm text-blue-700">
            Every recommendation backed by nutrigenomic research and clinical data.
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-5">
          <div className="text-2xl mb-3">🌿</div>
          <h3 className="font-semibold text-amber-800 mb-2">Holistic</h3>
          <p className="text-sm text-amber-700">
            Integrating genetics with lifestyle, diet, and natural medicine approaches.
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-8">
        This takes about 5 minutes. Your data is encrypted and never shared without consent.
      </p>
    </div>
  );
}
