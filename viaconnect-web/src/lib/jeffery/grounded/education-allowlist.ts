/**
 * Stage A first RAG education / safety slice — ≤20 allowlisted ids HARD.
 * Live PeptideIQ spellings only. Never invent alias rows or expand past 20.
 * safety_never_say = Lex/FAQ pass-through only. No new clinical invent.
 */

import { FAQ } from "./copy";

/** Lex-cleared refuse/escalate fixtures. Do not invent monograph bodies. */
export const STAGE_A_SAFETY_NEVER_SAY_IDS = [
  "safety_never_say:diagnosis:01",
  "safety_never_say:pregnancy:01",
  "safety_never_say:pediatric:01",
  "safety_never_say:adverse-event:01",
  "safety_never_say:tool-fail:01",
] as const;

/** Consumer PeptideIQ keys — live spellings (not edu-pt-141 / edu-cjc-1295). */
export const STAGE_A_EDUCATION_ALLOWLIST = [
  "edu-retatrutide",
  "edu-sermorelin",
  "edu-ipamorelin",
  "edu-bpc157",
  "edu-ss31",
  "edu-5-amino-1mq-nonpeptide",
  "edu-slu-pp-332-nonpeptide",
  "edu-tesofensine-pause",
  "edu-pt141-bremelanotide",
  "edu-tesamorelin",
  "edu-cjc1295-no-dac",
  "edu-mots-c",
  "edu-ghk-cu",
  "edu-epitalon",
  "edu-peptideiq-topic-map",
] as const;

export const STAGE_A_RETRIEVER_ALLOWLIST = [
  ...STAGE_A_SAFETY_NEVER_SAY_IDS,
  ...STAGE_A_EDUCATION_ALLOWLIST,
] as const;

export const STAGE_A_RETRIEVER_ALLOWLIST_MAX = 20;

export type StageASafetyNeverSayId = (typeof STAGE_A_SAFETY_NEVER_SAY_IDS)[number];
export type StageAEducationAllowlistId = (typeof STAGE_A_EDUCATION_ALLOWLIST)[number];
export type StageARetrieverAllowlistId = (typeof STAGE_A_RETRIEVER_ALLOWLIST)[number];

const SAFETY_SET: ReadonlySet<string> = new Set(STAGE_A_SAFETY_NEVER_SAY_IDS);
const EDUCATION_SET: ReadonlySet<string> = new Set(STAGE_A_EDUCATION_ALLOWLIST);
const ALLOWLIST_SET: ReadonlySet<string> = new Set(STAGE_A_RETRIEVER_ALLOWLIST);

export interface SafetyNeverSayFixture {
  id: StageASafetyNeverSayId;
  title: string;
  text: string;
}

/** FAQ pass-through only — already Lex-cleared. No treatment-soft rewrite. */
export const SAFETY_NEVER_SAY_FIXTURES: Record<StageASafetyNeverSayId, SafetyNeverSayFixture> =
  {
    "safety_never_say:diagnosis:01": {
      id: "safety_never_say:diagnosis:01",
      title: "Diagnosis refuse",
      text: FAQ.diagnosis,
    },
    "safety_never_say:pregnancy:01": {
      id: "safety_never_say:pregnancy:01",
      title: "Pregnancy refuse",
      text: FAQ.pregnancy,
    },
    "safety_never_say:pediatric:01": {
      id: "safety_never_say:pediatric:01",
      title: "Pediatric refuse",
      text: FAQ.pediatric,
    },
    "safety_never_say:adverse-event:01": {
      id: "safety_never_say:adverse-event:01",
      title: "Adverse-event escalate",
      text: FAQ.outOfScope,
    },
    "safety_never_say:tool-fail:01": {
      id: "safety_never_say:tool-fail:01",
      title: "Tool-fail refuse",
      text: FAQ.toolFailed,
    },
  };

export function isStageAEducationAllowlisted(id: string): boolean {
  return EDUCATION_SET.has(id);
}

export function isSafetyNeverSayId(id: string): id is StageASafetyNeverSayId {
  return SAFETY_SET.has(id);
}

export function isStageARetrieverAllowlisted(id: string): id is StageARetrieverAllowlistId {
  return ALLOWLIST_SET.has(id);
}

export function safetyNeverSayFixture(id: string): SafetyNeverSayFixture | null {
  if (!isSafetyNeverSayId(id)) return null;
  const fixture = SAFETY_NEVER_SAY_FIXTURES[id];
  return fixture?.text.trim() ? fixture : null;
}

const EXPLICIT_ID_RE =
  /\b(edu-[a-z0-9-]+|depth-[a-z0-9-]+|safety_never_say:[a-z0-9-]+:\d+)\b/gi;

const EDUCATION_NAME_TO_KEY: Array<{ re: RegExp; key: StageAEducationAllowlistId }> = [
  { re: /\bretatrutide\b/i, key: "edu-retatrutide" },
  { re: /\bsermorelin\b/i, key: "edu-sermorelin" },
  { re: /\bipamorelin\b/i, key: "edu-ipamorelin" },
  { re: /\bbpc-?157\b/i, key: "edu-bpc157" },
  { re: /\bss-?31\b/i, key: "edu-ss31" },
  { re: /\b5-?amino-?1-?mq\b/i, key: "edu-5-amino-1mq-nonpeptide" },
  { re: /\bslu-?pp-?332\b/i, key: "edu-slu-pp-332-nonpeptide" },
  { re: /\btesofensine\b/i, key: "edu-tesofensine-pause" },
  { re: /\b(pt-?141|bremelanotide)\b/i, key: "edu-pt141-bremelanotide" },
  { re: /\btesamorelin\b/i, key: "edu-tesamorelin" },
  { re: /\bcjc-?1295\b/i, key: "edu-cjc1295-no-dac" },
  { re: /\bmots-?c\b/i, key: "edu-mots-c" },
  { re: /\bghk-?cu\b/i, key: "edu-ghk-cu" },
  { re: /\bepitalon\b/i, key: "edu-epitalon" },
  { re: /\bpeptideiq topic map\b/i, key: "edu-peptideiq-topic-map" },
];

export function isEducationAsk(message: string | undefined): boolean {
  const text = message ?? "";
  if (/\b(edu-[a-z0-9-]+|depth-[a-z0-9-]+|safety_never_say)\b/i.test(text)) return true;
  return /\b(education on file|education topic|topic education|viaconnect education)\b/i.test(
    text
  );
}

/** Extract allowlisted or explicit topic ids from a user turn. Never invent aliases. */
export function extractAllowlistedTopicIds(message: string | undefined): string[] {
  const text = message ?? "";
  EXPLICIT_ID_RE.lastIndex = 0;
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    found.push(trimmed);
  };
  for (const match of text.matchAll(EXPLICIT_ID_RE)) {
    if (match[1]) push(match[1]);
  }
  if (isEducationAsk(text)) {
    for (const token of EDUCATION_NAME_TO_KEY) {
      if (token.re.test(text)) push(token.key);
    }
  }
  return found.slice(0, STAGE_A_RETRIEVER_ALLOWLIST_MAX);
}

export function firstEducationTopicId(
  inputTopic: string | undefined,
  message: string | undefined
): string {
  const fromInput = typeof inputTopic === "string" ? inputTopic.trim() : "";
  if (fromInput) return fromInput;
  return extractAllowlistedTopicIds(message)[0] ?? "";
}
