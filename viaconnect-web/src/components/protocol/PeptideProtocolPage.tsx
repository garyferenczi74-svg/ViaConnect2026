"use client";

import { useState, useRef, useEffect } from "react";
import { FlaskConical, ClipboardList, ArrowRight, RefreshCw, Search, Dna } from "lucide-react";
import { searchPeptides } from "@/config/peptide-database/registry";
import type { PeptideProduct } from "@/config/peptide-database/categories-1-3";
import { ListenToSummary } from "@/components/analytics/ListenToSummary";
import { PeptideDisclaimerBanner } from "./PeptideDisclaimerBanner";
import { HelixPeptideCard } from "./HelixPeptideCard";
import { PeptideStackGrid } from "./PeptideStackGrid";
import { PeptideTimeline } from "./PeptideTimeline";
import { PeptidePractitionerAccess } from "./PeptidePractitionerAccess";
import { PeptideFAQSection } from "./PeptideFAQSection";
import { matchPeptidesToPatterns } from "@/lib/ai/peptide-matching";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

interface MasterPattern {
  name: string;
  symptomsInvolved?: string[];
}

interface PeptideProtocolPageProps {
  masterPatterns: MasterPattern[];
  helixBalance: number;
  caqCompleted: boolean;
}

function generatePeptideSummary(recs: PeptideRecommendation[]): string {
  if (recs.length === 0) return "No peptide protocol recommended at this time.";
  const names = recs.flatMap((r) => r.products.map((p) => p.name));
  return `Your personalized peptide protocol includes ${names.join(", ")}. These are matched to your Ultrathink master patterns for targeted wellness optimization. All products use dual liposomal-micellar delivery for enhanced bioavailability. Please consult your practitioner before starting.`;
}

function PeptideNotReadyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/15 flex items-center justify-center mx-auto mb-6">
        <FlaskConical className="w-8 h-8 text-purple-400/40" strokeWidth={1} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Your Peptide Protocol Awaits</h2>
      <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed mb-6">
        Complete your Clinical Assessment Questionnaire first. Ultrathink will analyze your symptoms, goals, and patterns to recommend personalized peptides from the ViaConnect portfolio.
      </p>
      <a href="/onboarding/i-caq-intro" className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-semibold hover:bg-teal-400/20 transition-all">
        <ClipboardList className="w-4 h-4" strokeWidth={1.5} />
        Start Your Assessment
      </a>
    </div>
  );
}

function PeptideEmptyState() {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-8 text-center">
      <FlaskConical className="w-10 h-10 text-white/10 mx-auto mb-4" strokeWidth={1} />
      <h3 className="text-base font-semibold text-white mb-2">No Peptide Protocol Recommended Yet</h3>
      <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed">
        Based on your current master patterns, your nutraceutical supplement stack is already well-optimized. Peptide recommendations will appear here if your patterns change on re-assessment or if you upload genetic data that reveals peptide synergies.
      </p>
    </div>
  );
}

const CATEGORY_CHIPS = [
  { id: 0, label: "All" },
  { id: 1, label: "Longevity", color: "#7C3AED" },
  { id: 2, label: "Stress", color: "#DC2626" },
  { id: 3, label: "Energy", color: "#F59E0B" },
  { id: 4, label: "Immune", color: "#059669" },
  { id: 5, label: "Neuro", color: "#2563EB" },
  { id: 6, label: "Hormonal", color: "#EC4899" },
  { id: 7, label: "Gut/Detox", color: "#84CC16" },
  { id: 8, label: "Metabolic", color: "#B75E18" },
];

function PeptideSearchSection() {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState(0);
  const [results, setResults] = useState<PeptideProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    const catLabel = catFilter > 0 ? CATEGORY_CHIPS.find((c) => c.id === catFilter)?.label.toLowerCase() || "" : "";
    const searchTerm = q.length >= 2 ? q : catLabel;
    if (!searchTerm) { setResults([]); setShowDropdown(false); return; }
    const found = searchPeptides(searchTerm).filter((p) => catFilter === 0 || p.category.toLowerCase().includes(catLabel));
    setResults(found.slice(0, 8));
    setShowDropdown(found.length > 0);
  }, [query, catFilter]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search peptides by name, category, or condition..."
            className="w-full min-h-[48px] pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-purple-400/20 text-sm text-white placeholder:text-white/20 focus:border-purple-400/40 focus:ring-1 focus:ring-purple-400/20 transition-all outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {CATEGORY_CHIPS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCatFilter(cat.id === catFilter ? 0 : cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all min-h-[32px] ${
                catFilter === cat.id ? "text-white" : "bg-white/5 text-white/30 hover:text-white/50"
              }`}
              style={catFilter === cat.id && cat.color ? { backgroundColor: cat.color } : catFilter === cat.id ? { backgroundColor: "#6B7280" } : undefined}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 rounded-xl bg-[#1E2D47] border border-white/10 shadow-2xl overflow-hidden max-h-[320px] overflow-y-auto">
          {results.map((pep) => (
            <button
              key={pep.id}
              type="button"
              onClick={() => { setShowDropdown(false); setQuery(""); }}
              className="w-full text-left px-4 py-3 hover:bg-purple-400/5 border-b border-white/[0.03] last:border-0 transition-colors flex items-center justify-between gap-3 min-h-[56px]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Dna className="w-4 h-4 text-purple-400/60 flex-shrink-0" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-white/90 font-medium truncate">{pep.name}</p>
                  <p className="text-[10px] text-white/30">{pep.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${pep.evidenceLevel === "strong" ? "bg-teal-400/10 text-teal-400/60" : pep.evidenceLevel === "emerging" ? "bg-blue-400/10 text-blue-400/60" : "bg-amber-400/10 text-amber-400/60"}`}>
                  {pep.evidenceLevel}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PeptideProtocolPage({ masterPatterns, helixBalance, caqCompleted }: PeptideProtocolPageProps) {
  if (!caqCompleted) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <PeptideNotReadyState />
      </div>
    );
  }

  const recommendations = matchPeptidesToPatterns(masterPatterns);
  const hasPeptideRecs = recommendations.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Peptide Protocol</h1>
        <p className="text-sm text-white/40 mt-1">Personalized oral peptides, Powered by Ultrathink</p>
      </div>

      {/* Mandatory disclaimer */}
      <PeptideDisclaimerBanner />

      {/* Hero header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-[#1A2744] to-teal-400/5" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute blur-xl -inset-1.5 rounded-2xl opacity-60" style={{ backgroundColor: "#A855F733" }} />
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F733, #A855F71A, transparent)", border: "1px solid #A855F726" }}>
                  <FlaskConical className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Your Personalized Peptide Stack</h2>
                <p className="text-sm text-white/40 mt-0.5">
                  {hasPeptideRecs
                    ? `Based on your CAQ patterns: ${masterPatterns.map((p) => p.name.toLowerCase()).join(", ")}`
                    : "Complete your assessment to unlock personalized recommendations"}
                </p>
              </div>
            </div>
            {hasPeptideRecs && <ListenToSummary summaryText={generatePeptideSummary(recommendations)} />}
          </div>
        </div>
      </div>

      {/* Peptide search bar */}
      <PeptideSearchSection />

      {/* Update assessment */}
      <div className="rounded-xl bg-white/[0.02] border border-orange-400/15 p-4 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#B75E1833" }} />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #B75E1833, #B75E181A, transparent)", border: "1px solid #B75E1826" }}>
            <RefreshCw className="w-4 h-4 text-orange-400" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">Update Assessment</h4>
          <p className="text-[11px] text-white/30 mt-0.5">Retake CAQ to refresh your peptide protocol</p>
        </div>
        <a href="/onboarding/i-caq-intro" className="min-h-[36px] px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/30 text-orange-400 text-[11px] font-medium hover:bg-orange-400/15 transition-all flex items-center gap-1.5 flex-shrink-0">
          <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Retake
        </a>
      </div>

      {/* Helix balance */}
      {hasPeptideRecs && <HelixPeptideCard helixBalance={helixBalance} />}

      {/* Cards or empty state */}
      {hasPeptideRecs ? (
        <PeptideStackGrid recommendations={recommendations} />
      ) : (
        <PeptideEmptyState />
      )}

      {/* Timeline */}
      {hasPeptideRecs && <PeptideTimeline recommendations={recommendations} />}

      {/* Practitioner access */}
      <PeptidePractitionerAccess />

      {/* FAQ */}
      <PeptideFAQSection />

    </div>
  );
}
