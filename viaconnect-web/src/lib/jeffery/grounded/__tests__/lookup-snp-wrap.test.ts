import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import { SNP_LISTING_EXPLANATION, INTERACTIONS_LISTING_EXPLANATION } from "../refuse";
import {
  extractLookupSnpAsk,
  honestGenotype,
  isBannedDemoGenotypeRow,
  isGenexmTarget,
  isNutrigenLiveTarget,
  lookupSnpLive,
  matchMemberSnpRow,
  restatedPanelKey,
  shouldConsultNutrigenDx,
  storedEducationalSummary,
} from "../lookup-snp-wrap";
import { isAllowGenerateHardFalse } from "../tool-router";
import type { LookupSnpEnginePayload, LookupSnpHubRow } from "../lookup-snp-assemble";
import type { GroundedToolContext } from "../types";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const ctx: GroundedToolContext = {
  userId: "user-1",
  role: "consumer",
  requestId: "req-snp",
  message: "What does rs1801133 mean on my genetic card?",
};

function row(partial: Partial<LookupSnpHubRow> & Pick<LookupSnpHubRow, "rsid">): LookupSnpHubRow {
  return {
    gene: null,
    genotype: null,
    panel_key: "methylation",
    stored_panel_key: "genex_m",
    status: null,
    clinical_significance: null,
    is_sample: false,
    chip: "genexm",
    ...partial,
  };
}

function okPayload(variants: LookupSnpHubRow[], extra: Partial<LookupSnpEnginePayload> = {}): LookupSnpEnginePayload {
  return {
    loadStatus: "ok",
    variants,
    snpCountsUnknown: false,
    demoAccount: false,
    nutrigenAttempted: false,
    nutrigenFailed: false,
    ...extra,
  };
}

const MTHFR_OK = okPayload([
  row({
    rsid: "rs1801133",
    gene: "MTHFR",
    genotype: "CT",
    panel_key: "methylation",
    stored_panel_key: "genex_m",
    clinical_significance: "Stored MTHFR C677T note on file.",
  }),
]);

describe("lookup_snp live wrap", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("success maps hub row to LookupSnpData without inventing genotype", async () => {
    let consultNutrigen: boolean | undefined;
    const result = await lookupSnpLive(
      { rsid: "rs1801133", user_id: "user-1" },
      ctx,
      async (input) => {
        consultNutrigen = input.consultNutrigen;
        return MTHFR_OK;
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rsid).toBe("rs1801133");
      expect(result.data.gene).toBe("MTHFR");
      expect(result.data.genotype).toBe("CT");
      expect(result.data.panel_key).toBe("genex_m");
      expect(result.data.educational_summary).toBe("Stored MTHFR C677T note on file.");
      expect(result.route).toBe("GET /api/genetics/variants");
    }
    expect(consultNutrigen).toBe(false);
  });

  it("restates UNKNOWN / null / pending verbatim and never rewrites to alleles, 0, normal, negative, or clear", async () => {
    const unknown = await lookupSnpLive(
      { rsid: "rs1799853", gene: "CYP2C9" },
      { ...ctx, message: "What is my CYP2C9 rs1799853 genotype?" },
      async () =>
        okPayload([
          row({
            rsid: "rs1799853",
            gene: "CYP2C9",
            genotype: "UNKNOWN",
            status: "pending",
            stored_panel_key: "GENEX-M",
          }),
        ])
    );
    expect(unknown.ok).toBe(true);
    if (unknown.ok) {
      expect(unknown.data.genotype).toBe("UNKNOWN");
      expect(unknown.data.status).toBe("pending");
      expect(unknown.data.genotype).not.toBe("0");
      expect(unknown.data.genotype).not.toMatch(/normal|negative|clear/i);
    }

    const pendingNull = await lookupSnpLive(
      { rsid: "rs429358" },
      { ...ctx, message: "APOE rs429358" },
      async () =>
        okPayload([
          row({
            rsid: "rs429358",
            gene: "APOE",
            genotype: null,
            status: "pending",
          }),
        ])
    );
    expect(pendingNull.ok).toBe(true);
    if (pendingNull.ok) {
      expect(pendingNull.data.genotype).toBeNull();
    }

    expect(honestGenotype("UNKNOWN")).toBe("UNKNOWN");
    expect(honestGenotype("pending")).toBe("pending");
    expect(honestGenotype(null)).toBeNull();
    expect(honestGenotype("")).toBeNull();
    expect(honestGenotype("  CT  ")).toBe("CT");
  });

  it("filters is_sample / Demo Client 4634 / demo@ as not on file", async () => {
    const sampleOnly = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () =>
      okPayload([
        row({
          rsid: "rs1801133",
          gene: "MTHFR",
          genotype: "TT",
          is_sample: true,
          chip: "demo",
        }),
      ])
    );
    expect(sampleOnly.ok).toBe(false);
    if (sampleOnly.ok === false) expect(sampleOnly.code).toBe("not_found");

    const demoAccount = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () =>
      okPayload(
        [
          row({
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "CT",
            is_sample: false,
          }),
        ],
        { demoAccount: true }
      )
    );
    expect(demoAccount.ok).toBe(false);
    if (demoAccount.ok === false) expect(demoAccount.code).toBe("not_found");

    expect(isBannedDemoGenotypeRow({ is_sample: true, chip: "genexm" })).toBe(true);
    expect(isBannedDemoGenotypeRow({ is_sample: false, chip: "demo" })).toBe(true);
    expect(isBannedDemoGenotypeRow({ is_sample: false, chip: "genexm" })).toBe(false);
  });

  it("panel-split: MTHFR / APOE resolve via genex_m only; FTO / VDR / ACTN3 via nutrigen aliases", async () => {
    expect(isGenexmTarget("rs1801133", "MTHFR")).toBe(true);
    expect(isGenexmTarget("rs1801131", "MTHFR")).toBe(true);
    expect(isGenexmTarget("rs429358", "APOE")).toBe(true);
    expect(isGenexmTarget("rs7412", "APOE")).toBe(true);
    expect(isNutrigenLiveTarget("rs1801133", "MTHFR")).toBe(false);
    expect(shouldConsultNutrigenDx({ rsid: "rs1801133", gene: "MTHFR" })).toBe(false);

    expect(isNutrigenLiveTarget("rs9939609", "FTO")).toBe(true);
    expect(isNutrigenLiveTarget("rs1544410", "VDR")).toBe(true);
    expect(isNutrigenLiveTarget("rs1815739", "ACTN3")).toBe(true);
    expect(isGenexmTarget("rs9939609", "FTO")).toBe(false);
    expect(shouldConsultNutrigenDx({ rsid: "rs9939609", gene: "FTO" })).toBe(true);

    expect(restatedPanelKey("methylation")).toBe("genex_m");
    expect(restatedPanelKey("reference")).toBe("genex_m");
    expect(restatedPanelKey("nutrition")).toBe("nutrigen_dx");
    expect(restatedPanelKey("hormone")).toBeNull();
    expect(restatedPanelKey("epigenetic")).toBeNull();

    const mixed: LookupSnpHubRow[] = [
      row({
        rsid: "rs1801133",
        gene: "MTHFR",
        genotype: "CT",
        panel_key: "nutrition",
        stored_panel_key: "nutrigen_dx",
      }),
      row({
        rsid: "rs1801133",
        gene: "MTHFR",
        genotype: "TT",
        panel_key: "methylation",
        stored_panel_key: "genex_m",
      }),
    ];
    const mthfr = matchMemberSnpRow(mixed, { rsid: "rs1801133", gene: "MTHFR" });
    expect(mthfr?.panel_key).toBe("methylation");
    expect(mthfr?.genotype).toBe("TT");

    let ftoConsult: boolean | undefined;
    const fto = await lookupSnpLive(
      { rsid: "rs9939609", gene: "FTO" },
      { ...ctx, message: "What is my FTO rs9939609 NutrigenDX result?" },
      async (input) => {
        ftoConsult = input.consultNutrigen;
        return okPayload(
          [
            row({
              rsid: "rs9939609",
              gene: "FTO",
              genotype: "AA",
              panel_key: "nutrition",
              stored_panel_key: "nutrigen_dx",
              clinical_significance: "Stored FTO appetite note.",
            }),
          ],
          { nutrigenAttempted: true, nutrigenFailed: false }
        );
      }
    );
    expect(ftoConsult).toBe(true);
    expect(fto.ok).toBe(true);
    if (fto.ok) {
      expect(fto.data.panel_key).toBe("nutrigen_dx");
      expect(fto.data.genotype).toBe("AA");
    }

    const fadsMismatch = await lookupSnpLive(
      { rsid: "rs174537" },
      { ...ctx, message: "What about FADS1 rs174537?" },
      async () =>
        okPayload([
          row({
            rsid: "rs174548",
            gene: "FADS1",
            genotype: "GG",
            panel_key: "nutrition",
            stored_panel_key: "nutrigen_dx",
          }),
        ])
    );
    expect(fadsMismatch.ok).toBe(false);
    if (fadsMismatch.ok === false) expect(fadsMismatch.code).toBe("not_found");
  });

  it("does not use NutrigenDX fallback filler as educational_summary", () => {
    expect(
      storedEducationalSummary(
        "FTO NutrigenDX result. Educational genotype context is not available for this call yet."
      )
    ).toBe("");
    expect(storedEducationalSummary("Stored FTO appetite note.")).toBe("Stored FTO appetite note.");
    expect(storedEducationalSummary(null)).toBe("");
  });

  it("fail / unauthorized / nutrigen soft-empty refuse instead of inventing empty genotype", async () => {
    const unauthorized = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () => ({
      loadStatus: "unauthorized",
      variants: [],
    }));
    expect(unauthorized.ok).toBe(false);
    if (unauthorized.ok === false) expect(unauthorized.code).toBe("unauthorized");

    const hubError = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () => ({
      loadStatus: "error",
      variants: [],
      error: "hub load failed",
    }));
    expect(hubError.ok).toBe(false);
    if (hubError.ok === false) expect(hubError.code).toBe("upstream_5xx");

    const nutrigenFailNoMatch = await lookupSnpLive(
      { rsid: "rs9939609", gene: "FTO" },
      { ...ctx, message: "FTO rs9939609" },
      async () =>
        okPayload([], {
          nutrigenAttempted: true,
          nutrigenFailed: true,
        })
    );
    expect(nutrigenFailNoMatch.ok).toBe(false);
    if (nutrigenFailNoMatch.ok === false) expect(nutrigenFailNoMatch.code).toBe("upstream_5xx");

    const unknownCounts = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () =>
      okPayload([], { snpCountsUnknown: true })
    );
    expect(unknownCounts.ok).toBe(false);
    if (unknownCounts.ok === false) expect(unknownCounts.code).toBe("upstream_5xx");

    const notOnFile = await lookupSnpLive({ rsid: "rs1801133" }, ctx, async () => okPayload([]));
    expect(notOnFile.ok).toBe(false);
    if (notOnFile.ok === false) expect(notOnFile.code).toBe("not_found");
  });

  it("flag-off stays legacy even when a genotype question would require the tool", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off-snp",
    });
    expect(turn.kind).toBe("legacy");
  });

  it("flag-on SNP success assembles Lex frame restatement, not tool_refuse", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-snp-ok",
      lookupSnpAssemble: async () => MTHFR_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.reason).not.toBe("tool_refuse");
    expect(turn.text).toContain(SNP_LISTING_EXPLANATION);
    expect(SNP_LISTING_EXPLANATION).toBe(
      "Here is what ViaConnect has on file for that genetic result."
    );
    expect(turn.text).toContain("rsid: rs1801133");
    expect(turn.text).toContain("gene: MTHFR");
    expect(turn.text).toContain("genotype: CT");
    expect(turn.text).toContain("panel_key: genex_m");
    expect(turn.text).toContain("educational_summary: Stored MTHFR C677T note on file.");
    expect(turn.text).not.toContain(VIA_CURA_DRAFT_BANNER);
    expect(turn.text.toLowerCase()).not.toMatch(
      /diagnos|you have [a-z]+ disease|safe to take|prescribe|prescribed|normal|negative|clear/
    );
    expect(turn.requiredTools).toEqual(["lookup_snp"]);
  });

  it("flag-on UNKNOWN genotype restates UNKNOWN and uses FAQ.genotypeMissing when not on file", async () => {
    process.env[FLAG] = "true";
    const unknownTurn = await resolveGroundedChatTurn({
      message: "What is my CYP2C9 rs1799853 genotype?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-snp-unknown",
      lookupSnpAssemble: async () =>
        okPayload([
          row({
            rsid: "rs1799853",
            gene: "CYP2C9",
            genotype: "UNKNOWN",
            status: "pending",
          }),
        ]),
    });
    expect(unknownTurn.kind).toBe("static");
    if (unknownTurn.kind === "static") {
      expect(unknownTurn.reason).toBe("assembled_from_tools");
      expect(unknownTurn.text).toContain("genotype: UNKNOWN");
      expect(unknownTurn.text).not.toMatch(/\b0\b/);
      expect(unknownTurn.text.toLowerCase()).not.toMatch(/\b(normal|negative|clear)\b/);
    }

    const missingTurn = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-snp-missing",
      lookupSnpAssemble: async () => okPayload([]),
    });
    expect(missingTurn.kind).toBe("static");
    if (missingTurn.kind === "static") {
      expect(missingTurn.reason).toBe("tool_refuse");
      expect(missingTurn.text).toContain(FAQ.genotypeMissing);
      expect(missingTurn.text).not.toContain(FAQ.newDose);
    }
  });

  it("flag-on fail uses existing refuse / FAQ.toolFailed", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-snp-fail",
      lookupSnpAssemble: async () => ({
        loadStatus: "error",
        variants: [],
        error: "hub load failed",
      }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text).toContain(FAQ.toolFailed);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.requiredTools).toContain("lookup_snp");
  });

  it("flag-on protocol + interactions + snp success lists protocol then interactions then snp", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Does rs1801133 on my genetic card interact with my stack?",
      role: "practitioner",
      userId: "user-1",
      requestId: "req-on-all-three",
      advisorContextVariables: {
        currentSupplements: "MTHFR+ (1 capsule daily)",
        medications: "Warfarin",
      },
      checkInteractionsAssemble: async () => ({
        interactions: [
          {
            medication: "Warfarin",
            interactsWith: "NAD+",
            interactionType: "ai_recommendation",
            severity: "moderate",
            mechanism: "engine mechanism",
            clinicalEffect: "engine effect",
            mitigation: "engine mitigation",
            evidenceLevel: "moderate",
            citations: [],
          },
        ],
        summary: { major: 0, moderate: 1, minor: 0, synergistic: 0 },
        blockedProducts: [],
      }),
      lookupSnpAssemble: async () => MTHFR_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.requiredTools).toEqual(
      expect.arrayContaining(["get_protocol", "check_interactions", "lookup_snp"])
    );
    const protocolIdx = turn.text.indexOf("I can only restate what ViaConnect already listed");
    const interactionsIdx = turn.text.indexOf(INTERACTIONS_LISTING_EXPLANATION);
    const snpIdx = turn.text.indexOf(SNP_LISTING_EXPLANATION);
    expect(protocolIdx).toBeGreaterThan(-1);
    expect(interactionsIdx).toBeGreaterThan(protocolIdx);
    expect(snpIdx).toBeGreaterThan(interactionsIdx);
    expect(turn.text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(turn.text.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
  });

  it("allow_generate stays hard false", () => {
    expect(isAllowGenerateHardFalse()).toBe(true);
  });

  it("extracts rsid / gene from the user turn without inventing alleles", () => {
    expect(extractLookupSnpAsk(undefined, "What does rs1801133 mean on my genetic card?")).toEqual({
      rsid: "rs1801133",
      gene: undefined,
      user_id: undefined,
    });
    expect(extractLookupSnpAsk(undefined, "What is my MTHFR genotype?")).toEqual({
      rsid: "",
      gene: "MTHFR",
      user_id: undefined,
    });
  });
});

describe("lookup_snp assemble source locks", () => {
  const assembleSrc = readFileSync(
    join(process.cwd(), "src/lib/jeffery/grounded/lookup-snp-assemble.ts"),
    "utf8"
  );
  const wrapSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/lookup-snp-wrap.ts"), "utf8");

  it("names the shared genetics helpers and does not HTTP-loopback the live GETs", () => {
    expect(assembleSrc).toContain("loadHubVariants");
    expect(assembleSrc).toContain("unauthorizedHubPayload");
    expect(assembleSrc).toContain("errorHubPayload");
    expect(assembleSrc).toContain("normalizeObservedPanelKey");
    expect(assembleSrc).toContain("panelKeyAliasesFor");
    expect(assembleSrc).toContain("buildNutrigenDxCrossRefPayload");
    expect(assembleSrc).toContain('panelKeyAliasesFor("nutrition")');
    expect(assembleSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\/genetics\/variants/);
    expect(assembleSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\/nutrition\/genetics\/nutrigendx/);
    expect(wrapSrc).toContain("isMthfrFolateTarget");
    expect(wrapSrc).toContain("normalizeObservedPanelKey");
  });
});
