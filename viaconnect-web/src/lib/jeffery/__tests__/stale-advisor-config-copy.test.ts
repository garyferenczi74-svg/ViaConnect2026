/**
 * History-display hygiene: persisted not-configured / supabase-secrets
 * assistant copy must never hydrate as a live Hannah bubble.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STALE_ADVISOR_CONFIG_DISPLAY_ERROR,
  displayAdvisorAssistantMessage,
  hydrateAdvisorHistoryMessages,
  isStaleAdvisorConfigCopy,
  shouldShowSuggestedPrompts,
} from "../stale-advisor-config-copy";

const OLD_SUPABASE_SECRETS_SENTENCE =
  "I'm not configured yet — the ANTHROPIC_API_KEY secret hasn't been set on this Supabase project. Ask an admin to run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` to enable me.";

const CURRENT_STREAMER_FALLBACK =
  "I am temporarily unable to reach the AI provider. Please try again in a moment. If this keeps happening, ask support to confirm the ANTHROPIC_API_KEY is set for this environment.";

const LIVE_HANNAH =
  "Your Bio Optimization Score reflects methylation, sleep, and supplement adherence. Let's start with consistent evening magnesium.";

describe("isStaleAdvisorConfigCopy", () => {
  it("detects the persisted not-configured / supabase secrets sentence", () => {
    expect(isStaleAdvisorConfigCopy(OLD_SUPABASE_SECRETS_SENTENCE)).toBe(true);
  });

  it("detects the current streamer fallback that names ANTHROPIC_API_KEY", () => {
    expect(isStaleAdvisorConfigCopy(CURRENT_STREAMER_FALLBACK)).toBe(true);
    expect(
      isStaleAdvisorConfigCopy(
        `${CURRENT_STREAMER_FALLBACK}\n\n⚕️ This information is for educational purposes only and is not a substitute for professional medical advice.`
      )
    ).toBe(true);
  });

  it("does not flag a real Hannah wellness reply", () => {
    expect(isStaleAdvisorConfigCopy(LIVE_HANNAH)).toBe(false);
    expect(isStaleAdvisorConfigCopy("How is my MTHFR variant affecting energy?")).toBe(
      false
    );
  });
});

describe("hydrateAdvisorHistoryMessages", () => {
  it("never keeps the old supabase-secrets sentence as a live assistant bubble", () => {
    const hydrated = hydrateAdvisorHistoryMessages([
      {
        id: "u1",
        role: "user",
        content: "How can I improve my Bio Optimization Score?",
      },
      { id: "a1", role: "assistant", content: OLD_SUPABASE_SECRETS_SENTENCE },
    ]);

    const liveAssistant = hydrated.filter((m) => m.role === "assistant" && !m.isError);
    const shown = hydrated.map((m) => m.content).join("\n");

    expect(liveAssistant).toHaveLength(0);
    expect(shown).not.toContain("I'm not configured yet");
    expect(shown).not.toContain("supabase secrets set");
    expect(shown).not.toContain("ANTHROPIC_API_KEY");
    expect(hydrated[1]).toMatchObject({
      role: "assistant",
      content: STALE_ADVISOR_CONFIG_DISPLAY_ERROR,
      isError: true,
      retryText: "How can I improve my Bio Optimization Score?",
    });
    expect(shouldShowSuggestedPrompts(hydrated)).toBe(false);
  });

  it("does not treat a 3-row history ending on a user turn as a live Hannah answer", () => {
    const hydrated = hydrateAdvisorHistoryMessages([
      { id: "1", role: "user", content: "Hi Hannah" },
      { id: "2", role: "assistant", content: OLD_SUPABASE_SECRETS_SENTENCE },
      { id: "3", role: "user", content: "Are you there?" },
    ]);
    expect(hydrated).toHaveLength(3);
    expect(hydrated.some((m) => m.content.includes("supabase secrets set"))).toBe(false);
    expect(hydrated.some((m) => m.content.includes("I'm not configured yet"))).toBe(false);
    expect(shouldShowSuggestedPrompts(hydrated)).toBe(false);
    expect(hydrated[1]?.retryText).toBe("Hi Hannah");
  });

  it("leaves a later live Hannah reply as a normal bubble", () => {
    const hydrated = hydrateAdvisorHistoryMessages([
      { id: "u1", role: "user", content: "Hello" },
      { id: "a1", role: "assistant", content: OLD_SUPABASE_SECRETS_SENTENCE },
      { id: "u2", role: "user", content: "What does my MTHFR result mean?" },
      { id: "a2", role: "assistant", content: LIVE_HANNAH },
    ]);

    expect(hydrated[1]?.isError).toBe(true);
    expect(hydrated[3]).toMatchObject({
      role: "assistant",
      content: LIVE_HANNAH,
    });
    expect(hydrated[3]?.isError).toBeUndefined();
    expect(shouldShowSuggestedPrompts(hydrated)).toBe(true);
  });

  it("rewrites a live stream fallback into the same honest error", () => {
    const displayed = displayAdvisorAssistantMessage(CURRENT_STREAMER_FALLBACK, {
      id: "a-live",
      retryText: "Should I take my supplements with food?",
    });
    expect(displayed.isError).toBe(true);
    expect(displayed.content).toBe(STALE_ADVISOR_CONFIG_DISPLAY_ERROR);
    expect(displayed.content).not.toContain("ANTHROPIC_API_KEY");
    expect(displayed.retryText).toBe("Should I take my supplements with food?");
  });
});

describe("AdvisorChat still posts a new send", () => {
  it("hydrates history through the helper and still POSTs /api/advisor/chat", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/advisor/AdvisorChat.tsx"),
      "utf8"
    );
    expect(src).toMatch(/hydrateAdvisorHistoryMessages/);
    expect(src).toMatch(/displayAdvisorAssistantMessage/);
    expect(src).toMatch(/fetch\("\/api\/advisor\/chat"/);
    expect(src).toMatch(/method:\s*"POST"/);
    expect(src).toMatch(/Retry/);
    expect(src).not.toMatch(/I'm not configured yet/);
    expect(src).not.toMatch(/supabase secrets set/);
  });
});
