import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isLlmGroundedChatEnabled, LLM_GROUNDED_CHAT_FLAG } from "../flag";
import { maybeGroundedStaticStream, resolveGroundedChatTurn } from "../chat-stub";
import { inferRequiredTools } from "../intent";
import {
  getProtocolFromContext,
  isAllowGenerateHardFalse,
  getEducationStub,
  lookupPeptideStub,
  lookupSnpLive,
  checkInteractionsLive,
} from "../tool-router";
import { retrieveGroundedChunks } from "../retriever";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

function readRoute(): string {
  return readFileSync(join(process.cwd(), "src/app/api/advisor/chat/route.ts"), "utf8");
}

describe("LLM_GROUNDED_CHAT_ENABLED flag", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("defaults OFF / false so today's stream is unchanged", () => {
    delete process.env[FLAG];
    expect(isLlmGroundedChatEnabled()).toBe(false);
    process.env[FLAG] = "false";
    expect(isLlmGroundedChatEnabled()).toBe(false);
    process.env[FLAG] = "banana";
    expect(isLlmGroundedChatEnabled()).toBe(false);
  });

  it("enables only for explicit truthy tokens", () => {
    process.env[FLAG] = "true";
    expect(isLlmGroundedChatEnabled()).toBe(true);
    process.env[FLAG] = "1";
    expect(isLlmGroundedChatEnabled()).toBe(true);
  });
});

describe("flag-off leaves stream path", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("chat route still auth-gates, rate-limits, builds Jeffery context, streams, then Marshall-scans", () => {
    const src = readRoute();
    expect(src).toMatch(/await createServerClient\(\)/);
    expect(src).toMatch(/checkAdvisorRateLimit/);
    expect(src).toMatch(/buildAdvisorContext/);
    expect(src).toMatch(/streamAdvisorResponse/);
    expect(src).toMatch(/scanAiOutput/);
    expect(src).toMatch(/maybeGroundedStaticStream/);
    expect(src).toMatch(/\?\? streamAdvisorResponse/);
    expect(src.indexOf("buildAdvisorContext")).toBeLessThan(src.indexOf("maybeGroundedStaticStream"));
    expect(src.indexOf("streamAdvisorResponse")).toBeLessThan(src.lastIndexOf("scanAiOutput"));
    expect(src).not.toMatch(/\/api\/ai\/generate-protocol/);
    expect(src).not.toMatch(/formavision/i);
  });

  it("resolveGroundedChatTurn is legacy when the flag is off", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "Why is MTHFR+ on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off",
    });
    expect(turn.kind).toBe("legacy");
    expect(turn).not.toHaveProperty("text");
    const hooked = await maybeGroundedStaticStream({
      message: "Why is MTHFR+ on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off-hook",
    });
    expect(hooked).toBeNull();
  });

  it("flag-on required-tool miss refuses instead of inventing", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Is this peptide stack safe with my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on",
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.text.toLowerCase()).toMatch(/already listed|on your protocol/);
    expect(turn.requiredTools).toContain("lookup_peptide");
    expect(turn.requiredTools).toContain("check_interactions");
  });

  it("flag-on greeting with no required tool stays on the stream path", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Good morning, how should I think about sleep tonight?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-hello",
    });
    expect(turn.kind).toBe("legacy");
  });
});

describe("tool router stub locks", () => {
  it("hard-disables allow_generate and reads stored / context protocol only", () => {
    expect(isAllowGenerateHardFalse()).toBe(true);
    const missing = getProtocolFromContext(
      { user_id: "user-1", allow_generate: true },
      {
        userId: "user-1",
        role: "consumer",
        requestId: "r1",
      }
    );
    expect(missing.ok).toBe(false);
    if (missing.ok === false) expect(missing.code).toBe("not_found");

    const fromContext = getProtocolFromContext(
      { user_id: "user-1", allow_generate: true },
      {
        userId: "user-1",
        role: "consumer",
        requestId: "r2",
        advisorContextVariables: {
          currentSupplements: "MTHFR+ (1 capsule daily)",
        },
      }
    );
    expect(fromContext.ok).toBe(true);
    if (fromContext.ok) {
      expect(fromContext.data.items[0]?.productName).toBe("MTHFR+");
      expect(fromContext.data.items[0]?.dosage).toBe("1 capsule daily");
    }
  });

  it("education stays not_implemented; peptide stub remains refuse-closed", async () => {
    const emptyMeds = await checkInteractionsLive(
      { stack: [], meds: [], herbs: [] },
      { userId: "user-1", role: "consumer", requestId: "r-empty-meds" }
    );
    expect(emptyMeds.ok).toBe(true);
    if (emptyMeds.ok) {
      expect(emptyMeds.data.interactions).toEqual([]);
      expect(emptyMeds.data.blockedProducts).toEqual([]);
    }
    const snpMissing = await lookupSnpLive(
      { rsid: "rs1801133" },
      { userId: "user-1", role: "consumer", requestId: "r-snp" },
      async () => ({ loadStatus: "ok", variants: [] })
    );
    expect(snpMissing.ok).toBe(false);
    expect(lookupPeptideStub({ name: "retatrutide" }).ok).toBe(false);
    expect(getEducationStub({ topic_id: "edu-retatrutide" }).ok).toBe(false);
  });

  it("retriever stub returns empty chunks", async () => {
    const result = await retrieveGroundedChunks({
      message: "MTHFR+",
      role: "consumer",
      userId: "user-1",
    });
    expect(result.chunks).toEqual([]);
  });

  it("infers peptide + stack as UC-C3 required tools", () => {
    const tools = inferRequiredTools("Is this peptide stack safe with my protocol?");
    expect(tools).toEqual(
      expect.arrayContaining(["lookup_peptide", "get_protocol", "check_interactions"])
    );
  });
});
