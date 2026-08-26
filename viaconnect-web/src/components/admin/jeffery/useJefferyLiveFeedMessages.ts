"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JefferyMessage } from "./MessageCard";

/**
 * Same jeffery_messages rows the Live Feed lists (created_at desc, limit 50).
 * Header presence and the feed share this result. No synthetic ticks.
 */
export function useJefferyLiveFeedMessages() {
  const [messages, setMessages] = useState<JefferyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("jeffery_messages")
      .select("*, jeffery_message_comments(id, content, is_directive, created_at)")
      .order("created_at", { ascending: false })
      .limit(50);
    setMessages((data ?? []) as JefferyMessage[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("jeffery-live-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jeffery_messages" },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload?.new as unknown as JefferyMessage | undefined;
          if (!row) return;
          setMessages((prev) => [{ ...row, jeffery_message_comments: [] }, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jeffery_messages" },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload?.new as unknown as JefferyMessage | undefined;
          if (!row) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? { ...row, jeffery_message_comments: m.jeffery_message_comments ?? [] }
                : m,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "jeffery_messages" },
        (payload: { old: Record<string, unknown> }) => {
          const oldId = (payload?.old as { id?: string } | undefined)?.id;
          if (!oldId) return;
          setMessages((prev) => prev.filter((m) => m.id !== oldId));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { messages, loading, reload: load };
}
