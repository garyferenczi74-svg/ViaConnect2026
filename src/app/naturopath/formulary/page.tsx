"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  X,
  AlertTriangle,
  Plus,
  Minus,
  ShieldAlert,
  FlaskConical,
  Leaf,
  BookOpen,
  Baby,
  Pill,
  Beaker,
  GripVertical,
} from "lucide-react";

/* ───────── Types & Data ───────── */

interface Herb {
  id: string;
  common: string;
  latin: string;
  actions: string[];
  energetics: string;
  contraindications: number;
  contraSeverity: "yellow" | "red";
  farmMatch: string | null;
  system: string;
  preparation: string;
  pharmacology: string;
  traditional: string;
  evidence: string;
  dosage: Record<string, string>;
  contraList: string[];
  drugInteractions: string[];
  pregnancy: string;
}

const herbs: Herb[] = [
  {
    id: "1", common: "Ashwagandha", latin: "Withania somnifera", actions: ["Adaptogen", "Nervine"], energetics: "Warm, Sweet, Bitter",
    contraindications: 1, contraSeverity: "yellow", farmMatch: "RELAX+", system: "Nervous", preparation: "Capsule",
    pharmacology: "Withanolides modulate GABAergic pathways and inhibit cortisol via HPA axis regulation. Anabolic activity via withanone.",
    traditional: "Rasayana (rejuvenative) in Ayurveda. Used for Vata disorders, debility, and reproductive health for 3,000+ years.",
    evidence: "15 RCTs demonstrate anxiolytic effects. KSM-66 extract shows significant cortisol reduction (p<0.01) and improved sleep quality.",
    dosage: { "Capsule (extract)": "300-600mg KSM-66 daily", "Root powder": "3-6g daily in warm milk", "Tincture 1:3": "2-4mL three times daily" },
    contraList: ["Thyroid disorders (may increase T4)", "Nightshade sensitivity"], drugInteractions: ["Thyroid medications", "Immunosuppressants", "Sedatives (additive)"], pregnancy: "Avoid during pregnancy. Limited lactation data.",
  },
  {
    id: "2", common: "Rhodiola", latin: "Rhodiola rosea", actions: ["Adaptogen", "Nootropic"], energetics: "Cool, Sweet, Astringent",
    contraindications: 1, contraSeverity: "yellow", farmMatch: "RISE+", system: "Nervous", preparation: "Capsule",
    pharmacology: "Rosavins and salidroside modulate serotonin and dopamine via MAO inhibition. Enhances mitochondrial ATP production.",
    traditional: "Siberian folk medicine for fatigue, altitude sickness, and mental performance. Scandinavian Viking tonic.",
    evidence: "Multiple RCTs showing reduced mental fatigue and improved cognitive function under stress conditions.",
    dosage: { "Standardized extract": "200-400mg daily (3% rosavins)", "Tincture 1:5": "1-3mL twice daily" },
    contraList: ["Bipolar disorder (may trigger mania)"], drugInteractions: ["SSRIs (serotonin syndrome risk)", "Stimulants"], pregnancy: "Insufficient data. Avoid.",
  },
  {
    id: "3", common: "Passionflower", latin: "Passiflora incarnata", actions: ["Anxiolytic", "Sedative"], energetics: "Cool, Bitter",
    contraindications: 1, contraSeverity: "yellow", farmMatch: "RELAX+", system: "Nervous", preparation: "Tincture",
    pharmacology: "Chrysin and vitexin bind GABA-A receptors. Inhibits MAO to increase serotonin availability.",
    traditional: "Native American sedative. European pharmacopoeia for anxiety and insomnia since 16th century.",
    evidence: "Comparable to oxazepam in GAD trial (Akhondzadeh 2001). Improves sleep quality in multiple studies.",
    dosage: { "Dried herb tea": "1-2g steeped 10min, 2-3x daily", "Tincture 1:5": "1-4mL at bedtime", "Capsule": "400-800mg standardized extract" },
    contraList: ["Concurrent sedative use"], drugInteractions: ["Benzodiazepines (potentiation)", "Anticoagulants"], pregnancy: "Contraindicated — uterine stimulant.",
  },
  {
    id: "4", common: "Valerian", latin: "Valeriana officinalis", actions: ["Sedative", "Antispasmodic"], energetics: "Warm, Bitter, Pungent",
    contraindications: 1, contraSeverity: "yellow", farmMatch: null, system: "Nervous", preparation: "Capsule",
    pharmacology: "Valerenic acid inhibits GABA transaminase, increasing synaptic GABA. Isovaleric acid has direct sedative activity.",
    traditional: "Greek and Roman sedative. Hippocrates prescribed for insomnia. German Commission E approved.",
    evidence: "Meta-analysis of 16 RCTs shows improved subjective sleep quality. Effect onset after 2-4 weeks.",
    dosage: { "Standardized extract": "300-600mg 30min before bed", "Root decoction": "2-3g simmered 15min", "Tincture 1:5": "3-5mL at bedtime" },
    contraList: ["Liver disease (rare hepatotoxicity)"], drugInteractions: ["Sedatives/hypnotics", "Alcohol", "CYP3A4 substrates"], pregnancy: "Avoid. Insufficient safety data.",
  },
  {
    id: "5", common: "Turmeric", latin: "Curcuma longa", actions: ["Anti-inflammatory", "Hepatoprotective"], energetics: "Warm, Bitter, Pungent",
    contraindications: 2, contraSeverity: "red", farmMatch: "FLEX+", system: "Musculoskeletal", preparation: "Capsule",
    pharmacology: "Curcumin inhibits NF-κB, COX-2, and LOX pathways. Phase II detox support via Nrf2 activation.",
    traditional: "Ayurvedic anti-inflammatory for 4,000+ years. TCM blood-mover for pain and stagnation.",
    evidence: "300+ clinical trials. Non-inferior to ibuprofen for OA pain. Significant hsCRP reduction.",
    dosage: { "Curcumin extract": "500-1000mg with piperine daily", "Golden paste": "1 tsp 2-3x daily", "Tincture 1:3": "2-4mL three times daily" },
    contraList: ["Gallstones", "Anticoagulant therapy"], drugInteractions: ["Warfarin (bleeding risk)", "Antiplatelet drugs", "Sulfasalazine"], pregnancy: "Culinary amounts safe. Supplemental doses — avoid.",
  },
  {
    id: "6", common: "Milk Thistle", latin: "Silybum marianum", actions: ["Hepatoprotective", "Antioxidant"], energetics: "Cool, Bitter",
    contraindications: 0, contraSeverity: "yellow", farmMatch: null, system: "Hepatic", preparation: "Capsule",
    pharmacology: "Silymarin complex stabilizes hepatocyte membranes. Promotes glutathione synthesis and protein synthesis in liver cells.",
    traditional: "European liver remedy since ancient Greece. Pliny the Elder documented its use for bile disorders.",
    evidence: "Strong evidence for alcoholic liver disease and hepatotoxin exposure. Moderate evidence for NAFLD.",
    dosage: { "Standardized extract": "200-400mg silymarin daily", "Seed tea": "1 tbsp crushed seeds, steep 20min", "Tincture 1:3": "3-5mL three times daily" },
    contraList: [], drugInteractions: ["CYP2C9 substrates (mild)", "Metronidazole"], pregnancy: "Likely safe. Traditional galactagogue.",
  },
  {
    id: "7", common: "Echinacea", latin: "Echinacea purpurea", actions: ["Immunostimulant", "Anti-infective"], energetics: "Cool, Pungent",
    contraindications: 1, contraSeverity: "yellow", farmMatch: null, system: "Immune", preparation: "Tincture",
    pharmacology: "Alkylamides activate macrophages and NK cells. Polysaccharides enhance phagocytosis. Caffeic acid derivatives provide antiviral activity.",
    traditional: "Plains Indians used for wounds, snakebites, and infections. Eclectics adopted it in 1880s.",
    evidence: "Cochrane review: reduces cold duration by 1-4 days. Most effective when started early.",
    dosage: { "Tincture 1:5": "2-5mL every 2-3hrs acute, 3x daily tonic", "Capsule": "500-1000mg three times daily", "Root decoction": "1-2g simmered 10min" },
    contraList: ["Autoimmune conditions"], drugInteractions: ["Immunosuppressants (antagonism)", "CYP3A4 substrates"], pregnancy: "Short-term use likely safe.",
  },
  {
    id: "8", common: "Ginger", latin: "Zingiber officinale", actions: ["Carminative", "Anti-emetic"], energetics: "Hot, Pungent",
    contraindications: 1, contraSeverity: "yellow", farmMatch: null, system: "Digestive", preparation: "Tea",
    pharmacology: "Gingerols and shogaols inhibit serotonin receptors (5-HT3) in gut. Prokinetic via cholinergic stimulation.",
    traditional: "Ayurvedic 'universal medicine.' TCM warming digestive. Used globally for >5,000 years.",
    evidence: "Strong evidence for nausea (NNT=6 for pregnancy nausea). Moderate evidence for OA pain.",
    dosage: { "Fresh root tea": "2-4g sliced, steep 10min", "Dried powder": "250-500mg capsule 3x daily", "Tincture 1:5": "1-2mL three times daily" },
    contraList: ["Active peptic ulcer"], drugInteractions: ["Anticoagulants (mild)", "Antidiabetics (potentiation)"], pregnancy: "Safe up to 1g/day for nausea.",
  },
  {
    id: "9", common: "Bacopa", latin: "Bacopa monnieri", actions: ["Nootropic", "Anxiolytic"], energetics: "Cool, Bitter, Sweet",
    contraindications: 0, contraSeverity: "yellow", farmMatch: "FOCUS+", system: "Nervous", preparation: "Capsule",
    pharmacology: "Bacosides enhance dendritic branching and synaptic activity in hippocampus. Upregulates tryptophan hydroxylase and serotonin transporter.",
    traditional: "Ayurvedic Medhya Rasayana — primary brain tonic. Used for learning and memory for 3,000+ years.",
    evidence: "12-week RCTs show significant memory consolidation improvement. Effect requires 8-12 weeks onset.",
    dosage: { "Standardized extract": "300-450mg (45% bacosides) daily", "Leaf powder": "5-10g daily in ghee", "Syrup": "10-20mL daily" },
    contraList: [], drugInteractions: ["Acetylcholinesterase inhibitors", "Thyroid medications (may increase T4)"], pregnancy: "Insufficient data. Avoid.",
  },
  {
    id: "10", common: "St. John's Wort", latin: "Hypericum perforatum", actions: ["Antidepressant", "Nervine"], energetics: "Cool, Bitter, Astringent",
    contraindications: 3, contraSeverity: "red", farmMatch: null, system: "Nervous", preparation: "Capsule",
    pharmacology: "Hyperforin inhibits reuptake of serotonin, norepinephrine, dopamine, GABA, and glutamate. Potent CYP3A4 inducer.",
    traditional: "European wound herb since ancient Greece. 'Drive away evil spirits.' Antidepressant use since 1980s.",
    evidence: "Cochrane: equivalent to SSRIs for mild-moderate depression with fewer side effects. Strong evidence base.",
    dosage: { "Standardized extract": "300mg (0.3% hypericin) three times daily", "Tincture 1:5": "2-4mL three times daily" },
    contraList: ["Concurrent SSRI use", "Photosensitivity conditions", "Organ transplant recipients"], drugInteractions: ["SSRIs (serotonin syndrome)", "Oral contraceptives", "Warfarin", "Cyclosporine", "HIV protease inhibitors"], pregnancy: "Avoid. Uterotonic potential.",
  },
  {
    id: "11", common: "Black Cohosh", latin: "Actaea racemosa", actions: ["Hormone modulator", "Antispasmodic"], energetics: "Cool, Bitter",
    contraindications: 2, contraSeverity: "red", farmMatch: "BALANCE+", system: "Endocrine", preparation: "Capsule",
    pharmacology: "Triterpene glycosides modulate serotonin receptors. Does NOT bind estrogen receptors (revised understanding). Dopaminergic activity.",
    traditional: "Eclectic medicine staple for women's health. Native American labor aid and musculoskeletal remedy.",
    evidence: "Effective for vasomotor menopausal symptoms in multiple RCTs. German Commission E approved.",
    dosage: { "Standardized extract": "20-40mg daily", "Tincture 1:10": "0.4-2mL three times daily" },
    contraList: ["Liver disease", "Hormone-sensitive conditions"], drugInteractions: ["Hepatotoxic drugs", "Tamoxifen (theoretical)"], pregnancy: "Contraindicated except during labor (traditional use).",
  },
  {
    id: "12", common: "Licorice Root", latin: "Glycyrrhiza glabra", actions: ["Demulcent", "Adaptogen"], energetics: "Neutral, Sweet",
    contraindications: 2, contraSeverity: "red", farmMatch: null, system: "Digestive", preparation: "Tea",
    pharmacology: "Glycyrrhizin inhibits 11β-HSD2, increasing cortisol half-life. Carbenoxolone promotes mucin secretion.",
    traditional: "TCM harmonizer in >50% of classical formulas. Ayurvedic Yashtimadhu for voice and gut.",
    evidence: "Effective for functional dyspepsia and peptic ulcer. Deglycyrrhizinated (DGL) form preferred for long-term use.",
    dosage: { "DGL chewable": "380-760mg before meals", "Root decoction": "1-4g simmered 15min", "Tincture 1:5": "2-5mL three times daily" },
    contraList: ["Hypertension", "Hypokalemia"], drugInteractions: ["Diuretics (potassium loss)", "Corticosteroids", "Digoxin", "Antihypertensives"], pregnancy: "Avoid. Premature labor risk at high doses.",
  },
];

const systems = ["All", "Nervous", "Musculoskeletal", "Hepatic", "Immune", "Digestive", "Endocrine"];
const actionFilters = ["All", "Adaptogen", "Nervine", "Sedative", "Anti-inflammatory", "Hepatoprotective", "Immunostimulant", "Nootropic", "Anxiolytic", "Carminative", "Antidepressant", "Demulcent", "Hormone modulator"];
const preparations = ["All", "Capsule", "Tincture", "Tea"];
const energeticsFilter = ["All", "Warm", "Cool", "Hot", "Neutral"];

/* ───────── Page ───────── */

export default function FormularyPage() {
  const [search, setSearch] = useState("");
  const [system, setSystem] = useState("All");
  const [action, setAction] = useState("All");
  const [prep, setPrep] = useState("All");
  const [energy, setEnergy] = useState("All");
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formula, setFormula] = useState<{ herb: Herb; ratio: number }[]>([]);

  const filtered = useMemo(() => {
    return herbs.filter((h) => {
      const q = search.toLowerCase();
      const matchSearch = !q || h.common.toLowerCase().includes(q) || h.latin.toLowerCase().includes(q) || h.actions.some((a) => a.toLowerCase().includes(q));
      const matchSystem = system === "All" || h.system === system;
      const matchAction = action === "All" || h.actions.includes(action);
      const matchPrep = prep === "All" || h.preparation === prep;
      const matchEnergy = energy === "All" || h.energetics.toLowerCase().includes(energy.toLowerCase());
      return matchSearch && matchSystem && matchAction && matchPrep && matchEnergy;
    });
  }, [search, system, action, prep, energy]);

  const addToFormula = (herb: Herb) => {
    if (!formula.find((f) => f.herb.id === herb.id)) {
      setFormula((p) => [...p, { herb, ratio: 1 }]);
      setFormulaOpen(true);
    }
  };

  const removeFromFormula = (id: string) => setFormula((p) => p.filter((f) => f.herb.id !== id));
  const updateRatio = (id: string, ratio: number) => setFormula((p) => p.map((f) => (f.herb.id === id ? { ...f, ratio: Math.max(0.5, ratio) } : f)));
  const totalRatio = formula.reduce((sum, f) => sum + f.ratio, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Leaf className="w-6 h-6 text-green-400" /> Botanical Formulary
      </h1>

      {/* Search */}
      <div className="w-full bg-gray-800/50 border border-gray-600/50 focus-within:border-green-400/50 focus-within:ring-1 focus-within:ring-green-400/20 rounded-xl px-4 py-3 flex items-center gap-3 transition-all">
        <Search className="w-5 h-5 text-white/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by herb name, Latin binomial, or condition..." className="bg-transparent text-white placeholder:text-white/30 flex-1 text-sm outline-none" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Body System", value: system, set: setSystem, options: systems },
          { label: "Action", value: action, set: setAction, options: actionFilters },
          { label: "Preparation", value: prep, set: setPrep, options: preparations },
          { label: "Energetics", value: energy, set: setEnergy, options: energeticsFilter },
        ].map((f) => (
          <div key={f.label} className="relative">
            <select
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="appearance-none bg-gray-800/50 border border-gray-700/50 rounded-lg pl-3 pr-8 py-2 text-xs text-white/70 outline-none focus:border-green-400/50 cursor-pointer"
            >
              {f.options.map((o) => (
                <option key={o} value={o}>{o === "All" ? `${f.label}: All` : o}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Grid + Slide-over */}
      <div className="flex gap-6">
        <div className={`flex-1 min-w-0 transition-all duration-300 ${selectedHerb ? "lg:mr-0" : ""}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHerb(h)}
                className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-5 text-left hover:bg-green-400/5 transition-all duration-200 ${
                  selectedHerb?.id === h.id ? "border-green-400/50 ring-1 ring-green-400/20" : "border-green-400/15"
                }`}
              >
                <h3 className="text-base font-medium text-white">{h.common}</h3>
                <p className="text-sm italic text-green-400 mb-2">{h.latin}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {h.actions.map((a) => (
                    <span key={a} className="bg-green-400/10 text-green-400 text-[10px] font-medium px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
                <p className="text-xs text-white/40 mb-2">{h.energetics}</p>
                <div className="flex items-center justify-between">
                  {h.contraindications > 0 ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${h.contraSeverity === "red" ? "bg-red-400/20 text-red-400" : "bg-yellow-400/20 text-yellow-400"}`}>
                      <AlertTriangle className="w-3 h-3" /> {h.contraindications}
                    </span>
                  ) : <span />}
                  {h.farmMatch && (
                    <span className="text-[10px] text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> In {h.farmMatch}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Monograph Slide-over */}
        {selectedHerb && (
          <div className="hidden lg:block w-[480px] shrink-0 bg-gray-800/50 backdrop-blur-sm border border-green-400/15 rounded-xl overflow-y-auto max-h-[calc(100vh-12rem)] sticky top-20">
            <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedHerb.common}</h2>
                <p className="text-sm italic text-green-400">{selectedHerb.latin}</p>
              </div>
              <button onClick={() => setSelectedHerb(null)} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {[
                { icon: FlaskConical, title: "Pharmacology", content: selectedHerb.pharmacology },
                { icon: BookOpen, title: "Traditional Uses", content: selectedHerb.traditional },
                { icon: Beaker, title: "Evidence", content: selectedHerb.evidence },
              ].map((s) => (
                <div key={s.title}>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <s.icon className="w-3.5 h-3.5" /> {s.title}
                  </h4>
                  <p className="text-xs text-white/70 leading-relaxed">{s.content}</p>
                </div>
              ))}

              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Pill className="w-3.5 h-3.5" /> Dosage by Preparation
                </h4>
                <div className="space-y-1.5">
                  {Object.entries(selectedHerb.dosage).map(([form, dose]) => (
                    <div key={form} className="flex justify-between text-xs bg-gray-900/40 rounded-lg px-3 py-2">
                      <span className="text-white/60">{form}</span>
                      <span className="text-green-400 font-medium">{dose}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedHerb.contraList.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-400/80 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Contraindications
                  </h4>
                  <ul className="space-y-1">
                    {selectedHerb.contraList.map((c) => (
                      <li key={c} className="text-xs text-white/60 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-yellow-400/80 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Drug Interactions
                </h4>
                <ul className="space-y-1">
                  {selectedHerb.drugInteractions.map((d) => (
                    <li key={d} className="text-xs text-white/60 flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-yellow-400 mt-1.5 shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Baby className="w-3.5 h-3.5" /> Pregnancy / Lactation
                </h4>
                <p className="text-xs text-white/60">{selectedHerb.pregnancy}</p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-700/50">
              <button
                onClick={() => addToFormula(selectedHerb)}
                className="w-full bg-green-400 hover:bg-green-500 text-gray-900 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add to Protocol
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formula Builder Drawer */}
      {formula.length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 md:left-64 z-40 transition-all duration-300 ${formulaOpen ? "max-h-80" : "max-h-14"}`}>
          <div className="bg-gray-800 border-t border-green-400/15 shadow-2xl">
            <button onClick={() => setFormulaOpen(!formulaOpen)} className="w-full px-5 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-white/30" />
                <span className="font-semibold text-white">Formula Builder</span>
                <span className="bg-green-400/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{formula.length} herbs</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${formulaOpen ? "rotate-180" : ""}`} />
            </button>

            {formulaOpen && (
              <div className="px-5 pb-4 space-y-3 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {formula.map((f) => (
                    <div key={f.herb.id} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2">
                      <span className="text-xs text-white font-medium flex-1 truncate">{f.herb.common}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateRatio(f.herb.id, f.ratio - 0.5)} className="text-white/30 hover:text-white"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs text-green-400 font-bold w-6 text-center">{f.ratio}</span>
                        <button onClick={() => updateRatio(f.herb.id, f.ratio + 0.5)} className="text-white/30 hover:text-white"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-[10px] text-white/30">{totalRatio > 0 ? Math.round((f.ratio / totalRatio) * 100) : 0}%</span>
                      <button onClick={() => removeFromFormula(f.herb.id)} className="text-white/20 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <span className="text-xs text-white/40">Total ratio: {totalRatio} parts</span>
                  <div className="flex gap-2">
                    <button className="text-xs text-yellow-400 hover:underline flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Check Interactions
                    </button>
                    <button className="bg-green-400 text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-green-500 transition-colors">
                      Save Formula
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
