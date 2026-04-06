"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  Search,
  Plus,
  X,
  Printer,
  Save,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  ArrowLeft,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HerbEntry {
  name: string;
  latin: string;
  actions: string[];
  ratio: string; // e.g. "1:5"
}

interface FormulaHerb extends HerbEntry {
  dose: string;
  proportion: string;
}

interface InteractionResult {
  severity: "critical" | "moderate" | "none";
  message: string;
  herb?: string;
}

// ---------------------------------------------------------------------------
// Mock data — herbs (same 15+ from botanical DB)
// ---------------------------------------------------------------------------
const HERB_LIBRARY: HerbEntry[] = [
  { name: "Ashwagandha", latin: "Withania somnifera", actions: ["Adaptogen", "Nervine", "Anti-inflammatory"], ratio: "1:5" },
  { name: "Turmeric", latin: "Curcuma longa", actions: ["Anti-inflammatory", "Hepatoprotective", "Antioxidant"], ratio: "1:5" },
  { name: "Milk Thistle", latin: "Silybum marianum", actions: ["Hepatoprotective", "Antioxidant", "Cholagogue"], ratio: "1:3" },
  { name: "Echinacea", latin: "Echinacea purpurea", actions: ["Immunostimulant", "Anti-microbial"], ratio: "1:5" },
  { name: "Valerian", latin: "Valeriana officinalis", actions: ["Sedative", "Anxiolytic", "Spasmolytic"], ratio: "1:5" },
  { name: "St. John's Wort", latin: "Hypericum perforatum", actions: ["Nervine", "Anti-depressant", "Anti-viral"], ratio: "1:5" },
  { name: "Ginger", latin: "Zingiber officinale", actions: ["Carminative", "Anti-emetic", "Circulatory stimulant"], ratio: "1:5" },
  { name: "Licorice", latin: "Glycyrrhiza glabra", actions: ["Adaptogen", "Demulcent", "Anti-viral"], ratio: "1:5" },
  { name: "Chamomile", latin: "Matricaria chamomilla", actions: ["Nervine", "Carminative", "Anti-spasmodic"], ratio: "1:5" },
  { name: "Elderberry", latin: "Sambucus nigra", actions: ["Immunostimulant", "Diaphoretic", "Anti-viral"], ratio: "1:5" },
  { name: "Dandelion", latin: "Taraxacum officinale", actions: ["Hepatoprotective", "Diuretic", "Cholagogue"], ratio: "1:5" },
  { name: "Passionflower", latin: "Passiflora incarnata", actions: ["Anxiolytic", "Sedative", "Nervine"], ratio: "1:5" },
  { name: "Rhodiola", latin: "Rhodiola rosea", actions: ["Adaptogen", "Nootropic", "Anti-fatigue"], ratio: "1:5" },
  { name: "Marshmallow Root", latin: "Althaea officinalis", actions: ["Demulcent", "Emollient", "Anti-inflammatory"], ratio: "1:5" },
  { name: "Nettle", latin: "Urtica dioica", actions: ["Alterative", "Nutritive", "Diuretic", "Anti-allergic"], ratio: "1:5" },
  { name: "Hawthorn", latin: "Crataegus monogyna", actions: ["Cardiotonic", "Hypotensive", "Antioxidant"], ratio: "1:5" },
];

// ---------------------------------------------------------------------------
// Mock patients
// ---------------------------------------------------------------------------
const PATIENTS = [
  { value: "p1", label: "Sarah Mitchell — DOB 1985-03-14" },
  { value: "p2", label: "James Thornton — DOB 1972-09-22" },
  { value: "p3", label: "Emily Chen — DOB 1990-07-08" },
  { value: "p4", label: "Robert Garcia — DOB 1968-12-01" },
  { value: "p5", label: "Olivia Patel — DOB 1995-05-19" },
  { value: "p6", label: "David Kowalski — DOB 1980-11-30" },
];

const PATIENT_MEDS: Record<string, string[]> = {
  p1: ["Sertraline (SSRI)", "Vitamin D"],
  p2: ["Lisinopril", "Metformin"],
  p3: ["None"],
  p4: ["Warfarin", "Atorvastatin"],
  p5: ["Oral contraceptives", "Iron supplement"],
  p6: ["Omeprazole", "Magnesium"],
};

// ---------------------------------------------------------------------------
// Preparation types
// ---------------------------------------------------------------------------
const PREPARATIONS = ["Tincture", "Tea", "Capsule", "Topical", "Powder"] as const;
type Preparation = (typeof PREPARATIONS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FormulaBuilderPage() {
  // Left panel
  const [herbSearch, setHerbSearch] = useState("");

  // Center panel
  const [formulaName, setFormulaName] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedHerbs, setSelectedHerbs] = useState<FormulaHerb[]>([]);
  const [preparation, setPreparation] = useState<Preparation>("Tincture");
  const [totalVolume, setTotalVolume] = useState("100 mL");
  const [dosageInstructions, setDosageInstructions] = useState("Take 5 mL in a small amount of water, 3 times daily before meals.");
  const [notes, setNotes] = useState("");

  // Interaction check
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionResults, setInteractionResults] = useState<InteractionResult[]>([]);

  // Save confirmation
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Filtered herb list
  const filteredHerbs = useMemo(() => {
    const q = herbSearch.toLowerCase();
    return HERB_LIBRARY.filter(
      (h) =>
        !selectedHerbs.some((sh) => sh.name === h.name) &&
        (!q ||
          h.name.toLowerCase().includes(q) ||
          h.latin.toLowerCase().includes(q) ||
          h.actions.some((a) => a.toLowerCase().includes(q)))
    );
  }, [herbSearch, selectedHerbs]);

  // Add herb
  const addHerb = (herb: HerbEntry) => {
    const count = selectedHerbs.length + 1;
    const defaultProportion = Math.round(100 / count);
    setSelectedHerbs((prev) => [
      ...prev.map((h) => ({ ...h, proportion: `${defaultProportion}%` })),
      { ...herb, dose: "2 mL", proportion: `${defaultProportion}%` },
    ]);
  };

  // Remove herb
  const removeHerb = (name: string) => {
    setSelectedHerbs((prev) => {
      const remaining = prev.filter((h) => h.name !== name);
      if (remaining.length === 0) return [];
      const prop = Math.round(100 / remaining.length);
      return remaining.map((h) => ({ ...h, proportion: `${prop}%` }));
    });
  };

  // Update herb field
  const updateHerb = (name: string, field: "dose" | "proportion", value: string) => {
    setSelectedHerbs((prev) =>
      prev.map((h) => (h.name === name ? { ...h, [field]: value } : h))
    );
  };

  // Compute label values
  const totalVolumeNum = parseFloat(totalVolume) || 0;
  const herbLabelItems = selectedHerbs.map((h) => {
    const propNum = parseFloat(h.proportion) || 0;
    const amount = ((propNum / 100) * totalVolumeNum).toFixed(2);
    return { ...h, amount: `${amount} mL` };
  });

  const patientName = PATIENTS.find((p) => p.value === selectedPatient)?.label.split(" — ")[0] || "—";

  // Interaction check logic
  const runInteractionCheck = () => {
    const results: InteractionResult[] = [];
    const herbNames = selectedHerbs.map((h) => h.name);
    const meds = selectedPatient ? (PATIENT_MEDS[selectedPatient] || []) : [];

    // St. John's Wort interactions
    if (herbNames.includes("St. John's Wort")) {
      if (meds.some((m) => m.includes("SSRI") || m.includes("Sertraline"))) {
        results.push({
          severity: "critical",
          message: "St. John's Wort + SSRIs (Sertraline): Risk of serotonin syndrome. CONTRAINDICATED.",
          herb: "St. John's Wort",
        });
      }
      if (meds.some((m) => m.includes("Oral contraceptives") || m.includes("oral contraceptive"))) {
        results.push({
          severity: "critical",
          message: "St. John's Wort + Oral contraceptives: Reduces efficacy via CYP3A4 induction. CONTRAINDICATED.",
          herb: "St. John's Wort",
        });
      }
      if (meds.some((m) => m.includes("Warfarin"))) {
        results.push({
          severity: "critical",
          message: "St. John's Wort + Warfarin: Reduces anticoagulant effect via CYP induction. CONTRAINDICATED.",
          herb: "St. John's Wort",
        });
      }
    }

    // Licorice + hypertension meds
    if (herbNames.includes("Licorice") && meds.some((m) => m.includes("Lisinopril"))) {
      results.push({
        severity: "moderate",
        message: "Licorice + Lisinopril: Glycyrrhizin may counteract antihypertensive effect. Use DGL form or monitor BP.",
        herb: "Licorice",
      });
    }

    // Turmeric + anticoagulants
    if (herbNames.includes("Turmeric") && meds.some((m) => m.includes("Warfarin"))) {
      results.push({
        severity: "moderate",
        message: "Turmeric + Warfarin: Curcumin may potentiate anticoagulant effect. Monitor INR closely.",
        herb: "Turmeric",
      });
    }

    if (results.length === 0) {
      results.push({ severity: "none", message: "No critical interactions found between selected herbs and patient medications." });
    }

    setInteractionResults(results);
    setShowInteractionModal(true);
  };

  return (
    <PageTransition className="min-h-screen bg-dark-bg">
      {/* Top header bar */}
      <StaggerChild className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/naturopath/botanical" className="flex items-center gap-1.5 text-sm text-sage hover:text-sage/80">
              <ArrowLeft className="h-4 w-4" />
              Botanical Database
            </Link>
            <div className="h-5 w-px bg-dark-border" />
            <div>
              <h1 className="text-xl font-bold text-white">Herbal Formula Builder</h1>
              <p className="text-xs text-gray-500">Build custom herbal formulations for your patients</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{selectedHerbs.length} herbs selected</Badge>
          </div>
        </div>
      </StaggerChild>

      {/* Three-panel layout */}
      <StaggerChild className="flex h-[calc(100vh-73px)]">
        {/* ─── Left Panel: Herb Search ─── */}
        <div className="w-[320px] shrink-0 border-r border-dark-border overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Herb Library</h2>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={herbSearch}
              onChange={(e) => setHerbSearch(e.target.value)}
              placeholder="Search herbs..."
              className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
            />
          </div>

          <div className="space-y-1.5">
            {filteredHerbs.map((herb) => (
              <div
                key={herb.name}
                className="group flex items-start justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 hover:border-sage/20 hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{herb.name}</p>
                  <p className="text-xs italic text-sage/70 truncate">{herb.latin}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {herb.actions.slice(0, 2).map((a) => (
                      <span key={a} className="rounded-full bg-sage/10 px-1.5 py-0.5 text-[10px] text-sage">
                        {a}
                      </span>
                    ))}
                    {herb.actions.length > 2 && (
                      <span className="text-[10px] text-gray-600">+{herb.actions.length - 2}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => addHerb(herb)}
                  className="ml-2 mt-0.5 shrink-0 rounded-md bg-sage/15 p-1.5 text-sage opacity-60 group-hover:opacity-100 hover:bg-sage/25 transition-all"
                  title="Add to formula"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {filteredHerbs.length === 0 && (
              <p className="py-8 text-center text-xs text-gray-600">
                {selectedHerbs.length === HERB_LIBRARY.length
                  ? "All herbs added to formula"
                  : "No matching herbs found"}
              </p>
            )}
          </div>
        </div>

        {/* ─── Center Panel: Formula Workspace ─── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Formula name + patient */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Formula Name"
                value={formulaName}
                onChange={(e) => setFormulaName(e.target.value)}
                placeholder="e.g. Adrenal Recovery Tincture"
              />
              <Select
                label="Patient"
                value={selectedPatient}
                onValueChange={setSelectedPatient}
                placeholder="Select patient..."
                options={PATIENTS}
              />
            </div>

            {/* Added herbs */}
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Formula Herbs ({selectedHerbs.length})
              </h3>
              {selectedHerbs.length === 0 ? (
                <Card hover={false} className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <Leaf className="mb-2 h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-500">No herbs added yet. Use the herb library on the left to add herbs to your formula.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {selectedHerbs.map((herb) => (
                    <div
                      key={herb.name}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{herb.name}</p>
                        <p className="text-xs italic text-sage/70">{herb.latin}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <input
                            type="text"
                            value={herb.dose}
                            onChange={(e) => updateHerb(herb.name, "dose", e.target.value)}
                            className="w-full h-8 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 text-xs text-white text-center outline-none focus:border-sage/50"
                            placeholder="Dose"
                          />
                          <p className="mt-0.5 text-center text-[10px] text-gray-600">Dose</p>
                        </div>
                        <div className="w-16">
                          <input
                            type="text"
                            value={herb.proportion}
                            onChange={(e) => updateHerb(herb.name, "proportion", e.target.value)}
                            className="w-full h-8 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 text-xs text-white text-center outline-none focus:border-sage/50"
                            placeholder="%"
                          />
                          <p className="mt-0.5 text-center text-[10px] text-gray-600">Proportion</p>
                        </div>
                        <button
                          onClick={() => removeHerb(herb.name)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-rose/10 hover:text-rose transition-colors"
                          title="Remove herb"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preparation method */}
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Preparation Method</h3>
              <div className="flex flex-wrap gap-2">
                {PREPARATIONS.map((prep) => (
                  <button
                    key={prep}
                    onClick={() => setPreparation(prep)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      preparation === prep
                        ? "bg-sage text-dark-bg"
                        : "border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:border-sage/30 hover:text-sage"
                    }`}
                  >
                    {prep}
                  </button>
                ))}
              </div>
            </div>

            {/* Total volume + dosage */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Total Volume / Weight"
                value={totalVolume}
                onChange={(e) => setTotalVolume(e.target.value)}
                placeholder="e.g. 100 mL"
              />
              <div /> {/* spacer */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Dosage Instructions</label>
              <textarea
                value={dosageInstructions}
                onChange={(e) => setDosageInstructions(e.target.value)}
                rows={2}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 resize-none"
                placeholder="e.g. Take 5 mL in water, 3 times daily before meals."
              />
            </div>

            {/* Interaction check */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={runInteractionCheck}
                disabled={selectedHerbs.length === 0}
                className="!border-sage/30 !text-sage hover:!bg-sage/10"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Check Interactions
              </Button>
              {selectedPatient && (
                <span className="self-center text-xs text-gray-500">
                  vs. {patientName}&apos;s medications: {(PATIENT_MEDS[selectedPatient] || []).join(", ")}
                </span>
              )}
            </div>

            {/* Clinical notes */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Clinical Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 resize-none"
                placeholder="Clinical rationale, patient response targets, follow-up plan..."
              />
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Patient Label Preview ─── */}
        <div className="w-[320px] shrink-0 border-l border-dark-border overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Label Preview</h2>

          <Card hover={false} className="border border-sage/20 p-4">
            <div className="space-y-3">
              {/* Patient */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Patient</p>
                <p className="text-sm font-semibold text-white">{selectedPatient ? patientName : "—"}</p>
              </div>

              {/* Date */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Date</p>
                <p className="text-sm text-gray-300">2026-03-21</p>
              </div>

              {/* Formula name */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Formula</p>
                <p className="text-sm font-semibold text-sage">{formulaName || "Untitled Formula"}</p>
              </div>

              {/* Herb breakdown */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Composition</p>
                {selectedHerbs.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No herbs added</p>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    {herbLabelItems.map((h) => (
                      <div key={h.name} className="flex items-baseline justify-between gap-2">
                        <span className="text-gray-300 truncate">
                          {h.name} {preparation === "Tincture" ? h.ratio : ""}
                        </span>
                        <span className="shrink-0 text-gray-500">
                          {h.proportion.replace("%", "")}%
                        </span>
                        <span className="shrink-0 text-sage">{h.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Total Volume</p>
                <p className="text-sm text-white">{totalVolume}</p>
              </div>

              {/* Preparation */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Preparation</p>
                <p className="text-sm text-white">{preparation}</p>
              </div>

              {/* Dosage */}
              <div className="border-b border-dashed border-white/[0.08] pb-2">
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Dosage</p>
                <p className="text-xs text-gray-300 leading-relaxed">{dosageInstructions || "—"}</p>
              </div>

              {/* Practitioner */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-600">Practitioner</p>
                <p className="text-sm text-white">Dr. ViaConnect, ND</p>
                <p className="text-xs text-gray-500">ViaConnect Wellness Clinic</p>
              </div>
            </div>
          </Card>

          {/* Action buttons */}
          <div className="mt-4 space-y-2">
            <Button
              variant="secondary"
              size="md"
              className="w-full !border-sage/30 !text-sage hover:!bg-sage/10"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Label
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full !bg-sage !text-dark-bg hover:!bg-sage/90 !border-sage"
              onClick={() => setShowSaveConfirm(true)}
              disabled={selectedHerbs.length === 0}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Formula
            </Button>
          </div>
        </div>
      </StaggerChild>

      {/* ─── Interaction Check Modal ─── */}
      <Modal
        open={showInteractionModal}
        onOpenChange={setShowInteractionModal}
        title="Interaction Check Results"
        description={selectedPatient ? `Checking against ${patientName}'s current medications` : "No patient selected — checking herb-herb interactions only"}
      >
        <div className="space-y-3 mt-2">
          {interactionResults.map((result, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                result.severity === "critical"
                  ? "border-rose/30 bg-rose/5"
                  : result.severity === "moderate"
                  ? "border-copper/30 bg-copper/5"
                  : "border-sage/30 bg-sage/5"
              }`}
            >
              <div className="flex items-start gap-2">
                {result.severity === "critical" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
                ) : result.severity === "moderate" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                )}
                <div>
                  {result.herb && (
                    <p className="text-xs font-semibold text-gray-400 mb-0.5">{result.herb}</p>
                  )}
                  <p
                    className={`text-sm ${
                      result.severity === "critical"
                        ? "text-rose"
                        : result.severity === "moderate"
                        ? "text-copper"
                        : "text-sage"
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.severity === "critical" && (
                    <Badge variant="danger" className="mt-1.5">CRITICAL</Badge>
                  )}
                  {result.severity === "moderate" && (
                    <Badge variant="warning" className="mt-1.5">MODERATE</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={() => setShowInteractionModal(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* ─── Save Confirmation Modal ─── */}
      <Modal
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        title="Formula Saved"
        description="Your herbal formula has been saved successfully."
      >
        <div className="rounded-lg border border-sage/20 bg-sage/5 p-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-sage" />
            <p className="text-sm font-medium text-sage">Formula saved to patient record</p>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Formula: {formulaName || "Untitled Formula"}</p>
            <p>Patient: {selectedPatient ? patientName : "None"}</p>
            <p>Herbs: {selectedHerbs.length}</p>
            <p>Preparation: {preparation}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSaveConfirm(false)}>
            Continue Editing
          </Button>
          <Link href="/naturopath/botanical">
            <Button variant="secondary" size="sm" className="!border-sage/30 !text-sage hover:!bg-sage/10">
              Back to Database
            </Button>
          </Link>
        </div>
      </Modal>
    </PageTransition>
  );
}
