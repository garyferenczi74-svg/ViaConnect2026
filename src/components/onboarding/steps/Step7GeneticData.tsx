"use client";

import { useEffect } from "react";
import { useOnboarding } from "@/lib/onboarding-context";

const geneticOptions: {
  value: "upload" | "order-kit" | "already-analyzed" | "skip";
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "upload",
    title: "Upload Raw Data",
    description: "I have raw genetic data from 23andMe, AncestryDNA, or another provider. Upload your .txt, .csv, or .vcf file.",
    icon: "📤",
  },
  {
    value: "already-analyzed",
    title: "Already Analyzed",
    description: "I've previously had my genome analyzed by a clinical lab. We'll import your existing results.",
    icon: "✅",
  },
  {
    value: "order-kit",
    title: "Order a Kit",
    description: "I don't have genetic data yet. We'll send you a saliva collection kit for whole-genome SNP analysis.",
    icon: "📦",
  },
  {
    value: "skip",
    title: "Skip for Now",
    description: "I'll provide genetic data later. You can still explore the platform with sample data.",
    icon: "⏭️",
  },
];

export default function Step7GeneticData() {
  const { data, updateData, setCanProceed } = useOnboarding();

  useEffect(() => {
    setCanProceed(data.geneticDataSource !== "");
  }, [data.geneticDataSource, setCanProceed]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Genetic Data</h2>
      <p className="text-gray-500 mb-8">
        Your genetic data is the foundation of personalized recommendations. How would you like to provide it?
      </p>

      <div className="space-y-4">
        {geneticOptions.map((option) => {
          const selected = data.geneticDataSource === option.value;
          return (
            <button
              key={option.value}
              onClick={() => updateData({ geneticDataSource: option.value })}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                selected
                  ? "border-gray-800 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <h3 className={`font-semibold ${selected ? "text-gray-900" : "text-gray-700"}`}>
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  selected ? "border-gray-800 bg-gray-800" : "border-gray-300"
                }`}>
                  {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {data.geneticDataSource === "upload" && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Genetic Data Provider</label>
            <select
              value={data.geneticProvider}
              onChange={(e) => updateData({ geneticProvider: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="">Select provider...</option>
              <option value="23andme">23andMe</option>
              <option value="ancestry">AncestryDNA</option>
              <option value="nebula">Nebula Genomics</option>
              <option value="dante">Dante Labs</option>
              <option value="wgs">Whole Genome Sequencing (clinical)</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">📁</div>
            <p className="text-sm text-gray-600 font-medium">Drag and drop your raw data file</p>
            <p className="text-xs text-gray-400 mt-2">Supported: .txt, .csv, .vcf (max 50MB)</p>
            <p className="text-xs text-gray-300 mt-1">Your data is encrypted in transit and at rest</p>
          </div>
        </div>
      )}

      {data.geneticDataSource === "already-analyzed" && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Analyzing Lab / Provider</label>
          <input
            type="text"
            value={data.geneticProvider}
            onChange={(e) => updateData({ geneticProvider: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="e.g., GeneSight, Genomind, IntellxxDNA"
          />
        </div>
      )}

      {data.geneticDataSource === "order-kit" && (
        <div className="mt-6 bg-green-50 rounded-xl p-4 text-sm text-green-800">
          A collection kit will be shipped to your address after sign-up. Results typically arrive within 3-4 weeks.
          You&apos;ll have access to the platform with sample data in the meantime.
        </div>
      )}
    </div>
  );
}
