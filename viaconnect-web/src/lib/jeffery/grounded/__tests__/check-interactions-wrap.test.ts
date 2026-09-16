import { afterEach, describe, expect, it } from "vitest";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import { INTERACTIONS_LISTING_EXPLANATION } from "../refuse";
import {
  assembleCheckInteractions,
  emptyCheckInteractionsPayload,
} from "../check-interactions-assemble";
import {
  buildCheckInteractionsInputFromContext,
  checkInteractionsLive,
  extractAskedCandidate,
  mapCheckInteractionsBody,
  nameList,
} from "../check-interactions-wrap";
import { isAllowGenerateHardFalse, protocolItemsFromContext } from "../tool-router";
import type { CheckInteractionsEngineBody } from "../check-interactions-assemble";
import type { GroundedToolContext } from "../types";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const ctx: GroundedToolContext = {
  userId: "user-1",
  role: "consumer",
  requestId: "req-wrap",
};

const SUCCESS_FIXTURE = {
  interactions: [
    {
      medication: "Warfarin",
      interactsWith: "NAD+",
      interactionType: "ai_recommendation",
      severity: "moderate" as const,
      mechanism: "engine mechanism",
      clinicalEffect: "engine effect",
      onsetTiming: "Days to weeks",
      mitigation: "engine mitigation",
      evidenceLevel: "moderate",
      citations: ["FarmCeutica formulation interaction database"],
    },
  ],
  summary: { major: 0, moderate: 1, minor: 0, synergistic: 0 },
  blockedProducts: [] as string[],
};

describe("check_interactions live wrap", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("maps engine payload to CheckInteractionsData verbatim and locks body fields", async () => {
    let captured: CheckInteractionsEngineBody | undefined;
    const result = await checkInteractionsLive(
      {
        stack: ["MTHFR+ (1 capsule daily)"],
        meds: ["Warfarin"],
        herbs: ["Turmeric"],
        candidate: ["NAD+"],
        user_id: "user-1",
      },
      ctx,
      async (body) => {
        captured = body;
        return SUCCESS_FIXTURE;
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(SUCCESS_FIXTURE);
      expect(result.route).toBe("POST /api/ai/check-interactions");
    }
    expect(captured).toEqual({
      userId: "user-1",
      medications: ["Warfarin"],
      supplements: ["MTHFR+", "Turmeric"],
      recommendations: ["NAD+"],
      allergies: [],
    });
    expect(JSON.stringify(captured)).not.toMatch(/\d+\s*(mg|capsule)/i);
  });

  it("treats soft-empty + error as refuse, not no-conflicts", async () => {
    const result = await checkInteractionsLive({ stack: ["MTHFR+"], meds: ["Warfarin"], herbs: [] }, ctx, async () => ({
      ...emptyCheckInteractionsPayload(),
      error: "Interaction check failed",
    }));
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.code).toBe("upstream_5xx");
      expect(result.route).toBe("POST /api/ai/check-interactions");
    }
  });

  it("refuses malformed payloads", async () => {
    const result = await checkInteractionsLive({ stack: [], meds: ["Warfarin"], herbs: [] }, ctx, async () => ({
      interactions: "not-an-array",
    }));
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("malformed_payload");
  });

  it("empty meds early-return is valid success", async () => {
    const result = await assembleCheckInteractions({
      medications: [],
      supplements: ["MTHFR+"],
      recommendations: ["NAD+"],
      allergies: [],
    });
    expect(result.error).toBeUndefined();
    expect(result.interactions).toEqual([]);
    expect(result.summary).toEqual({ major: 0, moderate: 0, minor: 0, synergistic: 0 });
    expect(result.blockedProducts).toEqual([]);
  });

  it("builds stack/meds/candidate from on-file context without inventing doses", () => {
    const builtCtx: GroundedToolContext = {
      ...ctx,
      message: "Can I add NAD+ — does it interact with my stack?",
      advisorContextVariables: {
        medications: "Warfarin, Metformin",
        currentSupplements: "MTHFR+ (1 capsule daily)",
      },
    };
    const input = buildCheckInteractionsInputFromContext(
      undefined,
      builtCtx,
      protocolItemsFromContext(builtCtx)
    );
    expect(input.meds).toEqual(["Warfarin", "Metformin"]);
    expect(input.stack).toEqual(["MTHFR+"]);
    expect(input.candidate).toEqual(["NAD+"]);
    expect(input.stack.join(" ")).not.toMatch(/capsule/i);
    expect(mapCheckInteractionsBody(input).recommendations).toEqual(["NAD+"]);
    expect(nameList(["MTHFR+ (1 capsule daily)", "500 mg"])).toEqual(["MTHFR+"]);
    expect(extractAskedCandidate("safe with my MTHFR+", ["MTHFR+"])).toEqual([]);
  });

  it("flag-off stays legacy even when an interact question would require the tool", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "Does this interact with my warfarin?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off-interact",
    });
    expect(turn.kind).toBe("legacy");
  });

  it("flag-on interactions-only success assembles engine restatement, not tool_refuse", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Does this interact with my warfarin?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-interact-ok",
      checkInteractionsAssemble: async () => SUCCESS_FIXTURE,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.reason).not.toBe("tool_refuse");
    expect(turn.text).toContain(INTERACTIONS_LISTING_EXPLANATION);
    expect(turn.text).toContain("medication: Warfarin");
    expect(turn.text).toContain("interactsWith: NAD+");
    expect(turn.text).toContain("severity: moderate");
    expect(turn.text).toContain("mechanism: engine mechanism");
    expect(turn.text).toContain("clinicalEffect: engine effect");
    expect(turn.text).toContain("mitigation: engine mitigation");
    expect(turn.text).not.toContain(VIA_CURA_DRAFT_BANNER);
    expect(turn.text.toLowerCase()).not.toMatch(
      /safe to take|cleared|approved to combine|no interactions means safe|prescribe|prescribed/
    );
    expect(turn.requiredTools).toEqual(["check_interactions"]);
  });

  it("flag-on protocol + interactions success lists protocol before interactions", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Does this interact with my stack?",
      role: "practitioner",
      userId: "user-1",
      requestId: "req-on-both-ok",
      advisorContextVariables: {
        currentSupplements: "MTHFR+ (1 capsule daily)",
        medications: "Warfarin",
      },
      checkInteractionsAssemble: async () => SUCCESS_FIXTURE,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.requiredTools).toEqual(expect.arrayContaining(["get_protocol", "check_interactions"]));
    expect(turn.requiredTools).not.toContain("lookup_peptide");
    const protocolIdx = turn.text.indexOf("I can only restate what ViaConnect already listed");
    const interactionsIdx = turn.text.indexOf(INTERACTIONS_LISTING_EXPLANATION);
    expect(protocolIdx).toBeGreaterThan(-1);
    expect(interactionsIdx).toBeGreaterThan(protocolIdx);
    expect(turn.text).toContain("MTHFR+");
    expect(turn.text).toContain("Already on your protocol");
    expect(turn.text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(turn.text.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
  });

  it("flag-on soft-empty+error uses existing refuse / FAQ.toolFailed", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Does this interact with my warfarin?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-soft-empty",
      checkInteractionsAssemble: async () => ({
        ...emptyCheckInteractionsPayload(),
        error: "Interaction check failed",
      }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text).toContain(FAQ.toolFailed);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.text).toContain("educational purposes only");
    expect(turn.requiredTools).toContain("check_interactions");
  });

  it("allow_generate stays hard false", () => {
    expect(isAllowGenerateHardFalse()).toBe(true);
  });

  it("flag-on SNP-only still fail-closes because lookup_snp is unwired", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-snp-stub",
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text).toContain(FAQ.toolFailed);
    expect(turn.requiredTools).toContain("lookup_snp");
  });
});
