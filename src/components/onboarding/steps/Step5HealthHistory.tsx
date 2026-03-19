"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";
import { CONDITION_OPTIONS, FAMILY_HISTORY_OPTIONS } from "@/lib/onboarding-types";

export default function Step5HealthHistory() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(data.conditions.length > 0 && data.familyHistory.length > 0);
  }, [data.conditions, data.familyHistory, setCanProceed]);

  const toggleItem = (field: "conditions" | "familyHistory", item: string) => {
    const current = data[field];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updateData({ [field]: updated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Health History</h2>
      <p className="text-gray-500 mb-8">
        {data.accountType === "wellness"
          ? "Help us understand your health background for accurate genomic interpretation."
          : "Common conditions in your practice help us tailor the platform."}
      </p>

      <div className="space-y-8">
        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Current or Past Conditions *</h3>
          <p className="text-sm text-gray-400 mb-4">Select all that apply to you or your clinical focus.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {CONDITION_OPTIONS.map((condition) => {
              const selected = data.conditions.includes(condition);
              return (
                <button
                  key={condition}
                  onClick={() => toggleItem("conditions", condition)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    selected
                      ? "border-gray-800 bg-gray-50 font-medium text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{selected ? "✓" : "○"}</span>
                  {condition}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Family History *</h3>
          <p className="text-sm text-gray-400 mb-4">
            Family health history helps contextualize genetic risk variants.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FAMILY_HISTORY_OPTIONS.map((item) => {
              const selected = data.familyHistory.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleItem("familyHistory", item)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${
                    selected
                      ? "border-gray-800 bg-gray-50 font-medium text-gray-900"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="mr-2">{selected ? "✓" : "○"}</span>
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">Current Medications</h3>
          <p className="text-sm text-gray-400 mb-4">
            Important for checking supplement-drug interactions. Separate with commas.
          </p>
          <textarea
            value={data.medications.join(", ")}
            onChange={(e) => updateData({
              medications: e.target.value.split(",").map((m) => m.trim()).filter(Boolean)
            })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="e.g., Levothyroxine 50mcg, Metformin 500mg"
          />
        </div>
      </div>
    </div>
  );
}
