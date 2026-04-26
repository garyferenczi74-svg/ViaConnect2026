/**
 * Rebuttal template helpers (Prompt #123 §6.1 + §6.2 + §6.3).
 *
 * Template selection and deterministic slot filling. NO LLM is used in
 * slot-filling itself per spec section 6.3; the augmentation layer
 * (Anthropic API) is deferred to a later phase and gated by the
 * AUGMENTATION_ENABLED constant.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RebuttalTemplateRow,
  AppealRecommendation,
  AppealClaimType,
  TemplateSlotName,
} from "./types";

export const AUGMENTATION_ENABLED = false; // Phase 1 foundation: deterministic only.

export interface TemplateSelectionInput {
  disposition: AppealRecommendation;
  claim_type: AppealClaimType;
  jurisdiction: string;
  language: string;
}

const DISPOSITION_TO_TEMPLATE_DISPOSITION: Record<AppealRecommendation, RebuttalTemplateRow["disposition"] | null> = {
  uphold: "uphold",
  reverse: "reverse",
  partial: "partial",
  request_more_info: "request_more_info",
  manual_review: null,
  escalate: "escalation_notice",
};

export async function selectTemplate(
  client: SupabaseClient,
  input: TemplateSelectionInput,
): Promise<RebuttalTemplateRow | null> {
  const disposition = DISPOSITION_TO_TEMPLATE_DISPOSITION[input.disposition];
  if (!disposition) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from("rebuttal_templates")
    .select("*")
    .eq("disposition", disposition)
    .in("claim_type", [input.claim_type, "any"])
    .in("jurisdiction", [input.jurisdiction, "generic"])
    .eq("language", input.language)
    .eq("active", true)
    .order("version", { ascending: false });

  const candidates = (data ?? []) as RebuttalTemplateRow[];
  if (candidates.length === 0) return null;

  // Prefer the most-specific template: claim_type matches exact, then
  // jurisdiction matches exact, then highest version.
  const exactClaim = candidates.filter((t) => t.claim_type === input.claim_type);
  const exactJur = (exactClaim.length > 0 ? exactClaim : candidates).filter((t) => t.jurisdiction === input.jurisdiction);
  return (exactJur.length > 0 ? exactJur : exactClaim.length > 0 ? exactClaim : candidates)[0];
}

export interface SlotValues {
  practitioner_name?: string;
  practitioner_display_name?: string;
  notice_id?: string;
  finding_id?: string;
  rule_id?: string;
  rule_description?: string;
  citation?: string;
  evidence_reference?: string;
  evidence_summary?: string;
  remediation_action?: string;
  appeal_outcome?: string;
  receipt_id?: string;
  receipt_issued_at?: string;
  drift_description?: string;
  strike_count_current?: string;
  strike_count_window_days?: string;
  sla_original_due?: string;
  sla_new_due?: string;
  signed_by?: string;
  signed_title?: string;
}

export interface FillTemplateResult {
  text: string;
  unfilledSlots: TemplateSlotName[];
}

export function fillTemplate(template: RebuttalTemplateRow, values: SlotValues): FillTemplateResult {
  let text = template.body;
  const unfilled: TemplateSlotName[] = [];
  for (const slot of template.required_slots) {
    const value = (values as Record<string, string | undefined>)[slot];
    if (value === undefined || value === null || value === "") {
      unfilled.push(slot as TemplateSlotName);
      continue;
    }
    const re = new RegExp(`\\{\\{\\s*${slot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`, "g");
    text = text.replace(re, value);
  }
  // Strip any remaining unfilled placeholders to avoid leaking template syntax.
  text = text.replace(/\{\{\s*[a-z_]+\s*\}\}/g, "");
  return { text, unfilledSlots: unfilled };
}
