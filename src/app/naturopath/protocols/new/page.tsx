"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import StepProgress from "@/components/protocol/StepProgress";
import TemplateSelector from "@/components/protocol/TemplateSelector";
import SupplementPicker from "@/components/protocol/SupplementPicker";
import ProtocolCanvas from "@/components/protocol/ProtocolCanvas";
import type { Supplement } from "@/components/protocol/SupplementPicker";

interface CanvasItem {
  supplement: Supplement;
  dosage: string;
  frequency: string;
}

export default function ProtocolBuilderPage() {
  const [step, setStep] = useState(0);
  const [, setTemplate] = useState<string | null>(null);
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);

  const addedIds = new Set(canvasItems.map((c) => c.supplement.id));

  const handleAdd = useCallback((s: Supplement) => {
    setCanvasItems((prev) => [
      ...prev,
      { supplement: s, dosage: "", frequency: "Once daily" },
    ]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setCanvasItems((prev) => prev.filter((c) => c.supplement.id !== id));
  }, []);

  const handleUpdateDosage = useCallback((id: string, dosage: string) => {
    setCanvasItems((prev) =>
      prev.map((c) =>
        c.supplement.id === id ? { ...c, dosage } : c
      )
    );
  }, []);

  const handleUpdateFrequency = useCallback((id: string, frequency: string) => {
    setCanvasItems((prev) =>
      prev.map((c) =>
        c.supplement.id === id ? { ...c, frequency } : c
      )
    );
  }, []);

  const handleSelectTemplate = (name: string) => {
    setTemplate(name);
    setStep(1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Choose a Template
            </h2>
            <TemplateSelector onSelect={handleSelectTemplate} />
          </div>
        );
      case 1:
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Clinical Indication
            </h2>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-xs text-white/40 font-medium uppercase tracking-wider block mb-1.5">
                  Primary Condition
                </label>
                <input
                  type="text"
                  placeholder="e.g., Chronic fatigue, MTHFR-related methylation deficit"
                  className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium uppercase tracking-wider block mb-1.5">
                  ICD-10 Code (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., E53.8"
                  className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 font-medium uppercase tracking-wider block mb-1.5">
                  Clinical Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Relevant history, goals, contraindications..."
                  className="w-full bg-gray-900/60 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-green-400/50 resize-none"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Add Supplements
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
              <SupplementPicker onAdd={handleAdd} addedIds={addedIds} />
              <ProtocolCanvas
                items={canvasItems}
                onRemove={handleRemove}
                onUpdateDosage={handleUpdateDosage}
                onUpdateFrequency={handleUpdateFrequency}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl p-12 text-center">
            <p className="text-white/40 text-sm">
              Step {step + 1} content — coming soon
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Protocol Builder</h1>
        <p className="text-sm text-white/60">
          Create a new treatment protocol
        </p>
      </div>

      {/* Stepper */}
      <StepProgress current={step} />

      {/* Step Content */}
      {renderStepContent()}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white/60 border border-gray-700/50 hover:bg-gray-700/30 disabled:opacity-30 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Loader2 className="w-3 h-3 animate-spin" />
          Auto-saved
        </div>

        <button
          onClick={() => setStep(Math.min(7, step + 1))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-400 hover:bg-green-500 text-gray-900 transition-colors duration-200"
        >
          {step === 7 ? (
            <>
              <Check className="w-4 h-4" />
              Save Protocol
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
