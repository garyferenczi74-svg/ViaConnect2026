"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";
import {
  FOOD_ALLERGY_OPTIONS,
  SUPPLEMENT_ALLERGY_OPTIONS,
  HERB_SENSITIVITY_OPTIONS,
} from "@/lib/onboarding-types";

const CheckboxGroup = ({
  label,
  description,
  options,
  selected,
  onToggle,
}: {
  label: string;
  description: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) => (
  <div>
    <h3 className="font-semibold text-gray-800 mb-1">{label}</h3>
    <p className="text-sm text-gray-400 mb-3">{description}</p>
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
              isSelected
                ? "border-gray-800 bg-gray-50 font-medium text-gray-900"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className="mr-2">{isSelected ? "✓" : "○"}</span>
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

export default function Step9Allergies() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(
      data.foodAllergies.length > 0 &&
      data.supplementAllergies.length > 0 &&
      data.herbSensitivities.length > 0
    );
  }, [data.foodAllergies, data.supplementAllergies, data.herbSensitivities, setCanProceed]);

  const toggle = (field: "foodAllergies" | "supplementAllergies" | "herbSensitivities", item: string) => {
    const current = data[field];
    // If "None" is selected, clear others. If selecting something else, remove "None".
    if (item === "None") {
      updateData({ [field]: current.includes("None") ? [] : ["None"] });
    } else {
      const withoutNone = current.filter((i) => i !== "None");
      const updated = withoutNone.includes(item)
        ? withoutNone.filter((i) => i !== item)
        : [...withoutNone, item];
      updateData({ [field]: updated });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Allergies & Sensitivities</h2>
      <p className="text-gray-500 mb-8">
        Critical safety screening — ensures no recommended supplements or herbs contain
        ingredients you react to. Select &quot;None&quot; if not applicable.
      </p>

      <div className="space-y-8">
        <CheckboxGroup
          label="Food Allergies / Intolerances *"
          description="These affect which supplement forms and fillers we can recommend"
          options={FOOD_ALLERGY_OPTIONS}
          selected={data.foodAllergies}
          onToggle={(item) => toggle("foodAllergies", item)}
        />

        <CheckboxGroup
          label="Supplement Sensitivities *"
          description="Known reactions to common supplement excipients and ingredients"
          options={SUPPLEMENT_ALLERGY_OPTIONS}
          selected={data.supplementAllergies}
          onToggle={(item) => toggle("supplementAllergies", item)}
        />

        <CheckboxGroup
          label="Herb Sensitivities *"
          description={
            data.accountType === "naturopath"
              ? "Important for your client formulation safety checks"
              : "Botanical ingredients you've reacted to in the past"
          }
          options={HERB_SENSITIVITY_OPTIONS}
          selected={data.herbSensitivities}
          onToggle={(item) => toggle("herbSensitivities", item)}
        />

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Other Allergies</h3>
          <p className="text-sm text-gray-400 mb-3">Anything else we should know about</p>
          <textarea
            value={data.otherAllergies}
            onChange={(e) => updateData({ otherAllergies: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="e.g., sulfite sensitivity, dye reactions, latex (cross-reactive with certain fruits)"
          />
        </div>
      </div>
    </div>
  );
}
