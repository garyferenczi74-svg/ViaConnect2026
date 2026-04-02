"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PortalToast {
  id: string;
  type: "supplement_added" | "peptide_added" | "interaction_detected" | "analytics_updated";
  message: string;
  icon: string;
  color: string;
  timestamp: number;
}

export function usePortalRealtime(userId: string | null) {
  const [toasts, setToasts] = useState<PortalToast[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const addToast = useCallback((toast: Omit<PortalToast, "id" | "timestamp">) => {
    const newToast: PortalToast = {
      ...toast,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 5000);
  }, []);

  const triggerRefresh = useCallback(() => {
    setLastUpdate(Date.now());
  }, []);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Listen for supplement changes
    const supplementChannel = supabase
      .channel("portal-supplements")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_current_supplements",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const entry = payload.new as { supplement_name?: string };
        addToast({
          type: "supplement_added",
          message: `${entry.supplement_name || "Supplement"} added to your protocol`,
          icon: "CheckCircle2",
          color: "teal",
        });
        triggerRefresh();
      })
      .subscribe();

    // Listen for peptide changes
    const peptideChannel = supabase
      .channel("portal-peptides")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "user_peptide_prescriptions",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const entry = payload.new as { peptide_id?: string };
        addToast({
          type: "peptide_added",
          message: `${entry.peptide_id || "Peptide"} added to your Peptides Protocol`,
          icon: "FlaskConical",
          color: "purple",
        });
        triggerRefresh();
      })
      .subscribe();

    // Listen for adherence changes
    const adherenceChannel = supabase
      .channel("portal-adherence")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "supplement_adherence",
        filter: `user_id=eq.${userId}`,
      }, () => {
        triggerRefresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(supplementChannel);
      supabase.removeChannel(peptideChannel);
      supabase.removeChannel(adherenceChannel);
    };
  }, [userId, addToast, triggerRefresh]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismissToast, lastUpdate, triggerRefresh };
}
