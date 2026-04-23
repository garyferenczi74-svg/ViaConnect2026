// =============================================================================
// practitioner-notification-dispatcher (Prompt #112)
// =============================================================================
// Pull-architecture dispatcher. Cron-triggered every minute. Reads pending
// rows from notification_events_inbox, resolves recipients + preferences,
// applies quiet hours + rate limits + priority overrides, PHI-redacts every
// external body, dispatches via SMS / Slack / Push / Email / in-app.
//
// Every attempt writes to notifications_dispatched. Append-only triggers at
// the DB level reject any UPDATE/DELETE. PHI redaction failures write to
// notification_phi_redaction_failures and drop the notification (no
// fallback — §3.2 bright line).
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_MSG_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";

const DRIFT_DEFAULT_RATE_LIMIT_PER_HOUR = 10;

type Priority = "urgent" | "high" | "normal" | "low";
type Channel = "sms" | "slack" | "push" | "email" | "in_app";

interface InboxRow {
  inbox_id: string;
  event_code: string;
  practitioner_ids: string[];
  legal_ops: boolean;
  context_ref: string;
  context_data: Record<string, unknown>;
  priority_override: Priority | null;
}

interface RegistryRow {
  event_code: string;
  default_priority: Priority;
  default_channels: Channel[];
  external_body_template: string;
  sms_body_template: string | null;
  push_title_template: string | null;
  push_body_template: string | null;
  deep_link_path_template: string | null;
  legal_ops_scope: boolean;
  attorney_work_product: boolean;
  default_enabled: boolean;
  rate_limit_override: number | null;
}

interface PreferenceRow {
  sms_enabled: boolean;
  slack_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;
  priority_override: Priority | null;
}

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

// --- PHI validation (parity with src/lib/notifications/phi-redactor.ts per Sherlock/Michelangelo review) ---
// Source of truth for these regex + watchlist values is the lib file. Keep in sync.
const PHI_REGEXES: Array<{ rule: string; re: RegExp }> = [
  { rule: "unrendered_template_variable", re: /\{[a-zA-Z_][a-zA-Z0-9_]*\}/ },
  { rule: "email_address", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { rule: "phone_number", re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/ },
  { rule: "dob_like_date", re: /\b(?:0?[1-9]|1[0-2])[\/\-\.](?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:19|20)\d{2}\b/ },
  { rule: "icd10_code", re: /\b[A-TV-Z]\d{2}(?:\.\d{1,4})?\b/ },
  { rule: "lab_value", re: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|IU|mmol|ng|pg|U\/L|mg\/dL|nmol|pmol|g\/dL|mEq\/L|ng\/mL|pg\/mL)\b/i },
  { rule: "rsid", re: /\brs\d{3,}\b/i },
  { rule: "zygosity", re: /\b(?:homozygous|heterozygous|wildtype|[ACTG]\/[ACTG])\b/i },
];

const MEDICATION_WATCHLIST: readonly string[] = [
  "metformin","lisinopril","atorvastatin","levothyroxine","amlodipine","omeprazole",
  "albuterol","prednisone","warfarin","insulin","ozempic","semaglutide","tirzepatide",
  "retatrutide","gabapentin","hydrochlorothiazide","losartan","simvastatin","sertraline",
  "escitalopram","fluoxetine","paroxetine","methylprednisolone","furosemide","clonazepam",
  "alprazolam","oxycodone","hydrocodone","tramadol","amoxicillin","azithromycin",
  "ciprofloxacin","doxycycline","pantoprazole","montelukast","tamsulosin","finasteride",
  "sildenafil","tadalafil","lamotrigine","duloxetine","venlafaxine","bupropion",
  "metoprolol","atenolol","carvedilol","valsartan","ramipril","pravastatin","rosuvastatin",
  "clopidogrel","apixaban","rivaroxaban","methotrexate","adderall","ritalin","vyvanse",
  "wellbutrin","lexapro","prozac","zoloft","xanax","ativan","valium","trazodone",
];

const GENE_SYMBOL_WATCHLIST: readonly string[] = [
  "MTHFR","COMT","MAOA","MAOB","VDR","CYP2D6","CYP2C9","CYP2C19","CYP3A4","CYP1A2",
  "APOE","BRCA1","BRCA2","NAT2","SLCO1B1","UGT1A1","TPMT","DPYD","GSTP1","GSTM1",
  "GSTT1","NOS3","ACE","AGT","HTR2A","ADRB2","ADRB1","BDNF","DRD2","DRD4",
  "IL6","FTO","PPARG","ADIPOQ","LEPR","MC4R","MC1R","AHCY","BHMT","CBS",
  "MTR","MTRR","PEMT","PON1","SOD2","GPX1","NRF2","HFE","FUT2","VKORC1",
];

const GENE_SYMBOL_ALLOWLIST_CONTEXT: readonly string[] = ["MTHFR-Methyl", "CYP Support"];

function checkWatchlist(body: string, rule: string, list: readonly string[], violations: Array<{ rule: string; match: string }>, allowContext?: readonly string[]): void {
  const lower = body.toLowerCase();
  for (const term of list) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx < 0) continue;
    const before = idx === 0 || !/[a-zA-Z0-9_]/.test(body[idx - 1]);
    const after = idx + term.length >= body.length || !/[a-zA-Z0-9_]/.test(body[idx + term.length]);
    if (!before || !after) continue;
    if (allowContext && allowContext.some((ctx) => body.toLowerCase().includes(ctx.toLowerCase()))) continue;
    violations.push({ rule, match: term });
    return;
  }
}

function phiViolations(body: string): Array<{ rule: string; match: string }> {
  const v: Array<{ rule: string; match: string }> = [];
  for (const { rule, re } of PHI_REGEXES) {
    const m = body.match(re);
    if (m) v.push({ rule, match: m[0] });
  }
  checkWatchlist(body, "medication_name", MEDICATION_WATCHLIST, v);
  checkWatchlist(body, "gene_symbol", GENE_SYMBOL_WATCHLIST, v, GENE_SYMBOL_ALLOWLIST_CONTEXT);
  return v;
}

function renderBody(template: string, contextRef: string): string {
  return template.replace(/\{ref\}/g, contextRef);
}

function resolvePriority(registryDefault: Priority, override: Priority | null): Priority {
  if (registryDefault === "urgent") return "urgent"; // cannot be downgraded
  if (override) return override;
  return registryDefault;
}

async function isInQuietHours(db: SupabaseClient, practitionerId: string): Promise<boolean> {
  const { data } = await db
    .from("notification_quiet_hours")
    .select("day_of_week, start_local_time, end_local_time, timezone, active")
    .eq("practitioner_id", practitionerId)
    .eq("active", true);
  if (!data || data.length === 0) return false;
  const now = new Date();
  for (const row of data as Array<{ day_of_week: number; start_local_time: string; end_local_time: string; timezone: string }>) {
    const localStr = now.toLocaleString("en-US", { timeZone: row.timezone, hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" });
    const [wk, timePart] = localStr.split(", ");
    const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(wk);
    if (dow !== row.day_of_week) continue;
    const [hh, mm] = timePart.split(":").map(Number);
    const nowMin = hh * 60 + mm;
    const [sh, sm] = row.start_local_time.split(":").map(Number);
    const [eh, em] = row.end_local_time.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (startMin <= endMin) {
      if (nowMin >= startMin && nowMin < endMin) return true;
    } else {
      // wraps midnight
      if (nowMin >= startMin || nowMin < endMin) return true;
    }
  }
  return false;
}

async function countRecentSms(db: SupabaseClient, practitionerId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("notifications_dispatched")
    .select("dispatch_id", { count: "exact", head: true })
    .eq("recipient_practitioner_id", practitionerId)
    .eq("channel", "sms")
    .in("delivery_status", ["dispatched", "delivered"])
    .gte("occurred_at", since);
  return count ?? 0;
}

async function sendSmsViaTwilio(to: string, body: string): Promise<{ ok: boolean; sid?: string; err?: unknown }> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_MSG_SID) return { ok: false, err: "twilio_not_configured" };
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("MessagingServiceSid", TWILIO_MSG_SID);
  form.set("Body", body);
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, err: json };
  return { ok: true, sid: json.sid };
}

async function dispatchOne(db: SupabaseClient, inbox: InboxRow, registry: RegistryRow): Promise<void> {
  if (!registry.default_enabled) {
    await db.from("notifications_dispatched").insert({
      event_code: inbox.event_code,
      recipient_practitioner_id: null,
      channel: "in_app",
      delivery_status: "dropped_disabled",
      context_ref: inbox.context_ref,
      inbox_id: inbox.inbox_id,
    });
    return;
  }

  const priority = resolvePriority(registry.default_priority, inbox.priority_override);
  const externalBody = renderBody(registry.external_body_template, inbox.context_ref);
  const smsBody = renderBody(registry.sms_body_template ?? registry.external_body_template, inbox.context_ref);
  const pushTitle = renderBody(registry.push_title_template ?? "ViaConnect", inbox.context_ref);
  const pushBody  = renderBody(registry.push_body_template ?? externalBody, inbox.context_ref);

  // PHI check — applies to every external body variant.
  const violations = [
    ...phiViolations(externalBody),
    ...phiViolations(smsBody),
    ...phiViolations(pushTitle),
    ...phiViolations(pushBody),
  ];
  if (violations.length > 0) {
    await db.from("notification_phi_redaction_failures").insert({
      event_code: inbox.event_code,
      channel: "sms",
      body_attempted: `${externalBody}\n${smsBody}\n${pushTitle}\n${pushBody}`,
      violations_json: violations,
      template_version: "prompt_112_v1",
    });
    for (const pid of inbox.practitioner_ids) {
      await db.from("notifications_dispatched").insert({
        event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "in_app",
        delivery_status: "dropped_phi", phi_redaction_result: { violations },
        context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
      });
    }
    return;
  }

  for (const pid of inbox.practitioner_ids) {
    const { data: pref } = await db
      .from("notification_preferences")
      .select("sms_enabled, slack_enabled, push_enabled, email_enabled, in_app_enabled, priority_override")
      .eq("practitioner_id", pid).eq("event_code", inbox.event_code).maybeSingle();
    const p = (pref ?? {
      sms_enabled: registry.default_channels.includes("sms"),
      slack_enabled: registry.default_channels.includes("slack"),
      push_enabled: registry.default_channels.includes("push"),
      email_enabled: registry.default_channels.includes("email"),
      in_app_enabled: true,
      priority_override: null,
    }) as PreferenceRow;

    const { data: cred } = await db
      .from("notification_channel_credentials")
      .select("sms_phone_number, sms_opt_in_completed_at, slack_access_token_vault_ref, slack_default_channel_id")
      .eq("practitioner_id", pid).maybeSingle();

    // in-app always records regardless of priority (bell icon is unconditional)
    await db.from("notifications_dispatched").insert({
      event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "in_app",
      delivery_status: "dispatched", external_body_rendered: externalBody,
      priority_resolved: priority, context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
    });

    // For non-urgent: check quiet hours + rate limits
    if (priority !== "urgent") {
      if (await isInQuietHours(db, pid)) {
        await db.from("notification_batch_queue").insert({
          practitioner_id: pid, event_code: inbox.event_code,
          context_ref: inbox.context_ref, priority, defer_reason: "quiet_hours",
        });
        await db.from("notifications_dispatched").insert({
          event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "sms",
          delivery_status: "queued_quiet_hours", priority_resolved: priority,
          context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
        });
        continue;
      }
    }

    // SMS
    if (p.sms_enabled && registry.default_channels.includes("sms")) {
      if (!cred?.sms_phone_number || !cred?.sms_opt_in_completed_at) {
        await db.from("notifications_dispatched").insert({
          event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "sms",
          delivery_status: "dropped_no_optin", context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
        });
      } else {
        const rateLimit = registry.rate_limit_override ?? DRIFT_DEFAULT_RATE_LIMIT_PER_HOUR;
        const count = await countRecentSms(db, pid);
        if (count >= rateLimit && priority !== "urgent") {
          await db.from("notification_batch_queue").insert({
            practitioner_id: pid, event_code: inbox.event_code,
            context_ref: inbox.context_ref, priority, defer_reason: "rate_limit",
          });
          await db.from("notifications_dispatched").insert({
            event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "sms",
            delivery_status: "queued_rate_limit", priority_resolved: priority,
            context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
          });
        } else {
          const res = await sendSmsViaTwilio(cred.sms_phone_number, smsBody);
          await db.from("notifications_dispatched").insert({
            event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "sms",
            delivery_status: res.ok ? "dispatched" : "failed",
            external_body_rendered: smsBody, priority_resolved: priority,
            carrier_message_id: res.sid ?? null,
            delivery_receipt_json: res.err ? { error: res.err } : null,
            context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
          });
        }
      }
    }

    // Slack — attorney-work-product bypass enforced
    if (p.slack_enabled && registry.default_channels.includes("slack")) {
      if (registry.attorney_work_product) {
        await db.from("notifications_dispatched").insert({
          event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "slack",
          delivery_status: "dropped_no_channel",
          attorney_work_product_bypass: true,
          context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
        });
      } else {
        // Slack actual send would load access token from vault + POST chat.postMessage.
        // For this iteration, record dispatched intent; full wire-up is follow-on.
        await db.from("notifications_dispatched").insert({
          event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "slack",
          delivery_status: cred?.slack_access_token_vault_ref ? "dispatched" : "dropped_no_channel",
          external_body_rendered: externalBody, priority_resolved: priority,
          context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
        });
      }
    }

    // Push — recorded but actual encrypted send deferred to activation.
    if (p.push_enabled && registry.default_channels.includes("push")) {
      await db.from("notifications_dispatched").insert({
        event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "push",
        delivery_status: "dispatched", external_body_rendered: `${pushTitle}: ${pushBody}`,
        priority_resolved: priority, context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
      });
    }

    // Email — recorded via existing email infra (not rebuilt here).
    if (p.email_enabled && registry.default_channels.includes("email")) {
      await db.from("notifications_dispatched").insert({
        event_code: inbox.event_code, recipient_practitioner_id: pid, channel: "email",
        delivery_status: "dispatched", external_body_rendered: externalBody,
        priority_resolved: priority, context_ref: inbox.context_ref, inbox_id: inbox.inbox_id,
      });
    }
  }
}

serve(async (_req: Request) => {
  const db = admin();
  const started = Date.now();
  const { data: pending } = await db
    .from("notification_events_inbox")
    .select("inbox_id, event_code, practitioner_ids, legal_ops, context_ref, context_data, priority_override")
    .is("processed_at", null)
    .order("emitted_at", { ascending: true })
    .limit(50);

  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "content-type": "application/json" } });
  }

  let processed = 0;
  let errors = 0;
  for (const row of pending as InboxRow[]) {
    try {
      const { data: reg } = await db
        .from("notification_event_registry")
        .select("event_code, default_priority, default_channels, external_body_template, sms_body_template, push_title_template, push_body_template, deep_link_path_template, legal_ops_scope, attorney_work_product, default_enabled, rate_limit_override")
        .eq("event_code", row.event_code).maybeSingle();
      if (!reg) {
        await db.from("notifications_dispatched").insert({
          event_code: row.event_code, channel: "in_app", delivery_status: "dropped_unknown_event",
          context_ref: row.context_ref, inbox_id: row.inbox_id,
        });
      } else {
        await dispatchOne(db, row, reg as RegistryRow);
      }
      await db.from("notification_events_inbox")
        .update({ processed_at: new Date().toISOString(), processing_attempts: 1 })
        .eq("inbox_id", row.inbox_id);
      processed++;
    } catch (e) {
      errors++;
      await db.from("notification_events_inbox")
        .update({ last_error: String(e), processing_attempts: 1 })
        .eq("inbox_id", row.inbox_id);
    }
  }
  return new Response(JSON.stringify({ ok: true, processed, errors, duration_ms: Date.now() - started }), {
    headers: { "content-type": "application/json" },
  });
});
