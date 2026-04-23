/**
 * Practitioner + legal notification. Today this mirrors every notice into
 * Jeffery's Live Feed and the audit log. Email (via Resend) and Slack
 * webhooks are gated behind env flags and no-op until wired.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Finding } from "@/lib/compliance/engine/types";

function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Hounddog notify: missing SUPABASE env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export interface NotifyContext {
  noticeIds: string[];
  findings: Finding[];
  signalUrl: string;
  practitionerId?: string;
}

/**
 * Notify a practitioner of an auto-opened finding. Fire-and-forget posture:
 * observability must never block the main pipeline.
 */
export async function notifyPractitioner(ctx: NotifyContext, db?: SupabaseClient): Promise<void> {
  if (!ctx.practitionerId || ctx.noticeIds.length === 0) return;
  const client = db ?? serviceClient();

  // Jeffery mirror: findings surface in /admin/jeffery Live Feed.
  for (const f of ctx.findings) {
    try {
      await client.rpc("jeffery_emit_message", {
        p_category: f.severity === "P0" ? "error_escalation" : "advisor_insight",
        p_severity: f.severity === "P0" ? "critical" : f.severity === "P1" ? "review_required" : "advisory",
        p_title: `Hounddog finding: ${f.ruleId}`,
        p_summary: f.message.slice(0, 240),
        p_detail: {
          findingId: f.findingId,
          ruleId: f.ruleId,
          signalUrl: ctx.signalUrl,
          practitionerId: ctx.practitionerId,
          noticeIds: ctx.noticeIds,
        },
        p_source_agent: "marshall_hounddog",
        p_source_context: null,
        p_proposed_action: f.remediation ?? null,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[hounddog/notify] jeffery emit failed: ${(err as Error).message}`);
    }
  }

  // Audit log: one row per notice.
  for (const noticeId of ctx.noticeIds) {
    try {
      await client.from("compliance_audit_log").insert({
        event_type: "hounddog.notice.issued",
        actor_type: "marshall",
        actor_id: "hounddog_writer",
        payload: { noticeId, practitionerId: ctx.practitionerId, signalUrl: ctx.signalUrl },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[hounddog/notify] audit write failed: ${(err as Error).message}`);
    }
  }

  // Email (Resend) and Slack webhooks remain off until env flags are set.
  // When HOUNDDOG_EMAIL_ENABLED === "1" and RESEND_API_KEY is present, the
  // dedicated compliance email template sends from marshall@viaconnect.health
  // with reply-to steve@farmceuticawellness.com. No-op today.
}

/**
 * Notify legal counsel for counterfeit / trademark / DMCA paths.
 * Stubbed; writes an audit row so the event is traceable.
 */
export async function notifyLegal(finding: Finding, signalUrl: string, db?: SupabaseClient): Promise<void> {
  const client = db ?? serviceClient();
  try {
    await client.from("compliance_audit_log").insert({
      event_type: "hounddog.legal.notified",
      actor_type: "marshall",
      actor_id: "hounddog_writer",
      payload: { findingId: finding.findingId, ruleId: finding.ruleId, signalUrl },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[hounddog/notify] legal audit write failed: ${(err as Error).message}`);
  }
}
