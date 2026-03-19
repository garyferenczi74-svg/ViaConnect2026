"use client";

import { Herb } from "@/data/herbs";

interface FormulaHerb {
  herb: Herb;
  ratio: number;
  doseML: number;
}

interface FormulaBuilderDrawerProps {
  formulaHerbs: FormulaHerb[];
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: (herbId: string) => void;
  onUpdateDose: (herbId: string, doseML: number) => void;
}

export default function FormulaBuilderDrawer({
  formulaHerbs,
  expanded,
  onToggleExpand,
  onRemove,
  onUpdateDose,
}: FormulaBuilderDrawerProps) {
  const totalVolume = formulaHerbs.reduce((sum, f) => sum + f.doseML, 0);

  return (
    <footer
      className="fixed bottom-0 left-0 w-full z-50 border-t border-[#3d4a3e]/15 shadow-[0px_-10px_30px_rgba(0,0,0,0.5)]"
      style={{ background: "rgba(12, 19, 34, 0.8)", backdropFilter: "blur(20px)" }}
    >
      {/* Expanded Panel */}
      {expanded && formulaHerbs.length > 0 && (
        <div className="max-w-[1600px] mx-auto px-6 py-6 border-b border-[#3d4a3e]/15">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {formulaHerbs.map((fh) => (
              <div
                key={fh.herb.id}
                className="flex items-center gap-4 bg-[#232a3a]/60 rounded-xl p-4 border border-[#3d4a3e]/15"
              >
                <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-[#4ade80]">
                    {fh.herb.commonName.slice(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#dce2f7] truncate">{fh.herb.commonName}</p>
                  <p className="text-[10px] italic text-[#4ade80]/60">{fh.herb.latinName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={fh.doseML}
                    onChange={(e) => onUpdateDose(fh.herb.id, parseFloat(e.target.value) || 0.5)}
                    className="w-16 bg-[#0c1322] border border-[#3d4a3e]/30 rounded-lg px-2 py-1 text-xs text-center text-[#4ade80] font-mono focus:outline-none focus:border-[#4ade80]/50"
                  />
                  <span className="text-[10px] text-[#bccabb]/60 font-mono">mL</span>
                </div>
                <button
                  onClick={() => onRemove(fh.herb.id)}
                  className="text-[#bccabb]/40 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed Bar */}
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            {/* Herb Avatars */}
            <div className="flex -space-x-3">
              {formulaHerbs.slice(0, 3).map((fh) => (
                <div
                  key={fh.herb.id}
                  className="w-10 h-10 rounded-full bg-[#4ade80]/10 border-2 border-[#0c1322] shadow-xl flex items-center justify-center"
                >
                  <span className="text-[10px] font-black text-[#4ade80]">
                    {fh.herb.commonName.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              ))}
              {formulaHerbs.length > 3 && (
                <div className="w-10 h-10 rounded-full bg-[#2e3545] border-2 border-[#0c1322] shadow-xl flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#bccabb]">+{formulaHerbs.length - 3}</span>
                </div>
              )}
              {formulaHerbs.length === 0 && (
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#4ade80]/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#4ade80]">Formula Builder</p>
              <p className="text-xs text-[#bccabb]">
                {formulaHerbs.length} herb{formulaHerbs.length !== 1 ? "s" : ""} selected
                {formulaHerbs.length > 0 && (
                  <> • <span className="font-mono">{totalVolume.toFixed(1)} mL</span> total vol.</>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {formulaHerbs.length > 0 && (
            <button
              onClick={onToggleExpand}
              className="text-[#dce2f7]/40 hover:text-[#4ade80] transition-colors px-3 py-1.5"
            >
              <svg className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          )}
          <div className="h-8 w-px bg-[#3d4a3e]/20 mx-2" />
          <button className="bg-[#6bfb9a]/10 text-[#6bfb9a] rounded-xl px-6 py-3 shadow-[0_0_15px_rgba(107,251,154,0.2)] font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#6bfb9a]/20 active:translate-y-0.5 transition-all">
            Save Formula
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
