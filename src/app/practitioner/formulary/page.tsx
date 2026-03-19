"use client";

import { useState, useMemo, useCallback } from "react";
import { herbs, Herb } from "@/data/herbs";
import HerbCard from "@/components/HerbCard";
import MonographSlideOver from "@/components/MonographSlideOver";
import FormulaBuilderDrawer from "@/components/FormulaBuilderDrawer";

const BODY_SYSTEMS = ["Nervous", "Immune", "GI", "Endocrine", "Respiratory", "Circulatory", "Reproductive", "Musculoskeletal", "Hepatic"];
const ACTIONS = ["Adaptogen", "Nervine", "Nootropic", "Antidepressant", "Immunostimulant", "Anti-inflammatory", "Hepatoprotective", "Carminative", "Sedative", "Demulcent", "Spasmolytic", "Antioxidant", "Antimicrobial", "Anti-emetic", "Anxiolytic", "Bitter", "Cholagogue", "Expectorant", "Hormone-modulating", "Antispasmodic"];
const PREPARATIONS = ["Tincture", "Capsule", "Tea", "Powder"];
const ENERGETICS_OPTIONS = ["Warming", "Cooling", "Drying", "Moistening"];

interface FormulaHerb {
  herb: Herb;
  ratio: number;
  doseML: number;
}

export default function FormularyPage() {
  const [search, setSearch] = useState("");
  const [selectedBodySystem, setSelectedBodySystem] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedPreparation, setSelectedPreparation] = useState("");
  const [selectedEnergetics, setSelectedEnergetics] = useState("");
  const [activeFilters, setActiveFilters] = useState<{ type: string; value: string }[]>([]);
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [formulaHerbs, setFormulaHerbs] = useState<FormulaHerb[]>([]);
  const [formulaExpanded, setFormulaExpanded] = useState(false);

  const addFilter = useCallback((type: string, value: string) => {
    if (!value) return;
    setActiveFilters((prev) => {
      if (prev.some((f) => f.type === type && f.value === value)) return prev;
      return [...prev, { type, value }];
    });
    if (type === "Body System") setSelectedBodySystem("");
    if (type === "Action") setSelectedAction("");
    if (type === "Preparation") setSelectedPreparation("");
    if (type === "Energetics") setSelectedEnergetics("");
  }, []);

  const removeFilter = useCallback((type: string, value: string) => {
    setActiveFilters((prev) => prev.filter((f) => !(f.type === type && f.value === value)));
  }, []);

  const filteredHerbs = useMemo(() => {
    return herbs.filter((herb) => {
      const q = search.toLowerCase();
      if (q && !herb.commonName.toLowerCase().includes(q) && !herb.latinName.toLowerCase().includes(q) && !herb.actions.some((a) => a.toLowerCase().includes(q)) && !herb.bodySystem.some((b) => b.toLowerCase().includes(q))) {
        return false;
      }
      for (const filter of activeFilters) {
        if (filter.type === "Body System" && !herb.bodySystem.includes(filter.value)) return false;
        if (filter.type === "Action" && !herb.actions.includes(filter.value)) return false;
        if (filter.type === "Preparation" && !herb.preparation.includes(filter.value)) return false;
        if (filter.type === "Energetics" && !herb.energetics.toLowerCase().includes(filter.value.toLowerCase())) return false;
      }
      return true;
    });
  }, [search, activeFilters]);

  const addToFormula = useCallback((herb: Herb) => {
    setFormulaHerbs((prev) => {
      if (prev.some((f) => f.herb.id === herb.id)) return prev;
      return [...prev, { herb, ratio: 1, doseML: 2 }];
    });
  }, []);

  const removeFromFormula = useCallback((herbId: string) => {
    setFormulaHerbs((prev) => prev.filter((f) => f.herb.id !== herbId));
  }, []);

  const updateFormulaDose = useCallback((herbId: string, doseML: number) => {
    setFormulaHerbs((prev) => prev.map((f) => (f.herb.id === herbId ? { ...f, doseML } : f)));
  }, []);

  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7]">
      {/* Top Navigation */}
      <header className="bg-[#0c1322] flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-[#3d4a3e]/15">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-[#6bfb9a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h1 className="text-xl font-bold tracking-tighter text-[#6bfb9a]">The Clinical Nexus</h1>
        </div>
        <div className="hidden md:flex gap-8 items-center">
          <nav className="flex gap-6">
            <a className="font-bold text-[#6bfb9a] uppercase text-sm tracking-tight" href="#">Database</a>
            <a className="font-bold text-[#dce2f7]/60 uppercase text-sm tracking-tight hover:text-[#6bfb9a] transition-colors" href="#">Formulary</a>
            <a className="font-bold text-[#dce2f7]/60 uppercase text-sm tracking-tight hover:text-[#6bfb9a] transition-colors" href="#">Builder</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-[#4ade80] text-[#003919] font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-[#6bfb9a] transition-colors shadow-lg shadow-[#4ade80]/20">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Formula
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10 mb-24">
        {/* Dashboard Header */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tight mb-2">
                Botanical Formulary <span className="text-[#4ade80]/50 text-xl font-medium">v4.2</span>
              </h2>
              <p className="text-[#bccabb] text-sm max-w-xl">
                Comprehensive clinical repository of botanical therapeutics. Cross-referenced with PubMed evidence and FarmCeutica formulation standards.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4ade80]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by herb name, Latin binomial, or condition..."
              className="w-full bg-[#2e3545]/40 backdrop-blur-sm border border-[#3d4a3e]/30 rounded-xl pl-12 pr-4 py-3.5 text-sm text-[#dce2f7] placeholder-[#bccabb]/40 focus:outline-none focus:border-[#4ade80]/50 focus:ring-1 focus:ring-[#4ade80]/30 transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 mt-3">
            <FilterDropdown
              label="Body System"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>}
              options={BODY_SYSTEMS}
              value={selectedBodySystem}
              onChange={(v) => { setSelectedBodySystem(v); addFilter("Body System", v); }}
            />
            <FilterDropdown
              label="Action"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
              options={ACTIONS}
              value={selectedAction}
              onChange={(v) => { setSelectedAction(v); addFilter("Action", v); }}
            />
            <FilterDropdown
              label="Preparation"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>}
              options={PREPARATIONS}
              value={selectedPreparation}
              onChange={(v) => { setSelectedPreparation(v); addFilter("Preparation", v); }}
            />
            <FilterDropdown
              label="Energetics"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>}
              options={ENERGETICS_OPTIONS}
              value={selectedEnergetics}
              onChange={(v) => { setSelectedEnergetics(v); addFilter("Energetics", v); }}
            />
          </div>

          {/* Active Filter Pills */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map((f) => (
                <span key={`${f.type}-${f.value}`} className="inline-flex items-center gap-1.5 bg-[#4ade80]/10 text-[#4ade80] text-xs font-bold px-3 py-1.5 rounded-full border border-[#4ade80]/20">
                  <span className="text-[#4ade80]/60 text-[10px] uppercase">{f.type}:</span> {f.value}
                  <button onClick={() => removeFilter(f.type, f.value)} className="ml-1 hover:text-white transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button onClick={() => setActiveFilters([])} className="text-xs text-[#bccabb]/60 hover:text-[#4ade80] transition-colors px-2">
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* Herb Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHerbs.map((herb) => (
            <HerbCard
              key={herb.id}
              herb={herb}
              onClick={() => setSelectedHerb(herb)}
            />
          ))}
          {filteredHerbs.length === 0 && (
            <div className="col-span-full text-center py-20 text-[#bccabb]/40">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm font-medium">No herbs match your search criteria</p>
              <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
            </div>
          )}
        </div>
      </main>

      {/* Monograph Slide-Over */}
      <MonographSlideOver
        herb={selectedHerb}
        onClose={() => setSelectedHerb(null)}
        onAddToProtocol={(herb) => {
          addToFormula(herb);
          setSelectedHerb(null);
        }}
      />

      {/* Formula Builder Drawer */}
      <FormulaBuilderDrawer
        formulaHerbs={formulaHerbs}
        expanded={formulaExpanded}
        onToggleExpand={() => setFormulaExpanded(!formulaExpanded)}
        onRemove={removeFromFormula}
        onUpdateDose={updateFormulaDose}
      />
    </div>
  );
}

function FilterDropdown({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#232a3a] px-4 py-2 pl-9 pr-8 rounded-lg text-xs font-bold uppercase tracking-widest border border-[#3d4a3e]/10 hover:border-[#4ade80]/40 transition-all text-[#dce2f7] cursor-pointer focus:outline-none focus:border-[#4ade80]/50"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4ade80]/60 pointer-events-none">
        {icon}
      </div>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#bccabb]/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}
