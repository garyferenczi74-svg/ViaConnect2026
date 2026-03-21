"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  Search,
  Leaf,
  Plus,
  Star,
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Pill,
  CupSoda,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Herb {
  name: string;
  latin: string;
  family: string;
  partsUsed: string[];
  actions: string[];
  actionDescriptions: Record<string, string>;
  indications: string[];
  contraindications: string[];
  dosing: {
    tincture: string;
    tea: string;
    capsule: string;
  };
  evidenceRating: "Strong" | "Moderate" | "Limited" | "Traditional";
  evidenceStars: number;
}

// ---------------------------------------------------------------------------
// Category filters
// ---------------------------------------------------------------------------
const CATEGORIES = [
  "Adaptogen",
  "Nervine",
  "Hepatoprotective",
  "Anti-inflammatory",
  "Immunostimulant",
  "Carminative",
  "Diuretic",
  "Alterative",
] as const;

type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Mock herb data (15+)
// ---------------------------------------------------------------------------
const HERBS: Herb[] = [
  {
    name: "Ashwagandha",
    latin: "Withania somnifera",
    family: "Solanaceae",
    partsUsed: ["Root"],
    actions: ["Adaptogen", "Nervine", "Anti-inflammatory"],
    actionDescriptions: {
      Adaptogen: "Modulates HPA axis, improves stress resilience and cortisol regulation.",
      Nervine: "Calms nervous system, supports GABA-ergic activity.",
      "Anti-inflammatory": "Inhibits NF-kB pathway, reduces CRP and inflammatory cytokines.",
    },
    indications: ["Chronic stress", "Fatigue", "Anxiety", "Adrenal insufficiency", "Insomnia", "Cognitive decline"],
    contraindications: [],
    dosing: { tincture: "1:5, 45% ethanol, 2-4 mL TID", tea: "1-2 tsp root per cup, decoct 15 min", capsule: "600-1200 mg standardized extract daily" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Turmeric",
    latin: "Curcuma longa",
    family: "Zingiberaceae",
    partsUsed: ["Rhizome"],
    actions: ["Anti-inflammatory", "Hepatoprotective", "Antioxidant"],
    actionDescriptions: {
      "Anti-inflammatory": "Curcumin inhibits COX-2, LOX, and NF-kB pathways.",
      Hepatoprotective: "Supports phase II liver detoxification and bile production.",
      Antioxidant: "Potent free radical scavenger, enhances endogenous antioxidant enzymes.",
    },
    indications: ["Joint pain", "Digestive issues", "Systemic inflammation", "Metabolic syndrome", "Liver support"],
    contraindications: ["Gallstones (use with caution)", "Concurrent anticoagulant therapy"],
    dosing: { tincture: "1:5, 70% ethanol, 2-5 mL TID", tea: "1-2 tsp grated rhizome, decoct 10 min", capsule: "500-1000 mg curcumin BID with piperine" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Milk Thistle",
    latin: "Silybum marianum",
    family: "Asteraceae",
    partsUsed: ["Seed"],
    actions: ["Hepatoprotective", "Antioxidant", "Cholagogue"],
    actionDescriptions: {
      Hepatoprotective: "Silymarin stabilises hepatocyte membranes and stimulates protein synthesis.",
      Antioxidant: "Increases glutathione and SOD levels in liver tissue.",
      Cholagogue: "Promotes bile flow and supports gallbladder function.",
    },
    indications: ["Liver disease", "Detoxification support", "Gallbladder dysfunction", "Drug-induced hepatotoxicity"],
    contraindications: ["Ragweed allergy (Asteraceae sensitivity)"],
    dosing: { tincture: "1:3, 60% ethanol, 3-5 mL TID", tea: "1 tsp crushed seed per cup, steep 15 min", capsule: "200-400 mg silymarin TID" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Echinacea",
    latin: "Echinacea purpurea",
    family: "Asteraceae",
    partsUsed: ["Root", "Aerial parts"],
    actions: ["Immunostimulant", "Anti-microbial"],
    actionDescriptions: {
      Immunostimulant: "Enhances phagocytosis, increases NK cell activity and cytokine production.",
      "Anti-microbial": "Direct anti-viral and anti-bacterial activity via alkylamides.",
    },
    indications: ["Acute upper respiratory infections", "Immune support", "Wound healing", "Recurrent infections"],
    contraindications: ["Autoimmune conditions (theoretical)", "Progressive systemic diseases"],
    dosing: { tincture: "1:5, 50% ethanol, 2-5 mL TID (acute: every 2 hours)", tea: "1-2 tsp root per cup, decoct 10 min", capsule: "500-1000 mg TID" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Valerian",
    latin: "Valeriana officinalis",
    family: "Caprifoliaceae",
    partsUsed: ["Root"],
    actions: ["Sedative", "Anxiolytic", "Spasmolytic"],
    actionDescriptions: {
      Sedative: "Valerenic acid modulates GABA-A receptors to promote sleep onset.",
      Anxiolytic: "Reduces anxiety through GABAergic mechanism without morning grogginess.",
      Spasmolytic: "Relaxes smooth and skeletal muscle spasm.",
    },
    indications: ["Insomnia", "Anxiety", "Muscle tension", "Restlessness", "Nervous digestive complaints"],
    contraindications: [],
    dosing: { tincture: "1:5, 60% ethanol, 3-5 mL at bedtime", tea: "1-2 tsp root per cup, steep 10-15 min", capsule: "300-600 mg 30-60 min before bed" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "St. John's Wort",
    latin: "Hypericum perforatum",
    family: "Hypericaceae",
    partsUsed: ["Flowering tops"],
    actions: ["Nervine", "Anti-depressant", "Anti-viral"],
    actionDescriptions: {
      Nervine: "Tropho-restorative to the nervous system; supports neuronal health.",
      "Anti-depressant": "Hypericin and hyperforin modulate serotonin, dopamine, and norepinephrine reuptake.",
      "Anti-viral": "Topical anti-viral activity demonstrated against enveloped viruses.",
    },
    indications: ["Mild to moderate depression", "Nerve pain", "Seasonal affective disorder", "Neuralgia", "Viral infections (topical)"],
    contraindications: ["MAOIs", "SSRIs / SNRIs", "Oral contraceptives", "Cyclosporin", "Warfarin", "Digoxin", "HIV protease inhibitors"],
    dosing: { tincture: "1:5, 60% ethanol, 2-4 mL TID", tea: "1-2 tsp dried herb per cup, steep 10 min", capsule: "300 mg standardized (0.3% hypericin) TID" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Ginger",
    latin: "Zingiber officinale",
    family: "Zingiberaceae",
    partsUsed: ["Rhizome"],
    actions: ["Carminative", "Anti-emetic", "Circulatory stimulant"],
    actionDescriptions: {
      Carminative: "Relaxes intestinal smooth muscle and reduces gas and bloating.",
      "Anti-emetic": "Inhibits 5-HT3 receptors in the GI tract, reduces nausea.",
      "Circulatory stimulant": "Enhances peripheral blood flow and warms the body.",
    },
    indications: ["Nausea", "Motion sickness", "Digestive sluggishness", "Cold extremities", "Morning sickness"],
    contraindications: ["Gallstones (high doses)", "Caution with anticoagulants at high doses"],
    dosing: { tincture: "1:5, 90% ethanol, 1-2 mL TID", tea: "1-2 tsp fresh grated per cup, steep 10 min", capsule: "250-500 mg QID" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Licorice",
    latin: "Glycyrrhiza glabra",
    family: "Fabaceae",
    partsUsed: ["Root"],
    actions: ["Adaptogen", "Demulcent", "Anti-viral"],
    actionDescriptions: {
      Adaptogen: "Prolongs cortisol half-life, supports adrenal function.",
      Demulcent: "Mucilaginous properties soothe inflamed mucous membranes.",
      "Anti-viral": "Glycyrrhizin demonstrates broad-spectrum anti-viral activity.",
    },
    indications: ["Adrenal fatigue", "Peptic ulcers", "Sore throat", "Viral infections", "Cough"],
    contraindications: ["Hypertension", "Pregnancy", "Hypokalaemia", "Kidney disease", "Corticosteroid therapy"],
    dosing: { tincture: "1:5, 40% ethanol, 1-3 mL TID", tea: "1 tsp root per cup, decoct 10 min", capsule: "200-600 mg daily (DGL for GI)" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Chamomile",
    latin: "Matricaria chamomilla",
    family: "Asteraceae",
    partsUsed: ["Flower"],
    actions: ["Nervine", "Carminative", "Anti-spasmodic"],
    actionDescriptions: {
      Nervine: "Apigenin binds benzodiazepine receptors, providing mild sedation.",
      Carminative: "Relieves gas, bloating, and intestinal cramping.",
      "Anti-spasmodic": "Relaxes smooth muscle in the GI tract and uterus.",
    },
    indications: ["Anxiety", "Insomnia", "Colic", "IBS", "Gastritis", "Teething (children)"],
    contraindications: ["Ragweed allergy (Asteraceae sensitivity)"],
    dosing: { tincture: "1:5, 45% ethanol, 2-4 mL TID", tea: "1-2 tsp flowers per cup, steep 5-10 min (covered)", capsule: "400-800 mg BID-TID" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Elderberry",
    latin: "Sambucus nigra",
    family: "Adoxaceae",
    partsUsed: ["Berry", "Flower"],
    actions: ["Immunostimulant", "Diaphoretic", "Anti-viral"],
    actionDescriptions: {
      Immunostimulant: "Anthocyanins stimulate cytokine production and immune cell activation.",
      Diaphoretic: "Elderflower promotes sweating during febrile illness.",
      "Anti-viral": "Flavonoids block viral attachment and entry into host cells.",
    },
    indications: ["Influenza", "Common cold", "Upper respiratory infections", "Fever management"],
    contraindications: ["Raw berries (contain cyanogenic glycosides; must be cooked)"],
    dosing: { tincture: "1:5, 25% ethanol, 5-10 mL TID", tea: "2 tsp dried berries per cup, simmer 15 min", capsule: "500-1000 mg standardized extract BID" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Dandelion",
    latin: "Taraxacum officinale",
    family: "Asteraceae",
    partsUsed: ["Root", "Leaf"],
    actions: ["Hepatoprotective", "Diuretic", "Cholagogue"],
    actionDescriptions: {
      Hepatoprotective: "Bitter principles stimulate hepatic function and bile production.",
      Diuretic: "Leaf is potassium-sparing aquaretic, gentle kidney support.",
      Cholagogue: "Root stimulates bile secretion and supports fat digestion.",
    },
    indications: ["Liver congestion", "Fluid retention", "Digestive sluggishness", "Constipation", "Skin conditions"],
    contraindications: ["Bile duct obstruction", "Gallstones (use with caution)"],
    dosing: { tincture: "1:5, 40% ethanol, 2-5 mL TID", tea: "1-2 tsp root per cup, decoct 10 min (or leaf infusion)", capsule: "500-1000 mg root BID-TID" },
    evidenceRating: "Traditional",
    evidenceStars: 3,
  },
  {
    name: "Passionflower",
    latin: "Passiflora incarnata",
    family: "Passifloraceae",
    partsUsed: ["Aerial parts"],
    actions: ["Anxiolytic", "Sedative", "Nervine"],
    actionDescriptions: {
      Anxiolytic: "Chrysin and other flavonoids modulate GABA-A receptors.",
      Sedative: "Promotes sleep without next-day drowsiness.",
      Nervine: "Calms racing thoughts and nervous tension.",
    },
    indications: ["Anxiety", "Insomnia", "Nervous restlessness", "ADHD (adjunctive)", "Withdrawal symptoms"],
    contraindications: [],
    dosing: { tincture: "1:5, 45% ethanol, 2-4 mL TID", tea: "1-2 tsp dried herb per cup, steep 10-15 min", capsule: "400-800 mg BID-TID" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Rhodiola",
    latin: "Rhodiola rosea",
    family: "Crassulaceae",
    partsUsed: ["Root"],
    actions: ["Adaptogen", "Nootropic", "Anti-fatigue"],
    actionDescriptions: {
      Adaptogen: "Rosavins and salidroside modulate stress-response mediators.",
      Nootropic: "Enhances cognitive function, working memory, and mental stamina.",
      "Anti-fatigue": "Reduces perceived exertion and improves physical endurance.",
    },
    indications: ["Mental fatigue", "Physical exhaustion", "Burnout", "Cognitive decline", "Athletic performance"],
    contraindications: ["Bipolar disorder (may trigger mania at high doses)"],
    dosing: { tincture: "1:5, 40% ethanol, 2-3 mL BID (morning and noon)", tea: "1 tsp root per cup, decoct 15 min", capsule: "200-600 mg standardized extract (3% rosavins, 1% salidroside)" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
  {
    name: "Marshmallow Root",
    latin: "Althaea officinalis",
    family: "Malvaceae",
    partsUsed: ["Root", "Leaf"],
    actions: ["Demulcent", "Emollient", "Anti-inflammatory"],
    actionDescriptions: {
      Demulcent: "High mucilage content coats and soothes irritated mucous membranes.",
      Emollient: "Softens and protects dry or inflamed tissue.",
      "Anti-inflammatory": "Mucopolysaccharides reduce local inflammation in GI and urinary tracts.",
    },
    indications: ["GERD", "Gastritis", "Dry cough", "Urinary tract irritation", "Sore throat"],
    contraindications: ["May delay absorption of oral medications (take 1 hour apart)"],
    dosing: { tincture: "1:5, 25% ethanol, 3-5 mL TID", tea: "1-2 tsp root per cup, cold infuse 4-8 hours (or decoct)", capsule: "500-1000 mg TID" },
    evidenceRating: "Traditional",
    evidenceStars: 3,
  },
  {
    name: "Nettle",
    latin: "Urtica dioica",
    family: "Urticaceae",
    partsUsed: ["Leaf", "Root"],
    actions: ["Alterative", "Nutritive", "Diuretic", "Anti-allergic"],
    actionDescriptions: {
      Alterative: "Gently supports elimination pathways and tissue cleansing.",
      Nutritive: "Rich in iron, calcium, magnesium, silica, and vitamins A, C, K.",
      Diuretic: "Mild aquaretic action supports kidney function.",
      "Anti-allergic": "Inhibits histamine release and prostaglandin formation.",
    },
    indications: ["Seasonal allergies", "Iron-deficiency anaemia", "BPH (root)", "Eczema", "Arthritis"],
    contraindications: [],
    dosing: { tincture: "1:5, 40% ethanol, 2-5 mL TID", tea: "1-3 tsp dried leaf per cup, steep 10-15 min (or overnight infusion)", capsule: "300-600 mg freeze-dried leaf BID-TID" },
    evidenceRating: "Moderate",
    evidenceStars: 4,
  },
  {
    name: "Hawthorn",
    latin: "Crataegus monogyna",
    family: "Rosaceae",
    partsUsed: ["Berry", "Leaf", "Flower"],
    actions: ["Cardiotonic", "Hypotensive", "Antioxidant"],
    actionDescriptions: {
      Cardiotonic: "Oligomeric procyanidins improve myocardial contractility and coronary blood flow.",
      Hypotensive: "Relaxes peripheral vasculature and reduces afterload.",
      Antioxidant: "Flavonoids protect cardiovascular endothelium from oxidative damage.",
    },
    indications: ["Congestive heart failure (NYHA I-II)", "Hypertension", "Angina", "Atherosclerosis", "Anxiety with palpitations"],
    contraindications: ["Monitor with cardiac glycosides (additive effect)"],
    dosing: { tincture: "1:5, 45% ethanol, 2-4 mL TID", tea: "1-2 tsp berries/leaf per cup, steep 15 min", capsule: "300-600 mg standardized extract BID" },
    evidenceRating: "Strong",
    evidenceStars: 5,
  },
];

// ---------------------------------------------------------------------------
// Evidence badge colour mapping
// ---------------------------------------------------------------------------
const evidenceBadgeVariant: Record<string, "active" | "info" | "warning" | "neutral"> = {
  Strong: "active",
  Moderate: "info",
  Limited: "warning",
  Traditional: "neutral",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BotanicalPage() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedHerb, setSelectedHerb] = useState<Herb | null>(null);

  // Filter logic
  const filteredHerbs = useMemo(() => {
    const q = search.toLowerCase();
    return HERBS.filter((h) => {
      const matchesSearch =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.latin.toLowerCase().includes(q) ||
        h.actions.some((a) => a.toLowerCase().includes(q)) ||
        h.indications.some((ind) => ind.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.some((cat) => h.actions.includes(cat));

      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategories]);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <PageTransition className="min-h-screen bg-dark-bg px-6 py-10">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <StaggerChild className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Botanical Database</h1>
            <p className="mt-1 text-gray-400">
              500+ Herb Database &mdash; Search, explore, and build formulas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/naturopath/botanical/formula-builder">
              <Button variant="secondary" size="md" className="!border-sage/30 !text-sage hover:!bg-sage/10">
                <FlaskConical className="mr-2 h-4 w-4" />
                Formula Builder
              </Button>
            </Link>
            <Link href="/naturopath/dashboard" className="text-sm text-sage hover:text-sage/80">
              &larr; Dashboard
            </Link>
          </div>
        </StaggerChild>

        {/* Main split view */}
        <StaggerChild className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ─── Left Panel: Search + Results ─── */}
          <div className="flex flex-col gap-4">
            {/* Search bar */}
            <Card hover={false} className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search 500+ herbs by name, action, or indication..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
                />
              </div>
              {/* Category filter tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? "bg-sage text-dark-bg"
                          : "bg-sage/10 text-sage hover:bg-sage/20"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="rounded-full px-3 py-1 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </Card>

            {/* Results list */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-1">
              {filteredHerbs.length === 0 ? (
                <Card hover={false} className="p-6">
                  <EmptyState
                    icon={Leaf}
                    title="No herbs found"
                    description="Try adjusting your search or category filters."
                  />
                </Card>
              ) : (
                filteredHerbs.map((herb) => {
                  const isSelected = selectedHerb?.name === herb.name;
                  return (
                    <button
                      key={herb.name}
                      onClick={() => setSelectedHerb(herb)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-sage/60 bg-sage/5"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-sage/30 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-base font-semibold text-white">{herb.name}</span>
                          <span className="ml-2 text-sm italic text-sage">{herb.latin}</span>
                        </div>
                        <Link
                          href="/naturopath/botanical/formula-builder"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 ml-2 rounded-lg bg-sage/15 px-3 py-1.5 text-xs font-medium text-sage hover:bg-sage/25 transition-colors"
                        >
                          <Plus className="mr-1 inline h-3 w-3" />
                          Add to Formula
                        </Link>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {herb.actions.map((a) => (
                          <span key={a} className="rounded-full bg-sage/10 px-2 py-0.5 text-[11px] font-medium text-sage">
                            {a}
                          </span>
                        ))}
                      </div>

                      {herb.contraindications.length > 0 && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-rose">
                          <AlertTriangle className="h-3 w-3" />
                          CI: {herb.contraindications.slice(0, 2).join(", ")}
                          {herb.contraindications.length > 2 && ` +${herb.contraindications.length - 2} more`}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Right Panel: Herb Detail ─── */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {selectedHerb ? (
              <Card hover={false} className="p-6 border border-sage/20">
                {/* Header */}
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedHerb.name}</h2>
                    <p className="text-sm italic text-sage">{selectedHerb.latin}</p>
                    <p className="mt-0.5 text-xs text-gray-500">Family: {selectedHerb.family}</p>
                  </div>
                  <button
                    onClick={() => setSelectedHerb(null)}
                    className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Parts used */}
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Parts Used</h3>
                  <div className="flex gap-2">
                    {selectedHerb.partsUsed.map((p) => (
                      <span key={p} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-gray-300">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Therapeutic actions */}
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Therapeutic Actions</h3>
                  <div className="space-y-2">
                    {selectedHerb.actions.map((a) => (
                      <div key={a} className="rounded-lg border border-sage/10 bg-sage/5 p-2.5">
                        <span className="text-sm font-medium text-sage">{a}</span>
                        {selectedHerb.actionDescriptions[a] && (
                          <p className="mt-0.5 text-xs text-gray-400">{selectedHerb.actionDescriptions[a]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indications */}
                <div className="mb-4">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Indications</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHerb.indications.map((ind) => (
                      <span key={ind} className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-gray-300">{ind}</span>
                    ))}
                  </div>
                </div>

                {/* Contraindications & Interactions */}
                {selectedHerb.contraindications.length > 0 && (
                  <div className="mb-4 rounded-lg border border-rose/20 bg-rose/5 p-3">
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Contraindications & Interactions
                    </h3>
                    <ul className="space-y-1">
                      {selectedHerb.contraindications.map((c) => (
                        <li key={c} className="text-sm text-rose/80">- {c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dosing */}
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Dosing Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <div>
                        <span className="font-medium text-gray-300">Tincture:</span>{" "}
                        <span className="text-gray-400">{selectedHerb.dosing.tincture}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CupSoda className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <div>
                        <span className="font-medium text-gray-300">Tea:</span>{" "}
                        <span className="text-gray-400">{selectedHerb.dosing.tea}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Pill className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      <div>
                        <span className="font-medium text-gray-300">Capsule:</span>{" "}
                        <span className="text-gray-400">{selectedHerb.dosing.capsule}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence rating */}
                <div className="mb-5">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Evidence Quality</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < selectedHerb.evidenceStars ? "fill-sage text-sage" : "text-gray-700"}`}
                        />
                      ))}
                    </div>
                    <Badge variant={evidenceBadgeVariant[selectedHerb.evidenceRating]}>
                      {selectedHerb.evidenceRating}
                    </Badge>
                  </div>
                </div>

                {/* Add to Formula */}
                <Link href="/naturopath/botanical/formula-builder" className="block">
                  <Button variant="secondary" size="lg" className="w-full !bg-sage !text-dark-bg hover:!bg-sage/90 !border-sage">
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Formula
                  </Button>
                </Link>
              </Card>
            ) : (
              <Card hover={false} className="p-6 border border-white/[0.06]">
                <EmptyState
                  icon={BookOpen}
                  title="Select an herb"
                  description="Select an herb from the list to view its full monograph including therapeutic actions, indications, dosing, and evidence ratings."
                />
              </Card>
            )}
          </div>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
