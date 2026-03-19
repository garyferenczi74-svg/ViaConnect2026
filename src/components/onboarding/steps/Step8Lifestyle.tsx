"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

const RadioGroup = ({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) => (
  <div>
    <h3 className="font-semibold text-gray-800 mb-1">{label}</h3>
    <p className="text-sm text-gray-400 mb-3">{description}</p>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
            value === opt.value
              ? "border-gray-800 bg-gray-50 font-medium text-gray-900"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export default function Step8Lifestyle() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(
      data.dietType !== "" &&
      data.exerciseFrequency !== "" &&
      data.sleepQuality !== "" &&
      data.stressLevel !== ""
    );
  }, [data.dietType, data.exerciseFrequency, data.sleepQuality, data.stressLevel, setCanProceed]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Lifestyle Factors</h2>
      <p className="text-gray-500 mb-8">
        Lifestyle significantly modulates gene expression (epigenetics). This data refines your recommendations.
      </p>

      <div className="space-y-8">
        <RadioGroup
          label="Diet Type *"
          description="Your predominant eating pattern"
          value={data.dietType}
          onChange={(val) => updateData({ dietType: val })}
          options={[
            { value: "omnivore", label: "Omnivore" },
            { value: "vegetarian", label: "Vegetarian" },
            { value: "vegan", label: "Vegan" },
            { value: "keto", label: "Keto / Low-carb" },
            { value: "paleo", label: "Paleo" },
            { value: "mediterranean", label: "Mediterranean" },
          ]}
        />

        <RadioGroup
          label="Exercise Frequency *"
          description="How often do you engage in physical activity"
          value={data.exerciseFrequency}
          onChange={(val) => updateData({ exerciseFrequency: val })}
          options={[
            { value: "sedentary", label: "Sedentary" },
            { value: "1-2x", label: "1-2x / week" },
            { value: "3-4x", label: "3-4x / week" },
            { value: "5+", label: "5+ / week" },
            { value: "daily", label: "Daily" },
            { value: "athlete", label: "Competitive athlete" },
          ]}
        />

        <RadioGroup
          label="Sleep Quality *"
          description="How would you rate your typical sleep"
          value={data.sleepQuality}
          onChange={(val) => updateData({ sleepQuality: val })}
          options={[
            { value: "poor", label: "Poor (< 5hrs)" },
            { value: "fair", label: "Fair (5-6hrs)" },
            { value: "good", label: "Good (7-8hrs)" },
            { value: "excellent", label: "Excellent (8+hrs)" },
            { value: "irregular", label: "Irregular / shift work" },
          ]}
        />

        <RadioGroup
          label="Stress Level *"
          description="Your average perceived stress"
          value={data.stressLevel}
          onChange={(val) => updateData({ stressLevel: val })}
          options={[
            { value: "low", label: "Low" },
            { value: "moderate", label: "Moderate" },
            { value: "high", label: "High" },
            { value: "chronic", label: "Chronic / burnout" },
          ]}
        />

        <RadioGroup
          label="Smoking Status"
          description="Smoking affects detoxification gene pathways (CYP1A2, GST)"
          value={data.smokingStatus}
          onChange={(val) => updateData({ smokingStatus: val })}
          options={[
            { value: "never", label: "Never" },
            { value: "former", label: "Former" },
            { value: "occasional", label: "Occasional" },
            { value: "current", label: "Current" },
          ]}
        />

        <RadioGroup
          label="Alcohol Use"
          description="Alcohol impacts methylation and liver detox capacity"
          value={data.alcoholUse}
          onChange={(val) => updateData({ alcoholUse: val })}
          options={[
            { value: "none", label: "None" },
            { value: "occasional", label: "Occasional (1-2/wk)" },
            { value: "moderate", label: "Moderate (3-7/wk)" },
            { value: "heavy", label: "Heavy (8+/wk)" },
          ]}
        />
      </div>
    </div>
  );
}
