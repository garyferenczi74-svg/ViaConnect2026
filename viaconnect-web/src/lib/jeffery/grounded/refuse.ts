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
} from "./copy";
import type { AdvisorChatRole, GroundedToolName, ProtocolItem, ToolError } from "./types";

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
  if (/\b(semaglutide|ozempic|wegovy|liraglutide|excluded glp-?1)\b/.test(t) || /\bglp-?1\b/.test(t)) {
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

export function explanationForToolFailure(error?: ToolError): string {
  if (error?.code === "not_found") {
    return FAQ.newDose;
  }
  if (error?.message) {
    return FAQ.toolFailed;
  }
  return FAQ.toolFailed;
}

export function killSwitchFaqExplanation(): string {
  return FAQ.killSwitch;
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
  void options?.role;
  let text = sections.join("\n\n");
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
      explanation: explanationForToolFailure(input.error),
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

export function assembleProtocolListingText(input: {
  role: AdvisorChatRole;
  items: ProtocolItem[];
  protocolName: string;
  sourceRoute: string;
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
      nextAction: "Open your protocol screen or ask your clinician before changing anything.",
    },
    { role: input.role }
  );
}

function requestIdNote(requestId: string, toolList: string): string {
  return `\n\n(request ${requestId}; tools: ${toolList})`;
}

export function assertNoPrescribedWording(text: string): boolean {
  return !PRESCRIBED_RE.test(text);
}
