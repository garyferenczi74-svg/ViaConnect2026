// Prompt 204c lab engine (2026-06-18): Hannah decipherment + recommendations.
// Runs ONLY on a confirmed result set. Hannah translates the DETERMINISTIC
// results into plain language and offers educational, wellness suggestions
// grounded only in the provided data + the FarmCeutica catalog. Every word then
// passes the compliance gate (reviewServerText) before it can reach the member;
// the gate is fail-closed (a review error or a BLOCKED/ESCALATE verdict drops
// the AI text). The deterministic consult flags stay visible on the page
// regardless, so a blocked decipherment never hides a concerning value.

import Anthropic from '@anthropic-ai/sdk';
import { reviewServerText } from '@/lib/compliance/review-server-text';
import { getDisplayName } from '@/lib/getDisplayName';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';
import { MASTER_FORMULATIONS } from '@/data/masterFormulations';
import type { LabResultRow } from './loadLabResults';

const MODEL = process.env.HANNAH_LAB_MODEL ?? 'claude-sonnet-4-6';
const LLM_TIMEOUT_MS = 30_000;

export interface DecipherResult {
  /** Reviewed, member-facing text. Null when there is nothing safe to show. */
  text: string | null;
  /** True when the compliance gate dropped the AI text. */
  blocked: boolean;
  /** True when any marker is consult tier (surfaced regardless of the text). */
  hasConsult: boolean;
}

const HANNAH = getDisplayName('hannah');

const SYSTEM_PROMPT =
  `You are ${HANNAH}, ViaConnect's AI wellness guide. You translate a member's lab ` +
  `results into clear, plain language for a general reader and offer educational, ` +
  `wellness-oriented suggestions.\n\n` +
  `STRICT RULES:\n` +
  `- Educational and wellness framing ONLY. This is NOT a diagnosis and NOT a ` +
  `substitute for medical care. Do not diagnose, do not name diseases, and do not ` +
  `claim to treat, cure, or prevent any condition (respect DSHEA).\n` +
  `- Ground EVERYTHING in the structured results provided. Do not introduce values, ` +
  `ranges, genes, or facts that are not in the data. Do not invent reference ranges.\n` +
  `- For any marker marked tier "consult", state plainly that it is outside the ` +
  `expected range and recommend the member seek professional or practitioner care ` +
  `promptly. Never reassure or minimize a consult value in a way that could delay care.\n` +
  `- For supplement suggestions you may ONLY name FarmCeutica products from the ` +
  `provided catalog list, and only as general educational options. Do NOT state ` +
  `specific doses, amounts, or nutrient quantities (a practitioner determines those). ` +
  `Do NOT suggest any supplement for a marker marked consult (defer to care instead).\n` +
  `- Do not recommend peptides. Do not mention tesofensine. No prescription guidance. ` +
  `Keep nutrition guidance high level and educational; do not compute nutrient values.\n\n` +
  `OUTPUT: clear plain-language prose in short labelled sections: Overview, brief ` +
  `per-marker notes for the notable results, "What you can consider" (educational ` +
  `suggestions), and "When to seek care". No medical jargon without a plain explanation. ` +
  `Do not use em dashes or en dashes; use a hyphen or rephrase.`;

function buildUserPrompt(results: LabResultRow[]): string {
  const lines = results.map((r) => {
    const std = r.standard ? `printed range ${r.standard.low} to ${r.standard.high}` : 'no printed range';
    const geneticOpt = r.geneticOptimal
      ? `; genetic optimal ${r.geneticOptimal.low} to ${r.geneticOptimal.high} (from ${r.gene})`
      : '';
    // Inline reinforcement so a consult marker can never carry a supplement nudge.
    const consult = r.tier === 'consult'
      ? ' [CONSULT: do NOT suggest any supplement for this marker; recommend professional care]'
      : '';
    return `- ${r.name}: ${r.value} ${r.unit} [${r.panelGroup}] tier=${r.tier} (${r.direction}); ${std}${geneticOpt}${consult}`;
  });
  const catalog = MASTER_FORMULATIONS
    .filter((p) => !p.isDraft)
    .map((p) => `${p.name} (${p.category})`)
    .join('; ');
  return (
    `Confirmed lab results:\n${lines.join('\n')}\n\n` +
    `FarmCeutica catalog you may reference by name (educational only): ${catalog}\n\n` +
    `Translate these into plain language and educational suggestions per your rules.`
  );
}

export async function decipherLabResults(results: LabResultRow[], userId: string): Promise<DecipherResult> {
  const hasConsult = results.some((r) => r.tier === 'consult');
  if (results.length === 0) {
    return { text: null, blocked: false, hasConsult: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    safeLog.warn('labs.decipher', 'ANTHROPIC_API_KEY not configured', { user_id: userId });
    return { text: null, blocked: false, hasConsult };
  }

  let raw = '';
  try {
    const client = new Anthropic({ apiKey, timeout: LLM_TIMEOUT_MS, maxRetries: 1 });
    const msg = await withTimeout(
      client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(results) }],
      }),
      LLM_TIMEOUT_MS + 5_000,
      'labs.decipher.llm',
    );
    raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  } catch (err) {
    safeLog.error('labs.decipher', 'llm failed', {
      user_id: userId, error: err instanceof Error ? err.message : String(err),
    });
    return { text: null, blocked: false, hasConsult };
  }
  if (!raw) return { text: null, blocked: false, hasConsult };

  // Compliance gate. Fail-closed: any error or a BLOCKED/ESCALATE verdict drops
  // the AI text rather than risk an ungrounded claim reaching the member.
  try {
    const reviewed = await reviewServerText({
      text: raw,
      jurisdiction: 'US',
      subject_type: 'protocol',
      acting_user_id: userId,
      actor_role: 'consumer',
      ingredient_scope: results.map((r) => r.name),
    });
    // Only show Hannah's OWN words when they passed cleanly. A CONDITIONAL verdict
    // means Kelsey rewrote the text to make it compliant; on a health surface we
    // do not present that rewrite as Hannah's interpretation, we drop it and fall
    // back to the deterministic results. BLOCKED/ESCALATE already return null.
    const clean = reviewed.decision === 'APPROVED' || reviewed.decision === 'pass_stage_1';
    if (!clean || reviewed.text === null) {
      return { text: null, blocked: true, hasConsult };
    }
    return { text: reviewed.text, blocked: false, hasConsult };
  } catch (err) {
    safeLog.error('labs.decipher', 'compliance review failed (dropping text)', {
      user_id: userId, error: err instanceof Error ? err.message : String(err),
    });
    return { text: null, blocked: true, hasConsult };
  }
}
