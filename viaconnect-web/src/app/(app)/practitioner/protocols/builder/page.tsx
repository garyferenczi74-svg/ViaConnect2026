"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Button, Badge, Avatar } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  Check,
  Search,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import SupplementInput from "@/components/shared/SupplementInput";
import type { PluginProductResult } from "@/plugins/types";

// ─── Types ──────────────────────────────────────────────────────────────────

type Patient = {
  id: string;
  name: string;
  initials: string;
  lastVisit: string;
  riskLevel: "low" | "moderate" | "high";
};

type Recommendation = {
  gene: string;
  variant: string;
  product: string;
  productId: string;
  rationale: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  dose: string;
};

type InteractionResult = {
  productA: string;
  productB: string;
  severity: "clear" | "moderate" | "critical";
  note: string;
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PATIENTS: Patient[] = [
  { id: "pt1", name: "Sarah Mitchell", initials: "SM", lastVisit: "Mar 14, 2026", riskLevel: "high" },
  { id: "pt2", name: "James Rodriguez", initials: "JR", lastVisit: "Mar 10, 2026", riskLevel: "moderate" },
  { id: "pt3", name: "Emily Chen", initials: "EC", lastVisit: "Mar 8, 2026", riskLevel: "low" },
  { id: "pt4", name: "Michael Torres", initials: "MT", lastVisit: "Feb 28, 2026", riskLevel: "high" },
  { id: "pt5", name: "Lisa Park", initials: "LP", lastVisit: "Mar 1, 2026", riskLevel: "moderate" },
  { id: "pt6", name: "David Nguyen", initials: "DN", lastVisit: "Mar 18, 2026", riskLevel: "low" },
];

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  { gene: "MTHFR", variant: "C677T (heterozygous)", product: "MTHFR+", productId: "prod1", rationale: "Supports impaired methylation with bioavailable folate and B12. 10-28x bioavailability." },
  { gene: "COMT", variant: "Val158Met (slow)", product: "COMT+", productId: "prod2", rationale: "Optimizes catechol metabolism with targeted magnesium and SAMe support." },
  { gene: "CYP1A2", variant: "rs762551 (slow metabolizer)", product: "FOCUS+", productId: "prod3", rationale: "Enhances Phase I detox and cognitive clarity for slow CYP1A2 metabolizers." },
  { gene: "VDR", variant: "FokI (TT genotype)", product: "D3", productId: "prod8", rationale: "High-dose vitamin D3 with K2 for impaired VDR receptor binding." },
];

const MOCK_PRODUCTS: Product[] = [
  { id: "prod1", name: "MTHFR+", category: "Methylation", price: 54.88, dose: "2 capsules daily" },
  { id: "prod2", name: "COMT+", category: "Neurotransmitter", price: 48.88, dose: "1 capsule twice daily" },
  { id: "prod3", name: "FOCUS+", category: "Cognitive", price: 52.88, dose: "2 capsules morning" },
  { id: "prod4", name: "BLAST+", category: "Performance", price: 58.88, dose: "1 scoop pre-workout" },
  { id: "prod5", name: "SHRED+", category: "Weight Management", price: 56.88, dose: "2 capsules with meals" },
  { id: "prod6", name: "NAD+", category: "Longevity", price: 68.88, dose: "1 capsule daily" },
  { id: "prod7", name: "CBD Oil", category: "Cannabinoid", price: 44.88, dose: "1 mL sublingual" },
  { id: "prod8", name: "D3", category: "Vitamin", price: 28.88, dose: "1 capsule daily" },
];

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Select Patient" },
  { num: 2, label: "Genetic Recommendations" },
  { num: 3, label: "Product Selection" },
  { num: 4, label: "Interaction Check" },
  { num: 5, label: "Review & Submit" },
];

// ─── Risk level badge variant ───────────────────────────────────────────────

const riskVariant: Record<string, "active" | "pending" | "danger"> = {
  low: "active",
  moderate: "pending",
  high: "danger",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ProtocolBuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [interactionResults, setInteractionResults] = useState<InteractionResult[] | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Track max completed step for navigation guard
  const maxCompleted = selectedPatient
    ? interactionResults
      ? 5
      : selectedProducts.length > 0
        ? 3
        : 1
    : 0;

  function canNavigateTo(step: number) {
    if (step === 1) return true;
    return step <= maxCompleted + 1;
  }

  function addProduct(product: Product) {
    if (!selectedProducts.find((p) => p.id === product.id)) {
      setSelectedProducts((prev) => [...prev, product]);
    }
  }

  function removeProduct(id: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
    // Reset interaction results if products change
    setInteractionResults(null);
  }

  function addAllRecommendations() {
    const toAdd = MOCK_RECOMMENDATIONS.map((r) =>
      MOCK_PRODUCTS.find((p) => p.id === r.productId)!
    ).filter((p) => !selectedProducts.find((sp) => sp.id === p.id));
    setSelectedProducts((prev) => [...prev, ...toAdd]);
  }

  function runInteractionCheck() {
    setInteractionLoading(true);
    // Simulate async check
    setTimeout(() => {
      const results: InteractionResult[] = [];
      for (let i = 0; i < selectedProducts.length; i++) {
        for (let j = i + 1; j < selectedProducts.length; j++) {
          const a = selectedProducts[i];
          const b = selectedProducts[j];
          // Mock: MTHFR+ and COMT+ have a minor interaction
          if (
            (a.name === "MTHFR+" && b.name === "COMT+") ||
            (a.name === "COMT+" && b.name === "MTHFR+")
          ) {
            results.push({
              productA: a.name,
              productB: b.name,
              severity: "moderate",
              note: "Both affect methylation pathways. Monitor SAMe levels; consider staggering doses by 4 hours.",
            });
          } else {
            results.push({
              productA: a.name,
              productB: b.name,
              severity: "clear",
              note: "No known interactions.",
            });
          }
        }
      }
      setInteractionResults(results);
      setInteractionLoading(false);
    }, 1200);
  }

  const totalCost = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const hasModerateInteraction = interactionResults?.some((r) => r.severity === "moderate") ?? false;
  const hasCriticalInteraction = interactionResults?.some((r) => r.severity === "critical") ?? false;

  // ─── Render Steps ─────────────────────────────────────────────────────────

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return <StepSelectPatient />;
      case 2:
        return <StepGeneticRecommendations />;
      case 3:
        return <StepProductSelection />;
      case 4:
        return <StepInteractionCheck />;
      case 5:
        return <StepReviewSubmit />;
      default:
        return null;
    }
  }

  // ─ Step 1: Select Patient ─────────────────────────────────────────────────

  function StepSelectPatient() {
    const filteredPatients = MOCK_PATIENTS.filter((p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Select Patient</h2>
        <p className="text-sm text-gray-400">Choose a patient to create a protocol for.</p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search patients..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-portal-green/50 focus:ring-1 focus:ring-portal-green/20 transition-colors"
          />
        </div>

        <div className="space-y-2">
          {filteredPatients.map((patient) => {
            const isSelected = selectedPatient?.id === patient.id;
            return (
              <button
                key={patient.id}
                onClick={() => {
                  setSelectedPatient(patient);
                  // Auto-advance to step 2
                  setTimeout(() => setCurrentStep(2), 300);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all text-left ${
                  isSelected
                    ? "bg-portal-green/10 border-2 border-portal-green/40"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-portal-green/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar fallback={patient.initials} size="md" />
                  <div>
                    <p className="text-sm font-medium text-white">{patient.name}</p>
                    <p className="text-xs text-gray-500">Last visit: {patient.lastVisit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={riskVariant[patient.riskLevel]}>
                    {patient.riskLevel.charAt(0).toUpperCase() + patient.riskLevel.slice(1)} Risk
                  </Badge>
                  {isSelected && <Check className="w-5 h-5 text-portal-green" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─ Step 2: Genetic Recommendations ────────────────────────────────────────

  function StepGeneticRecommendations() {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Genetic Recommendations</h2>
        <p className="text-sm text-gray-400">
          Auto-generated supplement recommendations based on{" "}
          <span className="text-portal-green font-medium">{selectedPatient?.name}</span>&apos;s genetic profile.
        </p>

        <div className="space-y-3">
          {MOCK_RECOMMENDATIONS.map((rec) => {
            const isAdded = selectedProducts.some((p) => p.id === rec.productId);
            return (
              <Card key={rec.gene} hover={false} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{rec.gene}</Badge>
                      <span className="text-xs text-gray-500">{rec.variant}</span>
                    </div>
                    <p className="text-sm text-white font-medium mt-1.5">
                      Suggested: <span className="text-portal-purple">{rec.product}</span>
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">{rec.rationale}</p>
                  </div>
                  <button
                    onClick={() => {
                      const product = MOCK_PRODUCTS.find((p) => p.id === rec.productId);
                      if (product) addProduct(product);
                    }}
                    disabled={isAdded}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAdded
                        ? "bg-portal-green/10 text-portal-green cursor-default"
                        : "bg-white/[0.04] text-gray-300 hover:bg-portal-green/10 hover:text-portal-green border border-white/[0.08]"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>

        <Button
          size="md"
          className="gap-2 !bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none"
          onClick={() => {
            addAllRecommendations();
            setCurrentStep(3);
          }}
        >
          <Plus className="w-4 h-4" />
          Add All to Protocol
        </Button>
      </div>
    );
  }

  // ─ Step 3: Product Selection ──────────────────────────────────────────────

  function StepProductSelection() {
    const filteredProducts = MOCK_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );

    function handlePluginProductAdded(product: PluginProductResult) {
      const newProduct: Product = {
        id: `plugin-${Date.now()}`,
        name: [product.brand, product.productName].filter(Boolean).join(' - ') || 'Supplement',
        category: product.isPeptide ? 'Peptide' : 'Supplement',
        price: 0,
        dose: product.servingSize || 'As directed',
      };
      addProduct(newProduct);
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Product Selection</h2>
        <p className="text-sm text-gray-400">Scan a barcode, search by name, or browse the catalog.</p>

        {/* Plugin-powered barcode scanner + search */}
        <Card hover={false} className="p-4">
          <SupplementInput portal="practitioner" onProductAdded={handlePluginProductAdded} />
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search product catalog..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-portal-green/50 focus:ring-1 focus:ring-portal-green/20 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const isAdded = selectedProducts.some((p) => p.id === product.id);
            return (
              <Card key={product.id} hover={false} className={`p-4 transition-all ${isAdded ? "border-portal-green/30" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{product.name}</span>
                      {isAdded && <Check className="w-4 h-4 text-portal-green" />}
                    </div>
                    <p className="text-xs text-gray-500">{product.category}</p>
                    <p className="text-xs text-gray-400">{product.dose}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-sm font-semibold text-portal-green">${product.price.toFixed(2)}</p>
                    <button
                      onClick={() => (isAdded ? removeProduct(product.id) : addProduct(product))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        isAdded
                          ? "bg-rose/10 text-rose hover:bg-rose/20"
                          : "bg-portal-green/10 text-portal-green hover:bg-portal-green/20"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <X className="w-3 h-3" /> Remove
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ─ Step 4: Interaction Check ──────────────────────────────────────────────

  function StepInteractionCheck() {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Interaction Check</h2>
        <p className="text-sm text-gray-400">
          Verify supplement interactions for{" "}
          <span className="text-portal-green font-medium">{selectedProducts.length} products</span>{" "}
          in the protocol.
        </p>

        {/* Product list */}
        <Card hover={false} className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Selected Supplements</p>
          <div className="flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <Badge key={p.id} variant="active">{p.name}</Badge>
            ))}
          </div>
        </Card>

        {!interactionResults && (
          <Button
            size="lg"
            className="gap-2 !bg-portal-green !text-dark-bg hover:!bg-portal-green/90 !shadow-lg !shadow-portal-green/20"
            onClick={runInteractionCheck}
            disabled={interactionLoading}
          >
            {interactionLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking Interactions...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Run Interaction Check
              </>
            )}
          </Button>
        )}

        {interactionResults && (
          <div className="space-y-2">
            <p className="text-sm text-gray-300 font-medium">Results</p>
            {interactionResults.map((result, i) => (
              <Card key={i} hover={false} className={`p-3 ${result.severity === "moderate" ? "border-portal-yellow/30" : ""}`}>
                <div className="flex items-start gap-3">
                  {result.severity === "clear" ? (
                    <CheckCircle className="w-4 h-4 text-portal-green mt-0.5 shrink-0" />
                  ) : result.severity === "moderate" ? (
                    <AlertTriangle className="w-4 h-4 text-portal-yellow mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {result.productA} + {result.productB}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{result.note}</p>
                  </div>
                  <Badge
                    variant={
                      result.severity === "clear" ? "active" : result.severity === "moderate" ? "pending" : "danger"
                    }
                  >
                    {result.severity === "clear" ? "Clear" : result.severity === "moderate" ? "Moderate" : "Critical"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─ Step 5: Review & Submit ────────────────────────────────────────────────

  function StepReviewSubmit() {
    if (submitted) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-portal-green/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-portal-green" />
          </div>
          <h2 className="text-xl font-semibold text-white">Protocol Created</h2>
          <p className="text-sm text-gray-400 text-center max-w-md">
            The protocol for {selectedPatient?.name} has been created with {selectedProducts.length} supplements.
          </p>
          <Link href="/practitioner/protocols">
            <Button size="md" className="gap-2 !bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none mt-4">
              Back to Protocols
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold text-white">Review & Submit</h2>
        <p className="text-sm text-gray-400">Confirm the protocol details before creating.</p>

        {/* Patient */}
        <Card hover={false} className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Patient</p>
          <div className="flex items-center gap-3">
            <Avatar fallback={selectedPatient?.initials ?? "?"} size="md" />
            <div>
              <p className="text-sm font-medium text-white">{selectedPatient?.name}</p>
              <p className="text-xs text-gray-500">Last visit: {selectedPatient?.lastVisit}</p>
            </div>
          </div>
        </Card>

        {/* Products */}
        <Card hover={false} className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Supplements ({selectedProducts.length})</p>
          <div className="space-y-2">
            {selectedProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-white">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.dose}</p>
                </div>
                <span className="text-sm text-portal-green font-medium">${product.price.toFixed(2)}/mo</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Interaction warnings */}
        {hasModerateInteraction && (
          <Card hover={false} className="p-3 border-portal-yellow/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-portal-yellow" />
              <span className="text-sm text-portal-yellow">Moderate interaction detected. Review interaction check results.</span>
            </div>
          </Card>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-400">Protocol Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add clinical notes, special instructions, or dosing adjustments..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-gray-600 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-portal-green/50 focus:ring-1 focus:ring-portal-green/20 resize-none transition-colors"
          />
        </div>

        {/* Cost */}
        <Card hover={false} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Estimated Monthly Cost</span>
            <span className="text-lg font-bold text-white">${totalCost.toFixed(2)}</span>
          </div>
        </Card>

        {/* Submit */}
        <Button
          size="lg"
          className="w-full gap-2 !bg-portal-green !text-dark-bg hover:!bg-portal-green/90 !shadow-lg !shadow-portal-green/20 font-semibold"
          onClick={() => setSubmitted(true)}
        >
          <CheckCircle className="w-4 h-4" />
          Create Protocol
        </Button>
      </div>
    );
  }

  // ─── Main Layout ──────────────────────────────────────────────────────────

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-5">
        {/* Breadcrumb */}
        <StaggerChild className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/practitioner/protocols" className="hover:text-portal-green transition-colors">
            Protocols
          </Link>
          <span>/</span>
          <span className="text-white">Builder</span>
        </StaggerChild>

        <StaggerChild>
          <h1 className="text-2xl font-bold text-white">Protocol Builder</h1>
        </StaggerChild>

        {/* 3-Panel Layout */}
        <StaggerChild className="flex gap-6 items-start">
          {/* ── Left Panel: Step Navigation ── */}
          <div className="w-[360px] shrink-0">
            <Card hover={false} className="p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-5">Steps</p>
              <div className="space-y-0">
                {STEPS.map((step, i) => {
                  const isActive = currentStep === step.num;
                  const isCompleted = step.num <= maxCompleted;
                  const isClickable = canNavigateTo(step.num);
                  const isLast = i === STEPS.length - 1;

                  return (
                    <div key={step.num} className="flex gap-3">
                      {/* Vertical connector */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => isClickable && setCurrentStep(step.num)}
                          disabled={!isClickable}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                            isActive
                              ? "bg-portal-green text-dark-bg shadow-lg shadow-portal-green/30"
                              : isCompleted
                                ? "bg-portal-green/20 text-portal-green"
                                : "bg-white/[0.04] text-gray-600 border border-white/[0.08]"
                          } ${isClickable && !isActive ? "cursor-pointer hover:scale-105" : ""} ${!isClickable ? "cursor-not-allowed" : ""}`}
                        >
                          {isCompleted && !isActive ? <Check className="w-4 h-4" /> : step.num}
                        </button>
                        {!isLast && (
                          <div
                            className={`w-px h-8 ${
                              isCompleted ? "bg-portal-green/30" : "bg-white/[0.06]"
                            }`}
                          />
                        )}
                      </div>
                      {/* Label */}
                      <div className="pt-1.5 pb-6">
                        <p
                          className={`text-sm font-medium ${
                            isActive ? "text-portal-green" : isCompleted ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                <Link href="/practitioner/protocols" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Cancel
                </Link>
                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                    >
                      Back
                    </Button>
                  )}
                  {currentStep < 5 && (
                    <Button
                      size="sm"
                      className="!bg-portal-green/20 !text-portal-green border border-portal-green/30 hover:!bg-portal-green/30 !shadow-none"
                      onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
                      disabled={!canNavigateTo(currentStep + 1)}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* ── Center Panel: Active Step ── */}
          <div className="flex-1 min-w-0">
            <Card hover={false} className="p-6">
              {renderStepContent()}
            </Card>
          </div>

          {/* ── Right Panel: Protocol Summary ── */}
          <div className="w-[320px] shrink-0">
            <Card hover={false} className="p-5 sticky top-8">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">Protocol Summary</p>

              {/* Patient */}
              <div className="mb-4 pb-4 border-b border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-1">Patient</p>
                {selectedPatient ? (
                  <div className="flex items-center gap-2">
                    <Avatar fallback={selectedPatient.initials} size="sm" />
                    <span className="text-sm font-medium text-white">{selectedPatient.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">No patient selected</p>
                )}
              </div>

              {/* Products */}
              <div className="mb-4 pb-4 border-b border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-2">Products ({selectedProducts.length})</p>
                {selectedProducts.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No products added</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between group">
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.dose}</p>
                        </div>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="p-1 rounded text-gray-600 hover:text-rose hover:bg-rose/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interaction Warnings */}
              {hasModerateInteraction && (
                <div className="mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-portal-yellow" />
                    <Badge variant="pending">Moderate Interaction</Badge>
                  </div>
                </div>
              )}
              {hasCriticalInteraction && (
                <div className="mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose" />
                    <Badge variant="danger">Critical Interaction</Badge>
                  </div>
                </div>
              )}

              {/* Cost */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Estimated Monthly Cost</p>
                <p className="text-xl font-bold text-white">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
            </Card>
          </div>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
