"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";
import { HEALTH_GOAL_OPTIONS } from "@/lib/onboarding-types";

export default function Step4HealthGoals() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(data.healthGoals.length > 0 && data.primaryGoal !== "");
  }, [data.healthGoals, data.primaryGoal, setCanProceed]);

  const toggleGoal = (goal: string) => {
    const updated = data.healthGoals.includes(goal)
      ? data.healthGoals.filter((g) => g !== goal)
      : [...data.healthGoals, goal];
    const newPrimary = updated.includes(data.primaryGoal) ? data.primaryGoal : "";
    updateData({ healthGoals: updated, primaryGoal: newPrimary });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Health Goals</h2>
      <p className="text-gray-500 mb-8">
        {data.accountType === "wellness"
          ? "What are you hoping to improve? Select all that apply."
          : "What areas do your patients/clients most commonly present with?"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {HEALTH_GOAL_OPTIONS.map((goal) => {
          const selected = data.healthGoals.includes(goal);
          return (
            <button
              key={goal}
              onClick={() => toggleGoal(goal)}
              className={`text-left px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                selected
                  ? "border-gray-800 bg-gray-50 text-gray-900 font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{selected ? "✓" : "○"}</span>
              {goal}
            </button>
          );
        })}
      </div>

      {data.healthGoals.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-800 mb-3">Primary Goal *</h3>
          <p className="text-sm text-gray-500 mb-4">
            Which of your selected goals is the highest priority?
          </p>
          <div className="space-y-2">
            {data.healthGoals.map((goal) => (
              <button
                key={goal}
                onClick={() => updateData({ primaryGoal: goal })}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  data.primaryGoal === goal
                    ? "border-green-500 bg-green-50 text-green-800 font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{data.primaryGoal === goal ? "★" : "☆"}</span>
                {goal}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
