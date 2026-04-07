"use client";

// NotificationBell — header bell that surfaces user_notifications in
// real time. Drops into Header.tsx in place of the previously static
// Bell icon. Lazy-fetches on mount + every time the panel opens, marks
// rows as read on open, and routes to notification.link when a row is
// clicked. Renders a small unread dot when count > 0.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bell,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  protocol_share_accepted: { icon: ShieldCheck, color: "#7BAE7F" },
  protocol_share_revoked:  { icon: ShieldOff,   color: "#F87171" },
  default:                 { icon: Sparkles,    color: "#2DA5A0" },
};

export function NotificationBell() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setUnread(0);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("user_notifications")
      .select("id, user_id, type, title, body, link, is_read, created_at")
      .eq("user_id", user.id)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(20);
    const list = (data as NotificationRow[]) ?? [];
    setRows(list);
    setUnread(list.filter(r => !r.is_read).length);
    setLoading(false);
  }

  useEffect(() => {
    load();

    // Realtime: subscribe to inserts and updates on user_notifications
    // scoped to the current user. Postgres changes get fan-fed through
    // Supabase Realtime so we can update the bell without polling.
    let channel: any = null;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = (supabase as any)
        .channel(`user_notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const row = payload?.new as NotificationRow | undefined;
            if (!row || row.is_read) return;
            setRows((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row, ...prev].slice(0, 20);
            });
            setUnread((u) => u + 1);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const row = payload?.new as NotificationRow | undefined;
            if (!row) return;
            setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        const supabase = createClient();
        (supabase as any).removeChannel(channel);
      }
    };
  }, []);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleOpen() {
    setOpen(true);
    if (unread === 0) return;
    // Optimistic UI then mark all as read server-side.
    const ids = rows.filter(r => !r.is_read).map(r => r.id);
    if (ids.length === 0) return;
    setRows(prev => prev.map(r => ({ ...r, is_read: true })));
    setUnread(0);
    const supabase = createClient();
    await (supabase as any)
      .from("user_notifications")
      .update({ is_read: true })
      .in("id", ids);
  }

  function handleRowClick(n: NotificationRow) {
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="bell-badge"
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-[#B75E18] text-[9px] font-bold text-white flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: -6 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Notifications panel"
            className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-2xl border border-white/10 bg-[#1E3054] shadow-2xl z-50"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <span className="text-[10px] uppercase tracking-wider text-white/40">
                {rows.length} recent
              </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-white/40" strokeWidth={1.5} />
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <Inbox className="w-6 h-6 text-white/20 mb-2" strokeWidth={1.5} />
                  <p className="text-xs text-white/40">You're all caught up.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {rows.map((n) => (
                    <NotificationItem
                      key={n.id}
                      row={n}
                      onClick={() => handleRowClick(n)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({
  row,
  onClick,
}: {
  row: NotificationRow;
  onClick: () => void;
}) {
  const meta = TYPE_META[row.type] ?? TYPE_META.default;
  const Icon = meta.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/[0.03] transition-colors ${
          !row.is_read ? "bg-white/[0.02]" : ""
        }`}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            backgroundColor: `${meta.color}1F`,
            border: `1px solid ${meta.color}33`,
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} strokeWidth={1.5} />
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
            <p className="text-xs text-white/55 mt-0.5 leading-snug">{row.body}</p>
          )}
          <p className="text-[10px] text-white/30 mt-1">
            {formatRelative(row.created_at)}
          </p>
        </div>
      </button>
    </li>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
