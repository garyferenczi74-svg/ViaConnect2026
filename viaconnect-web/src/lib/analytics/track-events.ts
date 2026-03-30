// Analytics Event Tracking — Supabase-backed event logging
// Swap to Amplitude/Mixpanel later by changing the transport

import { createClient } from "@/lib/supabase/client";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

let sessionId: string | null = null;
function getSessionId(): string {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return sessionId;
}

export async function trackEvent(event: string, properties?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      page: typeof window !== "undefined" ? window.location.pathname : null,
      device: isMobile() ? "mobile" : "desktop",
      session_id: getSessionId(),
    });
  } catch {
    // Analytics should never break the app — silently fail
  }
}

// Key events to track
export const TRACKING_EVENTS = {
  // Onboarding
  caq_phase_started: "caq_phase_started",
  caq_phase_completed: "caq_phase_completed",
  caq_phase_skipped: "caq_phase_skipped",
  caq_description_entered: "caq_description_entered",
  caq_voice_input_used: "caq_voice_input_used",
  caq_abandoned: "caq_abandoned",
  caq_completed: "caq_completed",

  // Report
  report_opened: "report_opened",
  report_section_viewed: "report_section_viewed",
  report_pattern_expanded: "report_pattern_expanded",
  report_listen_summary: "report_listen_summary",
  report_shared: "report_shared",

  // Action Plan
  action_checked: "action_checked",
  action_calendar_added: "action_calendar_added",

  // Engagement
  daily_tip_viewed: "daily_tip_viewed",
  reassessment_started: "reassessment_started",
  supplement_purchased: "supplement_purchased",
} as const;
