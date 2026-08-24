/**
 * Prompt 219F: Hannah chat wiring — unit tests (persona, rate limit, markers, UX shapes).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HANNAH_CONSUMER_SUBTITLE,
  HANNAH_CONSUMER_SYSTEM_PROMPT,
  HANNAH_PERSONA_APPROVED_BY,
  HANNAH_PERSONA_VERSION,
  stripEmEnDashes,
} from "../hannah-persona";
import {
  checkAdvisorRateLimit,
  resetAdvisorRateLimitForTests,
  ADVISOR_RATE_LIMIT,
} from "../advisor-rate-limit";
import {
  extractMsgIdMarker,
  formatMsgIdMarker,
} from "../advisor-msg-marker";
import { substituteTemplate } from "../advisor-context-builder";
import { getDisplayName } from "@/lib/getDisplayName";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Prompt 219F Hannah persona (Marshall-gated)", () => {
  it("is approved by marshall with version tag", () => {
    expect(HANNAH_PERSONA_APPROVED_BY).toBe("marshall");
    expect(HANNAH_PERSONA_VERSION).toMatch(/^219f/);
  });

  it("consumer subtitle has no FarmCeutica legal entity", () => {
    expect(HANNAH_CONSUMER_SUBTITLE.toLowerCase()).not.toContain("farmceutica");
    expect(HANNAH_CONSUMER_SUBTITLE).toMatch(/Via Cura/i);
  });

  it("persona enforces hard rules and locked strings", () => {
    const p = HANNAH_CONSUMER_SYSTEM_PROMPT;
    expect(p).toContain("Bio Optimization");
    expect(p).toContain("Maximum Bioavailability");
    expect(p.toLowerCase()).toContain("no diagnosis");
    expect(p.toLowerCase()).toContain("educational layer only");
    expect(p.toLowerCase()).toContain("em dashes");
  });

  it("stripEmEnDashes removes unicode dashes", () => {
    const em = String.fromCharCode(0x2014);
    const en = String.fromCharCode(0x2013);
    const out = stripEmEnDashes(`Hello ${em} world ${en} test`);
    expect(out).not.toContain(em);
    expect(out).not.toContain(en);
  });

  it("substituteTemplate fills placeholders", () => {
    const out = substituteTemplate("Hi {displayName}, score {bioOptScore}", {
      displayName: "Gary",
      bioOptScore: "72",
    });
    expect(out).toBe("Hi Gary, score 72");
  });
});

describe("Prompt 219F rate limit", () => {
  beforeEach(() => {
    resetAdvisorRateLimitForTests();
  });

  it("allows under the cap and blocks over", () => {
    const uid = "user-rate-test";
    for (let i = 0; i < ADVISOR_RATE_LIMIT.maxMessages; i++) {
      const r = checkAdvisorRateLimit(uid);
      expect(r.allowed).toBe(true);
    }
    const blocked = checkAdvisorRateLimit(uid);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("Prompt 219F message id markers", () => {
  it("round-trips marker extract", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const text = `Answer here${formatMsgIdMarker(id)}`;
    const { clean, messageId } = extractMsgIdMarker(text);
    expect(messageId).toBe(id);
    expect(clean).toContain("Answer here");
    expect(clean).not.toContain("HANNAH_MSG_ID");
  });
});

describe("Prompt 219F route and UI wiring (source shape)", () => {
  it("chat route awaits createClient and rate-limits", () => {
    const src = read("src/app/api/advisor/chat/route.ts");
    expect(src).toMatch(/await createServerClient\(\)/);
    expect(src).toMatch(/checkAdvisorRateLimit/);
    expect(src).toMatch(/buildAdvisorContext/);
    expect(src).toMatch(/streamAdvisorResponse/);
  });

  it("history and rate routes exist and await createClient", () => {
    const history = read("src/app/api/advisor/history/route.ts");
    const rate = read("src/app/api/advisor/rate/route.ts");
    expect(history).toMatch(/await createClient\(\)/);
    expect(rate).toMatch(/await createClient\(\)/);
    expect(rate).toMatch(/ultrathink_advisor_ratings/);
  });

  it("AdvisorChat preserves input on error and offers Retry", () => {
    const src = read("src/components/advisor/AdvisorChat.tsx");
    expect(src).toMatch(/setInput\(userMsg\)/);
    expect(src).toMatch(/Retry/);
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/\/api\/advisor\/history/);
    expect(src).toMatch(/extractMsgIdMarker/);
  });

  it("consumer page uses getDisplayName and compliant subtitle", () => {
    const src = read("src/app/(app)/(consumer)/wellness/advisor/page.tsx");
    expect(src).toMatch(/getDisplayName/);
    expect(src).toMatch(/HANNAH_CONSUMER_SUBTITLE/);
    expect(src).not.toMatch(/FarmCeutica Wellness/);
    expect(getDisplayName("hannah")).toBe("Hannah");
  });

  it("context builder soft-falls back and loads digests", () => {
    const src = read("src/lib/jeffery/advisor-context-builder.ts");
    expect(src).toMatch(/promptSource/);
    expect(src).toMatch(/HANNAH_CONSUMER_SYSTEM_PROMPT/);
    expect(src).toMatch(/getGordonDailyDigest|loadConsumerExtras/);
    expect(src).toMatch(/getScheduleView/);
  });

  it("migration seeds consumer persona", () => {
    const sql = read(
      "supabase/migrations/20260815140000_prompt_219f_hannah_advisor_persona.sql"
    );
    expect(sql).toMatch(/ultrathink_advisor_prompts/);
    expect(sql).toMatch(/is_active = true/);
    expect(sql).toMatch(/Bio Optimization/);
    expect(sql).toMatch(/10x to 28x/);
  });
});
