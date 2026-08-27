/**
 * Consumer advisor identity lock: a stale Jeffery ultrathink_advisor_prompts
 * row must not become the live consumer system prompt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HANNAH_CONSUMER_SYSTEM_PROMPT } from "../hannah-persona";
import {
  isConsumerJefferyIdentityPrompt,
  resolveAdvisorPromptTemplate,
  substituteTemplate,
} from "../advisor-context-builder";
import { getDisplayName } from "@/lib/getDisplayName";

const JEFFERY_STALE_ROW =
  "You are Jeffery, the AI Wellness Assistant. Always introduce yourself as Jeffery when chatting. You work for FarmCeutica Wellness LLC.";

const HANNAH_DB_ROW =
  "You are Hannah, the AI Wellness Assistant for ViaConnect. You are warm and grounded in this user's data.";

function liveSystemPrompt(role: "consumer" | "practitioner" | "naturopath", dbRow: string): string {
  const resolved = resolveAdvisorPromptTemplate(role, dbRow);
  return substituteTemplate(resolved.template, {
    displayNameAssistant: getDisplayName("hannah"),
    displayName: "Gary",
    patientName: "no active patient",
    bioOptScore: "72",
    tier: "gold",
    topSymptoms: "none reported",
    medications: "none",
    currentSupplements: "none",
    goals: "sleep",
    bioStrengths: "not available",
    bioOpportunities: "not available",
    bioBreakdown: "not available",
    todayAdherence: "not available",
    gordonDigest: "not available",
    elysiumDigest: "not available",
    arnoldDigest: "not available",
    thanosDigest: "not available",
    jefferyDigest: "not available",
    hannahNote: "not available",
  });
}

describe("isConsumerJefferyIdentityPrompt", () => {
  it("flags You are Jeffery / introduce yourself as Jeffery", () => {
    expect(isConsumerJefferyIdentityPrompt("You are Jeffery, the AI Wellness Assistant.")).toBe(true);
    expect(isConsumerJefferyIdentityPrompt("Always introduce yourself as Jeffery.")).toBe(true);
    expect(isConsumerJefferyIdentityPrompt(JEFFERY_STALE_ROW)).toBe(true);
  });

  it("flags a consumer prompt that never identifies as Hannah", () => {
    expect(isConsumerJefferyIdentityPrompt("You are a helpful wellness assistant.")).toBe(true);
  });

  it("allows a consumer prompt that already identifies as Hannah", () => {
    expect(isConsumerJefferyIdentityPrompt(HANNAH_DB_ROW)).toBe(false);
    expect(isConsumerJefferyIdentityPrompt(HANNAH_CONSUMER_SYSTEM_PROMPT)).toBe(false);
    expect(isConsumerJefferyIdentityPrompt("Please introduce yourself as Hannah.")).toBe(false);
  });

  it("does not treat Jeffery digest mentions as identity", () => {
    expect(
      isConsumerJefferyIdentityPrompt(
        "You are Hannah. Other supplier signals: {jefferyDigest}. Escalate via the Jeffery bus."
      )
    ).toBe(false);
  });
});

describe("resolveAdvisorPromptTemplate consumer lock", () => {
  it("rejects a Jeffery identity DB row and uses the Hannah fallback as the live system prompt", () => {
    const resolved = resolveAdvisorPromptTemplate("consumer", JEFFERY_STALE_ROW);
    expect(resolved.rejectedDbRow).toBe(true);
    expect(resolved.rejectReason).toBe("jeffery_identity");
    expect(resolved.promptSource).toBe("fallback");
    expect(resolved.template).toBe(HANNAH_CONSUMER_SYSTEM_PROMPT);
    expect(resolved.template).not.toContain("You are Jeffery");
    expect(resolved.template).not.toMatch(/introduce yourself as Jeffery/i);

    const live = liveSystemPrompt("consumer", JEFFERY_STALE_ROW);
    expect(live).toContain(`You are ${getDisplayName("hannah")}`);
    expect(live).not.toMatch(/You are Jeffery/i);
    expect(live).not.toMatch(/introduce yourself as Jeffery/i);
  });

  it("keeps a consumer DB prompt that already says Hannah", () => {
    const resolved = resolveAdvisorPromptTemplate("consumer", HANNAH_DB_ROW);
    expect(resolved.rejectedDbRow).toBe(false);
    expect(resolved.promptSource).toBe("db");
    expect(resolved.template).toBe(HANNAH_DB_ROW);

    const live = liveSystemPrompt("consumer", HANNAH_DB_ROW);
    expect(live).toContain("You are Hannah");
  });

  it("keeps the approved 219F consumer prompt stored as a DB row", () => {
    const resolved = resolveAdvisorPromptTemplate("consumer", HANNAH_CONSUMER_SYSTEM_PROMPT);
    expect(resolved.rejectedDbRow).toBe(false);
    expect(resolved.promptSource).toBe("db");
    expect(resolved.template).toBe(HANNAH_CONSUMER_SYSTEM_PROMPT);
  });

  it("leaves practitioner and naturopath DB prompts unchanged even if they mention Jeffery", () => {
    const practitioner = resolveAdvisorPromptTemplate("practitioner", JEFFERY_STALE_ROW);
    expect(practitioner.template).toBe(JEFFERY_STALE_ROW);
    expect(practitioner.promptSource).toBe("db");
    expect(practitioner.rejectedDbRow).toBe(false);

    const naturopath = resolveAdvisorPromptTemplate("naturopath", JEFFERY_STALE_ROW);
    expect(naturopath.template).toBe(JEFFERY_STALE_ROW);
    expect(naturopath.promptSource).toBe("db");
    expect(naturopath.rejectedDbRow).toBe(false);
  });

  it("locks displayNameAssistant to Hannah", () => {
    expect(getDisplayName("hannah")).toBe("Hannah");
    const live = liveSystemPrompt("consumer", HANNAH_CONSUMER_SYSTEM_PROMPT);
    expect(live).toContain("You are Hannah");
    expect(live).not.toContain("{displayNameAssistant}");
  });
});

describe("advisor-context-builder consumer lock wiring", () => {
  it("buildAdvisorContext applies the identity lock after the DB fetch", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/jeffery/advisor-context-builder.ts"),
      "utf8"
    );
    expect(src).toContain("isConsumerJefferyIdentityPrompt");
    expect(src).toContain("resolveAdvisorPromptTemplate");
    expect(src).toContain("rejected consumer db prompt; using Hannah fallback");
    expect(src).toContain('displayNameAssistant: getDisplayName("hannah")');
    expect(src).toMatch(/if \(role === "consumer"\)/);
  });
});
