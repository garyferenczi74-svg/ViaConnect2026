"use client";

import { useState, useEffect, useCallback } from "react";
import { Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MessageCard, { CATEGORY_CONFIG, type JefferyMessage } from "./MessageCard";
import ActionButtons from "./ActionButtons";
import CommentBox from "./CommentBox";

export default function LiveFeed() {
  const [messages, setMessages] = useState<JefferyMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from("jeffery_messages")
      .select("*, jeffery_message_comments(id, content, is_directive, created_at)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (categoryFilter) query.eq("category", categoryFilter);
    const { data } = await query;
    setMessages((data ?? []) as JefferyMessage[]);
    setLoading(false);
  }, [categoryFilter, supabase]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription: INSERT prepends, UPDATE patches in place,
  // DELETE removes. Approve/reject/flag writes on the server push status
  // changes here without the admin having to refresh.
  useEffect(() => {
    const channel = supabase
      .channel("jeffery-live-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jeffery_messages" },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload?.new as unknown as JefferyMessage | undefined;
          if (!row) return;
          setMessages(prev => [{ ...row, jeffery_message_comments: [] }, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jeffery_messages" },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload?.new as unknown as JefferyMessage | undefined;
          if (!row) return;
          setMessages(prev => prev.map(m =>
            m.id === row.id
              ? { ...row, jeffery_message_comments: m.jeffery_message_comments ?? [] }
              : m
          ));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "jeffery_messages" },
        (payload: { old: Record<string, unknown> }) => {
          const oldId = (payload?.old as { id?: string } | undefined)?.id;
          if (!oldId) return;
          setMessages(prev => prev.filter(m => m.id !== oldId));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <div className="space-y-3">
      {/* Category filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
            !categoryFilter ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/60"
          }`}
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
          All
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                categoryFilter === key ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:text-white/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} strokeWidth={1.5} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {loading && messages.length === 0 && (
        <div className="text-center text-white/30 text-sm py-12">Loading messages...</div>
      )}
      {!loading && messages.length === 0 && (
        <div className="text-center text-white/30 text-sm py-12">
          No messages yet. Jeffery will surface activity here as agents emit events.
        </div>
      )}

      {messages.map(msg => (
        <MessageCard
          key={msg.id}
          msg={msg}
          expanded={expandedId === msg.id}
          onToggle={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
        >
          <div className="border-t border-white/[0.08]">
            <div className="p-4 bg-[#1A2744]/50">
              <p className="text-xs font-medium text-white/40 mb-2">Full Detail</p>
              <pre className="text-xs text-white/60 bg-[#0F172A] rounded-lg p-3 overflow-x-auto max-h-60">
                {JSON.stringify(msg.detail, null, 2)}
              </pre>
            </div>
            {msg.proposed_action && (
              <div className="p-4 border-t border-white/[0.08]">
                <p className="text-xs font-medium text-white/40 mb-2">Proposed Action</p>
                <pre className="text-xs text-white/60 bg-[#0F172A] rounded-lg p-3 overflow-x-auto max-h-40">
                  {JSON.stringify(msg.proposed_action, null, 2)}
                </pre>
                {msg.status === "pending" && (
                  <div className="mt-3">
                    <ActionButtons messageId={msg.id} onActionComplete={load} />
                  </div>
                )}
              </div>
            )}
            {msg.jeffery_message_comments && msg.jeffery_message_comments.length > 0 && (
              <div className="p-4 border-t border-white/[0.08] space-y-2">
                <p className="text-xs font-medium text-white/40">Comments</p>
                {msg.jeffery_message_comments.map(c => (
                  <div key={c.id} className="bg-[#0F172A] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {c.is_directive && (
                        <span className="px-1.5 py-0.5 rounded bg-[#B75E18]/20 text-[#B75E18] text-[9px] font-bold uppercase">
                          Directive
                        </span>
                      )}
                      <span className="text-[10px] text-white/30">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-white/70">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 border-t border-white/[0.08]">
              <CommentBox messageId={msg.id} onCommentSubmitted={load} />
            </div>
          </div>
        </MessageCard>
      ))}
    </div>
  );
}
