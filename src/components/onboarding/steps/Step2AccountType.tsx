"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";
import { PortalType } from "@/lib/types";

const accountTypes: {
  type: PortalType;
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}[] = [
  {
    type: "wellness",
    title: "Personal Wellness",
    description: "I want to understand my genetics and get personalized supplement recommendations for my own health.",
    icon: "🧬",
    color: "green",
    features: ["Personal genetic profile", "Supplement recommendations", "Health reports"],
  },
  {
    type: "practitioner",
    title: "Practitioner",
    description: "I'm a licensed healthcare provider managing patients with evidence-based genomic supplement protocols.",
    icon: "🩺",
    color: "blue",
    features: ["Patient management", "Clinical protocols", "Genomic reporting"],
  },
  {
    type: "naturopath",
    title: "Naturopath",
    description: "I'm a naturopathic doctor creating herbal formulations and natural medicine protocols guided by genetics.",
    icon: "🌿",
    color: "amber",
    features: ["Client management", "Herbal formulations", "Gene-herb analysis"],
  },
];

const colorMap: Record<string, { bg: string; border: string; ring: string; text: string; badge: string }> = {
  green: { bg: "bg-green-50", border: "border-green-300", ring: "ring-green-200", text: "text-green-800", badge: "bg-green-100 text-green-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-300", ring: "ring-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-300", ring: "ring-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
};

export default function Step2AccountType() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(data.accountType !== "");
  }, [data.accountType, setCanProceed]);

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Account Type</h2>
      <p className="text-gray-500 mb-8">
        This determines your portal experience. You can always access other portals later.
      </p>

      <div className="space-y-4">
        {accountTypes.map((acct) => {
          const selected = data.accountType === acct.type;
          const colors = colorMap[acct.color];
          return (
            <button
              key={acct.type}
              onClick={() => updateData({ accountType: acct.type })}
              className={`w-full text-left p-6 rounded-xl border-2 transition-all ${
                selected
                  ? `${colors.bg} ${colors.border} ring-4 ${colors.ring}`
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{acct.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className={`font-semibold text-lg ${selected ? colors.text : "text-gray-800"}`}>
                      {acct.title}
                    </h3>
                    {selected && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{acct.description}</p>
                  <div className="flex gap-2">
                    {acct.features.map((f) => (
                      <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                  selected ? `${colors.border} ${colors.bg}` : "border-gray-300"
                }`}>
                  {selected && <div className={`w-3 h-3 rounded-full ${colors.border.replace("border", "bg")}`} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
