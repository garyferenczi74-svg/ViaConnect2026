"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, ChevronUp, Dna, Sparkles, ArrowRight,
  Shield, Lock, Upload, FileText, ClipboardList,
  FlaskConical, Apple, Activity, Clock, TestTubes, Leaf,
  Droplets, TestTube, FileBarChart, ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getGeneticsShopUrl } from "@/utils/geneticsShopLinks";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";
import FixedHeroSection from "@/components/ui/FixedHeroSection";

const GENETICS_HERO_IMAGE =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Scientist%201.png";

/* ═══════════════════════════════════════════════════════════════════════ */
/*  PREMIUM ICON                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */

function PremiumIcon({ icon: Icon, color, size = "md" }: { icon: LucideIcon; color: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? { box: "w-14 h-14", ico: "w-7 h-7", glow: "blur-2xl -inset-2" }
    : size === "sm" ? { box: "w-9 h-9", ico: "w-4 h-4", glow: "blur-lg -inset-1" }
    : { box: "w-12 h-12", ico: "w-5 h-5", glow: "blur-xl -inset-1.5" };
  return (
    <div className="relative flex-shrink-0">
      <div className={`absolute ${s.glow} rounded-2xl opacity-60 pointer-events-none`} style={{ backgroundColor: `${color}33` }} />
      <div className={`relative ${s.box} rounded-xl flex items-center justify-center`}
        style={{ background: `linear-gradient(135deg, ${color}33 0%, ${color}1A 50%, transparent 100%)`, border: `1px solid ${color}26` }}>
        <Icon className={s.ico} style={{ color }} strokeWidth={1.5} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  DATA                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

const PANELS: { id: string; code: string; name: string; icon: LucideIcon; color: string; status: "complete" | "partial" | "incomplete"; partialLabel?: string; genes: string[]; variants: string; description: string; isComplete?: boolean; subPanels?: string[] }[] = [
  { id: "genex360-complete", code: "GeneX360\u2122 Complete", name: "All 6 Panels", icon: Dna, color: "#2DA5A0", status: "partial", partialLabel: "2/6", genes: [], variants: "500+", description: "The full suite of 6 genetic panels in one comprehensive test", isComplete: true,
    subPanels: ["GeneX-M\u2122", "NutrigenDX\u2122", "HormoneIQ\u2122", "EpigenHQ\u2122", "PeptideIQ\u2122", "CannabisIQ\u2122"] },
  { id: "genex-m", code: "GeneX-M\u2122", name: "Methylation", icon: FlaskConical, color: "#60A5FA", status: "complete",
    genes: ["MTHFR", "COMT", "CBS", "MTR", "MTRR", "AHCY", "MAT"], variants: "45+", description: "Methylation pathway analysis for B-vitamin metabolism" },
  { id: "nutrigendx", code: "NutrigenDX\u2122", name: "Nutrition", icon: Apple, color: "#4ADE80", status: "incomplete",
    genes: ["FUT2", "GC", "BCMO1", "SLC23A1", "NBPF3"], variants: "80+", description: "Vitamin metabolism, mineral absorption, macronutrient sensitivity" },
  { id: "hormoneiq", code: "HormoneIQ\u2122", name: "Complete Hormone", icon: Activity, color: "#A855F7", status: "incomplete",
    genes: ["CYP19A1", "ESR1", "AR", "DIO2", "HSD17B1"], variants: "65+", description: "Estrogen, testosterone, thyroid, cortisol pathway genetics" },
  { id: "epigenhq", code: "EpigenHQ\u2122", name: "Biological Age", icon: Clock, color: "#FBBF24", status: "incomplete",
    genes: ["TERT", "TERC", "FOXO3", "APOE", "SIRT1"], variants: "55+", description: "Biological age, telomere length, DNA methylation clock" },
  { id: "peptideiq", code: "PeptideIQ\u2122", name: "Peptide Genetics", icon: TestTubes, color: "#22D3EE", status: "incomplete",
    genes: ["GH1", "IGF1", "COL1A1", "COL5A1", "MMP1"], variants: "40+", description: "Growth hormone, collagen synthesis, neuropeptide sensitivity" },
  { id: "cannabisiq", code: "CannabisIQ\u2122", name: "Cannabinoid Genetics", icon: Leaf, color: "#34D399", status: "incomplete",
    genes: ["CNR1", "CNR2", "FAAH", "CYP2C9", "COMT"], variants: "35+", description: "CB1/CB2 receptors, FAAH, THC metabolism" },
];

const VARIANTS = [
  { gene: "MTHFR C677T", variant: "C677T", rsId: "rs1801133", genotype: "CT", impact: "High" as const, category: "Methylation", insight: "Your heterozygous variant reduces methylfolate conversion by ~35%. Prioritize methylated B vitamins.", recommendation: "Use active L-methylfolate instead of folic acid", product: "GeneX-M\u2122" },
  { gene: "COMT Val158Met", variant: "Val158Met", rsId: "rs4680", genotype: "AG", impact: "Moderate" as const, category: "Mood & Cognition", insight: "Intermediate COMT activity. Moderate catecholamine metabolism.", recommendation: "Balanced magnesium and SAMe support" },
  { gene: "APOE E3/E4", variant: "E3/E4", rsId: "rs429358", genotype: "CT", impact: "High" as const, category: "Cardiovascular", insight: "One copy of APOE4. Increased cardiovascular and neurological risk.", recommendation: "Omega-3 and anti-inflammatory support recommended" },
  { gene: "CYP1A2 *1F", variant: "*1F", rsId: "rs762551", genotype: "AA", impact: "Low" as const, category: "Metabolism", insight: "Fast caffeine metabolizer. You process caffeine efficiently." },
  { gene: "VDR BsmI", variant: "BsmI", rsId: "rs1544410", genotype: "CT", impact: "Moderate" as const, category: "Recovery", recommendation: "May need higher Vitamin D doses due to receptor efficiency" },
  { gene: "CLOCK rs1801260", variant: "rs1801260", rsId: "rs1801260", genotype: "TC", impact: "Moderate" as const, category: "Sleep", insight: "Your CLOCK variant may shift circadian rhythm later." },
  { gene: "FTO rs9939609", variant: "rs9939609", rsId: "rs9939609", genotype: "AT", impact: "Moderate" as const, category: "Metabolism", recommendation: "Exercise and metabolic support may be more impactful" },
  { gene: "BDNF Val66Met", variant: "Val66Met", rsId: "rs6265", genotype: "AG", impact: "Low" as const, category: "Mood & Cognition", insight: "May benefit from neuroplasticity-supporting supplements." },
  { gene: "GSTT1", variant: "null/present", rsId: "null", genotype: "null", impact: "High" as const, category: "Detox", insight: "Reduced glutathione S-transferase activity affects Phase II detoxification.", recommendation: "NAC and glutathione support critical" },
];

const LAB_CATEGORIES: { icon: LucideIcon; color: string; label: string; sub: string }[] = [
  { icon: Droplets, color: "#F87171", label: "Blood Panels", sub: "CBC, CMP, Lipids" },
  { icon: TestTube, color: "#2DA5A0", label: "Biomarkers", sub: "Vitamins, Minerals" },
  { icon: Activity, color: "#A855F7", label: "Hormones", sub: "Thyroid, Cortisol" },
  { icon: FileBarChart, color: "#B75E18", label: "Full Reports", sub: "Any lab PDF" },
];

const DNA_SERVICES = ["23andMe", "Viome", "AncestryDNA", "MyHeritage", "Nebula Genomics", "10X", "Any Raw File"];

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

/* ── Buy Now button: deep-links to /shop?q=<panel> via geneticsShopLinks ── */
function BuyNowButton({ panelId, compact = false }: { panelId: string; compact?: boolean }) {
  const href = getGeneticsShopUrl(panelId);
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className={compact ? "inline-block" : "inline-block w-full sm:w-auto"}>
      <motion.span
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 hover:shadow-[#2DA5A0]/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${
          compact
            ? "px-3 py-1.5 text-xs min-h-[32px]"
            : "px-4 py-2.5 text-xs sm:text-sm min-h-[44px] w-full sm:w-auto"
        }`}
      >
        <ShoppingCart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
        Buy Now
      </motion.span>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function GeneticsPage() {
  const [variantFilter, setVariantFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVariant, setExpandedVariant] = useState<number | null>(null);
  const dnaInputRef = useRef<HTMLInputElement>(null);
  const labInputRef = useRef<HTMLInputElement>(null);

  const filteredVariants = VARIANTS.filter((v) => {
    const matchesFilter = variantFilter === "All" || v.impact === variantFilter;
    const q = searchQuery.toLowerCase();
    return matchesFilter && (!q || v.gene.toLowerCase().includes(q) || v.rsId.toLowerCase().includes(q));
  });

  const riskCounts = { High: VARIANTS.filter(v => v.impact === "High").length, Moderate: VARIANTS.filter(v => v.impact === "Moderate").length, Low: VARIANTS.filter(v => v.impact === "Low").length };

  return (
    <div className="min-h-screen w-full" style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}>
      {/* ── Fixed Hero (Prompt #62) ── */}
      <FixedHeroSection
        imageUrl={GENETICS_HERO_IMAGE}
        height="h-[280px] md:h-[380px]"
        overlayOpacity={0.58}
        gradientFade="bottom"
        alt="GeneX360 genetics portal background"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-0.5 w-10 rounded-full bg-[#2DA5A0]" />
          <h1 className="font-instrument-sans text-2xl font-semibold tracking-tight text-white md:text-4xl">
            GeneX360 Genetics Protocol
          </h1>
          <p className="max-w-lg text-sm text-white/65 md:text-base">
            Precision insights from your genetic blueprint
          </p>
        </div>
      </FixedHeroSection>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-10">

        {/* ═══ PREMIUM HEADER ═══ */}
        <header className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 md:p-8">
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 400 100"><path d="M0,50 Q100,20 200,50 T400,50" fill="none" stroke="#2DA5A0" strokeWidth="1" /><path d="M0,50 Q100,80 200,50 T400,50" fill="none" stroke="#B75E18" strokeWidth="1" /></svg>
          </div>
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <PremiumIcon icon={Dna} color="#2DA5A0" size="lg" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Genetics</h1>
              <p className="text-sm text-white/40 mt-0.5">Upload your DNA test and lab results here</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20">
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /><span className="w-2 h-2 rounded-full bg-white/15" /><span className="w-2 h-2 rounded-full bg-white/15" /></div>
                <span className="text-xs text-blue-400 font-medium">Personalized</span>
              </div>
              <ShareProtocolButton compact label="Share" />
            </div>
          </div>
        </header>

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

          {/* Filter + Search */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {(["All", "High", "Moderate", "Low"] as const).map((tab) => {
              const active = variantFilter === tab;
              return <button key={tab} onClick={() => setVariantFilter(tab)} className={`flex-shrink-0 min-h-[36px] px-4 py-1.5 rounded-full text-xs font-medium transition-all ${active ? "bg-teal-400/15 border border-teal-400/30 text-teal-400" : "bg-white/5 border border-white/[0.06] text-white/40 hover:text-white/60"}`}>{tab}</button>;
            })}
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/25" strokeWidth={1.5} />
            <input type="text" placeholder="Search by gene name or rs number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent text-sm text-base text-white placeholder:text-white/25 outline-none" />
          </div>

          {/* Variant Cards */}
          <div className="space-y-2">
            {filteredVariants.length === 0 && (
              <div className="rounded-xl bg-white/[0.02] border border-white/5 p-8 text-center">
                <Dna className="mx-auto mb-3 h-8 w-8 text-white/15" strokeWidth={1.5} />
                <p className="text-sm text-white/30">No variants match your filter.</p>
              </div>
            )}
            {filteredVariants.map((v, idx) => {
              const c = impactColor(v.impact);
              const isOpen = expandedVariant === idx;
              return (
                <div key={`${v.rsId}-${idx}`} className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden transition-all`}>
                  <button onClick={() => setExpandedVariant(isOpen ? null : idx)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors min-h-[44px]">
                    <span className={`text-sm font-bold font-mono ${c.text} shrink-0`}>{v.gene}</span>
                    <span className="text-xs font-mono text-white/25 hidden sm:inline">{v.variant}</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${c.bg} ${c.text}`}>{v.genotype}</span>
                    <span className="text-xs text-white/20 hidden md:inline flex-1">{v.category}</span>
                    <span className={`text-[9px] uppercase font-bold ${c.text} ml-auto mr-2`}>{v.impact}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.04]">
                          {v.insight && <p className="text-sm text-white/50 leading-relaxed">{v.insight}</p>}
                          {v.recommendation && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-teal-400/5 border border-teal-400/10">
                              <Sparkles className="w-3.5 h-3.5 text-teal-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                              <p className="text-xs text-teal-400/80">{v.recommendation}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {v.product && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">Panel: {v.product}</span>}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">rs{v.rsId.replace("rs", "")}</span>
                          </div>
                          <p className="text-[10px] text-orange-400/50 flex items-center gap-1">
                            <Shield className="w-3 h-3" strokeWidth={1.5} /> Consult a practitioner before making changes based on genetic data
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

        {/* ═══ BROWSE FULL SNP SUPPORT FORMULATIONS → /shop#category-snp ═══ */}
        <section
          className="rounded-2xl border border-orange-400/20 p-6 md:p-8 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1A2744, #2A1F15)" }}
        >
          <div className="flex items-center gap-4 mb-4">
            <PremiumIcon icon={Dna} color="#B75E18" size="lg" />
            <div className="min-w-0">
              <h3 className="text-base md:text-lg font-bold text-white">
                Browse Full SNP Support Formulations
              </h3>
              <p className="text-sm text-white/40 mt-0.5">
                Methylation / GeneX360™ catalog · MTHFR, COMT, VDR &amp; 80+ variants
              </p>
            </div>
          </div>
          <p className="text-xs md:text-sm text-white/50 leading-relaxed mb-5">
            Precision formulas designed to support common SNP patterns identified
            by GeneX360™ — methylation cofactors, neurotransmitter balance,
            detoxification, and more.
          </p>
          <Link
            href="/shop#category-snp"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-400/15 px-4 py-2.5 text-sm font-semibold text-orange-400 transition-all hover:border-orange-400/50 hover:bg-orange-400/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
            Browse SNP Support Catalog
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        </section>

        {/* ═══ DNA UPLOAD (TEAL ACCENT) ═══ */}
        <section className="rounded-2xl border border-teal-400/15 p-6 md:p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #141E33, #1A2E3E)" }}>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 z-10">
            <Lock className="w-3 h-3 text-teal-400" strokeWidth={1.5} /><span className="text-[10px] text-teal-400 font-medium">256-bit Encrypted</span>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <PremiumIcon icon={Dna} color="#2DA5A0" size="lg" />
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
            <Upload className="w-10 h-10 text-teal-400/30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-white/60 mb-1">Drag &amp; drop your DNA file or click to browse</p>
            <p className="text-xs text-white/25">Supported: .txt, .csv, .zip, .gz, .tsv, .vcf</p>
          </div>
          <input ref={dnaInputRef} type="file" className="hidden" accept=".txt,.csv,.zip,.gz,.tsv,.vcf" />
        </section>

        {/* ═══ LAB RESULTS UPLOAD (ORANGE ACCENT) ═══ */}
        <section className="rounded-2xl border border-orange-400/15 p-6 md:p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2744, #2A1F15)" }}>
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-400/10 border border-orange-400/20 z-10">
            <Shield className="w-3 h-3 text-orange-400" strokeWidth={1.5} /><span className="text-[10px] text-orange-400 font-medium">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <PremiumIcon icon={ClipboardList} color="#B75E18" size="lg" />
            <div>
              <h3 className="text-base md:text-lg font-bold text-white">Upload Lab Results</h3>
              <p className="text-sm text-white/40 mt-0.5">Blood panels, biomarkers, and lab reports</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-5">
            {LAB_CATEGORIES.map((cat) => (
              <div key={cat.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 md:p-4 text-center hover:border-white/10 transition-colors group">
                <div className="relative mx-auto mb-2 w-10 h-10">
                  <div className="absolute inset-0 rounded-lg opacity-50 group-hover:opacity-80 transition-opacity blur-md" style={{ backgroundColor: `${cat.color}1A` }} />
                  <div className="relative w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cat.color}26, transparent)`, border: `1px solid ${cat.color}1A` }}>
                    <cat.icon className="w-4 h-4" style={{ color: cat.color }} strokeWidth={1.5} />
                  </div>
                </div>
                <p className="text-xs font-medium text-white/60">{cat.label}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{cat.sub}</p>
              </div>
            ))}
          </div>
          <div onClick={() => labInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-orange-400/20 p-6 md:p-8 text-center cursor-pointer hover:border-orange-400/40 hover:bg-orange-400/5 hover:shadow-[0_0_30px_rgba(183,94,24,0.08)] transition-all">
            <FileText className="w-10 h-10 text-orange-400/30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-white/60 mb-1">Drop your raw data file here or click to browse</p>
            <p className="text-xs text-white/25">Supported: PDF, CSV, Excel, or photo (.jpg, .png, .heic)</p>
          </div>
          <input ref={labInputRef} type="file" className="hidden" accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic,.txt" multiple />
          <p className="text-[10px] text-white/15 mt-4">Your lab data is encrypted end-to-end and never shared without your consent.</p>
        </section>

        {/* ═══ GENEX360 COMPLETE (HERO) ═══ */}
        {(() => { const p = PANELS[0]; return (
          <div className="rounded-2xl p-5 md:p-6 border border-teal-400/20 hover:border-teal-400/40 hover:shadow-[0_0_40px_rgba(45,165,160,0.1)] transition-all duration-300 cursor-pointer"
            style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.12) 0%, rgba(96,165,250,0.06) 50%, rgba(183,94,24,0.06) 100%)" }}>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <PremiumIcon icon={p.icon} color={p.color} size="lg" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg md:text-xl font-bold text-white">{p.code}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-teal-400/30 text-teal-400 font-medium" style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.2), rgba(183,94,24,0.15))" }}>Most Popular</span>
                </div>
                <p className="text-sm text-white/50 mb-3">{p.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.subPanels?.map((sp) => <span key={sp} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-mono">{sp}</span>)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge status={p.status} partial={p.partialLabel} />
                <span className="text-xs text-white/30">{p.variants} variants</span>
                <BuyNowButton panelId={p.id} />
              </div>
            </div>
          </div>
        ); })()}

        {/* ═══ 6 INDIVIDUAL PANELS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {PANELS.slice(1).map((panel) => (
            <div key={panel.id} className="rounded-2xl p-4 md:p-5 border border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200 cursor-pointer group"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${panel.color}18`; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              <div className="flex items-center justify-between mb-3">
                <div className="group-hover:scale-110 transition-transform duration-200">
                  <PremiumIcon icon={panel.icon} color={panel.color} size="sm" />
                </div>
                <StatusBadge status={panel.status} />
              </div>
              <h3 className="text-sm font-bold text-white">{panel.code}</h3>
              <p className="text-xs text-white/40 mt-0.5">{panel.name}</p>
              <p className="text-xs text-white/30 mt-2 line-clamp-2">{panel.description}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {panel.genes.slice(0, 4).map((g) => <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/[0.06] text-white/30 font-mono">{g}</span>)}
                {panel.genes.length > 4 && <span className="text-[9px] px-1.5 py-0.5 text-white/20">+{panel.genes.length - 4}</span>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 gap-2">
                <span className="text-xs text-white/25 flex-shrink-0">{panel.variants} variants</span>
                <BuyNowButton panelId={panel.id} compact />
              </div>
            </div>
          ))}
        </div>

        {/* ═══ ORDER CTA ═══ */}
        <div className="rounded-2xl p-6 md:p-8 border border-white/[0.06] relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2744, #1E2D4A, #1A2744)" }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.05), transparent, rgba(183,94,24,0.05))" }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">Unlock Your Genetic Blueprint</h3>
              <p className="text-sm text-white/40 mt-1">6 comprehensive panels. Move from <span className="text-blue-400">Personalized</span> to <span className="text-teal-400">Precision Optimized</span>.</p>
            </div>
            <a href="/shop" className="flex-shrink-0 min-h-[44px] px-6 py-3 rounded-xl border border-teal-400/30 text-white text-sm font-semibold hover:shadow-[0_0_30px_rgba(45,165,160,0.15)] transition-all flex items-center gap-2 w-full sm:w-auto justify-center" style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.15), rgba(183,94,24,0.15))" }}>
              View GENEX360&trade; Panels <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
