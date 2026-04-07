"use client";

// /settings/shared-access — patient-side management of every protocol
// share they've created. Lets them see who has access, what was shared,
// what permissions were granted, copy/cancel pending invite codes,
// and revoke active shares.

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Share2, Copy, Check, ShieldCheck, ShieldOff, Trash2,
  Loader2, Mail, Stethoscope, Leaf, ClipboardList, AlertTriangle, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";
import { formatInviteCode } from "@/utils/protocolShareAccess";

interface ShareRow {
  id: string;
  patient_id: string;
  provider_id: string | null;
  provider_type: "naturopath" | "practitioner";
  invite_email: string | null;
  invite_code: string;
  share_supplements: boolean;
  share_genetic_results: boolean;
  share_caq_data: boolean;
  share_bio_optimization_score: boolean;
  share_wellness_analytics: boolean;
  share_peptide_recommendations: boolean;
  share_lab_results: boolean;
  can_order_on_behalf: boolean;
  can_modify_protocol: boolean;
  can_recommend_products: boolean;
  status: "pending" | "active" | "revoked" | "expired" | "declined";
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

export default function SharedAccessPage() {
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareRow | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("protocol_shares")
      .select("*")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });
    setShares(((data as ShareRow[]) ?? []));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase as any).rpc("protocol_share_revoke", {
        p_share_id: revokeTarget.id,
      });
      if (error) {
        setError(error.message ?? "Could not revoke share.");
      } else {
        await load();
      }
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  }

  function copyCode(s: ShareRow) {
    const formatted = formatInviteCode(s.invite_code);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(formatted).then(() => {
        setCopiedId(s.id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  }

  const active = shares.filter(s => s.status === "active");
  const pending = shares.filter(s => s.status === "pending");
  const inactive = shares.filter(s => ["revoked", "expired", "declined"].includes(s.status));

  return (
    <div
      className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10"
      style={{ background: "linear-gradient(180deg, #141E33 0%, #1A2744 30%, #1A2744 100%)" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back
          </Link>
          <h1 className="text-base md:text-lg font-bold text-white">Shared Access</h1>
        </div>

        <p className="text-sm text-white/55 mb-5 max-w-2xl">
          Control which providers can see your wellness data and what they're allowed to do
          on your behalf. You can revoke access at any time — changes take effect immediately.
        </p>

        <div className="mb-6">
          <ShareProtocolButton label="Share with a new provider" />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-5 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
            <Loader2 className="w-6 h-6 text-white/40 mx-auto animate-spin" strokeWidth={1.5} />
            <p className="text-sm text-white/40 mt-3">Loading your shares…</p>
          </div>
        ) : shares.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {active.length > 0 && (
              <Section title="Active shares" count={active.length}>
                {active.map(s => (
                  <ActiveShareCard
                    key={s.id}
                    share={s}
                    onRevoke={() => setRevokeTarget(s)}
                  />
                ))}
              </Section>
            )}

            {pending.length > 0 && (
              <Section title="Pending invitations" count={pending.length}>
                {pending.map(s => (
                  <PendingShareCard
                    key={s.id}
                    share={s}
                    copied={copiedId === s.id}
                    onCopy={() => copyCode(s)}
                    onCancel={() => setRevokeTarget(s)}
                  />
                ))}
              </Section>
            )}

            {inactive.length > 0 && (
              <Section title="Inactive" count={inactive.length}>
                {inactive.map(s => (
                  <InactiveShareCard key={s.id} share={s} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>

      <ConfirmRevokeModal
        target={revokeTarget}
        revoking={revoking}
        onCancel={() => !revoking && setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}

// ── Layout primitives ──────────────────────────────────────────────────
function Section({
  title, count, children,
}: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.15em] text-white/40 mb-3">
        {title} <span className="text-white/30 normal-case">({count})</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <Share2 className="w-6 h-6 text-white/30" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-white/60 mb-1">No shared access yet</p>
      <p className="text-xs text-white/40">
        Share your protocol with a naturopath or practitioner to get expert guidance.
      </p>
    </div>
  );
}

// ── Active share card ─────────────────────────────────────────────────
function ActiveShareCard({
  share, onRevoke,
}: { share: ShareRow; onRevoke: () => void }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderAvatar type={share.provider_type} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white truncate">
                {share.invite_email ?? "Provider"}
              </h3>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-white/50">
                {share.provider_type}
              </span>
            </div>
            <p className="text-[10px] text-white/40 mt-0.5 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#2DA5A0]" strokeWidth={1.5} />
              Active · accepted {formatDate(share.accepted_at ?? share.created_at)}
            </p>
          </div>
        </div>
      </div>

      <PermissionGrid share={share} />

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onRevoke}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all"
        >
          <ShieldOff className="w-3.5 h-3.5" strokeWidth={1.5} />
          Revoke access
        </button>
      </div>
    </article>
  );
}

// ── Pending share card ────────────────────────────────────────────────
function PendingShareCard({
  share, copied, onCopy, onCancel,
}: {
  share: ShareRow;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.02] p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderAvatar type={share.provider_type} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white truncate">
                {share.invite_email ?? "Share code only"}
              </h3>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-300/80">
                pending
              </span>
            </div>
            <p className="text-[10px] text-white/40 mt-0.5 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={1.5} />
              Sent {formatDate(share.created_at)}
              {share.expires_at && ` · expires ${formatDate(share.expires_at)}`}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-0.5">Share code</p>
          <p className="text-base font-bold tracking-[0.15em] text-white font-mono tabular-nums truncate">
            {formatInviteCode(share.invite_code)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2DA5A0] hover:text-[#2DA5A0]/80 px-3 py-2 rounded-lg border border-[#2DA5A0]/20 hover:border-[#2DA5A0]/40 transition-all flex-shrink-0"
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

      <PermissionGrid share={share} />

      <div className="flex items-center justify-end mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-red-400 px-3 py-1.5 rounded-lg border border-white/[0.10] hover:border-red-500/30 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Cancel invite
        </button>
      </div>
    </article>
  );
}

// ── Inactive share card ───────────────────────────────────────────────
function InactiveShareCard({ share }: { share: ShareRow }) {
  const statusLabel = share.status[0].toUpperCase() + share.status.slice(1);
  return (
    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 opacity-60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProviderAvatar type={share.provider_type} muted />
          <div className="min-w-0">
            <p className="text-sm text-white/70 truncate">
              {share.invite_email ?? "Share code only"}
            </p>
            <p className="text-[10px] text-white/40">
              {statusLabel} · {formatDate(share.revoked_at ?? share.created_at)}
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-white/50">
          {share.provider_type}
        </span>
      </div>
    </article>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────
function ProviderAvatar({ type, muted }: { type: "naturopath" | "practitioner"; muted?: boolean }) {
  const Icon = type === "naturopath" ? Leaf : Stethoscope;
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        muted ? "bg-white/[0.04] border border-white/[0.06]" : "bg-[#2DA5A0]/12 border border-[#2DA5A0]/25"
      }`}
    >
      <Icon className={`w-4 h-4 ${muted ? "text-white/30" : "text-[#2DA5A0]"}`} strokeWidth={1.5} />
    </div>
  );
}

function PermissionGrid({ share }: { share: ShareRow }) {
  const dataItems: Array<[string, boolean]> = [
    ["Supplements", share.share_supplements],
    ["Bio Score", share.share_bio_optimization_score],
    ["Genetics", share.share_genetic_results],
    ["CAQ", share.share_caq_data],
    ["Analytics", share.share_wellness_analytics],
    ["Peptides", share.share_peptide_recommendations],
    ["Labs", share.share_lab_results],
  ];
  const actionItems: Array<[string, boolean]> = [
    ["Recommend", share.can_recommend_products],
    ["Order on behalf", share.can_order_on_behalf],
    ["Modify protocol", share.can_modify_protocol],
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1.5">Data shared</p>
        <ul className="space-y-1">
          {dataItems.map(([label, on]) => (
            <PermissionLine key={label} label={label} on={on} />
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1.5">Permissions</p>
        <ul className="space-y-1">
          {actionItems.map(([label, on]) => (
            <PermissionLine key={label} label={label} on={on} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function PermissionLine({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {on ? (
        <Check className="w-3 h-3 text-[#2DA5A0]" strokeWidth={2} />
      ) : (
        <span className="w-3 h-3 inline-block text-center text-white/25 font-bold leading-none">×</span>
      )}
      <span className={on ? "text-white/80" : "text-white/30 line-through"}>{label}</span>
    </li>
  );
}

// ── Confirm revoke modal ──────────────────────────────────────────────
function ConfirmRevokeModal({
  target, revoking, onCancel, onConfirm,
}: {
  target: ShareRow | null;
  revoking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPending = target?.status === "pending";
  return (
    <AnimatePresence>
      {target && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#1E3054] p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white mb-1">
              {isPending ? "Cancel pending invite?" : "Revoke access?"}
            </h3>
            <p className="text-sm text-white/60 mb-5">
              {isPending
                ? "The provider won't be able to use this code anymore. You can always create a new share later."
                : "The provider will lose access to your data immediately. They keep no copy of anything they viewed."}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={revoking}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={revoking}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 transition-all inline-flex items-center gap-2 disabled:opacity-60"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    Working…
                  </>
                ) : isPending ? (
                  "Cancel invite"
                ) : (
                  "Revoke"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Date formatter ────────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
