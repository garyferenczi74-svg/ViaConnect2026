"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MessageCard, { type JefferyMessage } from "./MessageCard";
import ActionButtons from "./ActionButtons";

interface ReviewQueueProps {
  onCountChange?: (count: number) => void;
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, review_required: 1, advisory: 2, info: 3 };

export default function ReviewQueue({ onCountChange }: ReviewQueueProps) {
  const [messages, setMessages] = useState<JefferyMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jeffery_messages")
      .select("*, jeffery_message_comments(id, content, is_directive, created_at)")
      .in("status", ["pending", "flagged"])
      .order("created_at", { ascending: false })
      .limit(100);
    const sorted = ((data ?? []) as JefferyMessage[]).sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
    );
    setMessages(sorted);
    onCountChange?.(sorted.filter(m => m.status === "pending").length);
  }, [supabase, onCountChange]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardCheck className="w-4 h-4 text-[#B75E18]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-white">
          Review Queue {messages.length > 0 && <span className="text-white/40">({messages.length})</span>}
        </h3>
      </div>
      {messages.length === 0 ? (
        <div className="text-center text-white/30 text-sm py-12">
          Nothing to review. Jeffery is operating autonomously within his approved boundaries.
        </div>
      ) : (
        messages.map(msg => (
          <MessageCard
            key={msg.id}
            msg={msg}
            expanded={expandedId === msg.id}
            onToggle={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
          >
            <div className="border-t border-white/[0.08] p-4">
              <p className="text-xs font-medium text-white/40 mb-2">Proposed Action</p>
              <pre className="text-xs text-white/60 bg-[#0F172A] rounded-lg p-3 overflow-x-auto max-h-40 mb-3">
                {JSON.stringify(msg.proposed_action ?? msg.detail, null, 2)}
              </pre>
              <ActionButtons messageId={msg.id} onActionComplete={load} />
            </div>
          </MessageCard>
        ))
      )}
    </div>
  );
}
