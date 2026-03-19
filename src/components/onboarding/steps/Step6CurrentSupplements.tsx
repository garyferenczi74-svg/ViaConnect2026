"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

export default function Step6CurrentSupplements() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(data.takingSupplements !== null);
  }, [data.takingSupplements, setCanProceed]);

  const addSupplement = () => {
    updateData({
      currentSupplements: [...data.currentSupplements, { name: "", dosage: "", duration: "" }],
    });
  };

  const updateSupplement = (index: number, field: string, value: string) => {
    const updated = data.currentSupplements.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    updateData({ currentSupplements: updated });
  };

  const removeSupplement = (index: number) => {
    updateData({
      currentSupplements: data.currentSupplements.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Supplements</h2>
      <p className="text-gray-500 mb-8">
        Knowing what you already take helps avoid duplicates and ensures safe dosing when we
        generate your personalized protocol.
      </p>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Are you currently taking any supplements? *</h3>
          <div className="flex gap-4">
            <button
              onClick={() => {
                updateData({ takingSupplements: true });
                if (data.currentSupplements.length === 0) addSupplement();
              }}
              className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                data.takingSupplements === true
                  ? "border-gray-800 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              Yes, I take supplements
            </button>
            <button
              onClick={() => updateData({ takingSupplements: false, currentSupplements: [] })}
              className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                data.takingSupplements === false
                  ? "border-gray-800 bg-gray-50 text-gray-900"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              No, not currently
            </button>
          </div>
        </div>

        {data.takingSupplements === true && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Your Supplements</h3>
              <button
                onClick={addSupplement}
                className="text-sm text-gray-600 font-medium hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                + Add Another
              </button>
            </div>

            {data.currentSupplements.map((supp, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-4 relative">
                <button
                  onClick={() => removeSupplement(index)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-sm"
                >
                  Remove
                </button>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Supplement Name</label>
                    <input
                      type="text"
                      value={supp.name}
                      onChange={(e) => updateSupplement(index, "name", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="e.g., Vitamin D3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Dosage</label>
                    <input
                      type="text"
                      value={supp.dosage}
                      onChange={(e) => updateSupplement(index, "dosage", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="e.g., 2000 IU"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">How Long</label>
                    <select
                      value={supp.duration}
                      onChange={(e) => updateSupplement(index, "duration", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <option value="">Select...</option>
                      <option value="<1 month">Less than 1 month</option>
                      <option value="1-6 months">1-6 months</option>
                      <option value="6-12 months">6-12 months</option>
                      <option value="1+ years">1+ years</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data.takingSupplements === false && (
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            No problem — we&apos;ll build your supplement protocol from scratch based on your
            genetic data and health goals.
          </div>
        )}
      </div>
    </div>
  );
}
