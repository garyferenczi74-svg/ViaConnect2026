/**
 * Jeffery Advisor Context Builder (Prompt #60b — Section 3A; Prompt 219F harden)
 *
 * Builds the runtime context for an advisor query in real-time.
 * Soft-fallback persona when DB prompts are missing; supplier digests fail-open.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUltrathinkContext, type UltrathinkContext } from "@/lib/ultrathink/buildContext";
import {
  HANNAH_CONSUMER_SYSTEM_PROMPT,
  HANNAH_PERSONA_VERSION,
} from "@/lib/jeffery/hannah-persona";
import { getDisplayName } from "@/lib/getDisplayName";
import { safeLog } from "@/lib/utils/safe-log";

export type AdvisorRole = "consumer" | "practitioner" | "naturopath";

export interface AdvisorMessage {
  message_role: "user" | "assistant" | "system";
  content: string;
}

export interface AdvisorComplianceContext {
  activeWaiverRuleIds: string[];
  hasGenex360Consent: boolean;
  jurisdiction: string;
  practitionerScope: string[];
}

export interface AdvisorContext {
  role: AdvisorRole;
  userId: string;
  patientId: string | null;
  systemPrompt: string;
  contextVariables: Record<string, string>;
  conversationHistory: AdvisorMessage[];
  jefferyInstructions: string[];
  protocolConfidencePct: number;
  complianceContext?: AdvisorComplianceContext;
  promptSource: "db" | "fallback";
}

/**
 * Substitute {placeholder} tokens in the prompt template with the variables map.
 * Missing tokens are replaced with "unknown" so the prompt never ships raw braces.
 */
export function substituteTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_m, key) => {
    return vars[key] !== undefined && vars[key] !== "" ? vars[key] : "unknown";
  });
}

function summarizeList(items: string[], empty = "none"): string {
  if (!items.length) return empty;
  return items.slice(0, 8).join("; ");
}

function contextToVariables(
  ctx: UltrathinkContext,
  displayName: string,
  patientName: string | null,
  extras: Record<string, string>
): Record<string, string> {
  const topSymptomsStr =
    ctx.topSymptoms.length > 0
      ? ctx.topSymptoms
          .slice(0, 5)
          .map((s) => `${s.name} (${s.score}/10)`)
          .join(", ")
      : "none reported";

  const medicationsStr = ctx.medications.length > 0 ? ctx.medications.join(", ") : "none";

  const currentSuppsStr =
    ctx.currentSupplements.length > 0
      ? ctx.currentSupplements
          .map((s) => `${s.brand ? s.brand + " " : ""}${s.name} (${s.dosage} ${s.frequency})`)
          .slice(0, 8)
          .join("; ")
      : "none";

  const goalsStr = ctx.goals.length > 0 ? ctx.goals.join(", ") : "not specified";

  const bioBreakdownStr =
    ctx.bioBreakdown && Object.keys(ctx.bioBreakdown).length > 0
      ? Object.entries(ctx.bioBreakdown)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "not available";

  return {
    displayName,
    displayNameAssistant: getDisplayName("hannah"),
    patientName: patientName ?? "no active patient",
    bioOptScore: ctx.bioScore != null ? String(ctx.bioScore) : "not yet calculated",
    tier: ctx.bioTier ?? "unknown",
    topSymptoms: topSymptomsStr,
    medications: medicationsStr,
    currentSupplements: currentSuppsStr,
    goals: goalsStr,
    bioStrengths: summarizeList(ctx.bioStrengths, "not available"),
    bioOpportunities: summarizeList(ctx.bioOpportunities, "not available"),
    bioBreakdown: bioBreakdownStr,
    todayAdherence: extras.todayAdherence ?? "not available",
    gordonDigest: extras.gordonDigest ?? "not available",
    elysiumDigest: extras.elysiumDigest ?? "not available",
    arnoldDigest: extras.arnoldDigest ?? "not available",
    thanosDigest: extras.thanosDigest ?? "not available",
    jefferyDigest: extras.jefferyDigest ?? "not available",
    hannahNote: extras.hannahNote ?? "not available",
  };
}

async function fetchDisplayName(db: SupabaseClient, userId: string): Promise<string> {
  const { data } = await db
    .from("profiles")
    .select("full_name, username")
    .eq("id", userId)
    .maybeSingle();
  if (data?.full_name) return data.full_name.split(" ")[0];
  if (data?.username) return data.username;
  return "";
}

/** Fail-open supplier digests + adherence + latest note. Never throws. */
async function loadConsumerExtras(
  db: SupabaseClient,
  userId: string
): Promise<Record<string, string>> {
  const extras: Record<string, string> = {};
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Digests (213a pattern): skip failed suppliers
  try {
    const {
      getGordonDailyDigest,
      getArnoldDailyDigest,
      getJefferyDailyDigest,
      getElysiumDailyDigest,
      getThanosDailyDigest,
    } = await import("@/lib/hannah/compilation/digests");

    const digests = await Promise.all([
      getGordonDailyDigest(userId, sinceIso),
      getArnoldDailyDigest(userId, sinceIso),
      getJefferyDailyDigest(userId, sinceIso),
      getElysiumDailyDigest(userId, sinceIso),
      getThanosDailyDigest(userId, sinceIso),
    ]);

    const pack = (d: { ok: boolean; skipped?: boolean; items: Array<{ summary: string }> }) => {
      if (!d.ok || d.skipped) return "not available";
      if (!d.items.length) return "not available";
      return d.items
        .slice(0, 4)
        .map((i) => i.summary)
        .join(" | ");
    };

    extras.gordonDigest = pack(digests[0]);
    extras.arnoldDigest = pack(digests[1]);
    extras.jefferyDigest = pack(digests[2]);
    extras.elysiumDigest = pack(digests[3]);
    extras.thanosDigest = pack(digests[4]);
  } catch (e) {
    safeLog.warn("advisor.context", "digest pack failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Today's adherence (219d shared interface via schedule view) fail-open
  try {
    const { getScheduleView } = await import("@/lib/caq/supplements/timing/assignTiming");
    const view = await getScheduleView(db as never, userId);
    const slots = [...(view.morning ?? []), ...(view.afternoon ?? []), ...(view.evening ?? [])];
    if (slots.length === 0) {
      extras.todayAdherence = "no schedule rows today";
    } else {
      const taken = slots.filter((s) => s.taken).length;
      const names = slots
        .slice(0, 6)
        .map((s) => `${s.name} (${s.taken ? "taken" : "pending"})`)
        .join("; ");
      extras.todayAdherence = `${taken}/${slots.length} logged today. ${names}`;
    }
  } catch (e) {
    safeLog.warn("advisor.context", "adherence skip", {
      error: e instanceof Error ? e.message : String(e),
    });
    extras.todayAdherence = "not available";
  }

  // Latest Hannah compiled note
  try {
    const { data: note } = await db
      .from("hannah_daily_notes")
      .select("note_text, note_kind, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (note?.note_text) {
      extras.hannahNote = String(note.note_text).slice(0, 400);
    } else {
      extras.hannahNote = "not available";
    }
  } catch {
    extras.hannahNote = "not available";
  }

  return extras;
}

const PRACTITIONER_FALLBACK = `You are ${getDisplayName("hannah")}, the clinical AI assistant for ViaCura practitioners on ViaConnect.
Use structure/function framing. No diagnosis claims. Cite patient context when present.
Patient: {patientName}. Provider: {displayName}.
Bio Optimization Score: {bioOptScore}. Supplements: {currentSupplements}. Symptoms: {topSymptoms}. Goals: {goals}.
Never use em or en dashes. Educational support only.`;

const NATUROPATH_FALLBACK = `You are ${getDisplayName("hannah")}, the naturopathic AI assistant for ViaConnect.
Use structure/function framing. No diagnosis claims. Cite patient context when present.
Patient: {patientName}. Provider: {displayName}.
Bio Optimization Score: {bioOptScore}. Supplements: {currentSupplements}. Symptoms: {topSymptoms}. Goals: {goals}.
Never use em or en dashes. Educational support only.`;

function fallbackPromptForRole(role: AdvisorRole): string {
  if (role === "practitioner") return PRACTITIONER_FALLBACK;
  if (role === "naturopath") return NATUROPATH_FALLBACK;
  return HANNAH_CONSUMER_SYSTEM_PROMPT;
}

const JEFFERY_IDENTITY_RE =
  /\byou\s+are\s+jeffery\b|\bintroduce\s+yourself\s+as\s+jeffery\b/i;
const HANNAH_IDENTITY_RE =
  /\byou\s+are\s+hannah\b|\bintroduce\s+yourself\s+as\s+hannah\b|\byou\s+are\s+\{displaynameassistant\}\b/i;

/**
 * Consumer-only identity lock. True when a DB `system_prompt` must not go live:
 * it claims Jeffery identity, or it never claims Hannah (including the approved
 * `{displayNameAssistant}` placeholder, which resolves to Hannah).
 */
export function isConsumerJefferyIdentityPrompt(template: string): boolean {
  return JEFFERY_IDENTITY_RE.test(template) || !HANNAH_IDENTITY_RE.test(template);
}

export type AdvisorPromptRejectReason = "jeffery_identity" | "missing_hannah_identity";

export interface AdvisorPromptResolution {
  template: string;
  promptSource: "db" | "fallback";
  rejectedDbRow: boolean;
  rejectReason: AdvisorPromptRejectReason | null;
}

/**
 * Choose the live advisor template. Consumer rows that identify as Jeffery
 * (or fail to identify as Hannah) are discarded in favor of the 219F Hannah
 * fallback. Practitioner / naturopath DB prompts are used as stored.
 */
export function resolveAdvisorPromptTemplate(
  role: AdvisorRole,
  dbSystemPrompt: string | null | undefined
): AdvisorPromptResolution {
  const fallback = fallbackPromptForRole(role);
  if (!dbSystemPrompt) {
    return {
      template: fallback,
      promptSource: "fallback",
      rejectedDbRow: false,
      rejectReason: null,
    };
  }

  if (role === "consumer" && isConsumerJefferyIdentityPrompt(dbSystemPrompt)) {
    const rejectReason: AdvisorPromptRejectReason = JEFFERY_IDENTITY_RE.test(dbSystemPrompt)
      ? "jeffery_identity"
      : "missing_hannah_identity";
    return {
      template: HANNAH_CONSUMER_SYSTEM_PROMPT,
      promptSource: "fallback",
      rejectedDbRow: true,
      rejectReason,
    };
  }

  return {
    template: dbSystemPrompt,
    promptSource: "db",
    rejectedDbRow: false,
    rejectReason: null,
  };
}

/**
 * Build the full advisor context for a query.
 */
export async function buildAdvisorContext(
  db: SupabaseClient,
  role: AdvisorRole,
  userId: string,
  patientId: string | null
): Promise<AdvisorContext> {
  // 1. Active system prompt (soft-fallback if missing)
  let template = fallbackPromptForRole(role);
  let promptSource: "db" | "fallback" = "fallback";

  try {
    const { data: promptRow, error: promptErr } = await db
      .from("ultrathink_advisor_prompts")
      .select("system_prompt, version")
      .eq("role", role)
      .eq("is_active", true)
      .maybeSingle();
    if (!promptErr && promptRow?.system_prompt) {
      const resolved = resolveAdvisorPromptTemplate(role, promptRow.system_prompt);
      template = resolved.template;
      promptSource = resolved.promptSource;
      if (resolved.rejectedDbRow) {
        safeLog.warn("advisor.context", "rejected consumer db prompt; using Hannah fallback", {
          role,
          reason: resolved.rejectReason,
          dbVersion: promptRow.version ?? null,
          personaVersion: HANNAH_PERSONA_VERSION,
        });
      }
    } else {
      safeLog.warn("advisor.context", "using fallback persona", {
        role,
        reason: promptErr?.message ?? "no active row",
        personaVersion: HANNAH_PERSONA_VERSION,
      });
    }
  } catch (e) {
    safeLog.warn("advisor.context", "prompt fetch failed; fallback", {
      role,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const dataOwnerId = role !== "consumer" && patientId ? patientId : userId;

  // 2. Ultrathink core context (fail-open to empty-ish via existing builder)
  let ultraCtx: UltrathinkContext;
  try {
    ultraCtx = await buildUltrathinkContext(dataOwnerId, db);
  } catch (e) {
    safeLog.warn("advisor.context", "ultrathink context failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    ultraCtx = {
      userId: dataOwnerId,
      confidenceTier: 1,
      confidencePct: 0,
      dataSourcesUsed: [],
      dataCompleteness: 0,
      demographics: { age: null, sex: null, height_cm: null, weight_kg: null, bmi: null, bodyType: null },
      healthConcerns: [],
      familyHistory: [],
      physicalSymptoms: {},
      neuroSymptoms: {},
      emotionalSymptoms: {},
      physicalSymptomAvg: 0,
      neuroSymptomAvg: 0,
      emotionalSymptomAvg: 0,
      topSymptoms: [],
      lifestyle: {},
      goals: [],
      medications: [],
      currentSupplements: [],
      allergies: [],
      bioScore: null,
      bioTier: null,
      bioStrengths: [],
      bioOpportunities: [],
      bioBreakdown: null,
    };
  }

  const userDisplayName = await fetchDisplayName(db, userId);
  const patientDisplayName = patientId ? await fetchDisplayName(db, patientId) : null;

  const extras =
    role === "consumer" ? await loadConsumerExtras(db, dataOwnerId) : ({} as Record<string, string>);

  const variables = contextToVariables(ultraCtx, userDisplayName, patientDisplayName, extras);
  const systemPrompt = substituteTemplate(template, variables);

  // Jeffery behavioral nudges (optional)
  let jefferyInstructions: string[] = [];
  try {
    const { data: instructions } = await db
      .from("ultrathink_jeffery_advisor_config")
      .select("instructions")
      .eq("role", role)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    jefferyInstructions = (instructions ?? []).map((i: { instructions: string }) => i.instructions);
  } catch {
    /* skip */
  }

  // Recent conversation history (last 20, oldest first)
  let conversationHistory: AdvisorMessage[] = [];
  try {
    const { data: history } = await db
      .from("ultrathink_advisor_conversations")
      .select("message_role, content")
      .eq("user_id", userId)
      .eq("advisor_role", role)
      .order("created_at", { ascending: false })
      .limit(20);
    conversationHistory = ((history ?? []) as AdvisorMessage[]).reverse();
  } catch {
    /* skip */
  }

  // Fire-and-forget insight emit
  void db
    .rpc("jeffery_emit_message", {
      p_category: "advisor_insight",
      p_severity: "advisory",
      p_title: `${role} advisor context built`,
      p_summary: `Context for ${role} advisor assembled (confidence ${ultraCtx.confidencePct}%, prompt=${promptSource}).`,
      p_detail: {
        role,
        has_patient: !!patientId,
        top_symptoms: ultraCtx.topSymptoms.slice(0, 5),
        bio_score: ultraCtx.bioScore,
        prompt_source: promptSource,
      },
      p_source_agent: `advisor_${role}`,
      p_source_context: { user_id: userId, patient_id: patientId },
      p_proposed_action: null,
    })
    .then(
      () => {},
      () => {}
    );

  return {
    role,
    userId,
    patientId,
    systemPrompt,
    contextVariables: variables,
    conversationHistory,
    jefferyInstructions,
    protocolConfidencePct: ultraCtx.confidencePct,
    promptSource,
  };
}
