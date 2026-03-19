"use client";

import { useEffect } from "react";
import { Herb } from "@/data/herbs";

interface MonographSlideOverProps {
  herb: Herb | null;
  onClose: () => void;
  onAddToProtocol: (herb: Herb) => void;
}

export default function MonographSlideOver({ herb, onClose, onAddToProtocol }: MonographSlideOverProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (herb) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [herb, onClose]);

  if (!herb) return null;

  const pregnancyLabel =
    herb.pregnancySafety === "safe" ? "Generally Safe" :
    herb.pregnancySafety === "caution" ? "Use with Caution" : "Avoid";
  const pregnancyColor =
    herb.pregnancySafety === "safe" ? "text-[#4ade80] bg-[#4ade80]/10 border-[#4ade80]/20" :
    herb.pregnancySafety === "caution" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
    "text-red-400 bg-red-400/10 border-red-400/20";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] animate-fadeIn"
        onClick={onClose}
        style={{ animation: "fadeIn 200ms ease-out" }}
      />

      {/* Panel */}
      <aside
        className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-[#141b2b] border-l border-[#3d4a3e]/20 z-50 shadow-2xl flex flex-col animate-slideIn"
        style={{ animation: "slideIn 300ms ease-out" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#3d4a3e]/10 flex justify-between items-center bg-[#232a3a]">
          <div>
            <h3 className="text-2xl font-black text-[#4ade80] tracking-tighter uppercase">
              {herb.commonName}
            </h3>
            <p className="text-xs font-mono uppercase tracking-widest text-[#dce2f7]/60">
              Complete Clinical Monograph
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-[#2e3545] flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10" style={{ scrollbarWidth: "thin", scrollbarColor: "#3d4a3e transparent" }}>
          {/* Latin Name & Pregnancy Badge */}
          <div className="flex items-center justify-between">
            <p className="text-sm italic text-[#4ade80]/70">{herb.latinName}</p>
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${pregnancyColor}`}>
              Pregnancy: {pregnancyLabel}
            </span>
          </div>

          {/* Pharmacology */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-4">Pharmacology</h4>
            <p className="text-sm leading-relaxed text-[#bccabb]">{herb.pharmacology}</p>
          </section>

          {/* Traditional Uses */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-4">Traditional Uses</h4>
            <ul className="space-y-2">
              {herb.traditionalUses.map((use, i) => (
                <li key={i} className="text-sm text-[#bccabb] flex gap-2">
                  <span className="text-[#4ade80]/40 mt-1">•</span>
                  {use}
                </li>
              ))}
            </ul>
          </section>

          {/* Modern Evidence */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-4">Modern Evidence (PubMed)</h4>
            <div className="space-y-3">
              {herb.modernEvidence.map((evidence, i) => (
                <div key={i} className="bg-[#0c1322] p-4 rounded-xl border-l-4 border-[#4ade80]/40">
                  <p className="text-xs font-bold text-[#dce2f7] mb-1">{evidence.title}</p>
                  <p className="text-[10px] text-[#bccabb]/60 font-mono uppercase">
                    PMID: {evidence.pmid}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Dosage Table */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#4ade80] mb-4">Dosing Matrix</h4>
            <div className="overflow-hidden rounded-xl bg-[#0c1322]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#2e3545]/50">
                    <th className="p-3 font-bold text-[#dce2f7]">Preparation</th>
                    <th className="p-3 font-bold text-[#dce2f7]">Dose</th>
                    <th className="p-3 font-bold text-[#dce2f7]">Frequency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d4a3e]/10 font-mono">
                  {herb.dosage.map((d, i) => (
                    <tr key={i}>
                      <td className="p-3 text-[#bccabb]">{d.preparation}</td>
                      <td className="p-3 text-[#4ade80]">{d.dose}</td>
                      <td className="p-3 text-[#bccabb]">{d.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Contraindications */}
          {herb.contraindications.length > 0 && (
            <section className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20">
              <div className="flex items-center gap-3 mb-3 text-red-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Contraindications</h4>
              </div>
              <ul className="text-sm text-red-400/80 space-y-2 list-disc pl-4">
                {herb.contraindications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Drug Interactions */}
          {herb.drugInteractions.length > 0 && (
            <section className="bg-yellow-500/5 p-6 rounded-2xl border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-3 text-yellow-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <h4 className="text-xs font-bold uppercase tracking-[0.2em]">Drug Interactions</h4>
              </div>
              <ul className="text-sm text-yellow-400/80 space-y-2 list-disc pl-4">
                {herb.drugInteractions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#232a3a]">
          <button
            onClick={() => onAddToProtocol(herb)}
            className="w-full bg-[#4ade80] text-[#003919] font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#4ade80]/20 hover:bg-[#6bfb9a] transition-colors active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add to Protocol
          </button>
        </div>
      </aside>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
