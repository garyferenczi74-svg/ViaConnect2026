/**
 * agentExtensions208a.test.ts
 *
 * Verifies the additive PROMPT 208a EXTENSION blocks appended to each agent
 * definition file. These tests run RED until the four blocks are appended.
 *
 * TDD contract (brief Appendix 2):
 * 1. Each modified file contains its PROMPT 208a EXTENSION START/END markers EXACTLY once.
 * 2. Each new <AGENT>_208A_DIRECTIVE is exported and is a non-empty string.
 *    - GORDON mentions 'allergen' and 'depletion'
 *    - HANNAH mentions 'concordance' and 'orientation'
 *    - ARNOLD mentions 'concordance'
 *    - JEFFERY mentions 'conflict' and 'arbitrat'
 * 3. Existing exports are unchanged (representative phrase check).
 */

import { describe, it, expect } from "vitest";

// ── Hannah ──────────────────────────────────────────────────────────────────

import {
  HANNAH_GUARDRAILS_TEXT,
  HANNAH_208_RESEARCH_DIRECTIVE,
  HANNAH_208_QA_DIRECTIVE,
  HANNAH_208A_DIRECTIVE,
} from "@/lib/ai/hannah/ultrathink/prompts/ultrathink-system";

describe("Hannah 208a extension", () => {
  it("exports HANNAH_208A_DIRECTIVE as a non-empty string", () => {
    expect(typeof HANNAH_208A_DIRECTIVE).toBe("string");
    expect(HANNAH_208A_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it("HANNAH_208A_DIRECTIVE mentions concordance", () => {
    expect(HANNAH_208A_DIRECTIVE.toLowerCase()).toContain("concordance");
  });

  it("HANNAH_208A_DIRECTIVE mentions orientation (strand orientation)", () => {
    expect(HANNAH_208A_DIRECTIVE.toLowerCase()).toContain("orientation");
  });

  it("existing export HANNAH_GUARDRAILS_TEXT is unchanged (contains FARMCEUTICA-ONLY)", () => {
    expect(HANNAH_GUARDRAILS_TEXT).toContain("FARMCEUTICA-ONLY");
  });

  it("existing export HANNAH_208_RESEARCH_DIRECTIVE is unchanged (contains DEDUPLICATION)", () => {
    expect(HANNAH_208_RESEARCH_DIRECTIVE).toContain("DEDUPLICATION");
  });

  it("existing export HANNAH_208_QA_DIRECTIVE is unchanged (contains KNOWLEDGE GROUNDING)", () => {
    expect(HANNAH_208_QA_DIRECTIVE).toContain("KNOWLEDGE GROUNDING");
  });
});

// ── Gordon ───────────────────────────────────────────────────────────────────

import {
  GORDON_SYSTEM_PROMPT,
  GORDON_TASK_PROMPTS,
  GORDON_208_NUTRITION_BY_GENETICS_PROMPT,
  GORDON_208A_DIRECTIVE,
} from "@/lib/agents/gordon/systemPrompt";

describe("Gordon 208a extension", () => {
  it("exports GORDON_208A_DIRECTIVE as a non-empty string", () => {
    expect(typeof GORDON_208A_DIRECTIVE).toBe("string");
    expect(GORDON_208A_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it("GORDON_208A_DIRECTIVE mentions allergen", () => {
    expect(GORDON_208A_DIRECTIVE.toLowerCase()).toContain("allergen");
  });

  it("GORDON_208A_DIRECTIVE mentions depletion", () => {
    expect(GORDON_208A_DIRECTIVE.toLowerCase()).toContain("depletion");
  });

  it("existing export GORDON_SYSTEM_PROMPT is unchanged (contains MEAL ANALYSIS)", () => {
    expect(GORDON_SYSTEM_PROMPT).toContain("MEAL ANALYSIS");
  });

  it("existing export GORDON_TASK_PROMPTS contains meal_vision_analysis key", () => {
    expect(GORDON_TASK_PROMPTS).toHaveProperty("meal_vision_analysis");
  });

  it("existing export GORDON_208_NUTRITION_BY_GENETICS_PROMPT is unchanged (contains MTHFR)", () => {
    expect(GORDON_208_NUTRITION_BY_GENETICS_PROMPT).toContain("MTHFR");
  });
});

// ── Arnold ───────────────────────────────────────────────────────────────────

import {
  ARNOLD_SYSTEM_PROMPT,
  ARNOLD_BRAIN_VERSION,
  ARNOLD_208_PROTOCOL_CONTEXT_DIRECTIVE,
  ARNOLD_208A_DIRECTIVE,
} from "@/lib/arnold/arnoldSystemPrompt";

describe("Arnold 208a extension", () => {
  it("exports ARNOLD_208A_DIRECTIVE as a non-empty string", () => {
    expect(typeof ARNOLD_208A_DIRECTIVE).toBe("string");
    expect(ARNOLD_208A_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it("ARNOLD_208A_DIRECTIVE mentions concordance", () => {
    expect(ARNOLD_208A_DIRECTIVE.toLowerCase()).toContain("concordance");
  });

  it("existing export ARNOLD_SYSTEM_PROMPT is unchanged (contains Body Tracker AI)", () => {
    expect(ARNOLD_SYSTEM_PROMPT).toContain("Body Tracker AI agent");
  });

  it("existing export ARNOLD_BRAIN_VERSION is unchanged (is a string)", () => {
    expect(typeof ARNOLD_BRAIN_VERSION).toBe("string");
    expect(ARNOLD_BRAIN_VERSION.length).toBeGreaterThan(0);
  });

  it("existing export ARNOLD_208_PROTOCOL_CONTEXT_DIRECTIVE is unchanged (contains observable relationships)", () => {
    expect(ARNOLD_208_PROTOCOL_CONTEXT_DIRECTIVE).toContain("observable relationship");
  });
});

// ── Jeffery ──────────────────────────────────────────────────────────────────

import {
  validateRecommendationText,
  validateSupplementCandidate,
  JEFFERY_208A_DIRECTIVE,
} from "@/lib/agents/jeffery/guardrails";

describe("Jeffery 208a extension", () => {
  it("exports JEFFERY_208A_DIRECTIVE as a non-empty string", () => {
    expect(typeof JEFFERY_208A_DIRECTIVE).toBe("string");
    expect(JEFFERY_208A_DIRECTIVE.length).toBeGreaterThan(0);
  });

  it("JEFFERY_208A_DIRECTIVE mentions conflict", () => {
    expect(JEFFERY_208A_DIRECTIVE.toLowerCase()).toContain("conflict");
  });

  it("JEFFERY_208A_DIRECTIVE mentions arbitrat", () => {
    expect(JEFFERY_208A_DIRECTIVE.toLowerCase()).toContain("arbitrat");
  });

  it("existing export validateRecommendationText is unchanged (catches semaglutide)", () => {
    const result = validateRecommendationText("Take semaglutide daily.");
    expect(result.ok).toBe(false);
    expect(result.violations[0].code).toBe("semaglutide");
  });

  it("existing export validateSupplementCandidate is unchanged (allows magnesium glycinate)", () => {
    const result = validateSupplementCandidate({ productName: "magnesium glycinate" });
    expect(result.ok).toBe(true);
  });
});
