/**
 * Jeffery Advisor Context Builder (Prompt #60b — Section 3A)
 *
 * Builds the runtime context for an advisor query in real-time.
 * Reuses the existing buildUltrathinkContext from lib/ultrathink/buildContext.ts
 * (Prompt #40) — no need to rebuild data assembly.
 *
 * Output: a fully-substituted system prompt + structured context the API route
 * passes straight to Claude.
 *
 * NOTE: This module is server-only. It uses a service-role Supabase client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUltrathinkContext, type UltrathinkContext } from "@/lib/ultrathink/buildContext";

export type AdvisorRole = "consumer" | "practitioner" | "naturopath";

export interface AdvisorMessage {
  message_role: "user" | "assistant" | "system";
  content: string;
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

/**
 * Map a Jeffery UltrathinkContext into the placeholder variables used by the
 * advisor system prompts (consumer / practitioner / naturopath share most keys).
 */
function contextToVariables(
  ctx: UltrathinkContext,
  displayName: string,
  patientName: string | null
): Record<string, string> {
  const topSymptomsStr = ctx.topSymptoms.length > 0
    ? ctx.topSymptoms.slice(0, 5).map(s => `${s.name} (${s.score}/10)`).join(", ")
    : "none reported";

  const medicationsStr = ctx.medications.length > 0
    ? ctx.medications.join(", ")
    : "none";

  const currentSuppsStr = ctx.currentSupplements.length > 0
    ? ctx.currentSupplements.map(s => `${s.brand ? s.brand + " " : ""}${s.name} (${s.dosage} ${s.frequency})`).slice(0, 8).join("; ")
    : "none";

  const goalsStr = ctx.goals.length > 0 ? ctx.goals.join(", ") : "not specified";

  return {
    displayName,
    patientName: patientName ?? "no active patient",
    bioOptScore: ctx.bioScore != null ? String(ctx.bioScore) : "not yet calculated",
    tier: ctx.bioTier ?? "unknown",
    topSymptoms: topSymptomsStr,
    medications: medicationsStr,
    currentSupplements: currentSuppsStr,
    goals: goalsStr,
  };
}

/**
 * Server-side display name lookup. Mirrors lib/user/get-display-name.ts but
 * accepts a service-role client and a target user id (so providers can fetch
 * patient names without their own session).
 */
async function fetchDisplayName(db: SupabaseClient, userId: string): Promise<string> {
  const { data } = await db.from("profiles").select("full_name, username").eq("id", userId).maybeSingle();
  if (data?.full_name) return data.full_name.split(" ")[0];
  if (data?.username) return data.username;
  return "there";
}

/**
 * Build the full advisor context for a query.
 *
 * @param db        service-role Supabase client
 * @param role      advisor role (consumer/practitioner/naturopath)
 * @param userId    the signed-in user (always)
 * @param patientId the patient being viewed (only for practitioner/naturopath)
 */
export async function buildAdvisorContext(
  db: SupabaseClient,
  role: AdvisorRole,
  userId: string,
  patientId: string | null
): Promise<AdvisorContext> {
  // 1. Fetch the active system prompt template for this role
  const { data: promptRow, error: promptErr } = await db
    .from("ultrathink_advisor_prompts")
    .select("system_prompt, version")
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();
  if (promptErr || !promptRow) {
    throw new Error(`No active advisor prompt for role=${role}`);
  }

  // 2. Build the underlying Ultrathink context for whoever owns the data
  //    - consumer: the signed-in user
  //    - practitioner/naturopath WITH patientId: the patient
  //    - practitioner/naturopath WITHOUT patientId: the provider's own data
  //      (so the provider can ask "what does my caseload look like?")
  const dataOwnerId = (role !== "consumer" && patientId) ? patientId : userId;
  const ultraCtx = await buildUltrathinkContext(dataOwnerId, db);

  // 3. Display names
  const userDisplayName = await fetchDisplayName(db, userId);
  const patientDisplayName = patientId ? await fetchDisplayName(db, patientId) : null;

  // 4. Substitute prompt variables
  const variables = contextToVariables(ultraCtx, userDisplayName, patientDisplayName);
  const systemPrompt = substituteTemplate(promptRow.system_prompt, variables);

  // 5. Pull active Jeffery behavioral nudges for this role
  const { data: instructions } = await db
    .from("ultrathink_jeffery_advisor_config")
    .select("instructions")
    .eq("role", role)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // 6. Recent conversation history (last 20 messages, oldest first)
  const { data: history } = await db
    .from("ultrathink_advisor_conversations")
    .select("message_role, content")
    .eq("user_id", userId)
    .eq("advisor_role", role)
    .order("created_at", { ascending: false })
    .limit(20);

  // Prompt #60c — fire-and-forget advisor_insight message into the Jeffery
  // Command Center feed. Failure here must NEVER block context building.
  void db.rpc("jeffery_emit_message", {
    p_category: "advisor_insight",
    p_severity: "advisory",
    p_title: `${role} advisor context built`,
    p_summary: `Context for ${role} advisor assembled (confidence ${ultraCtx.confidencePct}%, ${ultraCtx.topSymptoms.length} top symptoms).`,
    p_detail: { role, has_patient: !!patientId, top_symptoms: ultraCtx.topSymptoms.slice(0, 5), bio_score: ultraCtx.bioScore },
    p_source_agent: `advisor_${role}`,
    p_source_context: { user_id: userId, patient_id: patientId },
    p_proposed_action: null,
  }).then(() => {}, () => {});

  return {
    role,
    userId,
    patientId,
    systemPrompt,
    contextVariables: variables,
    conversationHistory: ((history ?? []) as AdvisorMessage[]).reverse(),
    jefferyInstructions: (instructions ?? []).map(i => i.instructions),
    protocolConfidencePct: ultraCtx.confidencePct,
  };
}
