"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Dna, ArrowLeft,
  Loader2, Shield, Zap, Cloud, ExternalLink, RefreshCw, Hourglass,
  Apple, Activity, HeartPulse, Leaf,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";
import { withAbortTimeout } from "@/lib/utils/with-timeout";
import { EpigenUploadPanel } from "@/components/genetics/upload/EpigenUploadPanel";

// A short intro shown above the shared DNA dropzone on a genotype panel tab, so a
// member knows what the panel covers and that it is read from their DNA file.
interface PanelIntro {
  title: string;
  covers: string;
  dataSourceNote: string;
  blueprintHref: string;
}

// The Upload Genetic Data tabs. DNA Test is the raw genotype upload (it also
// covers the GeneXM methylation panel). Epigenetic is its own measured-report
// upload. Nutrition, Hormone, Peptide, and Cannabis are read from the DNA file,
// so their tabs show the SAME DNA dropzone with a short per-panel intro.
type UploadTab = "dna" | "nutrition" | "hormone" | "epigen" | "peptide" | "cannabis";

const TABS: ReadonlyArray<{ id: UploadTab; label: string; icon: LucideIcon }> = [
  { id: "dna", label: "DNA Test", icon: Dna },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "hormone", label: "Hormone", icon: Activity },
  { id: "epigen", label: "Epigenetic", icon: Hourglass },
  { id: "peptide", label: "Peptide", icon: HeartPulse },
  { id: "cannabis", label: "Cannabis", icon: Leaf },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.id));

// The explainer copy for the genotype panels read from the DNA file. `covers` is
// a plain description of the panel; `dataSourceNote` states where the data comes
// from. No clinical claim about the member is made here.
const EXPLAINERS: Partial<Record<UploadTab, PanelIntro>> = {
  nutrition: {
    title: "Nutrition (NutrigenDX)",
    covers: "Functional nutrition and absorption markers: how you metabolize folate, fats, vitamins, and more.",
    dataSourceNote: "These markers are read from your DNA, so there is no separate upload. Upload your DNA test once and your Nutrition panel is scored from it.",
    blueprintHref: "/shop/genex360#nutrigen-dx",
  },
  hormone: {
    title: "Hormone (HormoneIQ)",
    covers: "Hormone and adrenal mapping: estrogen, androgen, and stress hormone pathways.",
    dataSourceNote: "The genetic markers are read from your DNA, and as our panel coverage expands they appear here. The measured hormone and metabolite levels come from your GeneX360 lab sample.",
    blueprintHref: "/shop/genex360#hormone-iq",
  },
  peptide: {
    title: "Peptide (PeptideIQ)",
    covers: "Peptide response and tissue repair genetics: growth factor and recovery pathways.",
    dataSourceNote: "These markers are read from your DNA. As our panel coverage expands, your results appear here.",
    blueprintHref: "/shop/genex360#peptide-iq",
  },
  cannabis: {
    title: "Cannabis (CannabisIQ)",
    covers: "Cannabinoid response and sensitivity genetics: how you respond to and clear cannabinoids.",
    dataSourceNote: "These markers are read from your DNA. As our panel coverage expands, your results appear here.",
    blueprintHref: "/shop/genex360#cannabis-iq",
  },
};

const supabase = createClient();

type UploadResult = {
  summary: {
    total_snps_parsed: number;
    panel_variants_found: number;
    risk_summary: { high: number; moderate: number; low: number };
    panels_covered: string[];
  };
  variants: Array<{ gene: string; rsid: string; genotype: string; risk_level: string; category: string }>;
  recommendations: Array<{ sku: string; reason: string; priority: string }>;
};

// Prompt 204c: PDF preview returned by /api/genex/upload-pdf. The member must
// verify these extracted readings before they are saved (verify-before-save).
type PdfPreview = {
  sourceFilename: string;
  method: string;
  scanned: boolean;
  readable?: boolean;
  matchedCount: number;
  rows: Array<{ rsid: string; genotype: string; status?: string }>;
  preview: Array<{
    rsid: string;
    gene: string;
    panel_key: string;
    genotype: string;
    status: string;
    clinical_significance: string;
    context: string;
  }>;
};

const SUPPORTED_PROVIDERS = [
  { name: "23andMe", ext: ".txt", icon: "23", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", desc: "Download your raw data from 23andMe settings" },
  { name: "AncestryDNA", ext: ".txt", icon: "A", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", desc: "Export raw DNA data from AncestryDNA account" },
  { name: "MyHeritage", ext: ".csv", icon: "MH", color: "bg-green-500/10 text-green-400 border-green-500/20", desc: "Download DNA raw data from MyHeritage DNA" },
  { name: "LivingDNA", ext: ".csv", icon: "LD", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", desc: "Export raw data from LivingDNA portal" },
  { name: "Nebula Genomics", ext: ".txt", icon: "N", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", desc: "Download your WGS data from Nebula" },
  { name: "SelfDecode", ext: ".txt,.csv", icon: "SD", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", desc: "Export genotype data from SelfDecode" },
];

// Token-driven status badge for an extracted variant. +/+ orange, +/- neutral
// white, -/- teal. The hyphen-minus characters are genotype notation, allowed.
function pdfStatusBadgeClass(status: string): string {
  if (status === "+/+") return "border-[#B75E18]/45 bg-[#B75E18]/15 text-[#B75E18]";
  if (status === "+/-" || status === "-/+") return "border-white/20 bg-white/[0.06] text-white/80";
  return "border-[#2DA5A0]/40 bg-[#2DA5A0]/[0.12] text-[#2DA5A0]";
}

function GeneticUploadInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<UploadTab>(() => {
    const t = searchParams.get("tab");
    return t && VALID_TABS.has(t) ? (t as UploadTab) : "dna";
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [genexStatus, setGenexStatus] = useState<"idle" | "checking" | "found" | "none">("idle");
  const [dragOver, setDragOver] = useState(false);
  // Prompt 204c: PDF verify-before-save flow state.
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfSavedCount, setPdfSavedCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    const name = dropped?.name.toLowerCase() ?? "";
    if (dropped && (name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".pdf"))) {
      setFile(dropped);
      if (name.includes("23andme")) setProvider("23andMe");
      else if (name.includes("ancestry")) setProvider("AncestryDNA");
      else if (name.includes("myheritage")) setProvider("MyHeritage");
      else if (name.includes("nebula")) setProvider("Nebula Genomics");
    } else {
      toast.error("Please upload a .txt, .csv, or .pdf file");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const name = selected.name.toLowerCase();
      if (name.includes("23andme")) setProvider("23andMe");
      else if (name.includes("ancestry")) setProvider("AncestryDNA");
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !userId) return;
    setIsUploading(true);
    try {
      // Prompt 204c: a PDF goes through the verify-before-save flow (extract +
      // interpret, then the member confirms) instead of the direct text parse.
      // Per-tab scope: a genotype panel tab (its id is the panel_key) captures only
      // that panel; the DNA Test tab passes no scope and captures every panel.
      const panelScope = activeTab === "dna" ? null : activeTab;

      if (file.name.toLowerCase().endsWith(".pdf")) {
        const formData = new FormData();
        formData.append("file", file);
        if (panelScope) formData.append("panel", panelScope);
        // Abort the request if the server stalls, so the spinner can never hang.
        const res = await withAbortTimeout(
          (signal) => fetch("/api/genex/upload-pdf", { method: "POST", body: formData, signal }),
          45_000,
          "genetics.upload-pdf",
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Could not read this PDF");
          return;
        }
        setPdfPreview(data as PdfPreview);
        if ((data as PdfPreview).matchedCount === 0) {
          toast("No known genetic markers were found in this PDF", { icon: "i" });
        }
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kitId", `upload-${Date.now()}`);
      if (provider) formData.append("provider", provider);
      if (panelScope) formData.append("panel", panelScope);

      const res = await fetch("/api/genex/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        toast.success(`${data.data.summary.panel_variants_found} genetic variants analyzed!`);
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [file, userId, provider, activeTab]);

  // Prompt 204c: save the PDF-extracted variants the member just verified. The
  // server re-runs the deterministic engine from the rows, so the saved status
  // never depends on what the client displayed.
  const handleConfirmPdf = useCallback(async () => {
    if (!pdfPreview || pdfPreview.rows.length === 0) return;
    setPdfSaving(true);
    try {
      const res = await fetch("/api/genetics/confirm-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: pdfPreview.rows,
          sourceFilename: pdfPreview.sourceFilename,
          // Re-send the per-tab scope so the confirmed save stays within this panel.
          panel: activeTab === "dna" ? undefined : activeTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save your variants");
        return;
      }
      setPdfSavedCount(typeof data.saved === "number" ? data.saved : pdfPreview.rows.length);
      toast.success("Your variants were saved");
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setPdfSaving(false);
    }
  }, [pdfPreview, activeTab]);

  const handleCancelPdf = useCallback(() => {
    setPdfPreview(null);
    setPdfSavedCount(null);
    setFile(null);
    setProvider(null);
  }, []);

  // Check for GENEX360 results via Genemetrics API
  const checkGenemetrics = useCallback(async () => {
    if (!userId) return;
    setGenexStatus("checking");
    try {
      const res = await fetch("/api/genex/genemetrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      if (data.success && data.data?.results_available) {
        setGenexStatus("found");
        toast.success(`GENEX360 results found! ${data.data.panels_ready} panels ready.`);
      } else {
        setGenexStatus("none");
        toast("No pending GENEX360 results found", { icon: "i" });
      }
    } catch {
      setGenexStatus("none");
      toast.error("Could not check for results");
    }
  }, [userId]);

  const importGenemetrics = useCallback(async () => {
    if (!userId) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/genex/genemetrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        toast.success("GENEX360 results imported successfully!");
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch {
      toast.error("Import failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [userId]);

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <StaggerChild className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push("/genetics")} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <Dna className="w-6 h-6 text-teal" />
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Genetic Data</h1>
          <p className="text-sm text-gray-400">Import your DNA test or your EpigenHQ results, all in one place</p>
        </div>
      </StaggerChild>

      {/* Prompt 204 (2026-06-21): one tabbed page for every GeneX360 test. DNA Test
          (raw files + GENEX360 sync, covering the methylation panel) and Epigenetic
          (measured report) each have their own upload; Nutrition, Hormone, Peptide,
          and Cannabis are read from the DNA file and explain that. ?tab= deep links
          to any tab. The tab bar scrolls on narrow widths. */}
      <StaggerChild className="mb-6">
        <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                aria-pressed={isActive}
                className={`inline-flex min-h-[44px] flex-none items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/70 ${
                  isActive ? "bg-teal/15 text-teal" : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <TabIcon className="h-4 w-4" strokeWidth={1.5} />
                {t.label}
              </button>
            );
          })}
        </div>
      </StaggerChild>

      {/* The Epigenetic tab owns its measured-report upload. Every other tab
          (DNA plus the four genotype panels) shares the SAME raw-DNA upload flow
          below: the verify-before-save and saved screens take precedence, then the
          upload form. The genotype panels are read from the one DNA file, so each
          of their tabs shows the same dropzone with a short per-panel intro. */}
      {activeTab === "epigen" ? (
        <StaggerChild>
          <EpigenUploadPanel />
        </StaggerChild>
      ) : pdfSavedCount !== null ? (
        <StaggerChild className="space-y-6">
          <Card className="p-6 border-portal-green/30 bg-portal-green/5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-portal-green" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-semibold text-white">Variants saved</h2>
                <p className="text-sm text-gray-400">
                  {pdfSavedCount} interpreted {pdfSavedCount === 1 ? "variant" : "variants"} saved to your record.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/genetics">
                <Button className="bg-teal hover:bg-teal/80 text-white">View My Genetics</Button>
              </Link>
              <Button variant="secondary" onClick={handleCancelPdf}>Upload another</Button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/40">
              For informational and wellness purposes only. Not a diagnosis or medical advice.
            </p>
          </Card>
        </StaggerChild>
      ) : pdfPreview ? (
        <StaggerChild className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-7 h-7 text-teal flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-semibold text-white">Verify your readings</h2>
                <p className="text-sm text-gray-400 mt-1">
                  We read these from {pdfPreview.sourceFilename}
                  {pdfPreview.scanned ? " (scanned document, read with OCR)" : ""}. Check them, then
                  save. Nothing is written to your record until you confirm.
                </p>
              </div>
            </div>

            {pdfPreview.matchedCount === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.5} />
                <span>
                  {pdfPreview.readable === false
                    ? 'We could not read this document. It may be unreadable, or our reader is temporarily unavailable. Try a clearer file or enter your results manually.'
                    : 'We could not find any known genetic markers in this report. It may be a summary rather than raw genotype data, or it covers markers outside our current panel. Try a different file or enter manually.'}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {pdfPreview.preview.map((v, i) => (
                  <div
                    key={`${v.rsid}-${i}`}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white">{v.gene}</span>
                      <span className="font-mono text-xs text-white/35">{v.rsid}</span>
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs font-semibold text-white/70">
                        {v.genotype}
                      </span>
                      {pdfPreview.scanned ? (
                        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          OCR
                        </span>
                      ) : null}
                      <span
                        className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${pdfStatusBadgeClass(v.status)}`}
                      >
                        {v.status}
                      </span>
                    </div>
                    {/* The verbatim source snippet, so a misread (for example a
                        genotype grabbed from the wrong column) is catchable. */}
                    {v.context ? (
                      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-white/40">
                        Read from: &quot;{v.context}&quot;
                      </p>
                    ) : null}
                    {v.clinical_significance ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                        {v.clinical_significance}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-[11px] leading-relaxed text-white/40">
              These readings are for informational and wellness purposes only and are not a
              diagnosis or medical advice. Verify each value before saving, and consult a qualified
              professional before acting on any genetic information.
            </p>

            <div className="flex gap-3 mt-5">
              <Button
                onClick={handleConfirmPdf}
                disabled={pdfSaving || pdfPreview.matchedCount === 0}
                className="bg-teal hover:bg-teal/80 text-white"
              >
                {pdfSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1.5} />Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" strokeWidth={1.5} />Confirm and save my variants</>
                )}
              </Button>
              <Button variant="secondary" onClick={handleCancelPdf}>Cancel</Button>
            </div>
          </Card>
        </StaggerChild>
      ) : result ? (
        <StaggerChild className="space-y-6">
          <Card className="p-6 border-portal-green/30 bg-portal-green/5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-8 h-8 text-portal-green" />
              <div>
                <h2 className="text-lg font-semibold text-white">Analysis Complete</h2>
                <p className="text-sm text-gray-400">{result.summary.total_snps_parsed.toLocaleString()} SNPs parsed, {result.summary.panel_variants_found} panel variants scored</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.summary.risk_summary.high}</p>
                <p className="text-xs text-gray-400">High Risk</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.summary.risk_summary.moderate}</p>
                <p className="text-xs text-gray-400">Moderate</p>
              </div>
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{result.summary.risk_summary.low}</p>
                <p className="text-xs text-gray-400">Low Risk</p>
              </div>
            </div>
            {result.recommendations.length > 0 && (
              <div className="border-t border-white/[0.08] pt-4">
                <p className="text-sm font-medium text-white mb-2">Recommended Supplements</p>
                <div className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant={r.priority === "high" ? "danger" : "warning"}>{r.priority}</Badge>
                      <span className="text-copper font-medium">{r.sku}</span>
                      <span className="text-gray-400 truncate">{r.reason.substring(0, 80)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Link href="/genetics">
                <Button className="bg-teal hover:bg-teal/80 text-white">View Full Results</Button>
              </Link>
              <Button variant="secondary" onClick={() => { setResult(null); setFile(null); }}>Upload Another</Button>
            </div>
          </Card>
        </StaggerChild>
      ) : (
        <div className="space-y-6">
          {activeTab === "dna" ? (
          <>
          {/* GENEX360 Auto-Import (DNA tab only) */}
          <StaggerChild>
            <Card className="p-6 border-copper/20 bg-gradient-to-br from-copper/5 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-copper/10 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-copper" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">ViaConnect GENEX360</h2>
                    <p className="text-sm text-gray-400">Auto-import results from your GENEX360 test via Genemetrics</p>
                  </div>
                </div>
                <Badge variant="active">Recommended</Badge>
              </div>
              <div className="flex items-center gap-3">
                {genexStatus === "found" ? (
                  <Button onClick={importGenemetrics} disabled={isUploading} className="bg-copper hover:bg-copper/80 text-white">
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing...</> : <><Cloud className="w-4 h-4 mr-2" />Import GENEX360 Results</>}
                  </Button>
                ) : (
                  <Button onClick={checkGenemetrics} disabled={genexStatus === "checking"} variant="secondary">
                    {genexStatus === "checking" ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking...</> : <><RefreshCw className="w-4 h-4 mr-2" />Check for Results</>}
                  </Button>
                )}
                {genexStatus === "none" && (
                  <p className="text-xs text-gray-500">No pending results. Order a GENEX360 kit to get started.</p>
                )}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> HIPAA-aware</div>
                <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Instant Analysis</div>
                <div className="flex items-center gap-1"><Dna className="w-3.5 h-3.5" /> 6-Panel Complete</div>
              </div>
            </Card>
          </StaggerChild>

          <div className="flex items-center gap-4 text-gray-500">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs font-medium uppercase tracking-wider">or upload from another provider</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Supported Providers */}
          <StaggerChild>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SUPPORTED_PROVIDERS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setProvider(p.name)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    provider === p.name ? p.color + " border-opacity-100" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold opacity-60">{p.icon}</span>
                    <span className="text-sm font-medium text-white">{p.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2">{p.desc}</p>
                </button>
              ))}
            </div>
          </StaggerChild>
          </>
          ) : (
            // A genotype panel tab: the same dropzone, with a short intro telling
            // the member what the panel covers and that it is read from their DNA.
            <StaggerChild>
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white">{EXPLAINERS[activeTab]?.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{EXPLAINERS[activeTab]?.covers}</p>
                <p className="text-sm text-gray-400 mt-2">{EXPLAINERS[activeTab]?.dataSourceNote}</p>
                <Link
                  href={EXPLAINERS[activeTab]?.blueprintHref ?? "/shop/genex360"}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal/80"
                >
                  View on your blueprint
                </Link>
              </Card>
            </StaggerChild>
          )}

          {/* Upload Zone (shared by the DNA tab and every genotype panel tab) */}
          <StaggerChild>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragOver ? "border-teal bg-teal/5" : file ? "border-portal-green/40 bg-portal-green/5" : "border-white/[0.12] hover:border-white/[0.2]"
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-12 h-12 text-portal-green" />
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB{provider ? ` from ${provider}` : ""}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleUpload} disabled={isUploading} className="bg-teal hover:bg-teal/80 text-white">
                      {isUploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</> : <><Upload className="w-4 h-4 mr-2" />Analyze Genetic Data</>}
                    </Button>
                    <Button variant="secondary" onClick={() => { setFile(null); setProvider(null); }}>Remove</Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-500" />
                  <div>
                    <p className="text-white font-medium">Drop your raw data file here</p>
                    <p className="text-sm text-gray-400">or click to browse (.txt, .csv, or .pdf)</p>
                  </div>
                  <input type="file" accept=".txt,.csv,.pdf,text/plain,text/csv,application/pdf" onChange={handleFileSelect} className="hidden" />
                  <p className="text-xs text-gray-600 mt-2">Supported: 23andMe, AncestryDNA, MyHeritage, LivingDNA, Nebula, SelfDecode</p>
                </label>
              )}
            </div>
          </StaggerChild>

          {/* Security Note */}
          <StaggerChild>
            <div className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <Shield className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Your data is secure</p>
                <p className="text-xs text-gray-400 mt-1">
                  Genetic data is encrypted at rest and in transit. To read a PDF or image report, AI extraction
                  sends that document to our AI provider (Google Gemini); we do not sell your data. Processing
                  happens on HIPAA-aware infrastructure, and you can delete your data at any time from your profile settings.
                </p>
              </div>
            </div>
          </StaggerChild>
        </div>
      )}
    </PageTransition>
  );
}

export default function GeneticUploadPage() {
  // useSearchParams (for the ?tab deep link) requires a Suspense boundary in the
  // App Router; the inner component holds all of the upload state.
  return (
    <Suspense fallback={null}>
      <GeneticUploadInner />
    </Suspense>
  );
}
