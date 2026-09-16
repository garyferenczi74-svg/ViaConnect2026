import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import {
  INTERACTIONS_LISTING_EXPLANATION,
  PEPTIDE_LISTING_EXPLANATION,
  SNP_LISTING_EXPLANATION,
  detectSafetyRefuse,
} from "../refuse";
import {
  dropPractitionerDepthEducation,
  extractLookupPeptideAsk,
  isBlockedGlp1Ask,
  isExcludedGlp1GeneAsk,
  isRetatrutideOralOrStackInvent,
  listedNamesOnly,
  lookupPeptideLive,
} from "../lookup-peptide-wrap";
import { hasPeptideDeliveryOptions } from "../strip-peptide-delivery";
import { isAllowGenerateHardFalse, lookupPeptideSuccessFixture } from "../tool-router";
import type { LookupPeptideEnginePayload, LookupPeptideSearchRow } from "../lookup-peptide-assemble";
import type { GroundedToolContext } from "../types";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const ctx: GroundedToolContext = {
  userId: "user-1",
  role: "consumer",
  requestId: "req-peptide",
  message: "What does ViaConnect have on file for retatrutide peptide education?",
};

function searchRow(
  partial: Partial<LookupPeptideSearchRow> & Pick<LookupPeptideSearchRow, "peptide_id" | "product_name">
): LookupPeptideSearchRow {
  return {
    category_name: "incretin",
    evidence_level: "educational",
    genex_panel: null,
    match_score: 1,
    ...partial,
  };
}

function okPayload(
  extra: Partial<LookupPeptideEnginePayload> = {}
): LookupPeptideEnginePayload {
  return {
    loadStatus: "ok",
    searchVerified: true,
    searchFailed: false,
    results: [],
    education: null,
    listedNames: [],
    ...extra,
  };
}

const RETA_EDU = {
  entryKey: "edu-retatrutide",
  title: "Retatrutide",
  isPeptide: true,
  mechanism: "Incretin-class educational note on file.",
  evidenceGrade: "C",
} as const;

const RETA_OK = okPayload({
  results: [
    searchRow({
      peptide_id: "pep-reta",
      product_name: "Retatrutide",
      deliveryOptions: [{ delivery_form: "injectable", dose_amount: 2, dose_unit: "mg" }],
    }),
  ],
  education: RETA_EDU,
});

describe("lookup_peptide live wrap", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("success maps catalog + mechanism and strips nested Retatrutide delivery mcg/mg", async () => {
    const result = await lookupPeptideLive(
      { name: "Retatrutide", slug: "retatrutide" },
      ctx,
      async () =>
        okPayload({
          results: [
            searchRow({
              peptide_id: "pep-reta",
              product_name: "Retatrutide",
              deliveryOptions: [
                { delivery_form: "injectable", dose_amount: 4, dose_unit: "mg" },
                { route: "injectable", mcg: 2000 },
              ],
            }),
          ],
          education: RETA_EDU,
        })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.educational_only).toBe(true);
      expect(result.data.name).toBe("Retatrutide");
      expect(result.data.slug).toBe("retatrutide");
      expect(result.data.summary).toBe("Incretin-class educational note on file.");
      expect(result.data.entry_key).toBe("edu-retatrutide");
      expect(result.data.is_peptide).toBe(true);
      expect("deliveryOptions_raw" in result.data).toBe(false);
      expect("deliveryOptions" in result.data).toBe(false);
      expect(hasPeptideDeliveryOptions(result.data)).toBe(false);
      expect(JSON.stringify(result.data)).not.toMatch(/mcg|dose_amount|2 mg/i);
      expect(result.route).toBe("GET /api/peptides/search");
    }

    const fixture = lookupPeptideSuccessFixture({
      name: "Retatrutide",
      slug: "retatrutide",
      educational_only: true,
      summary: "Incretin-class educational note on file.",
      pathway_tags: [],
      deliveryOptions_raw: [{ route: "injectable", mcg: 2000 }],
    });
    expect(fixture.ok).toBe(true);
    if (fixture.ok) {
      expect(hasPeptideDeliveryOptions(fixture.data)).toBe(false);
    }
  });

  it("prefers live mechanism and does not invent a summary from registry-only search", async () => {
    const withMechanism = await lookupPeptideLive(
      { name: "Retatrutide" },
      ctx,
      async () => RETA_OK
    );
    expect(withMechanism.ok).toBe(true);
    if (withMechanism.ok) {
      expect(withMechanism.data.summary).toBe("Incretin-class educational note on file.");
    }

    const registryOnly = await lookupPeptideLive(
      { name: "Retatrutide" },
      ctx,
      async () =>
        okPayload({
          results: [
            searchRow({
              peptide_id: "pep-reta",
              product_name: "Retatrutide",
            }),
          ],
          education: null,
        })
    );
    expect(registryOnly.ok).toBe(true);
    if (registryOnly.ok) {
      expect(registryOnly.data.summary).toBe("");
      expect(registryOnly.data.educational_only).toBe(true);
    }
  });

  it("soft-empty RPC is not a verified catalog miss; verified empty is not_found", async () => {
    const softEmpty = await lookupPeptideLive({ name: "Retatrutide" }, ctx, async () => ({
      loadStatus: "error",
      searchVerified: false,
      searchFailed: true,
      results: [],
      education: null,
      listedNames: [],
      error: "search_peptides rpc error",
    }));
    expect(softEmpty.ok).toBe(false);
    if (softEmpty.ok === false) expect(softEmpty.code).toBe("upstream_5xx");

    const timeoutEmpty = await lookupPeptideLive({ name: "Retatrutide" }, ctx, async () => ({
      loadStatus: "ok",
      searchVerified: false,
      searchFailed: true,
      results: [],
      education: null,
      listedNames: [],
      error: "timeout",
    }));
    expect(timeoutEmpty.ok).toBe(false);
    if (timeoutEmpty.ok === false) expect(timeoutEmpty.code).toBe("upstream_5xx");

    const verifiedMiss = await lookupPeptideLive({ name: "Retatrutide" }, ctx, async () =>
      okPayload({ searchVerified: true, results: [], education: null })
    );
    expect(verifiedMiss.ok).toBe(false);
    if (verifiedMiss.ok === false) expect(verifiedMiss.code).toBe("not_found");
  });

  it("refuses Retatrutide oral / stack invent and never coaches those in the wrap", async () => {
    expect(isRetatrutideOralOrStackInvent("Can I take oral retatrutide?", "Retatrutide")).toBe(
      true
    );
    expect(
      isRetatrutideOralOrStackInvent("What is a retatrutide stacking schedule?", "Retatrutide")
    ).toBe(true);
    expect(
      isRetatrutideOralOrStackInvent("Does retatrutide interact with my stack?", "Retatrutide")
    ).toBe(false);

    const oral = await lookupPeptideLive(
      { name: "Retatrutide" },
      { ...ctx, message: "Can I take oral retatrutide instead of injectable?" },
      async () => RETA_OK
    );
    expect(oral.ok).toBe(false);
    if (oral.ok === false) expect(oral.code).toBe("refuse_required");

    const stackInvent = await lookupPeptideLive(
      { name: "Retatrutide" },
      { ...ctx, message: "Give me a retatrutide stacking schedule with BPC-157" },
      async () => RETA_OK
    );
    expect(stackInvent.ok).toBe(false);
    if (stackInvent.ok === false) expect(stackInvent.code).toBe("refuse_required");
  });

  it("refuses Semaglutide / excluded GLP-1 and GCG/GLP1R gene education", async () => {
    expect(isBlockedGlp1Ask("Semaglutide", "Should I take semaglutide?")).toBe(true);
    expect(isExcludedGlp1GeneAsk("Explain my GCG and GLP1R genes")).toBe(true);

    const sema = await lookupPeptideLive(
      { name: "Semaglutide" },
      { ...ctx, message: "Should I take semaglutide?" },
      async () => RETA_OK
    );
    expect(sema.ok).toBe(false);
    if (sema.ok === false) expect(sema.code).toBe("refuse_required");

    const gene = await lookupPeptideLive(
      { name: "Retatrutide" },
      { ...ctx, message: "Does GLP1R gene change retatrutide?" },
      async () => RETA_OK
    );
    expect(gene.ok).toBe(false);
    if (gene.ok === false) expect(gene.code).toBe("refuse_required");
  });

  it("does not teach non-peptide edu keys as peptides", async () => {
    const amino = await lookupPeptideLive(
      { name: "5-Amino-1MQ", slug: "5-amino-1mq" },
      { ...ctx, message: "What is 5-amino-1mq peptide education?" },
      async () =>
        okPayload({
          searchVerified: true,
          results: [],
          education: {
            entryKey: "edu-5-amino-1mq-nonpeptide",
            title: "5-Amino-1MQ",
            isPeptide: false,
            mechanism: "Non-peptide educational card on file.",
            evidenceGrade: "D",
          },
        })
    );
    expect(amino.ok).toBe(true);
    if (amino.ok) {
      expect(amino.data.is_peptide).toBe(false);
      expect(amino.data.pathway_tags).toContain("non-peptide");
      expect(amino.data.entry_key).toBe("edu-5-amino-1mq-nonpeptide");
    }

    const tesofensine = await lookupPeptideLive(
      { name: "Tesofensine", slug: "tesofensine" },
      { ...ctx, message: "Tesofensine peptide education" },
      async () =>
        okPayload({
          searchVerified: true,
          results: [],
          education: {
            entryKey: "edu-tesofensine-pause",
            title: "Tesofensine",
            isPeptide: false,
            mechanism: "Non-peptide pause card on file.",
            evidenceGrade: "D",
          },
        })
    );
    expect(tesofensine.ok).toBe(true);
    if (tesofensine.ok) {
      expect(tesofensine.data.is_peptide).toBe(false);
      expect(tesofensine.data.pathway_tags).toContain("non-peptide");
    }
  });

  it("keeps practitioner-depth frameworks off the consumer path", async () => {
    expect(
      dropPractitionerDepthEducation({
        entryKey: "depth-bpc157-framework",
        title: "BPC-157 depth",
        isPeptide: true,
        mechanism: "Practitioner-only framework.",
        evidenceGrade: "C",
      })
    ).toBeNull();
    expect(
      dropPractitionerDepthEducation({
        entryKey: "depth-ss31-framework",
        title: "SS-31 depth",
        isPeptide: true,
        mechanism: "Practitioner-only framework.",
        evidenceGrade: "C",
      })
    ).toBeNull();

    const depthOnly = await lookupPeptideLive(
      { name: "BPC-157", slug: "bpc-157" },
      { ...ctx, message: "BPC-157 peptide education" },
      async () =>
        okPayload({
          searchVerified: true,
          results: [],
          education: {
            entryKey: "depth-bpc157-framework",
            title: "BPC-157 depth",
            isPeptide: true,
            mechanism: "Practitioner-only framework.",
            evidenceGrade: "C",
          },
        })
    );
    expect(depthOnly.ok).toBe(false);
    if (depthOnly.ok === false) expect(depthOnly.code).toBe("not_found");
  });

  it("restates listed names only and never coaches Rx dose / vial / frequency", async () => {
    const listed = await lookupPeptideLive(
      { name: "Retatrutide" },
      ctx,
      async () =>
        okPayload({
          ...RETA_OK,
          listedNames: ["Retatrutide"],
        })
    );
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data.listed_names).toEqual(["Retatrutide"]);
      expect(listed.data.prescribed).toEqual({ listed: true, names: ["Retatrutide"] });
      expect(JSON.stringify(listed.data)).not.toMatch(
        /dose_amount|dose_unit|vial_|frequency_text|2\.5|mcg/
      );
    }
    expect(listedNamesOnly(["Retatrutide", "  ", { dose_amount: 2.5 }])).toEqual(["Retatrutide"]);
  });

  it("topic-map is an index, not a genotype report", async () => {
    const map = await lookupPeptideLive(
      { name: "PeptideIQ topic map", slug: "peptideiq-topic-map" },
      { ...ctx, message: "Show the PeptideIQ topic map" },
      async () =>
        okPayload({
          searchVerified: true,
          results: [],
          education: {
            entryKey: "edu-peptideiq-topic-map",
            title: "PeptideIQ topic map",
            isPeptide: true,
            mechanism: "Index of PeptideIQ education topics.",
            evidenceGrade: "n/a",
          },
        })
    );
    expect(map.ok).toBe(true);
    if (map.ok) {
      expect(map.data.pathway_tags).toContain("index");
      expect(map.data.entry_key).toBe("edu-peptideiq-topic-map");
    }
  });

  it("flag-off stays legacy even when a peptide question would require the tool", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "What does ViaConnect have on file for retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off-peptide",
    });
    expect(turn.kind).toBe("legacy");
  });

  it("flag-on peptide success assembles Lex frame restatement, not tool_refuse", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What does ViaConnect have on file for retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-peptide-ok",
      lookupPeptideAssemble: async () => RETA_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.reason).not.toBe("tool_refuse");
    expect(turn.text).toContain(PEPTIDE_LISTING_EXPLANATION);
    expect(PEPTIDE_LISTING_EXPLANATION).toBe(
      "Here is what ViaConnect has on file for that peptide education."
    );
    expect(turn.text).toContain("name: Retatrutide");
    expect(turn.text).toContain("educational_only: true");
    expect(turn.text).toContain("summary: Incretin-class educational note on file.");
    expect(turn.text).toContain("compound_class: peptide");
    expect(turn.text).not.toContain(VIA_CURA_DRAFT_BANNER);
    expect(turn.text.toLowerCase()).not.toMatch(
      /prescribe|titration|oral retatrutide|safe to take|semaglutide|stacking schedule/
    );
    expect(turn.text).not.toMatch(/\b(mcg|mg)\b/);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.requiredTools).toEqual(["lookup_peptide"]);
  });

  it("flag-on Retatrutide oral/stack invent refuses without assembler coaching", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Can I take oral retatrutide instead of injectable?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-reta-oral",
      lookupPeptideAssemble: async () => RETA_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text).toContain(FAQ.outOfScope);
    expect(turn.text.toLowerCase()).not.toMatch(/oral retatrutide dose|stacking schedule:/);
    expect(turn.text).not.toMatch(/\b(mcg|mg)\b/);
  });

  it("flag-on Semaglutide refuse uses FAQ.semaglutide", async () => {
    process.env[FLAG] = "true";
    expect(detectSafetyRefuse("Should I take semaglutide?")).toBe("semaglutide");
    const turn = await resolveGroundedChatTurn({
      message: "Should I take semaglutide?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-sema",
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("safety_faq");
    expect(turn.text).toContain(FAQ.semaglutide);
    expect(turn.text.toLowerCase()).not.toMatch(/recommend semaglutide|start ozempic|wegovy dose/);
  });

  it("flag-on soft-empty uses FAQ.toolFailed; verified miss uses FAQ.outOfScope", async () => {
    process.env[FLAG] = "true";
    const soft = await resolveGroundedChatTurn({
      message: "What is retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-peptide-soft",
      lookupPeptideAssemble: async () => ({
        loadStatus: "error",
        searchVerified: false,
        searchFailed: true,
        results: [],
        education: null,
        listedNames: [],
        error: "timeout",
      }),
    });
    expect(soft.kind).toBe("static");
    if (soft.kind === "static") {
      expect(soft.reason).toBe("tool_refuse");
      expect(soft.text).toContain(FAQ.toolFailed);
    }

    const miss = await resolveGroundedChatTurn({
      message: "What is retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-peptide-miss",
      lookupPeptideAssemble: async () => okPayload({ results: [], education: null }),
    });
    expect(miss.kind).toBe("static");
    if (miss.kind === "static") {
      expect(miss.reason).toBe("tool_refuse");
      expect(miss.text).toContain(FAQ.outOfScope);
      expect(miss.text).not.toContain(FAQ.newDose);
    }
  });

  it("flag-on listed-only restatement has no Rx dose coaching", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What is retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-listed",
      lookupPeptideAssemble: async () =>
        okPayload({
          ...RETA_OK,
          listedNames: ["Retatrutide"],
        }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.text).toContain("listed: Retatrutide");
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.text).not.toMatch(/dose_amount|vial_|frequency_text|2\.5 mg/);
  });

  it("flag-on non-peptide edu is labeled and not taught as a peptide", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "What is tesofensine peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-nonpeptide",
      lookupPeptideAssemble: async () =>
        okPayload({
          searchVerified: true,
          results: [],
          education: {
            entryKey: "edu-slu-pp-332-nonpeptide",
            title: "SLU-PP-332",
            isPeptide: false,
            mechanism: "Non-peptide educational card on file.",
            evidenceGrade: "D",
          },
        }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.text).toContain("compound_class: non-peptide");
    expect(turn.text).not.toMatch(/this peptide is slu-pp-332/i);
  });

  it("flag-on protocol + interactions + snp + peptide lists that four-tool order", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Does rs1801133 on my genetic card interact with retatrutide on my protocol?",
      role: "practitioner",
      userId: "user-1",
      requestId: "req-on-all-four",
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
      lookupSnpAssemble: async () => ({
        loadStatus: "ok",
        variants: [
          {
            rsid: "rs1801133",
            gene: "MTHFR",
            genotype: "CT",
            panel_key: "methylation",
            stored_panel_key: "genex_m",
            status: null,
            clinical_significance: "Stored MTHFR C677T note on file.",
            is_sample: false,
            chip: "genexm",
          },
        ],
        snpCountsUnknown: false,
        demoAccount: false,
      }),
      lookupPeptideAssemble: async () => RETA_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.requiredTools).toEqual(
      expect.arrayContaining(["get_protocol", "check_interactions", "lookup_snp", "lookup_peptide"])
    );
    const protocolIdx = turn.text.indexOf("I can only restate what ViaConnect already listed");
    const interactionsIdx = turn.text.indexOf(INTERACTIONS_LISTING_EXPLANATION);
    const snpIdx = turn.text.indexOf(SNP_LISTING_EXPLANATION);
    const peptideIdx = turn.text.indexOf(PEPTIDE_LISTING_EXPLANATION);
    expect(protocolIdx).toBeGreaterThan(-1);
    expect(interactionsIdx).toBeGreaterThan(protocolIdx);
    expect(snpIdx).toBeGreaterThan(interactionsIdx);
    expect(peptideIdx).toBeGreaterThan(snpIdx);
    expect(turn.text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(turn.text.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
    expect(turn.text.toLowerCase()).not.toMatch(/oral retatrutide|stacking schedule/);
  });

  it("allow_generate stays hard false", () => {
    expect(isAllowGenerateHardFalse()).toBe(true);
  });

  it("extracts a peptide name from the user turn without inventing doses", () => {
    expect(extractLookupPeptideAsk(undefined, "What is retatrutide peptide education?")).toEqual({
      name: "Retatrutide",
      slug: "retatrutide",
    });
    expect(extractLookupPeptideAsk({ name: "Sermorelin" }, "tell me about this peptide")).toEqual({
      name: "Sermorelin",
      slug: undefined,
    });
  });
});

describe("lookup_peptide assemble source locks", () => {
  const assembleSrc = readFileSync(
    join(process.cwd(), "src/lib/jeffery/grounded/lookup-peptide-assemble.ts"),
    "utf8"
  );
  const wrapSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/lookup-peptide-wrap.ts"), "utf8");

  it("names the shared peptide helpers and does not HTTP-loopback the live GETs", () => {
    expect(assembleSrc).toContain("search_peptides");
    expect(assembleSrc).toContain("peptide_delivery_options");
    expect(assembleSrc).toContain("loadConsumerEducationEntries");
    expect(assembleSrc).toContain("user_prescribed_peptides");
    expect(assembleSrc).toContain("kb_peptides");
    expect(assembleSrc).not.toContain("loadConverterAllowlist");
    expect(assembleSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\/peptides\/search/);
    expect(assembleSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\/peptides\/prescribed/);
    expect(wrapSrc).toContain("preparePeptideToolPayload");
    expect(wrapSrc).toContain("educational_only: true");
  });
});
