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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("user_current_supplements")
        .select("supplement_name, dosage, frequency, notes")
        .eq("user_id", patientId)
        .limit(50);
      if (!cancelled) {
        setRows((data as any[]) ?? []);
        setLoading(false);
      }
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
            {s.notes && (
              <p className="text-xs text-white/45 mt-0.5 truncate">{s.notes}</p>
            )}
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
  const [score, setScore] = useState<number | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("profiles")
        .select("bio_optimization_score, bio_optimization_tier")
        .eq("id", patientId)
        .maybeSingle();
      if (!cancelled) {
        setScore(data?.bio_optimization_score ?? null);
        setTier(data?.bio_optimization_tier ?? null);
        setLoading(false);
      }
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
  return (
    <div className="flex flex-col items-center text-center py-6">
      <p className="text-xs uppercase tracking-wider text-white/45 mb-2">
        Bio Optimization Score
      </p>
      <p className="text-6xl font-semibold text-[#2DA5A0]">
        {score !== null ? Math.round(score) : "—"}
      </p>
      {tier && (
        <p className="text-xs text-white/55 mt-2">{tier}</p>
      )}
      <p className="text-[10px] text-white/30 mt-4 max-w-sm">
        Aggregate score only. Individual gamification, streaks, and Helix
        Rewards data are never shared with providers.
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
