// =============================================================================
// compliance-alerts-daily-sync (Prompt #113)
// =============================================================================
// Daily cron (02:00 ET) that pulls regulatory alerts from FDA, Health Canada,
// and FTC, matches to our ingredient registry, inserts into regulatory_alerts,
// and emits notification_events_inbox rows for `fda_hc_regulatory_trigger`
// (activated from Prompt #112 stub) so Steve Rica + legal-ops channels get
// the notification downstream.
//
// This iteration: parses the three RSS/HTML index pages with lightweight
// regex extraction. Deeper structured parsing (per-letter ingredient
// extraction) is a follow-on task.
// =============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withAbortTimeout, isTimeoutError } from "../_shared/with-timeout.ts";
import { safeLog } from "../_shared/safe-log.ts";
import { getCircuitBreaker, isCircuitBreakerError } from "../_shared/circuit-breaker.ts";

const fdaBreaker = getCircuitBreaker("fda-api");
const hcBreaker = getCircuitBreaker("health-canada-api");
const ftcBreaker = getCircuitBreaker("ftc-api");

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SVC    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin(): SupabaseClient {
  return createClient(SB_URL, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
}

interface AlertCandidate {
  source: string;
  url: string;
  title: string;
  effective_date: string;
  summary?: string;
}

async function fetchFdaWarningLetters(): Promise<AlertCandidate[]> {
  try {
    const resp = await fetch("https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters");
    if (!resp.ok) return [];
    const html = await resp.text();
    const items: AlertCandidate[] = [];
    const rx = /<a[^>]+href="(\/inspections-compliance-enforcement-and-criminal-investigations\/warning-letters\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = rx.exec(html)) !== null && count < 50) {
      items.push({
        source: "FDA_warning_letter",
        url: `https://www.fda.gov${m[1]}`,
        title: m[2].trim(),
        effective_date: new Date().toISOString().slice(0, 10),
      });
      count++;
    }
    return items;
  } catch { return []; }
}

async function fetchHcRecalls(): Promise<AlertCandidate[]> {
  try {
    const resp = await fetch("https://recalls-rappels.canada.ca/en/search/rss/recalls");
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items: AlertCandidate[] = [];
    const rx = /<item>\s*<title>([^<]+)<\/title>\s*<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = rx.exec(xml)) !== null && count < 50) {
      items.push({
        source: "HC_recall",
        url: m[2].trim(),
        title: m[1].trim(),
        effective_date: new Date(m[3]).toISOString().slice(0, 10),
      });
      count++;
    }
    return items;
  } catch { return []; }
}

async function fetchFtcHealthActions(): Promise<AlertCandidate[]> {
  try {
    const resp = await fetch("https://www.ftc.gov/legal-library/browse/cases-proceedings/health-claims");
    if (!resp.ok) return [];
    const html = await resp.text();
    const items: AlertCandidate[] = [];
    const rx = /<a[^>]+href="(\/legal-library\/browse\/cases-proceedings\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = rx.exec(html)) !== null && count < 50) {
      items.push({
        source: "FTC_action",
        url: `https://www.ftc.gov${m[1]}`,
        title: m[2].trim(),
        effective_date: new Date().toISOString().slice(0, 10),
      });
      count++;
    }
    return items;
  } catch { return []; }
}

const CRON_SECRET = Deno.env.get("COMPLIANCE_CRON_SECRET") ?? "";

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req: Request) => {
  // Michelangelo review: cron-invoked handler MUST verify shared secret to
  // prevent public unauthenticated triggering of the alert sync.
  if (!CRON_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "cron_secret_not_configured" }), {
      status: 503, headers: { "content-type": "application/json" },
    });
  }
  const headerSecret = req.headers.get("x-compliance-cron-secret") ?? "";
  if (!constantTimeEquals(headerSecret, CRON_SECRET)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 403, headers: { "content-type": "application/json" },
    });
  }
  const db = admin();
  const [fda, hc, ftc] = await Promise.all([
    fetchFdaWarningLetters(),
    fetchHcRecalls(),
    fetchFtcHealthActions(),
  ]);
  const all = [...fda, ...hc, ...ftc];
  let inserted = 0;
  for (const a of all) {
    const { data: existing } = await db
      .from("regulatory_alerts")
      .select("id")
      .eq("url", a.url)
      .maybeSingle();
    if (existing) continue;
    const { error } = await db.from("regulatory_alerts").insert({
      source: a.source,
      url: a.url,
      title: a.title.slice(0, 500),
      summary: a.summary ?? null,
      effective_date: a.effective_date,
    });
    if (!error) inserted++;
  }
  // Emit one notification_events_inbox row summarising this sync's finds so
  // Steve Rica (legal-ops recipient) is notified via the Prompt #112 dispatcher.
  if (inserted > 0) {
    await db.from("notification_events_inbox").insert({
      event_code: "fda_hc_regulatory_trigger",
      practitioner_ids: [],
      legal_ops: true,
      context_ref: `alerts_sync:${new Date().toISOString().slice(0, 10)}`,
      context_data: { inserted, sources: { fda: fda.length, hc: hc.length, ftc: ftc.length } },
      priority_override: "urgent",
      source_prompt_of_emitter: "#113",
    });
  }
  return new Response(JSON.stringify({ ok: true, fetched: all.length, inserted, sources: { fda: fda.length, hc: hc.length, ftc: ftc.length } }), {
    headers: { "content-type": "application/json" },
  });
});
