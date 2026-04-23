"use client";

// Prompt #118 — Bottom control strip (label toggle + detail toggle).

import type { FC } from "react";
import { Tag, Layers } from "lucide-react";

interface Props {
  showLabels: boolean;
  showAnatomicalDetail: boolean;
  onToggleLabels: () => void;
  onToggleAnatomicalDetail: () => void;
}

export const GraphicControls: FC<Props> = ({
  showLabels, showAnatomicalDetail, onToggleLabels, onToggleAnatomicalDetail,
}) => {
  const toggleButton = (active: boolean, Icon: typeof Tag, label: string, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors
        ${active ? "border-[#2DA5A0] text-[#2DA5A0] bg-[#2DA5A0]/10" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
      {label}
    </button>
  );

  return (
    <div className="inline-flex gap-2 rounded-lg bg-slate-900/60 p-1 border border-slate-700">
      {toggleButton(showAnatomicalDetail, Layers, "Detail", onToggleAnatomicalDetail)}
      {toggleButton(showLabels, Tag, "Labels", onToggleLabels)}
    </div>
  );
};
