"use client";

// ShareProtocolModal — multi-step wizard for creating a protocol share.
//
// Steps:
//   1. Choose provider type (naturopath / practitioner) + email or "no email"
//   2. Pick which data categories to share + which actions to allow
//   3. Confirmation showing the generated share code
//
// Server interaction goes through the SECURITY DEFINER RPC
// `protocol_share_create` (Prompt #54a migration). The RPC owns code
// generation, audit logging, and constraint enforcement.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, Check, Copy, Loader2, AlertTriangle,
  Mail, Stethoscope, Leaf, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatInviteCode } from "@/utils/protocolShareAccess";

type Step = 1 | 2 | 3;
type ProviderType = "naturopath" | "practitioner";

interface ShareDataCategories {
  share_supplements: boolean;
  share_genetic_results: boolean;
  share_caq_data: boolean;
  share_bio_optimization_score: boolean;
  share_wellness_analytics: boolean;
  share_peptide_recommendations: boolean;
  share_lab_results: boolean;
}

interface ShareActionPermissions {
  can_order_on_behalf: boolean;
  can_modify_protocol: boolean;
  can_recommend_products: boolean;
}

const DEFAULT_DATA: ShareDataCategories = {
  share_supplements: true,
  share_genetic_results: false,
  share_caq_data: false,
  share_bio_optimization_score: true,
  share_wellness_analytics: false,
  share_peptide_recommendations: false,
  share_lab_results: false,
};

const DEFAULT_ACTIONS: ShareActionPermissions = {
  can_order_on_behalf: false,
  can_modify_protocol: false,
  can_recommend_products: true,
};

export function ShareProtocolModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>(1);
  const [providerType, setProviderType] = useState<ProviderType>("practitioner");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<ShareDataCategories>(DEFAULT_DATA);
  const [actions, setActions] = useState<ShareActionPermissions>(DEFAULT_ACTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setProviderType("practitioner");
        setEmail("");
        setData(DEFAULT_DATA);
        setActions(DEFAULT_ACTIONS);
        setSubmitting(false);
        setErrorMsg(null);
        setCreatedCode(null);
        setCopied(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function validateEmail(value: string): boolean {
    if (!value.trim()) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function submit() {
    setErrorMsg(null);
    if (email.trim() && !validateEmail(email)) {
      setErrorMsg("Please enter a valid email address (or leave it blank to use the share code).");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: row, error } = await (supabase as any).rpc("protocol_share_create", {
        p_provider_type: providerType,
        p_invite_email: email.trim() || null,
        p_share_supplements: data.share_supplements,
        p_share_genetic_results: data.share_genetic_results,
        p_share_caq_data: data.share_caq_data,
        p_share_bio_optimization_score: data.share_bio_optimization_score,
        p_share_wellness_analytics: data.share_wellness_analytics,
        p_share_peptide_recommendations: data.share_peptide_recommendations,
        p_share_lab_results: data.share_lab_results,
        p_can_order_on_behalf: actions.can_order_on_behalf,
        p_can_modify_protocol: actions.can_modify_protocol,
        p_can_recommend_products: actions.can_recommend_products,
        p_notes: null,
      });
      if (error) {
        setErrorMsg(error.message ?? "Could not create share. Please try again.");
        return;
      }
      const created = Array.isArray(row) ? row[0] : row;
      setCreatedCode(created?.invite_code ?? null);
      setStep(3);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!createdCode) return;
    const formatted = formatInviteCode(createdCode);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(formatted).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
        () => {/* ignore clipboard errors */},
      );
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Dialog */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label="Share your wellness protocol"
            className="relative w-full max-w-lg rounded-2xl border border-white/[0.10] bg-[#1E3054] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-base font-semibold text-white">Share your wellness protocol</h2>
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-0.5">
                  Step {step} of 3
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-white/40 hover:text-white transition-colors p-1 -mr-1"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {step === 1 && (
                <Step1
                  providerType={providerType}
                  setProviderType={setProviderType}
                  email={email}
                  setEmail={setEmail}
                  errorMsg={errorMsg}
                />
              )}
              {step === 2 && (
                <Step2
                  data={data}
                  setData={setData}
                  actions={actions}
                  setActions={setActions}
                />
              )}
              {step === 3 && createdCode && (
                <Step3
                  code={createdCode}
                  email={email}
                  data={data}
                  actions={actions}
                  copied={copied}
                  onCopy={copyCode}
                />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.08] px-5 py-4 flex items-center justify-between gap-2 bg-[#1A2744]">
              {step === 1 && (
                <>
                  <span className="text-[10px] text-white/30 flex-1">
                    Email is optional — you can also share the code below.
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 transition-all"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </>
              )}
              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 transition-all disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                        Sharing…
                      </>
                    ) : (
                      <>
                        Share
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </button>
                </>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#2DA5A0] hover:bg-[#2DA5A0]/85 shadow-lg shadow-[#2DA5A0]/20 transition-all"
                >
                  Done
                </button>
              )}
            </div>

            {errorMsg && step !== 3 && (
              <div className="absolute inset-x-0 bottom-[68px] mx-5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <p className="text-xs text-red-300">{errorMsg}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Step 1: provider type + email ─────────────────────────────────────
function Step1({
  providerType, setProviderType, email, setEmail, errorMsg,
}: {
  providerType: ProviderType;
  setProviderType: (v: ProviderType) => void;
  email: string;
  setEmail: (v: string) => void;
  errorMsg: string | null;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-white/60 leading-relaxed">
        Share your supplement protocol, genetic results, and wellness data with a licensed
        provider so they can guide your protocol and recommend products tailored to you.
      </p>

      <fieldset>
        <legend className="text-xs text-white/50 mb-2">Share with</legend>
        <div className="grid grid-cols-2 gap-2">
          <ProviderChoice
            value="practitioner"
            label="Practitioner"
            icon={Stethoscope}
            selected={providerType === "practitioner"}
            onClick={() => setProviderType("practitioner")}
          />
          <ProviderChoice
            value="naturopath"
            label="Naturopath"
            icon={Leaf}
            selected={providerType === "naturopath"}
            onClick={() => setProviderType("naturopath")}
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="provider-email" className="block text-xs text-white/50 mb-1.5">
          Provider's email <span className="text-white/30">(optional)</span>
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
          <input
            id="provider-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="dr.smith@clinic.com"
            autoComplete="email"
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.10] text-sm text-white placeholder:text-white/30 focus:border-[#2DA5A0]/60 focus:ring-2 focus:ring-[#2DA5A0]/25 focus:outline-none transition-all"
          />
        </div>
        <p className="text-[10px] text-white/30 mt-1.5">
          Skip the email to just generate a share code you can hand off any way you like.
        </p>
      </div>

      <div className="rounded-xl border border-[#2DA5A0]/20 bg-[#2DA5A0]/5 px-3 py-2.5 flex items-start gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2DA5A0] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-[10px] text-[#2DA5A0]/90 leading-snug">
          You stay in control. Your provider only sees what you grant in the next step, and
          you can revoke access at any time from Settings → Shared Access.
        </p>
      </div>
    </div>
  );
}

function ProviderChoice({
  value, label, icon: Icon, selected, onClick,
}: {
  value: ProviderType;
  label: string;
  icon: typeof Stethoscope;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-value={value}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
        selected
          ? "border-[#2DA5A0]/60 bg-[#2DA5A0]/15 text-white"
          : "border-white/[0.10] text-white/60 hover:border-white/[0.20] hover:text-white"
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// ── Step 2: data + action permissions ─────────────────────────────────
function Step2({
  data, setData, actions, setActions,
}: {
  data: ShareDataCategories;
  setData: (v: ShareDataCategories) => void;
  actions: ShareActionPermissions;
  setActions: (v: ShareActionPermissions) => void;
}) {
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">What to share</legend>
        <div className="space-y-2">
          <ToggleRow
            label="Supplement protocol"
            description="Daily schedule + AI-generated protocol"
            checked={data.share_supplements}
            onChange={v => setData({ ...data, share_supplements: v })}
          />
          <ToggleRow
            label="Bio Optimization Score"
            description="Current score, trend, and tier"
            checked={data.share_bio_optimization_score}
            onChange={v => setData({ ...data, share_bio_optimization_score: v })}
          />
          <ToggleRow
            label="Genetic test results (GeneX360™)"
            description="SNP variants and pathway analysis"
            checked={data.share_genetic_results}
            onChange={v => setData({ ...data, share_genetic_results: v })}
          />
          <ToggleRow
            label="CAQ health assessment data"
            description="Your Clinical Assessment Questionnaire responses"
            checked={data.share_caq_data}
            onChange={v => setData({ ...data, share_caq_data: v })}
          />
          <ToggleRow
            label="AI wellness analytics"
            description="Category scores, trends, and AI insights"
            checked={data.share_wellness_analytics}
            onChange={v => setData({ ...data, share_wellness_analytics: v })}
          />
          <ToggleRow
            label="Peptide recommendations"
            description="AI-matched peptide profile"
            checked={data.share_peptide_recommendations}
            onChange={v => setData({ ...data, share_peptide_recommendations: v })}
          />
          <ToggleRow
            label="Lab results"
            description="Uploaded lab work and biomarker data"
            checked={data.share_lab_results}
            onChange={v => setData({ ...data, share_lab_results: v })}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">Permissions</legend>
        <div className="space-y-2">
          <ToggleRow
            label="Allow recommendations"
            description="Provider can suggest products to you"
            checked={actions.can_recommend_products}
            onChange={v => setActions({ ...actions, can_recommend_products: v })}
          />
          <ToggleRow
            label="Allow ordering on my behalf"
            description="Provider can place shop orders for you"
            checked={actions.can_order_on_behalf}
            onChange={v => setActions({ ...actions, can_order_on_behalf: v })}
          />
          <ToggleRow
            label="Allow protocol modifications"
            description="Provider can adjust your supplement protocol"
            checked={actions.can_modify_protocol}
            onChange={v => setActions({ ...actions, can_modify_protocol: v })}
          />
        </div>
      </fieldset>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-white/[0.12] transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#2DA5A0] focus:ring-2 focus:ring-[#2DA5A0]/30 focus:ring-offset-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[10px] text-white/40 leading-snug mt-0.5">{description}</p>
      </div>
    </label>
  );
}

// ── Step 3: confirmation + share code ─────────────────────────────────
function Step3({
  code, email, data, actions, copied, onCopy,
}: {
  code: string;
  email: string;
  data: ShareDataCategories;
  actions: ShareActionPermissions;
  copied: boolean;
  onCopy: () => void;
}) {
  const sharedDataLabels = [
    data.share_supplements && "Supplement protocol",
    data.share_bio_optimization_score && "Bio Optimization Score",
    data.share_genetic_results && "Genetic results",
    data.share_caq_data && "CAQ data",
    data.share_wellness_analytics && "Wellness analytics",
    data.share_peptide_recommendations && "Peptide recommendations",
    data.share_lab_results && "Lab results",
  ].filter(Boolean) as string[];

  const actionLabels = [
    actions.can_recommend_products && "Recommendations",
    actions.can_order_on_behalf && "Order on your behalf",
    actions.can_modify_protocol && "Modify protocol",
  ].filter(Boolean) as string[];

  return (
    <div className="text-center space-y-5">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="w-14 h-14 mx-auto rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/40 flex items-center justify-center"
      >
        <Check className="w-7 h-7 text-[#2DA5A0]" strokeWidth={2} />
      </motion.div>

      <div>
        <h3 className="text-lg font-bold text-white mb-1">Protocol shared</h3>
        {email.trim() ? (
          <p className="text-sm text-white/60">
            We sent the invite details to <span className="text-white/90">{email.trim()}</span>.
          </p>
        ) : (
          <p className="text-sm text-white/60">Hand off the code below to your provider.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">Share code</p>
        <p className="text-2xl md:text-3xl font-bold tracking-[0.18em] text-white tabular-nums font-mono">
          {formatInviteCode(code)}
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#2DA5A0] hover:text-[#2DA5A0]/80 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">You shared</p>
        <ul className="space-y-1 text-xs text-white/70">
          {sharedDataLabels.map(l => (
            <li key={l} className="flex items-start gap-2">
              <Check className="w-3 h-3 text-[#2DA5A0] flex-shrink-0 mt-0.5" strokeWidth={2} />
              {l}
            </li>
          ))}
        </ul>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-3 mb-1">Permissions</p>
        <p className="text-xs text-white/60">{actionLabels.join(" · ") || "View only"}</p>
      </div>

      <p className="text-[10px] text-white/30">
        Manage or revoke access from <span className="text-white/50">Settings → Shared Access</span> at any time.
      </p>
    </div>
  );
}
