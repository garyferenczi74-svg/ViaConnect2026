"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Real-time messages subscription ─────────────────────────────────────────

export function useRealtimeMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return channelRef;
}

// ─── Real-time token balance ─────────────────────────────────────────────────

export function useRealtimeTokens(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tokens:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farma_tokens",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tokens", userId] });
          queryClient.invalidateQueries({ queryKey: ["token-balance"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "token_transactions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const amount = (payload.new as Record<string, unknown>)?.amount;
          const action = (payload.new as Record<string, unknown>)?.action;
          if (typeof amount === "number" && amount > 0) {
            toast.success(`+${amount} ViaTokens earned (${action})`, {
              icon: "🪙",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ─── Real-time notifications ─────────────────────────────────────────────────

export function useRealtimeNotifications(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Record<string, unknown>;
          const title = (notification?.title as string) ?? "New notification";
          toast(title, { icon: "🔔" });
          queryClient.invalidateQueries({
            queryKey: ["notifications", userId],
          });
          queryClient.invalidateQueries({
            queryKey: ["notification-count"],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ─── Real-time supplement logs ───────────────────────────────────────────────

export function useRealtimeSupplementLogs(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`supplement-logs:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplement_logs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["supplement-logs", userId],
          });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ─── Combined hook for app shell ─────────────────────────────────────────────

export function useRealtimeSubscriptions(userId: string | null) {
  useRealtimeTokens(userId);
  useRealtimeNotifications(userId);
  useRealtimeSupplementLogs(userId);
}

// ─── Keyboard shortcuts ──────────────────────────────────────────────────────

export function useKeyboardShortcuts({
  onCommandPalette,
  onToggleSidebar,
  onNewProtocol,
  onSaveForm,
}: {
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  onNewProtocol?: () => void;
  onSaveForm?: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+K: Command palette
      if (meta && e.key === "k") {
        e.preventDefault();
        onCommandPalette?.();
        return;
      }

      // Cmd+/: Toggle sidebar
      if (meta && e.key === "/") {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Escape: Close any modal/dialog (handled by Radix, but also dispatch)
      if (e.key === "Escape") {
        // Radix handles this natively, no-op here
        return;
      }

      // Cmd+N: New protocol (practitioner)
      if (meta && e.key === "n" && !e.shiftKey) {
        // Only if not in input/textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        onNewProtocol?.();
        return;
      }

      // Cmd+S: Save current form
      if (meta && e.key === "s") {
        e.preventDefault();
        onSaveForm?.();
        return;
      }
    },
    [onCommandPalette, onToggleSidebar, onNewProtocol, onSaveForm]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
