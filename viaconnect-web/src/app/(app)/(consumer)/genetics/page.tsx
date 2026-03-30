"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, Dna, Sparkles, ArrowRight,
  Shield, Lock, Upload, FileText, CheckCircle2, ClipboardList,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════ */
/*  DATA                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

const PANELS = [
  { id: "genex360-complete", code: "GeneX360\u2122 Complete", name: "All 6 Panels", icon: "\ud83e\uddec", price: "$988.88", status: "partial" as const, partialLabel: "2/6", accent: "teal", genes: [], variants: "500+", description: "The full suite of 6 genetic panels in one comprehensive test", isComplete: true,
    subPanels: ["GeneX-M\u2122", "NutrigenDX\u2122", "HormoneIQ\u2122", "EpigenHQ\u2122", "PeptideIQ\u2122", "CannabisIQ\u2122"] },
  { id: "genex-m", code: "GeneX-M\u2122", name: "Methylation", icon: "\ud83d\udd2c", price: "$288.88", status: "complete" as const, accent: "blue", accentColor: "#60A5FA",
    genes: ["MTHFR", "COMT", "CBS", "MTR", "MTRR", "AHCY", "MAT"], variants: "45+",
    description: "Methylation pathway analysis for B-vitamin metabolism and detoxification" },
  { id: "nutrigendx", code: "NutrigenDX\u2122", name: "Nutrition", icon: "\ud83e\udd57", price: "$288.88", status: "incomplete" as const, accent: "green", accentColor: "#4ADE80",
    genes: ["FUT2", "GC", "BCMO1", "SLC23A1", "NBPF3"], variants: "80+",
    description: "Nutrigenomic profiling for vitamin metabolism and mineral absorption" },
  { id: "hormoneiq", code: "HormoneIQ\u2122", name: "Complete Hormone", icon: "\u26a1", price: "$388.88", status: "incomplete" as const, accent: "purple", accentColor: "#A855F7",
    genes: ["CYP19A1", "ESR1", "AR", "DIO2", "HSD17B1"], variants: "65+",
    description: "Hormone pathway genetics for estrogen, testosterone, thyroid, and cortisol" },
  { id: "epigenhq", code: "EpigenHQ\u2122", name: "Biological Age", icon: "\u231b", price: "$388.88", status: "incomplete" as const, accent: "amber", accentColor: "#FBBF24",
    genes: ["TERT", "TERC", "FOXO3", "APOE", "SIRT1"], variants: "55+",
    description: "Epigenetic clock analysis for biological age and telomere length" },
  { id: "peptideiq", code: "PeptideIQ\u2122", name: "Peptide Genetics", icon: "\ud83e\uddea", price: "$488.88", status: "incomplete" as const, accent: "cyan", accentColor: "#22D3EE",
    genes: ["GH1", "IGF1", "COL1A1", "COL5A1", "MMP1"], variants: "40+",
    description: "Peptide response genetics for growth hormone and collagen synthesis" },
  { id: "cannabisiq", code: "CannabisIQ\u2122", name: "Cannabinoid Genetics", icon: "\ud83c\udf3f", price: "$288.88", status: "incomplete" as const, accent: "emerald", accentColor: "#34D399",
    genes: ["CNR1", "CNR2", "FAAH", "CYP2C9", "COMT"], variants: "35+",
    description: "Endocannabinoid system genetics for CB1/CB2 receptors and THC metabolism" },
];

const VARIANTS = [
  { gene: "MTHFR C677T", variant: "C677T", rsId: "rs1801133", genotype: "CT", impact: "High" as const, category: "Methylation", insight: "Your heterozygous variant reduces methylfolate conversion by ~35%. Prioritize methylated B vitamins.", product: "GeneX-M\u2122", recommendation: "Use active L-methylfolate instead of folic acid" },
  { gene: "COMT Val158Met", variant: "Val158Met", rsId: "rs4680", genotype: "AG", impact: "Moderate" as const, category: "Mood & Cognition", insight: "Intermediate COMT activity. Moderate catecholamine metabolism.", recommendation: "Balanced magnesium and SAMe support" },
  { gene: "APOE E3/E4", variant: "E3/E4", rsId: "rs429358", genotype: "CT", impact: "High" as const, category: "Cardiovascular", insight: "One copy of APOE4. Increased cardiovascular and neurological risk.", recommendation: "Omega-3 and anti-inflammatory support recommended" },
  { gene: "CYP1A2 *1F", variant: "*1F", rsId: "rs762551", genotype: "AA", impact: "Low" as const, category: "Metabolism", insight: "Fast caffeine metabolizer. You process caffeine efficiently." },
  { gene: "VDR BsmI", variant: "BsmI", rsId: "rs1544410", genotype: "CT", impact: "Moderate" as const, category: "Recovery", recommendation: "May need higher Vitamin D doses due to receptor efficiency" },
  { gene: "CLOCK rs1801260", variant: "rs1801260", rsId: "rs1801260", genotype: "TC", impact: "Moderate" as const, category: "Sleep", insight: "Your CLOCK variant may shift circadian rhythm later." },
  { gene: "FTO rs9939609", variant: "rs9939609", rsId: "rs9939609", genotype: "AT", impact: "Moderate" as const, category: "Metabolism", recommendation: "Exercise and metabolic support may be more impactful" },
  { gene: "BDNF Val66Met", variant: "Val66Met", rsId: "rs6265", genotype: "AG", impact: "Low" as const, category: "Mood & Cognition", insight: "May benefit from neuroplasticity-supporting supplements." },
  { gene: "GSTT1", variant: "null/present", rsId: "null", genotype: "null", impact: "High" as const, category: "Detox", insight: "Reduced glutathione S-transferase activity affects Phase II detoxification.", recommendation: "NAC and glutathione support critical" },
];

const FILTER_TABS = ["All", "High", "Moderate", "Low", "Protective"] as const;

const DNA_SERVICES = ["23andMe", "Viome", "AncestryDNA", "MyHeritage", "Nebula Genomics", "10X", "Any Raw File"];

const LAB_CATEGORIES = [
  { icon: "\ud83e\ude78", label: "Blood Panels" },
  { icon: "\ud83e\uddea", label: "Biomarkers" },
  { icon: "\ud83e\udda0", label: "Hormones" },
  { icon: "\ud83d\udcca", label: "Full Reports" },
];

function impactColor(impact: string) {
  if (impact === "High") return { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", dot: "bg-red-400" };
  if (impact === "Moderate") return { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", dot: "bg-yellow-400" };
  if (impact === "Low") return { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/20", dot: "bg-green-400" };
  return { text: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20", dot: "bg-teal-400" };
}

function StatusBadge({ status, partial }: { status: string; partial?: string }) {
  if (status === "complete") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" />Results Ready</span>;
  if (status === "partial") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />{partial || "Partial"}</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/30" />Available</span>;
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function GeneticsPage() {
  const [variantFilter, setVariantFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null);
  const dnaInputRef = useRef<HTMLInputElement>(null);
  const labInputRef = useRef<HTMLInputElement>(null);

  const filteredVariants = VARIANTS.filter((v) => {
    const matchesFilter = variantFilter === "All" || v.impact === variantFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || v.gene.toLowerCase().includes(q) || v.rsId.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const riskCounts = { High: VARIANTS.filter(v => v.impact === "High").length, Moderate: VARIANTS.filter(v => v.impact === "Moderate").length, Low: VARIANTS.filter(v => v.impact === "Low").length };

  return (
    <div className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10" style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}>
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ═══ PREMIUM HEADER ═══ */}
        <header className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 md:p-8">
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 400 100"><path d="M0,50 Q100,20 200,50 T400,50" fill="none" stroke="#2DA5A0" strokeWidth="1" /><path d="M0,50 Q100,80 200,50 T400,50" fill="none" stroke="#B75E18" strokeWidth="1" /></svg>
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-400/10 flex items-center justify-center relative">
              <Dna className="w-7 h-7 text-teal-400" />
              <div className="absolute inset-0 rounded-2xl bg-teal-400/20 blur-xl animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Genetics</h1>
              <p className="text-sm text-white/40 mt-0.5">Upload your DNA test and lab results here</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20">
              <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /><span className="w-2 h-2 rounded-full bg-white/15" /><span className="w-2 h-2 rounded-full bg-white/15" /></div>
              <span className="text-xs text-blue-400 font-medium">Personalized</span>
            </div>
          </div>
        </header>

        {/* ═══ GENEX360 COMPLETE (HERO) ═══ */}
        <div className="rounded-2xl p-5 md:p-6 border border-teal-400/20 bg-gradient-to-br from-teal-400/10 via-blue-400/5 to-orange-400/5 hover:border-teal-400/40 hover:shadow-[0_0_40px_rgba(45,165,160,0.1)] transition-all duration-300 cursor-pointer">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <span className="text-3xl">{PANELS[0].icon}</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg md:text-xl font-bold text-white">{PANELS[0].code}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-teal-400/20 to-orange-400/20 border border-teal-400/30 text-teal-400 font-medium">Most Popular</span>
              </div>
              <p className="text-sm text-white/50 mb-3">{PANELS[0].description}</p>
              <div className="flex flex-wrap gap-1.5">
                {PANELS[0].subPanels?.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-mono">{p}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <StatusBadge status={PANELS[0].status} partial={PANELS[0].partialLabel} />
              <span className="text-xs text-white/30">{PANELS[0].variants} variants</span>
              <span className="text-sm font-bold text-white">{PANELS[0].price}</span>
            </div>
          </div>
        </div>

        {/* ═══ 6 INDIVIDUAL PANELS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {PANELS.slice(1).map((panel) => {
            const accentBg = `bg-[${panel.accentColor}]/10`;
            return (
              <div key={panel.id} className={`rounded-2xl p-4 md:p-5 border border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer`}
                style={{ boxShadow: `0 0 0 0 ${panel.accentColor}00` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${panel.accentColor}15`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${panel.accentColor}00`; }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{panel.icon}</span>
                  <StatusBadge status={panel.status} />
                </div>
                <h3 className="text-sm font-bold text-white">{panel.code}</h3>
                <p className="text-xs text-white/40 mt-0.5">{panel.name}</p>
                <p className="text-xs text-white/30 mt-2 line-clamp-2">{panel.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {panel.genes?.slice(0, 4).map((g) => (
                    <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/[0.06] text-white/30 font-mono">{g}</span>
                  ))}
                  {(panel.genes?.length || 0) > 4 && <span className="text-[9px] px-1.5 py-0.5 text-white/20">+{(panel.genes?.length || 0) - 4} more</span>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-white/25">{panel.variants} variants</span>
                  <span className="text-sm font-bold text-white">{panel.price}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ YOUR VARIANTS EXPLORER ═══ */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">Your Variants</h2>
              <p className="text-xs text-white/30 mt-0.5">{VARIANTS.length} genetic variants analyzed</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-400/15 border border-red-400/20 text-red-400 font-medium">{riskCounts.High} High</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/20 text-yellow-400 font-medium">{riskCounts.Moderate} Moderate</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/15 border border-green-400/20 text-green-400 font-medium">{riskCounts.Low} Low</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {FILTER_TABS.map((tab) => {
              const isActive = variantFilter === tab;
              const c = tab === "High" ? "red" : tab === "Moderate" ? "yellow" : tab === "Low" ? "green" : tab === "Protective" ? "teal" : "white";
              return (
                <button key={tab} onClick={() => setVariantFilter(tab)}
                  className={`flex-shrink-0 min-h-[36px] px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive ? `bg-${c}-400/15 border border-${c}-400/30 text-${c}-400` : "bg-white/5 border border-white/[0.06] text-white/40 hover:text-white/60"
                  }`}>{tab}</button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/25" />
            <input type="text" placeholder="Search by gene name or rs number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-base text-white placeholder:text-white/25 outline-none" />
          </div>

          {/* Variant Cards */}
          <div className="space-y-2">
            {filteredVariants.length === 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-8 text-center">
                <Dna className="mx-auto mb-3 h-8 w-8 text-white/15" />
                <p className="text-sm text-white/30">No variants match your filter.</p>
              </div>
            )}
            {filteredVariants.map((v, idx) => {
              const colors = impactColor(v.impact);
              const isOpen = expandedVariant === idx;
              return (
                <div key={`${v.rsId}-${idx}`} className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden transition-all`}>
                  <button onClick={() => setExpandedVariant(isOpen ? null : idx)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors min-h-[44px]">
                    <span className={`text-sm font-bold font-mono ${colors.text} shrink-0`}>{v.gene}</span>
                    <span className="text-xs font-mono text-white/25 hidden sm:inline">{v.variant}</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{v.genotype}</span>
                    <span className="text-xs text-white/20 hidden md:inline flex-1">{v.category}</span>
                    <span className={`text-[9px] uppercase font-bold ${colors.text} ml-auto mr-2`}>{v.impact}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.04]">
                          {v.insight && <p className="text-sm text-white/50 leading-relaxed">{v.insight}</p>}
                          {v.recommendation && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-teal-400/5 border border-teal-400/10">
                              <Sparkles className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-teal-400/80">{v.recommendation}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {v.product && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">Panel: {v.product}</span>}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">rs{v.rsId.replace("rs", "")}</span>
                          </div>
                          <p className="text-[10px] text-orange-400/50 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Consult a practitioner before making changes based on genetic data
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ DNA UPLOAD (TEAL ACCENT) ═══ */}
        <section className="rounded-2xl bg-gradient-to-br from-[#141E33] to-[#1A2E3E] border border-teal-400/15 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 z-10">
            <Lock className="w-3 h-3 text-teal-400" /><span className="text-[10px] text-teal-400 font-medium">256-bit Encrypted</span>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-teal-400/10 flex items-center justify-center relative flex-shrink-0">
              <Dna className="w-7 h-7 text-teal-400" /><div className="absolute inset-0 rounded-2xl bg-teal-400/15 blur-lg" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">Upload Your DNA Test</h3>
              <p className="text-sm text-white/40 mt-0.5">Including tests from other companies</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {DNA_SERVICES.map((s) => <span key={s} className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/[0.06] text-white/35 font-medium">{s}</span>)}
          </div>
          <div onClick={() => dnaInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-teal-400/20 p-6 md:p-8 text-center cursor-pointer hover:border-teal-400/40 hover:bg-teal-400/5 hover:shadow-[0_0_30px_rgba(45,165,160,0.08)] transition-all">
            <Upload className="w-10 h-10 text-teal-400/30 mx-auto mb-3" />
            <p className="text-sm text-white/60 mb-1">Drag &amp; drop your DNA file or click to browse</p>
            <p className="text-xs text-white/25">Supported: .txt, .csv, .zip, .gz, .tsv, .vcf</p>
          </div>
          <input ref={dnaInputRef} type="file" className="hidden" accept=".txt,.csv,.zip,.gz,.tsv,.vcf" />
        </section>

        {/* ═══ LAB RESULTS UPLOAD (ORANGE ACCENT) ═══ */}
        <section className="rounded-2xl bg-gradient-to-br from-[#1A2744] to-[#2A1F15] border border-orange-400/15 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-400/10 border border-orange-400/20 z-10">
            <Shield className="w-3 h-3 text-orange-400" /><span className="text-[10px] text-orange-400 font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-400/10 flex items-center justify-center relative flex-shrink-0">
              <ClipboardList className="w-7 h-7 text-orange-400" /><div className="absolute inset-0 rounded-2xl bg-orange-400/15 blur-lg" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">Upload Lab Results</h3>
              <p className="text-sm text-white/40 mt-0.5">Blood panels, biomarkers, and lab reports</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {LAB_CATEGORIES.map((c) => (
              <div key={c.label} className="rounded-lg p-3 bg-white/[0.03] border border-white/[0.06] text-center">
                <span className="text-lg">{c.icon}</span>
                <p className="text-[10px] text-white/35 font-medium mt-1">{c.label}</p>
              </div>
            ))}
          </div>
          <div onClick={() => labInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-orange-400/20 p-6 md:p-8 text-center cursor-pointer hover:border-orange-400/40 hover:bg-orange-400/5 hover:shadow-[0_0_30px_rgba(183,94,24,0.08)] transition-all">
            <FileText className="w-10 h-10 text-orange-400/30 mx-auto mb-3" />
            <p className="text-sm text-white/60 mb-1">Drop your raw data file here or click to browse</p>
            <p className="text-xs text-white/25">Supported: PDF, CSV, Excel, or photo (.jpg, .png, .heic)</p>
          </div>
          <input ref={labInputRef} type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic,.txt" multiple />
          <p className="text-[10px] text-white/15 mt-4">Your lab data is encrypted end-to-end and never shared without your consent. Lab results enhance your Bio Optimization score and Wellness Analytics.</p>
        </section>

        {/* ═══ ORDER CTA ═══ */}
        <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-[#1A2744] via-[#1E2D4A] to-[#1A2744] border border-white/[0.06] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400/5 via-transparent to-orange-400/5" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Unlock Your Genetic Blueprint</h3>
              <p className="text-sm text-white/40 mt-1">6 comprehensive panels. Move from <span className="text-blue-400">Personalized</span> to <span className="text-teal-400">Precision Optimized</span>.</p>
            </div>
            <a href="/shop" className="flex-shrink-0 min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-teal-400/15 to-orange-400/15 border border-teal-400/30 text-white text-sm font-semibold hover:shadow-[0_0_30px_rgba(45,165,160,0.15)] transition-all flex items-center gap-2 w-full sm:w-auto justify-center">
              View GENEX360&trade; Panels <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
