"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

const Section = ({
  title,
  stepNumber,
  onEdit,
  children,
}: {
  title: string;
  stepNumber: number;
  onEdit: () => void;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <button onClick={onEdit} className="text-xs text-blue-600 font-medium hover:text-blue-700">
        Edit
      </button>
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1.5 text-sm">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-800 font-medium text-right max-w-[60%]">{value || "—"}</span>
  </div>
);

const TagList = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5 mt-1">
    {items.length > 0 ? (
      items.map((item) => (
        <span key={item} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
          {item}
        </span>
      ))
    ) : (
      <span className="text-xs text-gray-400">None selected</span>
    )}
  </div>
);

const portalLabels = {
  wellness: "Personal Wellness",
  practitioner: "Practitioner",
  naturopath: "Naturopath",
} as const;

const geneticSourceLabels: Record<string, string> = {
  upload: "Upload Raw Data",
  "order-kit": "Order a Kit",
  "already-analyzed": "Already Analyzed",
  skip: "Skip for Now",
};

export default function Step11Review() {
  const { data, goToStep, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Profile</h2>
      <p className="text-gray-500 mb-8">
        Please verify all your information is correct before completing sign-up.
        Click &quot;Edit&quot; on any section to make changes.
      </p>

      <div className="space-y-4">
        <Section title="Account Type" stepNumber={2} onEdit={() => goToStep(2)}>
          <Field
            label="Portal"
            value={data.accountType ? portalLabels[data.accountType as keyof typeof portalLabels] : "—"}
          />
        </Section>

        <Section title="Personal Information" stepNumber={3} onEdit={() => goToStep(3)}>
          <Field label="Name" value={`${data.firstName} ${data.lastName}`} />
          <Field label="Email" value={data.email} />
          <Field label="Date of Birth" value={data.dateOfBirth} />
          <Field label="Biological Sex" value={data.biologicalSex} />
          {(data.accountType === "practitioner" || data.accountType === "naturopath") && (
            <>
              <Field label="License" value={data.licenseNumber} />
              <Field label="Practice" value={data.practiceName} />
              <Field label="Specialty" value={data.specialty} />
            </>
          )}
        </Section>

        <Section title="Health Goals" stepNumber={4} onEdit={() => goToStep(4)}>
          <p className="text-sm text-gray-500 mb-2">Selected goals:</p>
          <TagList items={data.healthGoals} />
          <Field label="Primary Goal" value={data.primaryGoal} />
        </Section>

        <Section title="Health History" stepNumber={5} onEdit={() => goToStep(5)}>
          <p className="text-sm text-gray-500 mb-1">Conditions:</p>
          <TagList items={data.conditions} />
          <p className="text-sm text-gray-500 mb-1 mt-3">Family History:</p>
          <TagList items={data.familyHistory} />
          {data.medications.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-1 mt-3">Medications:</p>
              <TagList items={data.medications} />
            </>
          )}
        </Section>

        <Section title="Current Supplements" stepNumber={6} onEdit={() => goToStep(6)}>
          {data.takingSupplements ? (
            <div className="space-y-2">
              {data.currentSupplements.map((s, i) => (
                <div key={i} className="text-sm text-gray-700">
                  {s.name || "Unnamed"} — {s.dosage || "No dosage"} ({s.duration || "No duration"})
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not currently taking supplements</p>
          )}
        </Section>

        <Section title="Genetic Data" stepNumber={7} onEdit={() => goToStep(7)}>
          <Field
            label="Source"
            value={data.geneticDataSource ? geneticSourceLabels[data.geneticDataSource] || data.geneticDataSource : "—"}
          />
          {data.geneticProvider && <Field label="Provider" value={data.geneticProvider} />}
        </Section>

        <Section title="Lifestyle" stepNumber={8} onEdit={() => goToStep(8)}>
          <Field label="Diet" value={data.dietType} />
          <Field label="Exercise" value={data.exerciseFrequency} />
          <Field label="Sleep" value={data.sleepQuality} />
          <Field label="Stress" value={data.stressLevel} />
          {data.smokingStatus && <Field label="Smoking" value={data.smokingStatus} />}
          {data.alcoholUse && <Field label="Alcohol" value={data.alcoholUse} />}
        </Section>

        <Section title="Allergies & Sensitivities" stepNumber={9} onEdit={() => goToStep(9)}>
          <p className="text-sm text-gray-500 mb-1">Food:</p>
          <TagList items={data.foodAllergies} />
          <p className="text-sm text-gray-500 mb-1 mt-2">Supplement:</p>
          <TagList items={data.supplementAllergies} />
          <p className="text-sm text-gray-500 mb-1 mt-2">Herbs:</p>
          <TagList items={data.herbSensitivities} />
          {data.otherAllergies && <Field label="Other" value={data.otherAllergies} />}
        </Section>

        <Section title="Consent" stepNumber={10} onEdit={() => goToStep(10)}>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className={data.consentDataProcessing ? "text-green-600" : "text-red-500"}>
                {data.consentDataProcessing ? "✓" : "✗"}
              </span>
              <span className="text-gray-700">Data Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.consentGenomicAnalysis ? "text-green-600" : "text-red-500"}>
                {data.consentGenomicAnalysis ? "✓" : "✗"}
              </span>
              <span className="text-gray-700">Genomic Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.consentHIPAA ? "text-green-600" : "text-red-500"}>
                {data.consentHIPAA ? "✓" : "✗"}
              </span>
              <span className="text-gray-700">HIPAA Acknowledgment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.consentResearchUse ? "text-green-600" : "text-gray-400"}>
                {data.consentResearchUse ? "✓" : "—"}
              </span>
              <span className="text-gray-700">Research Contribution (optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={data.agreeTerms ? "text-green-600" : "text-red-500"}>
                {data.agreeTerms ? "✓" : "✗"}
              </span>
              <span className="text-gray-700">Terms of Service</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
