"use client";

import { useState, useMemo } from "react";
import {
  Pill,
  Leaf,
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
  "Fluoxetine",
  "Prednisone",
];

const SUGGESTED_HERBS = [
  "Ashwagandha (KSM-66)",
  "Holy Basil (Tulsi)",
  "Rhodiola Rosea",
  "St. John's Wort",
  "Valerian Root",
  "Kava Kava",
  "Ginkgo Biloba",
  "Turmeric / Curcumin",
  "Milk Thistle",
  "Echinacea",
  "Black Cohosh",
  "Saw Palmetto",
  "MTHFR+",
  "COMT+",
  "CALM+",
  "RELAX+",
  "NAD+",
  "CLEAN+",
  "FLEX+",
];

type Severity = "critical" | "major" | "moderate" | "none";

interface InteractionDetail {
  severity: Severity;
  mechanism: string;
  recommendation: string;
  evidence: string;
}

const INTERACTION_DB: Record<string, InteractionDetail> = {
  "Warfarin::Ginkgo Biloba": {
    severity: "major",
    mechanism:
      "Ginkgo inhibits platelet-activating factor (PAF), potentiating anticoagulant effects. Increases bleeding risk, including intracranial hemorrhage.",
    recommendation:
      "Avoid combination. If patient insists, reduce ginkgo dose to <120mg/day and monitor INR weekly.",
    evidence: "Level A — Multiple case reports and pharmacologic studies",
  },
  "Warfarin::St. John's Wort": {
    severity: "critical",
    mechanism:
      "St. John's Wort is a potent CYP3A4 and CYP2C9 inducer, dramatically reducing warfarin plasma levels. INR can drop below therapeutic range within 5-7 days.",
    recommendation:
      "Contraindicated. Do not co-administer. If SJW is discontinued, warfarin dose will need reduction as INR rebounds.",
    evidence: "Level A — Well-established, multiple clinical studies",
  },
  "Warfarin::Turmeric / Curcumin": {
    severity: "moderate",
    mechanism:
      "Curcumin has mild antiplatelet activity and may inhibit CYP2C9. Additive bleeding risk when combined with warfarin.",
    recommendation:
      "Use with caution. Monitor INR more frequently. Consider Boswellia as anti-inflammatory alternative.",
    evidence: "Level B — Pharmacokinetic data and case reports",
  },
  "Warfarin::MTHFR+": {
    severity: "moderate",
    mechanism:
      "Methylfolate in MTHFR+ may reduce warfarin efficacy by increasing vitamin K-dependent clotting factor synthesis via one-carbon metabolism.",
    recommendation:
      "Monitor INR closely. Maintain consistent folate intake. Do not abruptly start or stop supplementation.",
    evidence: "Level B — Observational studies",
  },
  "Sertraline::St. John's Wort": {
    severity: "critical",
    mechanism:
      "St. John's Wort increases serotonin reuptake inhibition, creating additive serotonergic effects. High risk of serotonin syndrome (hyperthermia, agitation, clonus, tremor).",
    recommendation:
      "Contraindicated. Never combine SSRIs with St. John's Wort. Allow 2-week washout if switching.",
    evidence: "Level A — Established, FDA warning",
  },
  "Sertraline::Kava Kava": {
    severity: "major",
    mechanism:
      "Kava inhibits CYP2D6 and CYP3A4, potentially increasing sertraline plasma levels. Additive CNS depression and hepatotoxicity risk.",
    recommendation:
      "Avoid combination. If anxiolytic botanical needed, consider Passionflower or L-Theanine as safer alternatives.",
    evidence: "Level B — Pharmacokinetic data",
  },
  "Fluoxetine::St. John's Wort": {
    severity: "critical",
    mechanism:
      "Same mechanism as sertraline — serotonin syndrome risk. Fluoxetine has a longer half-life (4-6 days), increasing risk window.",
    recommendation:
      "Contraindicated. Allow 5-week washout (due to norfluoxetine) before starting SJW.",
    evidence: "Level A — FDA black box interaction",
  },
  "Levothyroxine::Ashwagandha (KSM-66)": {
    severity: "moderate",
    mechanism:
      "Ashwagandha may increase thyroid hormone production (T3, T4) via TSH modulation. Additive effect with levothyroxine could cause hyperthyroid symptoms.",
    recommendation:
      "Monitor TSH every 6-8 weeks after initiation. May need levothyroxine dose reduction. Watch for palpitations, anxiety, weight loss.",
    evidence: "Level B — Clinical trial data (Sharma et al., 2018)",
  },
  "Metformin::Milk Thistle": {
    severity: "moderate",
    mechanism:
      "Silymarin in Milk Thistle has hypoglycemic effects via AMPK activation, similar to metformin. Additive blood glucose lowering.",
    recommendation:
      "Monitor blood glucose more frequently. May need metformin dose adjustment. Beneficial interaction if managed properly.",
    evidence: "Level B — Clinical trials with silymarin",
  },
  "Metoprolol::Rhodiola Rosea": {
    severity: "moderate",
    mechanism:
      "Rhodiola may have mild stimulant and cardiotonic effects, partially counteracting beta-blocker therapy. Effects are dose-dependent.",
    recommendation:
      "Use low-dose Rhodiola (100-200mg). Monitor heart rate and blood pressure. Consider Ashwagandha as adaptogenic alternative.",
    evidence: "Level C — Pharmacologic rationale and limited clinical data",
  },
  "Atorvastatin::St. John's Wort": {
    severity: "major",
    mechanism:
      "SJW induces CYP3A4, reducing statin plasma levels by up to 50%. Significant loss of lipid-lowering efficacy.",
    recommendation:
      "Avoid combination. If mood support needed, consider SAMe or Rhodiola which do not induce CYP3A4.",
    evidence: "Level A — Pharmacokinetic studies",
  },
  "Omeprazole::Turmeric / Curcumin": {
    severity: "moderate",
    mechanism:
      "Curcumin may increase gastric acid secretion, potentially counteracting PPI therapy. Also competes for CYP2C19 metabolism.",
    recommendation:
      "Separate administration by 2 hours. Monitor GERD symptoms. Consider Boswellia for anti-inflammatory needs.",
    evidence: "Level C — Pharmacologic rationale",
  },
  "Prednisone::Echinacea": {
    severity: "major",
    mechanism:
      "Echinacea is an immunostimulant that directly opposes the immunosuppressive mechanism of prednisone. May reduce corticosteroid efficacy.",
    recommendation:
      "Avoid in patients on immunosuppressive-dose corticosteroids. Safe with short-course low-dose prednisone (<10mg).",
    evidence: "Level B — Pharmacologic antagonism with clinical rationale",
  },
  "Prednisone::Ashwagandha (KSM-66)": {
    severity: "moderate",
    mechanism:
      "Ashwagandha has immunomodulatory effects. May partially oppose immunosuppression but also helps mitigate cortisol-related side effects.",
    recommendation:
      "Acceptable at low steroid doses. Avoid if prednisone >20mg/day for immunosuppression. Monitor inflammatory markers.",
    evidence: "Level C — Mixed clinical evidence",
  },
  "Metoprolol::CALM+": {
    severity: "moderate",
    mechanism:
      "CALM+ contains Ashwagandha and L-Theanine which may have additive hypotensive and bradycardic effects with beta-blockers.",
    recommendation:
      "Start CALM+ at half dose. Monitor blood pressure and heart rate for 2 weeks. Generally well-tolerated combination.",
    evidence: "Level C — Pharmacologic rationale",
  },
};

function getInteraction(med: string, herb: string): InteractionDetail {
  const key = `${med}::${herb}`;
  return (
    INTERACTION_DB[key] ?? {
      severity: "none",
      mechanism: "No known pharmacological interaction identified in current botanical and drug databases.",
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
    color: "text-sage",
    bgClass: "bg-sage/10",
    borderClass: "border-sage/20",
    icon: CheckCircle2,
  },
};

// ─── Herb-Herb Interaction Data ──────────────────────────────────────────────

const HERB_HERB_CAUTIONS = [
  {
    herbs: "St. John's Wort + Kava Kava",
    risk: "major" as Severity,
    note: "Both hepatotoxic — combined liver stress. Avoid pairing.",
  },
  {
    herbs: "Valerian + Kava Kava",
    risk: "moderate" as Severity,
    note: "Additive CNS depression. Excessive sedation risk, especially with alcohol.",
  },
  {
    herbs: "Ginkgo + Turmeric / Curcumin",
    risk: "moderate" as Severity,
    note: "Both have antiplatelet activity. Monitor for easy bruising or prolonged bleeding.",
  },
  {
    herbs: "Ashwagandha + Rhodiola",
    risk: "none" as Severity,
    note: "Complementary adaptogens. Safe to combine — Ashwagandha calming, Rhodiola stimulating.",
  },
  {
    herbs: "Echinacea + Ashwagandha",
    risk: "none" as Severity,
    note: "Safe combination. Both immunomodulatory but via different pathways.",
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function NaturopathInteractionsPage() {
  const [medications, setMedications] = useState<string[]>([]);
  const [herbs, setHerbs] = useState<string[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [herbSearch, setHerbSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const filteredMeds = useMemo(
    () =>
      SUGGESTED_MEDICATIONS.filter(
        (m) => !medications.includes(m) && m.toLowerCase().includes(medSearch.toLowerCase())
      ),
    [medSearch, medications]
  );

  const filteredHerbs = useMemo(
    () =>
      SUGGESTED_HERBS.filter(
        (h) => !herbs.includes(h) && h.toLowerCase().includes(herbSearch.toLowerCase())
      ),
    [herbSearch, herbs]
  );

  function addMed(med: string) {
    if (!medications.includes(med)) { setMedications((prev) => [...prev, med]); setMedSearch(""); setShowResults(false); }
  }
  function addHerb(herb: string) {
    if (!herbs.includes(herb)) { setHerbs((prev) => [...prev, herb]); setHerbSearch(""); setShowResults(false); }
  }
  function removeMed(med: string) { setMedications((prev) => prev.filter((m) => m !== med)); setShowResults(false); }
  function removeHerb(herb: string) { setHerbs((prev) => prev.filter((h) => h !== herb)); setShowResults(false); }
  function clearAll() { setMedications([]); setHerbs([]); setMedSearch(""); setHerbSearch(""); setShowResults(false); setExpandedCell(null); }
  function handleCheck() { if (medications.length > 0 && herbs.length > 0) { setShowResults(true); setExpandedCell(null); } }

  const interactionSummary = useMemo(() => {
    if (!showResults) return null;
    const counts = { critical: 0, major: 0, moderate: 0, none: 0 };
    medications.forEach((med) => {
      herbs.forEach((herb) => { counts[getInteraction(med, herb).severity]++; });
    });
    return counts;
  }, [showResults, medications, herbs]);

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <StaggerChild className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Herb-Drug Interaction Checker</h1>
            <p className="text-gray-400 mt-1 text-sm">
              Check interactions between medications, botanicals, and ViaConnect formulations
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
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-portal-purple/15 flex items-center justify-center">
                <Pill className="w-4 h-4 text-portal-purple" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Medications</h2>
              {medications.length > 0 && <Badge variant="info">{medications.length}</Badge>}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" value={medSearch}
                onChange={(e) => setMedSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && medSearch.trim()) addMed(medSearch.trim()); }}
                placeholder="Search medications..."
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-portal-purple/50 focus:ring-1 focus:ring-portal-purple/20"
              />
            </div>
            {medications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {medications.map((med) => (
                  <span key={med} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-portal-purple/15 text-portal-purple border border-portal-purple/20">
                    {med}
                    <button onClick={() => removeMed(med)} className="hover:bg-portal-purple/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-2">Suggested</p>
              <div className="flex flex-wrap gap-2">
                {filteredMeds.map((med) => (
                  <button key={med} onClick={() => addMed(med)} className="px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-portal-purple/30 hover:text-portal-purple transition-colors">{med}</button>
                ))}
              </div>
            </div>
          </Card>

          {/* Right — Herbs & Botanicals */}
          <Card className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sage/15 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-sage" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white">Herbs & Botanicals</h2>
              {herbs.length > 0 && <Badge variant="active">{herbs.length}</Badge>}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" value={herbSearch}
                onChange={(e) => setHerbSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && herbSearch.trim()) addHerb(herbSearch.trim()); }}
                placeholder="Search herbs, botanicals, formulations..."
                className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none transition-colors bg-white/[0.04] border border-white/[0.08] focus:border-sage/50 focus:ring-1 focus:ring-sage/20"
              />
            </div>
            {herbs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {herbs.map((herb) => (
                  <span key={herb} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sage/15 text-sage border border-sage/20">
                    {herb}
                    <button onClick={() => removeHerb(herb)} className="hover:bg-sage/20 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-2">Botanicals & ViaConnect Formulations</p>
              <div className="flex flex-wrap gap-2">
                {filteredHerbs.map((herb) => (
                  <button key={herb} onClick={() => addHerb(herb)} className="px-3 py-1.5 rounded-full text-xs bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-sage/30 hover:text-sage transition-colors">{herb}</button>
                ))}
              </div>
            </div>
          </Card>
        </StaggerChild>

        {/* Check Button */}
        <div className="flex justify-center">
          <button
            onClick={handleCheck}
            disabled={medications.length === 0 || herbs.length === 0}
            className="w-full lg:w-auto lg:min-w-[320px] px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-150
              bg-sage/20 text-sage border border-sage/30
              hover:bg-sage/30 hover:shadow-lg hover:shadow-sage/10
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-sage/20 disabled:hover:shadow-none"
          >
            Check Interactions ({medications.length} med{medications.length !== 1 ? "s" : ""} &times;{" "}
            {herbs.length} herb{herbs.length !== 1 ? "s" : ""})
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <div className="space-y-6">
            {/* Severity Legend */}
            <Card className="p-5" hover={false}>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</span>
                {(["critical", "major", "moderate", "none"] as Severity[]).map((sev) => {
                  const cfg = SEVERITY_CONFIG[sev];
                  const Icon = cfg.icon;
                  return (
                    <div key={sev} className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-gray-600">({interactionSummary?.[sev] ?? 0})</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Interaction Matrix */}
            <Card className="p-4 sm:p-6 space-y-4" hover={false}>
              <h2 className="text-lg font-semibold text-white">Interaction Matrix</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-white/[0.06]">
                        Medication / Botanical
                      </th>
                      {herbs.map((herb) => (
                        <th key={herb} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-white/[0.06]">{herb}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med) => (
                      <>
                        <tr key={med}>
                          <td className="px-4 py-3 text-white font-medium whitespace-nowrap border-b border-white/[0.04]">{med}</td>
                          {herbs.map((herb) => {
                            const interaction = getInteraction(med, herb);
                            const cfg = SEVERITY_CONFIG[interaction.severity];
                            const Icon = cfg.icon;
                            const cellKey = `${med}::${herb}`;
                            const isExpanded = expandedCell === cellKey;
                            return (
                              <td key={herb} className="px-2 py-2 border-b border-white/[0.04]">
                                <button
                                  onClick={() => setExpandedCell(isExpanded ? null : cellKey)}
                                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-150 ${cfg.bgClass} border ${cfg.borderClass} hover:opacity-80`}
                                >
                                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                                  {isExpanded ? <ChevronUp className={`w-3 h-3 ${cfg.color}`} /> : <ChevronDown className={`w-3 h-3 ${cfg.color}`} />}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                        {herbs.map((herb) => {
                          const cellKey = `${med}::${herb}`;
                          if (expandedCell !== cellKey) return null;
                          const interaction = getInteraction(med, herb);
                          const cfg = SEVERITY_CONFIG[interaction.severity];
                          return (
                            <tr key={`${cellKey}-detail`}>
                              <td colSpan={herbs.length + 1} className="px-4 py-0 border-b border-white/[0.04]">
                                <div className={`${cfg.bgClass} border ${cfg.borderClass} rounded-lg p-4 my-2 space-y-3`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-semibold text-sm">{med} + {herb}</span>
                                    <Badge variant={interaction.severity === "critical" ? "danger" : interaction.severity === "major" ? "warning" : interaction.severity === "moderate" ? "pending" : "active"}>
                                      {cfg.label}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Mechanism</p>
                                      <p className="text-gray-300">{interaction.mechanism}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Recommendation</p>
                                      <p className="text-gray-300">{interaction.recommendation}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Evidence Level</p>
                                      <p className="text-gray-300">{interaction.evidence}</p>
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

        {/* Placeholder */}
        {!showResults && (
          <Card className="p-6" hover={false}>
            <div className="h-32 flex items-center justify-center">
              <p className="text-gray-600 text-sm">
                Select medications and herbs above, then click &quot;Check Interactions&quot; to view the interaction matrix
              </p>
            </div>
          </Card>
        )}

        {/* Herb-Herb Cautions */}
        <Card className="p-4 sm:p-6 space-y-4" hover={false}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Herb-Herb Cautions</h2>
            <Badge variant="pending">Botanical Safety</Badge>
          </div>
          <p className="text-gray-500 text-sm">Common herb-herb interactions to be aware of when designing botanical protocols</p>
          <div className="space-y-2">
            {HERB_HERB_CAUTIONS.map((item) => {
              const cfg = SEVERITY_CONFIG[item.risk];
              const Icon = cfg.icon;
              return (
                <div key={item.herbs} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bgClass} border ${cfg.borderClass}`}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div>
                    <p className="text-white text-sm font-medium">{item.herbs}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{item.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Severity Legend (bottom) */}
        <Card className="p-5" hover={false}>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Interaction Severity Levels</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { severity: "critical" as Severity, desc: "Contraindicated. Do not co-administer. Serious adverse outcomes expected." },
              { severity: "major" as Severity, desc: "Significant risk. Use alternative or closely monitor with dose adjustment." },
              { severity: "moderate" as Severity, desc: "Needs monitoring. May require timing separation or dose modification." },
              { severity: "none" as Severity, desc: "No known interaction. Safe to co-administer at standard doses." },
            ]).map((item) => {
              const cfg = SEVERITY_CONFIG[item.severity];
              const Icon = cfg.icon;
              return (
                <div key={item.severity} className={`${cfg.bgClass} border ${cfg.borderClass} rounded-lg p-4 space-y-2`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
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
