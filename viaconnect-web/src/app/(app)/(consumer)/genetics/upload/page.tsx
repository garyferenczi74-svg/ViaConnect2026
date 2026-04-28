"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Dna, ArrowLeft,
  Loader2, Shield, Zap, Cloud, ExternalLink, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

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

const SUPPORTED_PROVIDERS = [
  { name: "23andMe", ext: ".txt", icon: "23", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", desc: "Download your raw data from 23andMe settings" },
  { name: "AncestryDNA", ext: ".txt", icon: "A", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", desc: "Export raw DNA data from AncestryDNA account" },
  { name: "MyHeritage", ext: ".csv", icon: "MH", color: "bg-green-500/10 text-green-400 border-green-500/20", desc: "Download DNA raw data from MyHeritage DNA" },
  { name: "LivingDNA", ext: ".csv", icon: "LD", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", desc: "Export raw data from LivingDNA portal" },
  { name: "Nebula Genomics", ext: ".txt", icon: "N", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", desc: "Download your WGS data from Nebula" },
  { name: "SelfDecode", ext: ".txt,.csv", icon: "SD", color: "bg-rose-500/10 text-rose-400 border-rose-500/20", desc: "Export genotype data from SelfDecode" },
];

export default function GeneticUploadPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [genexStatus, setGenexStatus] = useState<"idle" | "checking" | "found" | "none">("idle");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".txt") || dropped.name.endsWith(".csv"))) {
      setFile(dropped);
      const name = dropped.name.toLowerCase();
      if (name.includes("23andme")) setProvider("23andMe");
      else if (name.includes("ancestry")) setProvider("AncestryDNA");
      else if (name.includes("myheritage")) setProvider("MyHeritage");
      else if (name.includes("nebula")) setProvider("Nebula Genomics");
    } else {
      toast.error("Please upload a .txt or .csv file");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kitId", `upload-${Date.now()}`);
      if (provider) formData.append("provider", provider);

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
  }, [file, userId, provider]);

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
          <p className="text-sm text-gray-400">Import data from testing companies or sync GENEX360 results</p>
        </div>
      </StaggerChild>

      {/* Result View */}
      {result ? (
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
          {/* GENEX360 Auto-Import */}
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

          {/* Upload Zone */}
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
                    <p className="text-sm text-gray-400">or click to browse (.txt or .csv)</p>
                  </div>
                  <input type="file" accept=".txt,.csv" onChange={handleFileSelect} className="hidden" />
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
                  Genetic data is encrypted at rest and in transit. We never share your raw data with third parties.
                  All processing happens on HIPAA-compliant infrastructure. You can delete your data at any time from your profile settings.
                </p>
              </div>
            </div>
          </StaggerChild>
        </div>
      )}
    </PageTransition>
  );
}
