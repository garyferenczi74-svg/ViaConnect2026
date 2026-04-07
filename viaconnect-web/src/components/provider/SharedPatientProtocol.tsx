"use client";

// SharedPatientProtocol — provider-side tabbed view of a patient's protocol.
//
// Used by both /naturopath/patients/[id]/protocol and
// /practitioner/patients/[id]/protocol. Resolves the active share between
// the signed-in provider and the patient via getSharePermissions and gates
// every tab on the corresponding boolean. If no active share exists the
// page shows a hard "no access" panel — never any fallback content.
//
// Underlying data tables (profiles, user_supplements, etc.) need RLS
// policies that grant provider SELECT when an active share exists. Until
// those policies are added, fetches gracefully degrade to "no data
// available" so the permission gating itself is still visible.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Pill,
  Dna,
  ClipboardList,
  Activity,
  LineChart,
  FlaskConical,
  TestTube,
  Lock,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getSharePermissions,
  type SharedDataKey,
  type SharePermissions,
} from "@/utils/protocolShareAccess";

interface SharedPatientProtocolProps {
  patientId: string;
  /** Where the back link should point (e.g. "/naturopath/patients") */
  backHref: string;
}

interface TabDef {
  key: SharedDataKey;
  label: string;
  icon: LucideIcon;
  color: string;
}

const TABS: TabDef[] = [
  { key: "supplements",            label: "Supplements",        icon: Pill,         color: "#2DA5A0" },
  { key: "bioScore",               label: "Bio Optimization",   icon: Activity,     color: "#7BAE7F" },
  { key: "geneticResults",         label: "Genetics",           icon: Dna,          color: "#60A5FA" },
  { key: "caqData",                label: "CAQ",                icon: ClipboardList, color: "#A855F7" },
  { key: "wellnessAnalytics",      label: "Wellness Analytics", icon: LineChart,    color: "#FBBF24" },
  { key: "peptideRecommendations", label: "Peptides",           icon: FlaskConical, color: "#22D3EE" },
  { key: "labResults",             label: "Lab Results",        icon: TestTube,     color: "#F87171" },
];

export function SharedPatientProtocol({
  patientId,
  backHref,
}: SharedPatientProtocolProps) {
  const reduce = useReducedMotion();
  const [perms, setPerms] = useState<SharePermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SharedDataKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("You must be signed in to view patient protocols.");
        }
        const result = await getSharePermissions(user.id, patientId, supabase);
        if (cancelled) return;
        setPerms(result);
        if (result) {
          // Pick the first tab the patient actually shared.
          const first = TABS.find((t) => result[t.key]);
          setActiveTab(first?.key ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Could not load share.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  const acceptedDate = useMemo(() => {
    if (!perms?.acceptedAt) return null;
    return new Date(perms.acceptedAt).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  }, [perms]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A2744] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
    );
  }

  // ── Hard "no access" guard ───────────────────────────────────────────
  if (error || !perms) {
    return (
      <div className="min-h-screen bg-[#1A2744] text-white px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            Back to patients
          </Link>
          <div className="rounded-2xl bg-[#1E3054] border border-[#B75E18]/40 p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#B75E18]/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#F5B681]" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-semibold">No active share</h1>
            </div>
            <p className="text-sm text-white/65 leading-relaxed">
              {error
                ? error
                : "This patient has not shared their protocol with you, or the share has been revoked. Ask the patient to send you a new invite code."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A2744] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Back to patients
        </Link>

        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl bg-[#1E3054] border border-white/10 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2DA5A0]/15 px-3 py-1 text-xs font-semibold text-[#2DA5A0] mb-2">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                Active share
              </div>
              <h1 className="text-2xl font-semibold">Patient protocol</h1>
              <p className="text-xs text-white/45 mt-1">
                Shared {acceptedDate ?? "recently"} ·{" "}
                {perms.providerType === "naturopath" ? "Naturopath access" : "Practitioner access"}
              </p>
            </div>
            <ActionPermissionsBadges perms={perms} />
          </div>
        </motion.div>

        {/* Tab nav */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
          {TABS.map((tab) => {
            const granted = perms[tab.key];
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => granted && setActiveTab(tab.key)}
                disabled={!granted}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
                  active
                    ? "bg-[#2DA5A0] text-white shadow-lg shadow-[#2DA5A0]/20"
                    : granted
                      ? "bg-white/5 border border-white/10 text-white/75 hover:bg-white/10"
                      : "bg-white/[0.02] border border-white/5 text-white/25 cursor-not-allowed"
                }`}
              >
                {granted ? (
                  <tab.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                ) : (
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab body */}
        <div className="rounded-2xl bg-[#1E3054] border border-white/10 p-6 min-h-[280px]">
          {activeTab ? (
            <TabBody tabKey={activeTab} patientId={patientId} perms={perms} />
          ) : (
            <EmptyShareState />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Action permissions badges ────────────────────────────────────────────

function ActionPermissionsBadges({ perms }: { perms: SharePermissions }) {
  const items = [
    { granted: perms.canRecommend, label: "Recommend" },
    { granted: perms.canModify,    label: "Modify"    },
    { granted: perms.canOrder,     label: "Order"     },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            it.granted
              ? "bg-[#7BAE7F]/15 border border-[#7BAE7F]/30 text-[#7BAE7F]"
              : "bg-white/5 border border-white/10 text-white/30 line-through"
          }`}
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── Tab body ─────────────────────────────────────────────────────────────

function TabBody({
  tabKey,
  patientId,
  perms,
}: {
  tabKey: SharedDataKey;
  patientId: string;
  perms: SharePermissions;
}) {
  // Hard guard — should never happen because UI disables locked tabs,
  // but defense in depth.
  if (!perms[tabKey]) {
    return <LockedTab />;
  }
  switch (tabKey) {
    case "supplements":
      return <SupplementsTab patientId={patientId} />;
    case "bioScore":
      return <BioScoreTab patientId={patientId} />;
    case "geneticResults":
      return <GeneticsTab patientId={patientId} />;
    case "caqData":
      return <CaqTab patientId={patientId} />;
    case "wellnessAnalytics":
      return <WellnessAnalyticsTab patientId={patientId} />;
    case "peptideRecommendations":
      return <PeptideTab patientId={patientId} />;
    case "labResults":
      return <LabResultsTab />;
    default:
      return <PlaceholderTab tabKey={tabKey} />;
  }
}

function LockedTab() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <Lock className="w-8 h-8 text-white/20 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-white/50">
        Patient has not shared this category.
      </p>
    </div>
  );
}

function EmptyShareState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12">
      <Lock className="w-8 h-8 text-white/20 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-white/50">
        This patient has not shared any data categories yet.
      </p>
    </div>
  );
}

function SupplementsTab({ patientId }: { patientId: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await (supabase as any).rpc(
        "provider_get_patient_supplements",
        { p_patient_id: patientId },
      );
      if (cancelled) return;
      if (rpcError) {
        setError(
          rpcError.message?.replace(/^protocol_share_assert_access:\s*/i, "") ??
            "Could not load supplements.",
        );
      } else {
        setRows((data as any[]) ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-[#F5B681] py-6 text-center">{error}</p>;
  }
  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-white/50 py-6 text-center">
        No supplements on record yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((s, i) => (
        <div
          key={i}
          className="flex items-start justify-between gap-3 rounded-xl bg-[#1A2744] border border-white/5 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{s.supplement_name}</p>
            <p className="text-xs text-white/45 mt-0.5 truncate">
              {[s.brand, s.product_name].filter(Boolean).join(" · ") || s.category}
            </p>
          </div>
          <div className="text-right text-xs text-white/55 shrink-0">
            <p>{s.dosage}</p>
            {s.frequency && <p className="text-white/35">{s.frequency}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function BioScoreTab({ patientId }: { patientId: string }) {
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: rpcError } = await (supabase as any).rpc(
        "provider_get_patient_bio_score",
        { p_patient_id: patientId },
      );
      if (cancelled) return;
      if (rpcError) {
        setError(
          rpcError.message?.replace(/^protocol_share_assert_access:\s*/i, "") ??
            "Could not load bio score.",
        );
      } else {
        setRow(Array.isArray(data) ? data[0] ?? null : data ?? null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-[#F5B681] py-6 text-center">{error}</p>;
  }
  const score = row?.bio_optimization_score
    ? Number(row.bio_optimization_score)
    : null;
  const strengths: string[] = row?.bio_optimization_strengths ?? [];
  const opportunities: string[] = row?.bio_optimization_opportunities ?? [];

  return (
    <div className="py-2">
      <div className="flex flex-col items-center text-center py-2">
        <p className="text-xs uppercase tracking-wider text-white/45 mb-2">
          Bio Optimization Score
        </p>
        <p className="text-6xl font-semibold text-[#2DA5A0]">
          {score !== null ? Math.round(score) : "—"}
        </p>
        {row?.bio_optimization_tier && (
          <p className="text-xs text-white/55 mt-2">{row.bio_optimization_tier}</p>
        )}
      </div>

      {(strengths.length > 0 || opportunities.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          {strengths.length > 0 && (
            <div className="rounded-xl bg-[#1A2744] border border-[#7BAE7F]/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#7BAE7F] font-semibold mb-2">
                Strengths
              </p>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-xs text-white/70">• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {opportunities.length > 0 && (
            <div className="rounded-xl bg-[#1A2744] border border-[#B75E18]/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#B75E18] font-semibold mb-2">
                Opportunities
              </p>
              <ul className="space-y-1">
                {opportunities.map((s, i) => (
                  <li key={i} className="text-xs text-white/70">• {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/30 mt-6 text-center max-w-sm mx-auto">
        Aggregate score only. Individual gamification, streaks, and Helix
        Rewards data are never shared with providers.
      </p>
    </div>
  );
}

// ── shared RPC fetcher hook ──────────────────────────────────────────────

function useRpcFetch<T>(
  rpcName: string,
  patientId: string,
): { data: T[] | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: rows, error: rpcError } = await (supabase as any).rpc(
        rpcName,
        { p_patient_id: patientId },
      );
      if (cancelled) return;
      if (rpcError) {
        setError(
          rpcError.message?.replace(/^protocol_share_assert_access:\s*/i, "") ??
            "Could not load data.",
        );
      } else {
        setData((rows as T[]) ?? []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [rpcName, patientId]);

  return { data, loading, error };
}

function TabStateWrap({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-[#F5B681] py-6 text-center">{error}</p>;
  }
  if (empty) {
    return (
      <p className="text-sm text-white/50 py-6 text-center">
        No data on record yet.
      </p>
    );
  }
  return <>{children}</>;
}

// ── genetics ─────────────────────────────────────────────────────────────

function GeneticsTab({ patientId }: { patientId: string }) {
  const { data, loading, error } = useRpcFetch<any>(
    "provider_get_patient_genetics",
    patientId,
  );
  const row = data && data.length > 0 ? data[0] : null;
  return (
    <TabStateWrap loading={loading} error={error} empty={!row}>
      {row && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <GeneCard label="MTHFR" value={row.mthfr_status} />
            <GeneCard label="COMT" value={row.comt_status} />
            <GeneCard label="CYP2D6" value={row.cyp2d6_status} />
          </div>
          {row.additional_genes && Object.keys(row.additional_genes).length > 0 && (
            <div className="rounded-xl bg-[#1A2744] border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-2">
                Additional variants
              </p>
              <pre className="text-xs text-white/70 overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(row.additional_genes, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[10px] text-white/35 text-center">
            Source: {row.source_lab ?? "patient upload"}
            {row.report_date && ` · ${new Date(row.report_date).toLocaleDateString()}`}
          </p>
        </div>
      )}
    </TabStateWrap>
  );
}

function GeneCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-[#1A2744] border border-white/5 p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1">
        {label}
      </p>
      <p className="text-sm font-mono text-white">{value || "—"}</p>
    </div>
  );
}

// ── CAQ ──────────────────────────────────────────────────────────────────

function CaqTab({ patientId }: { patientId: string }) {
  const { data, loading, error } = useRpcFetch<any>(
    "provider_get_patient_caq",
    patientId,
  );
  const row = data && data.length > 0 ? data[0] : null;
  return (
    <TabStateWrap loading={loading} error={error} empty={!row}>
      {row && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/55">
              Version {row.version_number} · {row.status}
            </span>
            {row.completed_at && (
              <span className="text-white/40">
                Completed {new Date(row.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <CaqSection label="Health concerns" payload={row.health_concerns} />
          <CaqSection label="Physical symptoms" payload={row.physical_symptoms} />
          <CaqSection label="Neuro symptoms" payload={row.neuro_symptoms} />
          <CaqSection label="Emotional symptoms" payload={row.emotional_symptoms} />
          <CaqSection label="Medications" payload={row.medications} />
          <CaqSection label="Allergies" payload={row.allergies} />
          <CaqSection label="Lifestyle" payload={row.lifestyle} />
        </div>
      )}
    </TabStateWrap>
  );
}

function CaqSection({ label, payload }: { label: string; payload: any }) {
  if (!payload) return null;
  const isEmpty =
    (Array.isArray(payload) && payload.length === 0) ||
    (typeof payload === "object" && Object.keys(payload).length === 0);
  if (isEmpty) return null;
  return (
    <div className="rounded-xl bg-[#1A2744] border border-white/5 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1.5">
        {label}
      </p>
      <pre className="text-xs text-white/75 overflow-x-auto whitespace-pre-wrap leading-snug">
        {Array.isArray(payload)
          ? payload.join(", ")
          : JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

// ── wellness analytics ───────────────────────────────────────────────────

function WellnessAnalyticsTab({ patientId }: { patientId: string }) {
  const { data, loading, error } = useRpcFetch<any>(
    "provider_get_patient_wellness_analytics",
    patientId,
  );
  const row = data && data.length > 0 ? data[0] : null;
  return (
    <TabStateWrap loading={loading} error={error} empty={!row}>
      {row && (
        <div className="space-y-4">
          {row.summary && (
            <div className="rounded-xl bg-[#1A2744] border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1.5">
                Summary
              </p>
              <p className="text-sm text-white/85 leading-relaxed">{row.summary}</p>
            </div>
          )}
          {row.categories && (
            <div className="rounded-xl bg-[#1A2744] border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-2">
                Category breakdown
              </p>
              <pre className="text-xs text-white/70 overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON.stringify(row.categories, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[10px] text-white/35 text-center">
            {Array.isArray(row.data_sources_used) && row.data_sources_used.length > 0
              ? `Sources: ${row.data_sources_used.join(", ")}`
              : "No sources recorded"}
            {row.calculated_at &&
              ` · calculated ${new Date(row.calculated_at).toLocaleDateString()}`}
          </p>
        </div>
      )}
    </TabStateWrap>
  );
}

// ── peptide recommendations ──────────────────────────────────────────────

function PeptideTab({ patientId }: { patientId: string }) {
  const { data, loading, error } = useRpcFetch<any>(
    "provider_get_patient_peptide_recommendations",
    patientId,
  );
  return (
    <TabStateWrap
      loading={loading}
      error={error}
      empty={!data || data.length === 0}
    >
      <div className="space-y-3">
        {(data ?? []).map((p, i) => (
          <div
            key={i}
            className="rounded-xl bg-[#1A2744] border border-white/5 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {p.peptide_name}
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  {[p.delivery_form, p.dosage, p.frequency].filter(Boolean).join(" · ")}
                </p>
              </div>
              {p.priority && (
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 text-[#2DA5A0] flex-shrink-0">
                  {p.priority}
                </span>
              )}
            </div>
            {p.rationale && (
              <p className="text-xs text-white/65 leading-snug">{p.rationale}</p>
            )}
            {(p.cycle_on_weeks || p.cycle_off_weeks) && (
              <p className="text-[10px] text-white/40 mt-2">
                Cycle: {p.cycle_on_weeks ?? 0} on / {p.cycle_off_weeks ?? 0} off weeks
              </p>
            )}
            {p.requires_supervision && (
              <p className="text-[10px] text-[#F5B681] mt-1.5">
                Requires medical supervision
              </p>
            )}
          </div>
        ))}
      </div>
    </TabStateWrap>
  );
}

// ── lab results (no backing table yet) ───────────────────────────────────

function LabResultsTab() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className="text-sm text-white/55 mb-1">
        Lab results storage coming soon.
      </p>
      <p className="text-xs text-white/35 max-w-sm">
        Patient share permission is wired and will activate the moment
        the lab uploads pipeline lands.
      </p>
    </div>
  );
}

function PlaceholderTab({ tabKey }: { tabKey: SharedDataKey }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <p className="text-sm text-white/55 mb-1">
        This patient has shared <span className="text-white">{tabKey}</span>.
      </p>
      <p className="text-xs text-white/35">
        Detailed view coming in the next provider-portal release.
      </p>
    </div>
  );
}
