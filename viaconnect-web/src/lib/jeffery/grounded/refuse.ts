/**
 * Refuse-if-tool-fails + Lex FAQ helpers.
 * Four-part assembler: explanation, already listed, sources, next action.
 * Language: "already listed" / "on your protocol" — never "prescribed".
 */

import {
  EDUCATIONAL_DISCLAIMER,
  FAQ,
  NOTHING_ON_FILE,
  TOOLS_UNAVAILABLE,
  VIA_CURA_DRAFT_BANNER,
} from "./copy";
import type {
  AdvisorChatRole,
  CheckInteractionsData,
  GroundedToolName,
  InteractionFinding,
  LookupPeptideData,
  LookupSnpData,
  ProtocolItem,
  ToolError,
} from "./types";

export type SafetyRefuseKind =
  | "emergency"
  | "pregnancy"
  | "pediatric"
  | "diagnosis"
  | "semaglutide"
  | "new_dose";

export interface FourPartAnswer {
  explanation: string;
  alreadyListed: string;
  sources: string[];
  nextAction: string;
}

const PRESCRIBED_RE = /\bprescribed\b/i;

export function detectSafetyRefuse(message: string): SafetyRefuseKind | null {
  const t = message.toLowerCase();
  if (
    /\bsuicid/.test(t) ||
    /\bkill myself\b/.test(t) ||
    /\bend my life\b/.test(t) ||
    /\bself-?harm\b/.test(t) ||
    /\bwant to die\b/.test(t) ||
    /\bchest pain\b/.test(t) ||
    /\banaphylax/.test(t) ||
    /\bcan'?t breathe\b/.test(t) ||
    /\bsevere bleed/.test(t) ||
    /\bstroke\b/.test(t)
  ) {
    return "emergency";
  }
  if (/\bpregnan/.test(t)) return "pregnancy";
  if (/\b(pediatric|for kids|infant|toddler|my (child|baby|kid))\b/.test(t)) return "pediatric";
  // Lex-safe: Semaglutide / excluded GLP-1 adjacency only — not broad educational GLP-1.
  if (/\b(semaglutide|ozempic|wegovy|liraglutide|excluded glp-?1)\b/.test(t)) {
    return "semaglutide";
  }
  if (/\b(do i have|diagnos|treat my (disease|cancer|diabetes|condition))\b/.test(t)) {
    return "diagnosis";
  }
  if (/\b(change my (rx|dose|prescription)|new dose|titrat|stacking schedule)\b/.test(t)) {
    return "new_dose";
  }
  return null;
}

export function explanationForSafety(kind: SafetyRefuseKind): string {
  switch (kind) {
    case "emergency":
      return FAQ.emergency;
    case "pregnancy":
      return FAQ.pregnancy;
    case "pediatric":
      return FAQ.pediatric;
    case "diagnosis":
      return FAQ.diagnosis;
    case "semaglutide":
      return FAQ.semaglutide;
    case "new_dose":
      return FAQ.newDose;
  }
}

export function explanationForToolFailure(
  error?: ToolError,
  failedTools?: GroundedToolName[]
): string {
  if (error?.code === "not_found" && failedTools?.includes("lookup_snp")) {
    return FAQ.genotypeMissing;
  }
  if (
    failedTools?.includes("lookup_peptide") &&
    (error?.code === "not_found" ||
      error?.code === "refuse_required" ||
      error?.code === "validation")
  ) {
    return FAQ.outOfScope;
  }
  if (error?.code === "not_found") {
    return FAQ.newDose;
  }
  if (error?.message) {
    return FAQ.toolFailed;
  }
  return FAQ.toolFailed;
}

export function killSwitchFaqExplanation(): string {
  return FAQ.killSwitchLines.join("\n");
}

function isClinicianDraftRole(role?: AdvisorChatRole): boolean {
  return role === "practitioner" || role === "naturopath";
}

function prependViaCuraDraftBanner(text: string, role?: AdvisorChatRole): string {
  if (!isClinicianDraftRole(role) || text.startsWith(VIA_CURA_DRAFT_BANNER)) {
    return text;
  }
  return `${VIA_CURA_DRAFT_BANNER}\n\n${text}`;
}

export function assembleFourPartAnswer(
  parts: FourPartAnswer,
  options?: { role?: AdvisorChatRole; includeDisclaimer?: boolean }
): string {
  const alreadyListed = parts.alreadyListed.trim() || NOTHING_ON_FILE;
  const sourceLines = parts.sources.length
    ? parts.sources.map((s) => `- ${s}`).join("\n")
    : "- none";
  const sections = [
    `1. Short explanation\n${parts.explanation.trim()}`,
    `2. What ViaConnect already listed\n${alreadyListed}`,
    `3. Sources\n${sourceLines}`,
    `4. Next action / ask clinician\n${parts.nextAction.trim()}`,
  ];
  let text = prependViaCuraDraftBanner(sections.join("\n\n"), options?.role);
  if (options?.includeDisclaimer !== false && !text.includes("educational purposes only")) {
    text += `\n\n${EDUCATIONAL_DISCLAIMER}`;
  }
  if (PRESCRIBED_RE.test(text)) {
    text = text.replace(PRESCRIBED_RE, "already listed");
  }
  return text;
}

export function assembleToolRefuseText(input: {
  role: AdvisorChatRole;
  failedTools: GroundedToolName[];
  error?: ToolError;
  requestId: string;
}): string {
  const toolList = input.failedTools.join(", ") || "required tool";
  return assembleFourPartAnswer(
    {
      explanation: explanationForToolFailure(input.error, input.failedTools),
      alreadyListed: TOOLS_UNAVAILABLE,
      sources: input.failedTools.map((name) => `${name} (${input.error?.code ?? "unavailable"})`),
      nextAction:
        "Retry in a moment, or ask your clinician to review what is already on your protocol. I will not invent a substitute.",
    },
    { role: input.role }
  ) + requestIdNote(input.requestId, toolList);
}

export function assembleSafetyRefuseText(input: {
  role: AdvisorChatRole;
  kind: SafetyRefuseKind;
}): string {
  return assembleFourPartAnswer(
    {
      explanation: explanationForSafety(input.kind),
      alreadyListed: NOTHING_ON_FILE,
      sources: ["lex-faq", input.kind],
      nextAction:
        input.kind === "emergency"
          ? "Seek emergency services now if needed. Call or text 988 (US Suicide and Crisis Lifeline) if you are thinking about harming yourself."
          : "Ask your clinician before changing anything already on your protocol.",
    },
    { role: input.role }
  );
}

/** Lex-cleared explanation frame (2026-09-15). Do not rewrite. */
export const INTERACTIONS_LISTING_EXPLANATION =
  "Here is what the ViaConnect interaction check listed.";

const PROTOCOL_NEXT_ACTION =
  "Open your protocol screen or ask your clinician before changing anything.";

export function assembleProtocolListingText(input: {
  role: AdvisorChatRole;
  items: ProtocolItem[];
  protocolName: string;
  sourceRoute: string;
  includeDisclaimer?: boolean;
}): string {
  const listed =
    input.items.length === 0
      ? NOTHING_ON_FILE
      : input.items
          .map((item) => {
            const dose = item.dosage.trim();
            const doseNote = dose ? ` (engine listing: ${dose})` : "";
            return `- ${item.productName}${doseNote}. Already on your protocol (${item.bucket}).`;
          })
          .join("\n");
  return assembleFourPartAnswer(
    {
      explanation:
        "I can only restate what ViaConnect already listed for you. This is educational context, not a new plan.",
      alreadyListed: listed,
      sources: [input.sourceRoute, input.protocolName],
      nextAction: PROTOCOL_NEXT_ACTION,
    },
    { role: input.role, includeDisclaimer: input.includeDisclaimer }
  );
}

function engineFieldLine(label: string, value: string | undefined | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return `${label}: ${value}`;
}

function formatInteractionFinding(finding: InteractionFinding): string {
  const lines = [
    `medication: ${finding.medication}`,
    `interactsWith: ${finding.interactsWith}`,
    `severity: ${finding.severity}`,
    engineFieldLine("mechanism", finding.mechanism),
    engineFieldLine("clinicalEffect", finding.clinicalEffect),
    engineFieldLine("mitigation", finding.mitigation),
  ].filter((line): line is string => line !== null);
  return `- ${lines.join("\n  ")}`;
}

function assembleInteractionsAlreadyListed(data: CheckInteractionsData): string {
  const sections: string[] = [];
  if (data.interactions.length > 0) {
    sections.push(data.interactions.map(formatInteractionFinding).join("\n"));
  }
  const { major, moderate, minor, synergistic } = data.summary;
  sections.push(`summary: major ${major}, moderate ${moderate}, minor ${minor}, synergistic ${synergistic}`);
  const blockedNames = data.blockedProducts.filter((name) => typeof name === "string" && name.trim());
  if (blockedNames.length > 0) {
    sections.push(`blockedProducts:\n${blockedNames.map((name) => `- ${name}`).join("\n")}`);
  }
  return sections.join("\n");
}

/**
 * Four-part restatement of CheckInteractionsData. Engine fields verbatim.
 * mechanism / clinicalEffect / mitigation only when non-empty on the payload.
 */
export function assembleInteractionsListingText(input: {
  role: AdvisorChatRole;
  data: CheckInteractionsData;
  sourceRoute: string;
  includeDisclaimer?: boolean;
}): string {
  return assembleFourPartAnswer(
    {
      explanation: INTERACTIONS_LISTING_EXPLANATION,
      alreadyListed: assembleInteractionsAlreadyListed(input.data),
      sources: [input.sourceRoute],
      nextAction: PROTOCOL_NEXT_ACTION,
    },
    { role: input.role, includeDisclaimer: input.includeDisclaimer }
  );
}

/** Lex-cleared explanation frame (2026-09-15). Do not rewrite. */
export const SNP_LISTING_EXPLANATION =
  "Here is what ViaConnect has on file for that genetic result.";

/** Lex-cleared explanation frame (2026-09-16). Do not rewrite. */
export const PEPTIDE_LISTING_EXPLANATION =
  "Here is what ViaConnect has on file for that peptide education.";

function assembleSnpAlreadyListed(data: LookupSnpData): string {
  const genotypeToken = data.genotype === null ? "null" : data.genotype;
  const lines = [
    `rsid: ${data.rsid}`,
    engineFieldLine("gene", data.gene),
    `genotype: ${genotypeToken}`,
    engineFieldLine("panel_key", data.panel_key),
    engineFieldLine("status", data.status),
    engineFieldLine("educational_summary", data.educational_summary),
  ].filter((line): line is string => line !== null);
  return `- ${lines.join("\n  ")}`;
}

/**
 * Four-part restatement of LookupSnpData. Field labels only.
 * null / UNKNOWN / pending stay verbatim. No diagnose, prescribe, or safe-to-take.
 */
export function assembleSnpListingText(input: {
  role: AdvisorChatRole;
  data: LookupSnpData;
  sourceRoute: string;
  includeDisclaimer?: boolean;
}): string {
  return assembleFourPartAnswer(
    {
      explanation: SNP_LISTING_EXPLANATION,
      alreadyListed: assembleSnpAlreadyListed(input.data),
      sources: [input.sourceRoute],
      nextAction: PROTOCOL_NEXT_ACTION,
    },
    { role: input.role, includeDisclaimer: input.includeDisclaimer }
  );
}

function assemblePeptideAlreadyListed(data: LookupPeptideData): string {
  const listedNames = Array.isArray(data.listed_names)
    ? data.listed_names.filter((name) => typeof name === "string" && name.trim())
    : [];
  const compoundClass =
    data.entry_key === "edu-peptideiq-topic-map"
      ? "index"
      : data.is_peptide === false
        ? "non-peptide"
        : "peptide";
  const lines = [
    `name: ${data.name}`,
    engineFieldLine("slug", data.slug),
    `educational_only: ${data.educational_only}`,
    engineFieldLine("summary", data.summary),
    data.pathway_tags.length ? `pathway_tags: ${data.pathway_tags.join(", ")}` : null,
    engineFieldLine("entry_key", data.entry_key),
    `compound_class: ${compoundClass}`,
    listedNames.length ? `listed: ${listedNames.join(", ")}` : null,
  ].filter((line): line is string => line !== null);
  return `- ${lines.join("\n  ")}`;
}

/**
 * Four-part restatement of LookupPeptideData. Field labels + Lex frame only.
 * No prescribe / dose / titration / stack / oral Retatrutide / safe-to-take /
 * Semaglutide recommend / mcg-mg coaching. Consumer copy says listed, not Rx.
 */
export function assemblePeptideListingText(input: {
  role: AdvisorChatRole;
  data: LookupPeptideData;
  sourceRoute: string;
  includeDisclaimer?: boolean;
}): string {
  return assembleFourPartAnswer(
    {
      explanation: PEPTIDE_LISTING_EXPLANATION,
      alreadyListed: assemblePeptideAlreadyListed(input.data),
      sources: [input.sourceRoute],
      nextAction: PROTOCOL_NEXT_ACTION,
    },
    { role: input.role, includeDisclaimer: input.includeDisclaimer }
  );
}

/** Protocol then interactions then snp then peptide. Banner stays once at the top. */
export function joinAssembledListingBlocks(blocks: string[]): string {
  if (blocks.length === 0) return "";
  if (blocks.length === 1) return blocks[0];
  return blocks
    .map((block, index) => {
      if (index === 0 || !block.startsWith(VIA_CURA_DRAFT_BANNER)) return block;
      return block.slice(VIA_CURA_DRAFT_BANNER.length).replace(/^\n+/, "");
    })
    .join("\n\n");
}

function requestIdNote(requestId: string, toolList: string): string {
  return `\n\n(request ${requestId}; tools: ${toolList})`;
}

export function assertNoPrescribedWording(text: string): boolean {
  return !PRESCRIBED_RE.test(text);
}
