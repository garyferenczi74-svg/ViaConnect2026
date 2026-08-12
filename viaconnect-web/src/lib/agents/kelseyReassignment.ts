/**
 * Prompt 214a: Kelsey duty reassignment mapping.
 * Kelsey is retired as a live agent. Historical slug "kelsey" aliases to Lex
 * for event resolution. Live duties land on Marshall (content/lexicon) or Lex
 * (legal/regulatory Stage 2).
 */

export type KelseyDutyOwner = "marshall" | "lex";

export interface KelseyDutyRow {
  duty: string;
  formerPath: string;
  owner: KelseyDutyOwner;
  rationale: string;
}

export const KELSEY_DUTY_MAP: readonly KelseyDutyRow[] = [
  {
    duty: "Stage 1 disease-claim detector",
    formerPath: "src/lib/compliance/detector/*",
    owner: "marshall",
    rationale: "Content/claims framing and lexicon-adjacent pre-filter.",
  },
  {
    duty: "Stage 2 LLM claims language review",
    formerPath: "src/lib/compliance/kelsey/client.ts",
    owner: "lex",
    rationale: "Legal-adjacent verdicts on free-text medical language.",
  },
  {
    duty: "Server review helper (reviewServerText)",
    formerPath: "src/lib/compliance/review-server-text.ts",
    owner: "marshall",
    rationale: "Gate orchestration; Stage 2 escalations attribute to Lex.",
  },
  {
    duty: "HTTP review endpoint",
    formerPath: "src/app/api/compliance/kelsey/review/route.ts",
    owner: "lex",
    rationale: "Admin legal/regulatory review entry; path kept for compat, owner Lex.",
  },
  {
    duty: "regulatory_kelsey_reviews table writer",
    formerPath: "src/lib/compliance/kelsey-review-rows.ts",
    owner: "lex",
    rationale: "Legal review persistence; table name retained (append-only history).",
  },
  {
    duty: "Arnold recommender free-text gate",
    formerPath: "src/lib/body-tracker/arnold-recommender.ts",
    owner: "marshall",
    rationale: "Content compliance on coaching copy; Lex on escalate.",
  },
  {
    duty: "Arnold region-blurb gate",
    formerPath: "src/app/api/arnold/region-blurb/route.ts",
    owner: "marshall",
    rationale: "Same two-stage gate; Stage 2 legal ownership Lex.",
  },
  {
    duty: "SNP protocol rule publish gate",
    formerPath: "src/lib/kb/snpProtocolRules.ts",
    owner: "lex",
    rationale: "Publication hold is legal/regulatory.",
  },
  {
    duty: "Labs Hannah decipher gate",
    formerPath: "src/lib/labs/hannahDecipher.ts",
    owner: "lex",
    rationale: "Lab interpretation legal review.",
  },
  {
    duty: "Hannah ask post-check",
    formerPath: "src/app/api/hannah/ask/route.ts",
    owner: "marshall",
    rationale: "Assistant content compliance; escalate to Lex on hard flags.",
  },
  {
    duty: "Message bus kelseyEscalate*",
    formerPath: "src/lib/agents/message-bus.ts",
    owner: "lex",
    rationale: "Escalation targets rebranded to Lex; Marshall for copy notifies.",
  },
  {
    duty: "Hound Dog staging content gate (213a)",
    formerPath: "synchronism Stage 2",
    owner: "marshall",
    rationale: "Content/lexicon primary; Lex escalation queue for legal flags.",
  },
] as const;

/** Ambiguous items for Gary (not reassigned by guess). */
export const KELSEY_AMBIGUOUS_FOR_GARY: readonly string[] = [
  "Marketing variant publish remains Marshall-only (no Stage 2) per Prompt 214 open Q3; confirm or add Lex.",
  "Table name regulatory_kelsey_reviews retained for history; rename deferred (append-only).",
  "HTTP path /api/compliance/kelsey/review kept for API compat; permanent rename needs product call.",
];

export function ownerForKelseyDuty(dutyPath: string): KelseyDutyOwner | null {
  const hit = KELSEY_DUTY_MAP.find((d) => dutyPath.includes(d.formerPath) || d.formerPath.includes(dutyPath));
  return hit?.owner ?? null;
}
