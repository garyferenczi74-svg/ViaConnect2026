"use client";

// Prompt #118 — Front/back view segmented control.

import type { FC } from "react";
import type { BodyView } from "./BodyGraphic.types";

interface Props {
  value: BodyView;
  onChange: (v: BodyView) => void;
  disabled?: boolean;
}

export const ViewToggle: FC<Props> = ({ value, onChange, disabled }) => {
  const pill = (v: BodyView, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === v}
      disabled={disabled}
      onClick={() => onChange(v)}
      className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${value === v ? "bg-[#2DA5A0] text-white" : "bg-transparent text-slate-300 hover:bg-slate-800"}
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );

  return (
    <div role="radiogroup" aria-label="Body view" className="inline-flex gap-1 rounded-lg bg-slate-900/60 p-1 border border-slate-700">
      {pill("front", "Front")}
      {pill("back", "Back")}
    </div>
  );
};
