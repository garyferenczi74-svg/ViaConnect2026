"use client";

import { useState, useMemo } from "react";
import {
  Pill,
  FlaskConical,
  X,
  Search,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
import { InteractionEngine } from "@/components/shared/InteractionEngine";

// ─── Data ──────────────────────────────────────────────────────────────────────

const SUGGESTED_MEDICATIONS = [
  "Warfarin",
  "Metformin",
  "Levothyroxine",
  "Atorvastatin",
  "Lisinopril",
  "Omeprazole",
  "Sertraline",
  "Metoprolol",
];

const SUGGESTED_SUPPLEMENTS = [
  "MTHFR+",
  "COMT+",
  "FOCUS+",
  "NAD+",
  "BLAST+",
  "SHRED+",
  "CBD Oil",
  "Vitamin D3",
];

type Severity = "critical" | "major" | "moderate" | "none";

interface InteractionDetail {
  severity: Severity;
  mechanism: string;
  recommendation: string;
  evidence: string;
}

const INTERACTION_DB: Record<string, InteractionDetail> = {
  "Warfarin::NAD+": {
    severity: "moderate",
    mechanism:
      "NAD+ precursors (NMN/NR) may potentiate anticoagulant activity via modulation of SIRT1-mediated platelet aggregation pathways.",
    recommendation:
      "Monitor INR weekly for the first month. Consider dose adjustment if INR exceeds therapeutic range.",
    evidence: "Level C — Case reports and pharmacologic rationale",
  },
  "Warfarin::MTHFR+": {
    severity: "moderate",
    mechanism:
      "Methylfolate in MTHFR+ may reduce warfarin efficacy by increasing vitamin K-dependent clotting factor synthesis via one-carbon metabolism.",
    recommendation:
      "Monitor INR closely. Maintain consistent folate intake. Do not abruptly start or stop supplementation.",
    evidence: "Level B — Observational studies",
  },
  "Sertraline::CBD Oil": {
    severity: "moderate",
    mechanism:
      "CBD inhibits CYP3A4 and CYP2C19, the primary enzymes metabolizing sertraline. May increase sertraline plasma levels by 20-40%.",
    recommendation:
      "Start CBD at low dose. Monitor for serotonergic side effects (agitation, tremor, diarrhea). Consider sertraline dose reduction.",
    evidence: "Level B — Pharmacokinetic studies",
  },
  "Metformin::BLAST+": {
    severity: "major",
    mechanism:
      "BLAST+ contains berberine which has additive hypoglycemic effects with metformin via AMPK activation. Risk of severe hypoglycemia.",
    recommendation:
      "Avoid concurrent use or reduce metformin dose by 50%. Monitor blood glucose daily. Educate patient on hypoglycemia symptoms.",
    evidence: "Level B — Clinical trials with berberine",
  },
  "Omeprazole::MTHFR+": {
    severity: "moderate",
    mechanism:
      "Omeprazole reduces B12 absorption via gastric acid suppression. MTHFR+ contains methylcobalamin which may partially compensate, but timing of administration matters.",
    recommendation:
      "Take MTHFR+ at least 2 hours apart from omeprazole. Monitor B12 levels annually.",
    evidence: "Level B — Pharmacokinetic interaction",
  },
  "Levothyroxine::Vitamin D3": {
    severity: "moderate",
    mechanism:
      "Calcium in Vitamin D3 formulations may chelate levothyroxine in the GI tract, reducing absorption by up to 40%.",
    recommendation:
      "Separate administration by at least 4 hours. Take levothyroxine on an empty stomach 30-60 minutes before any supplement.",
    evidence: "Level A — Well-established interaction",
  },
  "Atorvastatin::CBD Oil": {
    severity: "major",
    mechanism:
      "CBD is a potent inhibitor of CYP3A4, the primary enzyme responsible for atorvastatin metabolism. May increase statin levels 2-3x, raising rhabdomyolysis risk.",
    recommendation:
      "Avoid combination or use lowest statin dose with close CK monitoring. Consider pravastatin (CYP-independent) as alternative.",
    evidence: "Level B — In vitro and pharmacokinetic data",
  },
  "Metoprolol::SHRED+": {
    severity: "critical",
    mechanism:
      "SHRED+ contains synephrine and caffeine which have sympathomimetic activity directly opposing beta-blocker therapy. Risk of hypertensive crisis.",
    recommendation:
      "Contraindicated. Do not co-administer. Discontinue SHRED+ or consult cardiologist for alternative thermogenic approach.",
    evidence: "Level A — Established pharmacologic antagonism",
  },
};

function getInteraction(med: string, supp: string): InteractionDetail {
  const key = `${med}::${supp}`;
  return (
    INTERACTION_DB[key] ?? {
      severity: "none",
      mechanism: "No known pharmacological interaction identified in current databases.",
      recommendation: "Standard monitoring. No dosage adjustment required.",
      evidence: "No interaction data — considered safe based on available literature",
    }
  );
}

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bgClass: string; borderClass: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bgClass: "bg-red-500/10",
    borderClass: "border-red-500/20",
    icon: ShieldAlert,
  },
  major: {
    label: "Major",
    color: "text-copper",
    bgClass: "bg-copper/10",
    borderClass: "border-copper/20",
    icon: AlertTriangle,
  },
  moderate: {
    label: "Moderate",
    color: "text-portal-yellow",
    bgClass: "bg-portal-yellow/10",
    borderClass: "border-portal-yellow/20",
    icon: Info,
  },
  none: {
    label: "No Interaction",
    color: "text-portal-green",
    bgClass: "bg-portal-green/10",
    borderClass: "border-portal-green/20",
    icon: CheckCircle2,
  },
};

// ─── CYP450 Data ───────────────────────────────────────────────────────────────

const CYP_DATA = [
  {
    enzyme: "CYP1A2",
    substrates: "Caffeine, Theophylline, Melatonin, Duloxetine",
    inhibitors: "Fluvoxamine, Ciprofloxacin, Berberine",
    inducers: "Smoking, Charbroiled meat, Cruciferous vegetables",
  },
  {
    enzyme: "CYP2D6",
    substrates: "Metoprolol, Codeine, Tamoxifen, Fluoxetine",
    inhibitors: "Paroxetine, Fluoxetine, Bupropion, Quinidine",
    inducers: "Dexamethasone, Rifampin (minor)",
  },
  {
    enzyme: "CYP3A4",
    substrates: "Atorvastatin, Sertraline, Midazolam, Cyclosporine",
    inhibitors: "CBD, Grapefruit, Ketoconazole, Erythromycin",
    inducers: "St. John's Wort, Carbamazepine, Rifampin",
  },
  {
    enzyme: "CYP2C19",
    substrates: "Omeprazole, Clopidogrel, Escitalopram, Diazepam",
    inhibitors: "CBD, Omeprazole, Fluoxetine, Fluvoxamine",
    inducers: "Rifampin, Prednisone, St. John's Wort",
  },
  {
    enzyme: "CYP2C9",
    substrates: "Warfarin, Losartan, Ibuprofen, Celecoxib",
    inhibitors: "Fluconazole, Amiodarone, Metronidazole",
    inducers: "Rifampin, Phenobarbital, St. John's Wort",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function InteractionsPage() {
  const [medications, setMedications] = useState<string[]>([]);
  const [supplements, setSupplements] = useState<string[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [suppSearch, setSuppSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const filteredMeds = useMemo(
    () =>
      SUGGESTED_MEDICATIONS.filter(
        (m) =>
          !medications.includes(m) &&
          m.toLowerCase().includes(medSearch.toLowerCase())
      ),
    [medSearch, medications]
  );

  const filteredSupps = useMemo(
    () =>
      SUGGESTED_SUPPLEMENTS.filter(
        (s) =>
          !supplements.includes(s) &&
          s.toLowerCase().includes(suppSearch.toLowerCase())
      ),
    [suppSearch, supplements]
  );

  function addMed(med: string) {
    if (!medications.includes(med)) {
      setMedications((prev) => [...prev, med]);
      setMedSearch("");
      setShowResults(false);
    }
  }

  function addSupp(supp: string) {
    if (!supplements.includes(supp)) {
      setSupplements((prev) => [...prev, supp]);
      setSuppSearch("");
      setShowResults(false);
    }
  }

  function removeMed(med: string) {
    setMedications((prev) => prev.filter((m) => m !== med));
    setShowResults(false);
  }

  function removeSupp(supp: string) {
    setSupplements((prev) => prev.filter((s) => s !== supp));
    setShowResults(false);
  }

  function clearAll() {
    setMedications([]);
    setSupplements([]);
    setMedSearch("");
    setSuppSearch("");
    setShowResults(false);
    setExpandedCell(null);
  }

  function handleCheck() {
    if (medications.length > 0 && supplements.length > 0) {
      setShowResults(true);
      setExpandedCell(null);
    }
  }

  // Count interaction severities for summary
  const interactionSummary = useMemo(() => {
    if (!showResults) return null;
    const counts = { critical: 0, major: 0, moderate: 0, none: 0 };
    medications.forEach((med) => {
      supplements.forEach((supp) => {
        const interaction = getInteraction(med, supp);
        counts[interaction.severity]++;
      });
    });
    return counts;
  }, [showResults, medications, supplements]);

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Unified Interaction Engine — Patient interactions from DB */}
        <Card className="p-6" hover={false}>
          <InteractionEngine mode="practitioner" userId="" />
        </Card>

        {/* Standalone Interaction Checker */}
        <StaggerChild className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Interaction Checker</h1>
            <p className="text-gray-400 mt-1">
              Check drug-supplement interactions across ViaConnect formulations
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </StaggerChild>

        {/* Two-column input */}
        <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Medications */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-portal-purple/15 flex items-center justify-center">
                <Pill className="w-4 h-4 text-portal-purple" />
              </div>
              <h2 className="text-lg font-semibold text-white">Medications</h2>
              {medications.length > 0 && (
                <Badge variant="info">{medications.length}</Badge>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && medSearch.trim()) {
                    addMed(medSearch.trim());
                  }
                }}
                placeholder="Search medications..."
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-portal-purple/50 focus:ring-1 focus:ring-portal-purple/20"
              />
            </div>

            {/* Selected chips */}
            {medications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {medications.map((med) => (
                  <span
                    key={med}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-portal-purple/15 text-portal-purple border border-portal-purple/20"
                  >
                    {med}
                    <button
                      onClick={() => removeMed(med)}
                      className="hover:bg-portal-purple/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested tags */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {filteredMeds.map((med) => (
                  <button
                    key={med}
                    onClick={() => addMed(med)}
                    className="px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-gray-400 cursor-pointer hover:border-portal-purple/30 hover:text-portal-purple transition-colors"
                  >
                    {med}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Right — Supplements */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-portal-green/15 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-portal-green" />
              </div>
              <h2 className="text-lg font-semibold text-white">Supplements</h2>
              {supplements.length > 0 && (
                <Badge variant="active">{supplements.length}</Badge>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={suppSearch}
                onChange={(e) => setSuppSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suppSearch.trim()) {
                    addSupp(suppSearch.trim());
                  }
                }}
                placeholder="Search supplements..."
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-portal-green/50 focus:ring-1 focus:ring-portal-green/20"
              />
            </div>

            {/* Selected chips */}
            {supplements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {supplements.map((supp) => (
                  <span
                    key={supp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-portal-green/15 text-portal-green border border-portal-green/20"
                  >
                    {supp}
                    <button
                      onClick={() => removeSupp(supp)}
                      className="hover:bg-portal-green/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Suggested tags */}
            <div>
              <p className="text-xs text-gray-500 mb-2">ViaConnect Formulations</p>
              <div className="flex flex-wrap gap-2">
                {filteredSupps.map((supp) => (
                  <button
                    key={supp}
                    onClick={() => addSupp(supp)}
                    className="px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-gray-400 cursor-pointer hover:border-portal-green/30 hover:text-portal-green transition-colors"
                  >
                    {supp}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </StaggerChild>

        {/* Check Interactions Button */}
        <div className="flex justify-center">
          <button
            onClick={handleCheck}
            disabled={medications.length === 0 || supplements.length === 0}
            className="w-full lg:w-auto lg:min-w-[320px] px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-150
              bg-portal-green/20 text-portal-green border border-portal-green/30
              hover:bg-portal-green/30 hover:shadow-lg hover:shadow-portal-green/10
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-portal-green/20 disabled:hover:shadow-none"
          >
            Check Interactions ({medications.length} med{medications.length !== 1 ? "s" : ""} &times;{" "}
            {supplements.length} supp{supplements.length !== 1 ? "s" : ""})
          </button>
        </div>

        {/* Results Section */}
        {showResults && (
          <div className="space-y-6">
            {/* Severity Legend */}
            <Card className="p-5" hover={false}>
              <div className="flex flex-wrap items-center gap-6">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Severity
                </span>
                {(["critical", "major", "moderate", "none"] as Severity[]).map((sev) => {
                  const cfg = SEVERITY_CONFIG[sev];
                  const Icon = cfg.icon;
                  const count = interactionSummary?.[sev] ?? 0;
                  return (
                    <div key={sev} className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className={`text-sm font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-600">({count})</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Interaction Matrix */}
            <Card className="p-6 space-y-4" hover={false}>
              <h2 className="text-lg font-semibold text-white">Interaction Matrix</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-white/[0.06]">
                        Medication / Supplement
                      </th>
                      {supplements.map((supp) => (
                        <th
                          key={supp}
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-white/[0.06]"
                        >
                          {supp}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med) => (
                      <>
                        <tr key={med}>
                          <td className="px-4 py-3 text-white font-medium whitespace-nowrap border-b border-white/[0.04]">
                            {med}
                          </td>
                          {supplements.map((supp) => {
                            const interaction = getInteraction(med, supp);
                            const cfg = SEVERITY_CONFIG[interaction.severity];
                            const Icon = cfg.icon;
                            const cellKey = `${med}::${supp}`;
                            const isExpanded = expandedCell === cellKey;

                            return (
                              <td
                                key={supp}
                                className="px-2 py-2 border-b border-white/[0.04]"
                              >
                                <button
                                  onClick={() =>
                                    setExpandedCell(isExpanded ? null : cellKey)
                                  }
                                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-150 ${cfg.bgClass} border ${cfg.borderClass} hover:opacity-80`}
                                >
                                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                  <span className={`text-xs font-medium ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className={`w-3 h-3 ${cfg.color}`} />
                                  ) : (
                                    <ChevronDown className={`w-3 h-3 ${cfg.color}`} />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                        {/* Expanded detail row */}
                        {supplements.map((supp) => {
                          const cellKey = `${med}::${supp}`;
                          if (expandedCell !== cellKey) return null;
                          const interaction = getInteraction(med, supp);
                          const cfg = SEVERITY_CONFIG[interaction.severity];
                          return (
                            <tr key={`${cellKey}-detail`}>
                              <td
                                colSpan={supplements.length + 1}
                                className="px-4 py-0 border-b border-white/[0.04]"
                              >
                                <div
                                  className={`${cfg.bgClass} border ${cfg.borderClass} rounded-lg p-4 my-2 space-y-3`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold text-sm">
                                      {med} + {supp}
                                    </span>
                                    <Badge
                                      variant={
                                        interaction.severity === "critical"
                                          ? "danger"
                                          : interaction.severity === "major"
                                          ? "warning"
                                          : interaction.severity === "moderate"
                                          ? "pending"
                                          : "active"
                                      }
                                    >
                                      {cfg.label}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                                        Mechanism
                                      </p>
                                      <p className="text-gray-300">
                                        {interaction.mechanism}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                                        Recommendation
                                      </p>
                                      <p className="text-gray-300">
                                        {interaction.recommendation}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">
                                        Evidence Level
                                      </p>
                                      <p className="text-gray-300">
                                        {interaction.evidence}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Placeholder when no results */}
        {!showResults && (
          <Card className="p-6" hover={false}>
            <div className="h-32 flex items-center justify-center">
              <p className="text-gray-600 text-sm">
                Select medications and supplements above, then click &quot;Check Interactions&quot; to view the interaction matrix
              </p>
            </div>
          </Card>
        )}

        {/* CYP450 Reference Table */}
        <Card className="p-6 space-y-4" hover={false}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">CYP450 Enzyme Reference</h2>
            <Badge variant="info">Pharmacogenomics</Badge>
          </div>
          <p className="text-gray-500 text-sm">
            Key cytochrome P450 enzymes involved in drug and supplement metabolism
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Enzyme
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Substrates
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Inhibitors
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Inducers
                  </th>
                </tr>
              </thead>
              <tbody>
                {CYP_DATA.map((row) => (
                  <tr
                    key={row.enzyme}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-portal-green font-mono font-semibold text-xs">
                        {row.enzyme}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {row.substrates}
                    </td>
                    <td className="px-4 py-3 text-portal-yellow text-xs">
                      {row.inhibitors}
                    </td>
                    <td className="px-4 py-3 text-cyan text-xs">
                      {row.inducers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Severity Legend (bottom) */}
        <Card className="p-5" hover={false}>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Interaction Severity Levels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(
              [
                {
                  severity: "critical" as Severity,
                  desc: "Contraindicated. Do not co-administer. Serious adverse outcomes expected.",
                },
                {
                  severity: "major" as Severity,
                  desc: "Significant risk. Use alternative or closely monitor with dose adjustment.",
                },
                {
                  severity: "moderate" as Severity,
                  desc: "Needs monitoring. May require timing separation or dose modification.",
                },
                {
                  severity: "none" as Severity,
                  desc: "No known interaction. Safe to co-administer at standard doses.",
                },
              ] as const
            ).map((item) => {
              const cfg = SEVERITY_CONFIG[item.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.severity}
                  className={`${cfg.bgClass} border ${cfg.borderClass} rounded-lg p-4 space-y-2`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <span className={`text-sm font-semibold ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
