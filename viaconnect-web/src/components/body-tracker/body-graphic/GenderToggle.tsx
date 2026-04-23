"use client";

// Prompt #118 — Gender segmented control.
// Labels: "Male" / "Female" per product direction. The axis relabel to
// "Masculine frame" / "Feminine frame" is flagged for product review in §3.4
// of the prompt; no code change required here.

import type { FC } from "react";
import type { Gender } from "./BodyGraphic.types";

interface Props {
  value: Gender;
  onChange: (g: Gender) => void;
  disabled?: boolean;
}

export const GenderToggle: FC<Props> = ({ value, onChange, disabled }) => {
  const pill = (g: Gender, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === g}
      disabled={disabled}
      onClick={() => onChange(g)}
      className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${value === g ? "bg-[#2DA5A0] text-white" : "bg-transparent text-slate-300 hover:bg-slate-800"}
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );

  return (
    <div role="radiogroup" aria-label="Body gender frame" className="inline-flex gap-1 rounded-lg bg-slate-900/60 p-1 border border-slate-700">
      {pill("male", "Male")}
      {pill("female", "Female")}
    </div>
  );
};
