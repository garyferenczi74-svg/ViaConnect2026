"use client";

// /account/notifications — Prompt #55. Two sections in one page:
//   1. Inbox: every user_notifications row, grouped by Today / Yesterday
//      / older. Click to mark read and follow link.
//   2. Preferences: 9 toggles persisted to user_notification_preferences
//      via upsert.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Inbox,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Bell,
  Mail,
  Smartphone,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface PrefsRow {
  email_order_updates: boolean;
  email_shipping_updates: boolean;
  email_delivery_confirmation: boolean;
  email_protocol_recommendations: boolean;
  email_promotions: boolean;
  email_newsletter: boolean;
  push_order_updates: boolean;
  push_protocol_changes: boolean;
  push_bio_score_milestones: boolean;
}

const DEFAULT_PREFS: PrefsRow = {
  email_order_updates: true,
  email_shipping_updates: true,
  email_delivery_confirmation: true,
  email_protocol_recommendations: true,
  email_promotions: false,
  email_newsletter: false,
  push_order_updates: true,
  push_protocol_changes: true,
  push_bio_score_milestones: true,
};

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  protocol_share_accepted: { icon: ShieldCheck, color: "#7BAE7F" },
  protocol_share_revoked:  { icon: ShieldOff,   color: "#F87171" },
  default:                 { icon: Sparkles,    color: "#2DA5A0" },
};

function formatRelative(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function bucketFor(iso: string): "today" | "yesterday" | "older" {
  const ts = new Date(iso).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  if (ts >= startOfToday) return "today";
  if (ts >= startOfYesterday) return "yesterday";
  return "older";
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [prefs, setPrefs] = useState<PrefsRow>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingPref, setSavingPref] = useState<keyof PrefsRow | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [notifsRes, prefsRes] = await Promise.all([
      (supabase as any)
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(100),
      (supabase as any)
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setRows((notifsRes.data as NotificationRow[]) ?? []);
    if (prefsRes.data) {
      setPrefs(prefsRes.data as PrefsRow);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<"today" | "yesterday" | "older", NotificationRow[]> = {
      today: [],
      yesterday: [],
      older: [],
    };
    for (const r of rows) {
      groups[bucketFor(r.created_at)].push(r);
    }
    return groups;
  }, [rows]);

  async function markAllRead() {
    const ids = rows.filter((r) => !r.is_read).map((r) => r.id);
    if (ids.length === 0) return;
    setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
    const supabase = createClient();
    await (supabase as any)
      .from("user_notifications")
      .update({ is_read: true })
      .in("id", ids);
    toast.success(`${ids.length} marked as read`);
  }

  async function markRead(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)),
    );
    const supabase = createClient();
    await (supabase as any)
      .from("user_notifications")
      .update({ is_read: true })
      .eq("id", id);
  }

  async function togglePref(key: keyof PrefsRow) {
    setSavingPref(key);
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingPref(null);
      return;
    }
    const { error } = await (supabase as any)
      .from("user_notification_preferences")
      .upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) {
      toast.error("Could not save preference");
      // revert
      setPrefs(prefs);
    }
    setSavingPref(null);
  }

  const unreadCount = rows.filter((r) => !r.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg sm:text-xl font-bold">Notifications</h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#2DA5A0] border border-[#2DA5A0]/30 hover:bg-[#2DA5A0]/10 transition-all min-h-[32px]"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
            Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <Loader2
            className="w-6 h-6 text-white/40 mx-auto animate-spin"
            strokeWidth={1.5}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
          <Inbox className="w-7 h-7 text-white/30 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-white/60">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <NotificationGroup
            title="Today"
            rows={grouped.today}
            onClick={markRead}
          />
          <NotificationGroup
            title="Yesterday"
            rows={grouped.yesterday}
            onClick={markRead}
          />
          <NotificationGroup
            title="Earlier"
            rows={grouped.older}
            onClick={markRead}
          />
        </div>
      )}

      {/* Preferences */}
      <div className="pt-6 mt-6 border-t border-white/[0.08]">
        <h3 className="text-base font-bold text-white mb-4">
          Notification Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrefSection
            title="Email Notifications"
            icon={Mail}
            prefs={[
              ["email_order_updates",            "Order updates and confirmations"],
              ["email_shipping_updates",         "Shipping and delivery notifications"],
              ["email_delivery_confirmation",    "Delivery confirmation emails"],
              ["email_protocol_recommendations", "Protocol recommendations from providers"],
              ["email_promotions",               "Promotions and special offers"],
              ["email_newsletter",               "Newsletter and wellness tips"],
            ]}
            current={prefs}
            saving={savingPref}
            onToggle={togglePref}
          />
          <PrefSection
            title="Push Notifications"
            icon={Smartphone}
            prefs={[
              ["push_order_updates",       "Order status changes"],
              ["push_protocol_changes",    "Protocol changes by your provider"],
              ["push_bio_score_milestones","Bio Optimization Score milestones"],
            ]}
            current={prefs}
            saving={savingPref}
            onToggle={togglePref}
          />
        </div>
      </div>
    </div>
  );
}

function NotificationGroup({
  title,
  rows,
  onClick,
}: {
  title: string;
  rows: NotificationRow[];
  onClick: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <p className="text-xs uppercase tracking-[0.15em] text-white/45 mb-2">
        {title}
      </p>
      <ul className="rounded-2xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.05] overflow-hidden">
        {rows.map((row) => {
          const meta = TYPE_META[row.type] ?? TYPE_META.default;
          const Icon = meta.icon;
          return (
            <li key={row.id}>
              <Link
                href={row.link ?? "#"}
                onClick={() => !row.is_read && onClick(row.id)}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  !row.is_read
                    ? "bg-white/[0.04] hover:bg-white/[0.06]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: `${meta.color}1F`,
                    border: `1px solid ${meta.color}33`,
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: meta.color }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white font-medium leading-snug">
                      {row.title}
                    </p>
                    {!row.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2DA5A0] mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                  {row.body && (
                    <p className="text-xs text-white/55 mt-0.5 leading-snug">
                      {row.body}
                    </p>
                  )}
                  <p className="text-[10px] text-white/30 mt-1">
                    {formatRelative(row.created_at)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PrefSection({
  title,
  icon: Icon,
  prefs,
  current,
  saving,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  prefs: [keyof PrefsRow, string][];
  current: PrefsRow;
  saving: keyof PrefsRow | null;
  onToggle: (key: keyof PrefsRow) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <ul className="space-y-2">
        {prefs.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/75">{label}</span>
            <Toggle
              checked={current[key]}
              loading={saving === key}
              onChange={() => onToggle(key)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Toggle({
  checked,
  loading,
  onChange,
}: {
  checked: boolean;
  loading: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#2DA5A0]" : "bg-white/15"
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
