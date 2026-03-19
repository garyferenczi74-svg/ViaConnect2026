"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

const ConsentToggle = ({
  label,
  description,
  required,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  required: boolean;
  checked: boolean;
  onChange: (val: boolean) => void;
}) => (
  <div
    className={`p-5 rounded-xl border transition-all cursor-pointer ${
      checked ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
    }`}
    onClick={() => onChange(!checked)}
  >
    <div className="flex items-start gap-4">
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
          checked ? "border-green-600 bg-green-600" : "border-gray-300"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-800 text-sm">{label}</h4>
          {required && <span className="text-xs text-red-500 font-medium">Required</span>}
        </div>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

export default function Step10Consent() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(
      data.consentDataProcessing &&
      data.consentGenomicAnalysis &&
      data.consentHIPAA &&
      data.agreeTerms
    );
  }, [data.consentDataProcessing, data.consentGenomicAnalysis, data.consentHIPAA, data.agreeTerms, setCanProceed]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Consent & Privacy</h2>
      <p className="text-gray-500 mb-8">
        Your genomic data is among the most sensitive personal information. Please review and
        consent to the following before we proceed.
      </p>

      <div className="space-y-4">
        <ConsentToggle
          label="Data Processing Consent"
          description="I consent to ViaConnect processing my personal and health information to generate personalized supplement and health recommendations. My data is encrypted using AES-256 and stored in HIPAA-compliant infrastructure."
          required={true}
          checked={data.consentDataProcessing}
          onChange={(val) => updateData({ consentDataProcessing: val })}
        />

        <ConsentToggle
          label="Genomic Analysis Consent"
          description="I consent to the analysis of my genetic data (SNPs) for the purpose of identifying gene variants relevant to nutrient metabolism, detoxification pathways, and health risk factors. This analysis is for wellness purposes and does not constitute a medical diagnosis."
          required={true}
          checked={data.consentGenomicAnalysis}
          onChange={(val) => updateData({ consentGenomicAnalysis: val })}
        />

        <ConsentToggle
          label="HIPAA Acknowledgment"
          description="I acknowledge that ViaConnect operates under HIPAA-compliant data handling practices. My protected health information (PHI) will not be disclosed to third parties without my explicit written consent, except as required by law."
          required={true}
          checked={data.consentHIPAA}
          onChange={(val) => updateData({ consentHIPAA: val })}
        />

        <ConsentToggle
          label="Anonymized Research Contribution"
          description="I optionally consent to my anonymized, de-identified data being used in aggregate nutrigenomic research to advance the understanding of gene-nutrient interactions. This is entirely voluntary and does not affect your service."
          required={false}
          checked={data.consentResearchUse}
          onChange={(val) => updateData({ consentResearchUse: val })}
        />

        <ConsentToggle
          label="Terms of Service & Privacy Policy"
          description="I have read and agree to ViaConnect's Terms of Service and Privacy Policy, including the limitations of genomic wellness recommendations and the distinction between wellness guidance and medical advice."
          required={true}
          checked={data.agreeTerms}
          onChange={(val) => updateData({ agreeTerms: val })}
        />
      </div>

      <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 leading-relaxed">
        <p className="font-semibold text-gray-600 mb-2">Your Rights</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>You can request complete deletion of your data at any time</li>
          <li>You can download all your data in standard formats</li>
          <li>You can revoke any consent without affecting past processing</li>
          <li>Genetic data is never sold to third parties under any circumstances</li>
        </ul>
      </div>
    </div>
  );
}
