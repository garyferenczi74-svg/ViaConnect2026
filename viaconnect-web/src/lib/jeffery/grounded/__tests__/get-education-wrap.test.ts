import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import {
  EDUCATION_LISTING_EXPLANATION,
  INTERACTIONS_LISTING_EXPLANATION,
  PEPTIDE_LISTING_EXPLANATION,
  SNP_LISTING_EXPLANATION,
  detectSafetyRefuse,
} from "../refuse";
import {
  extractGetEducationAsk,
  getEducationLive,
  isBlockedGlp1EducationAsk,
  isRetatrutideOralOrStackInvent,
  isTirzepatideEducationAsk,
} from "../get-education-wrap";
import {
  STAGE_A_EDUCATION_ALLOWLIST,
  STAGE_A_RETRIEVER_ALLOWLIST,
  STAGE_A_SAFETY_NEVER_SAY_IDS,
} from "../education-allowlist";
import { inferRequiredTools } from "../intent";
import {
  filterChunksForConsumerAudience,
  mapSafetyFixtureToChunk,
  mapStoredEntryToEducationChunk,
  retrieveGroundedChunks,
} from "../retriever";
import { isAllowGenerateHardFalse, getEducationStub } from "../tool-router";
import type { GetEducationEnginePayload, GetEducationStoredRow } from "../get-education-assemble";
import type { GroundedToolContext } from "../types";
import type { EducationEntry } from "@/lib/peptides/educationEntryFields";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const ctx: GroundedToolContext = {
  userId: "user-1",
  role: "consumer",
  requestId: "req-edu",
  message: "Show the ViaConnect education on file for edu-sermorelin",
};

function storedRow(
  partial: Partial<GetEducationStoredRow> & Pick<GetEducationStoredRow, "entryKey" | "title">
): GetEducationStoredRow {
  return {
    isPeptide: true,
    mechanism: null,
    evidenceGrade: "C",
    regulatoryStatus: null,
    safetyContext: null,
    provenanceText: null,
    pmids: [],
    ...partial,
  };
}

function okPayload(
  extra: Partial<GetEducationEnginePayload> = {}
): GetEducationEnginePayload {
  return {
    loadStatus: "ok",
    topicId: extra.topicId ?? extra.education?.entryKey ?? "edu-sermorelin",
    education: extra.education ?? null,
    ...extra,
  };
}

const SERMORELIN_ROW = storedRow({
  entryKey: "edu-sermorelin",
  title: "Sermorelin",
  mechanism: "Stored Sermorelin mechanism on file.",
  regulatoryStatus: "Educational card only.",
  pmids: ["12345678"],
});

const SERMORELIN_OK = okPayload({
  topicId: "edu-sermorelin",
  education: SERMORELIN_ROW,
});

const RETA_EDU_ROW = storedRow({
  entryKey: "edu-retatrutide",
  title: "Retatrutide",
  mechanism: "Incretin-class educational note on file.",
});

describe("get_education live wrap", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("success maps stored Sermorelin fields without inventing a monograph", async () => {
    const result = await getEducationLive(
      { topic_id: "edu-sermorelin" },
      ctx,
      async () => SERMORELIN_OK
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.topic_id).toBe("edu-sermorelin");
      expect(result.data.title).toBe("Sermorelin");
      expect(result.data.audience).toBe("consumer");
      expect(result.data.text).toBe("Stored Sermorelin mechanism on file.");
      expect(result.data.citations).toEqual([{ cite_id: "pmid:12345678", label: "PMID 12345678" }]);
      expect(result.data.safety_flags).toEqual(expect.arrayContaining(["edu_not_dx", "no_new_dose"]));
      expect(result.data.audience).not.toBe("clinician");
      expect(result.route).toBe("peptide_education_entries / Stage A education allowlist");
    }
  });

  it("Semaglutide topic refuses and does not invent edu", async () => {
    expect(isBlockedGlp1EducationAsk("edu-semaglutide", "semaglutide education topic")).toBe(true);
    const result = await getEducationLive(
      { topic_id: "edu-semaglutide" },
      { ...ctx, message: "What education is on file for semaglutide?" },
      async () =>
        okPayload({
          topicId: "edu-semaglutide",
          education: storedRow({
            entryKey: "edu-semaglutide",
            title: "Semaglutide",
            mechanism: "invented",
          }),
        })
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("refuse_required");
  });

  it("blocks depth frameworks and does not serve practitioner depth", async () => {
    for (const key of ["depth-bpc157-framework", "depth-ss31-framework"]) {
      const result = await getEducationLive(
        { topic_id: key },
        { ...ctx, message: `Show the education topic ${key}` },
        async () => okPayload({ topicId: key, blocked: "depth", education: null })
      );
      expect(result.ok).toBe(false);
      if (result.ok === false) expect(result.code).toBe("refuse_required");
    }
  });

  it("labels non-peptides and does not teach them as peptides", async () => {
    for (const row of [
      storedRow({
        entryKey: "edu-5-amino-1mq-nonpeptide",
        title: "5-Amino-1MQ",
        isPeptide: false,
        mechanism: "Non-peptide educational card on file.",
      }),
      storedRow({
        entryKey: "edu-slu-pp-332-nonpeptide",
        title: "SLU-PP-332",
        isPeptide: false,
        mechanism: "Non-peptide educational card on file.",
      }),
      storedRow({
        entryKey: "edu-tesofensine-pause",
        title: "Tesofensine pause",
        isPeptide: false,
        mechanism: "Non-peptide pause educational card on file.",
      }),
    ]) {
      const result = await getEducationLive(
        { topic_id: row.entryKey },
        { ...ctx, message: `Show the ViaConnect education on file for ${row.entryKey}` },
        async () => okPayload({ topicId: row.entryKey, education: row })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.safety_flags).toContain("non_peptide");
        expect(result.data.text).toContain("Non-peptide");
      }
    }
  });

  it("edu-retatrutide is class education only and refuses oral/stack invent", async () => {
    const ok = await getEducationLive(
      { topic_id: "edu-retatrutide" },
      { ...ctx, message: "Show the ViaConnect education on file for edu-retatrutide" },
      async () => okPayload({ topicId: "edu-retatrutide", education: RETA_EDU_ROW })
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.safety_flags).toEqual(
        expect.arrayContaining(["edu_not_dx", "no_new_dose", "no_glp1_adjacency"])
      );
      expect(ok.data.text).toBe("Incretin-class educational note on file.");
    }

    expect(isRetatrutideOralOrStackInvent("Can I take oral retatrutide?", "edu-retatrutide")).toBe(
      true
    );
    const oral = await getEducationLive(
      { topic_id: "edu-retatrutide" },
      { ...ctx, message: "Can I take oral retatrutide? Show the education on file." },
      async () => okPayload({ topicId: "edu-retatrutide", education: RETA_EDU_ROW })
    );
    expect(oral.ok).toBe(false);
    if (oral.ok === false) expect(oral.code).toBe("refuse_required");
  });

  it("PT-141 uses live edu-pt141-bremelanotide HSDD stored framing only", async () => {
    const result = await getEducationLive(
      { topic_id: "edu-pt141-bremelanotide" },
      { ...ctx, message: "Show the ViaConnect education on file for edu-pt141-bremelanotide" },
      async () =>
        okPayload({
          topicId: "edu-pt141-bremelanotide",
          education: storedRow({
            entryKey: "edu-pt141-bremelanotide",
            title: "PT-141 (bremelanotide)",
            mechanism: "Stored HSDD educational framing on file.",
          }),
        })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.topic_id).toBe("edu-pt141-bremelanotide");
      expect(result.data.text).toBe("Stored HSDD educational framing on file.");
    }
  });

  it("Tesamorelin uses stored HIV lipodystrophy framing only", async () => {
    const result = await getEducationLive(
      { topic_id: "edu-tesamorelin" },
      { ...ctx, message: "Show the ViaConnect education on file for edu-tesamorelin" },
      async () =>
        okPayload({
          topicId: "edu-tesamorelin",
          education: storedRow({
            entryKey: "edu-tesamorelin",
            title: "Tesamorelin",
            mechanism: "Stored HIV lipodystrophy educational framing on file.",
          }),
        })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.topic_id).toBe("edu-tesamorelin");
      expect(result.data.text).toBe("Stored HIV lipodystrophy educational framing on file.");
    }
  });

  it("tirzepatide edu invent refuses", async () => {
    expect(isTirzepatideEducationAsk("", "tirzepatide education topic")).toBe(true);
    const result = await getEducationLive(
      { topic_id: "edu-tirzepatide" },
      { ...ctx, message: "Show the education topic for tirzepatide" },
      async () => okPayload({ topicId: "edu-tirzepatide", education: null })
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.code).toBe("refuse_required");
  });

  it("safety_never_say miss/empty refuses; known fixture is never education success", async () => {
    const miss = await getEducationLive(
      { topic_id: "safety_never_say:unknown:01" },
      { ...ctx, message: "safety_never_say:unknown:01" },
      async () =>
        okPayload({
          topicId: "safety_never_say:unknown:01",
          education: null,
          safetyFixture: null,
        })
    );
    expect(miss.ok).toBe(false);
    if (miss.ok === false) expect(miss.code).toBe("not_found");

    const empty = await getEducationLive(
      { topic_id: "safety_never_say:diagnosis:01" },
      { ...ctx, message: "safety_never_say:diagnosis:01" },
      async () =>
        okPayload({
          topicId: "safety_never_say:diagnosis:01",
          education: null,
          safetyFixture: { id: "safety_never_say:diagnosis:01", title: "Diagnosis refuse", text: "" },
        })
    );
    expect(empty.ok).toBe(false);
    if (empty.ok === false) expect(empty.code).toBe("not_found");

    const known = await getEducationLive(
      { topic_id: "safety_never_say:diagnosis:01" },
      { ...ctx, message: "safety_never_say:diagnosis:01" },
      async () =>
        okPayload({
          topicId: "safety_never_say:diagnosis:01",
          education: null,
          safetyFixture: {
            id: "safety_never_say:diagnosis:01",
            title: "Diagnosis refuse",
            text: FAQ.diagnosis,
          },
        })
    );
    expect(known.ok).toBe(false);
    if (known.ok === false) expect(known.code).toBe("refuse_required");
  });

  it("missing allowlisted key and empty stored prose refuse instead of inventing", async () => {
    const missing = await getEducationLive(
      { topic_id: "edu-sermorelin" },
      ctx,
      async () => okPayload({ topicId: "edu-sermorelin", education: null })
    );
    expect(missing.ok).toBe(false);
    if (missing.ok === false) expect(missing.code).toBe("not_found");

    const empty = await getEducationLive(
      { topic_id: "edu-sermorelin" },
      ctx,
      async () =>
        okPayload({
          topicId: "edu-sermorelin",
          education: storedRow({ entryKey: "edu-sermorelin", title: "Sermorelin" }),
        })
    );
    expect(empty.ok).toBe(false);
    if (empty.ok === false) expect(empty.code).toBe("not_found");
  });

  it("flag-off stays legacy even when an education question would require the tool", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-sermorelin",
      role: "consumer",
      userId: "user-1",
      requestId: "req-off-edu",
    });
    expect(turn.kind).toBe("legacy");
  });

  it("flag-on Sermorelin success assembles Lex frame restatement, not tool_refuse", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-sermorelin",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-edu-ok",
      lookupPeptideAssemble: async () => ({
        loadStatus: "ok",
        searchVerified: true,
        searchFailed: false,
        results: [],
        education: {
          entryKey: "edu-sermorelin",
          title: "Sermorelin",
          isPeptide: true,
          mechanism: "Stored Sermorelin mechanism on file.",
          evidenceGrade: "C",
        },
        listedNames: [],
      }),
      getEducationAssemble: async () => SERMORELIN_OK,
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.reason).not.toBe("tool_refuse");
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(EDUCATION_LISTING_EXPLANATION).toBe(
      "Here is the ViaConnect education on file for that topic."
    );
    expect(turn.text).toContain("topic_id: edu-sermorelin");
    expect(turn.text).toContain("title: Sermorelin");
    expect(turn.text).toContain("text: Stored Sermorelin mechanism on file.");
    expect(turn.text).toContain("cite_ids: pmid:12345678");
    expect(turn.text).toContain("compound_class: peptide");
    expect(turn.text).not.toContain(VIA_CURA_DRAFT_BANNER);
    expect(turn.text.toLowerCase()).not.toMatch(
      /diagnose|prescribe|titration|invent monograph|safe to take|semaglutide recommend|stack coaching/
    );
    expect(turn.requiredTools).toEqual(expect.arrayContaining(["get_education"]));
  });

  it("flag-on Semaglutide topic uses FAQ.semaglutide on the safety path", async () => {
    process.env[FLAG] = "true";
    expect(detectSafetyRefuse("What education is on file for semaglutide?")).toBe("semaglutide");
    const turn = await resolveGroundedChatTurn({
      message: "What education is on file for semaglutide?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-sema-edu",
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("safety_faq");
    expect(turn.text).toContain(FAQ.semaglutide);
    expect(turn.text.toLowerCase()).not.toMatch(/recommend semaglutide|start ozempic/);
  });

  it("flag-on education miss uses FAQ.outOfScope; read fail uses FAQ.toolFailed", async () => {
    process.env[FLAG] = "true";
    const miss = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-pt141-bremelanotide",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-edu-miss",
      getEducationAssemble: async () =>
        okPayload({ topicId: "edu-pt141-bremelanotide", education: null }),
    });
    expect(miss.kind).toBe("static");
    if (miss.kind === "static") {
      expect(miss.reason).toBe("tool_refuse");
      expect(miss.text).toContain(FAQ.outOfScope);
      expect(miss.text).not.toContain("eduMissing");
    }

    const failed = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-pt141-bremelanotide",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-edu-fail",
      getEducationAssemble: async () => ({
        loadStatus: "error",
        topicId: "edu-pt141-bremelanotide",
        education: null,
        educationFailed: true,
        error: "timeout",
      }),
    });
    expect(failed.kind).toBe("static");
    if (failed.kind === "static") {
      expect(failed.reason).toBe("tool_refuse");
      expect(failed.text).toContain(FAQ.toolFailed);
    }
  });

  it("flag-on safety_never_say miss/empty refuses with FAQ and no treatment soft", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Show the education topic safety_never_say:unknown:01",
      role: "consumer",
      userId: "user-1",
      requestId: "req-on-safety-miss",
      getEducationAssemble: async () =>
        okPayload({
          topicId: "safety_never_say:unknown:01",
          education: null,
          safetyFixture: null,
        }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("tool_refuse");
    expect(turn.text).toContain(FAQ.outOfScope);
    expect(turn.text.toLowerCase()).not.toMatch(/you should take|start treatment|safe to take/);
  });

  it("flag-on five-tool multi-ok order ends with education", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message:
        "Does rs1801133 on my genetic card interact with retatrutide on my protocol? Also show the ViaConnect education on file for edu-retatrutide.",
      role: "practitioner",
      userId: "user-1",
      requestId: "req-on-all-five",
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
      lookupPeptideAssemble: async () => ({
        loadStatus: "ok",
        searchVerified: true,
        searchFailed: false,
        results: [],
        education: {
          entryKey: "edu-retatrutide",
          title: "Retatrutide",
          isPeptide: true,
          mechanism: "Incretin-class educational note on file.",
          evidenceGrade: "C",
        },
        listedNames: [],
      }),
      getEducationAssemble: async () =>
        okPayload({ topicId: "edu-retatrutide", education: RETA_EDU_ROW }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.requiredTools).toEqual(
      expect.arrayContaining([
        "get_protocol",
        "check_interactions",
        "lookup_snp",
        "lookup_peptide",
        "get_education",
      ])
    );
    const protocolIdx = turn.text.indexOf("I can only restate what ViaConnect already listed");
    const interactionsIdx = turn.text.indexOf(INTERACTIONS_LISTING_EXPLANATION);
    const snpIdx = turn.text.indexOf(SNP_LISTING_EXPLANATION);
    const peptideIdx = turn.text.indexOf(PEPTIDE_LISTING_EXPLANATION);
    const educationIdx = turn.text.indexOf(EDUCATION_LISTING_EXPLANATION);
    expect(protocolIdx).toBeGreaterThan(-1);
    expect(interactionsIdx).toBeGreaterThan(protocolIdx);
    expect(snpIdx).toBeGreaterThan(interactionsIdx);
    expect(peptideIdx).toBeGreaterThan(snpIdx);
    expect(educationIdx).toBeGreaterThan(peptideIdx);
    expect(turn.text.startsWith(VIA_CURA_DRAFT_BANNER)).toBe(true);
    expect(turn.text.split(VIA_CURA_DRAFT_BANNER).length - 1).toBe(1);
    expect(turn.text.toLowerCase()).not.toContain("prescribed");
  });

  it("allow_generate stays hard false", () => {
    expect(isAllowGenerateHardFalse()).toBe(true);
  });

  it("extracts an education topic without inventing doses", () => {
    expect(
      extractGetEducationAsk(undefined, "Show the ViaConnect education on file for edu-sermorelin")
    ).toEqual({ topic_id: "edu-sermorelin" });
    expect(extractGetEducationAsk({ topic_id: "edu-ipamorelin" }, "tell me about this")).toEqual({
      topic_id: "edu-ipamorelin",
    });
    expect(
      inferRequiredTools("What does ViaConnect have on file for retatrutide peptide education?")
    ).toEqual(["lookup_peptide"]);
    expect(
      inferRequiredTools("Show the ViaConnect education on file for edu-pt141-bremelanotide")
    ).toEqual(["get_education"]);
  });
});

describe("Stage A education/safety retriever allowlist", () => {
  it("locks live spellings and stays at ≤20 concrete ids", () => {
    expect(STAGE_A_SAFETY_NEVER_SAY_IDS).toHaveLength(5);
    expect(STAGE_A_EDUCATION_ALLOWLIST).toHaveLength(15);
    expect(STAGE_A_RETRIEVER_ALLOWLIST).toHaveLength(20);
    expect(STAGE_A_RETRIEVER_ALLOWLIST).toContain("edu-pt141-bremelanotide");
    expect(STAGE_A_RETRIEVER_ALLOWLIST).toContain("edu-cjc1295-no-dac");
    expect(STAGE_A_RETRIEVER_ALLOWLIST).not.toContain("edu-pt-141");
    expect(STAGE_A_RETRIEVER_ALLOWLIST).not.toContain("edu-cjc-1295");
  });

  it("returns Lex/FAQ safety fixtures and empty on miss — no invented bodies", async () => {
    const hit = await retrieveGroundedChunks({
      message: "safety_never_say:diagnosis:01",
      role: "consumer",
      userId: "user-1",
    });
    expect(hit.chunks).toHaveLength(1);
    expect(hit.chunks[0]?.doc_type).toBe("safety_never_say");
    expect(hit.chunks[0]?.text).toBe(FAQ.diagnosis);
    expect(hit.chunks[0]?.audience).toBe("consumer");

    const miss = await retrieveGroundedChunks({
      message: "safety_never_say:unknown:01",
      role: "consumer",
      userId: "user-1",
    });
    expect(miss.chunks).toEqual([]);

    const fixture = mapSafetyFixtureToChunk("safety_never_say:tool-fail:01");
    expect(fixture?.text).toBe(FAQ.toolFailed);
  });

  it("maps stored education rows only and filters clinician-only from consumer", async () => {
    const entry: EducationEntry = {
      entryKey: "edu-sermorelin",
      title: "Sermorelin",
      isPeptide: true,
      mechanism: "Stored Sermorelin mechanism on file.",
      evidenceGrade: "C",
      regulatoryStatus: null,
      safetyContext: null,
      provenanceText: null,
      pmids: ["12345678"],
    };
    const chunk = mapStoredEntryToEducationChunk(entry);
    expect(chunk?.doc_type).toBe("education");
    expect(chunk?.text).toBe("Stored Sermorelin mechanism on file.");
    expect(chunk?.audience).toBe("consumer");

    const loaded = await retrieveGroundedChunks(
      {
        message: "Show the ViaConnect education on file for edu-sermorelin",
        role: "consumer",
        userId: "user-1",
      },
      async () => entry
    );
    expect(loaded.chunks).toHaveLength(1);
    expect(loaded.chunks[0]?.chunk_id).toBe("edu-sermorelin");

    const missing = await retrieveGroundedChunks(
      {
        message: "Show the ViaConnect education on file for edu-sermorelin",
        role: "consumer",
        userId: "user-1",
      },
      async () => null
    );
    expect(missing.chunks).toEqual([]);

    const filtered = filterChunksForConsumerAudience(
      [
        {
          chunk_id: "clinician-only",
          cite_id: "clinician-only",
          doc_type: "education",
          text: "clinician framework",
          audience: "clinician",
        },
      ],
      "consumer"
    );
    expect(filtered).toEqual([]);
  });

  it("does not retrieve depth frameworks or invent monograph bodies", async () => {
    const depth = await retrieveGroundedChunks(
      {
        message: "education topic depth-bpc157-framework",
        role: "consumer",
        userId: "user-1",
      },
      async () => ({
        entryKey: "depth-bpc157-framework",
        title: "Depth",
        isPeptide: true,
        mechanism: "invented depth body",
        evidenceGrade: "A",
        regulatoryStatus: null,
        safetyContext: null,
        provenanceText: null,
        pmids: [],
      })
    );
    expect(depth.chunks).toEqual([]);
    expect(mapStoredEntryToEducationChunk({
      entryKey: "depth-bpc157-framework",
      title: "Depth",
      isPeptide: true,
      mechanism: "invented",
      evidenceGrade: "A",
      regulatoryStatus: null,
      safetyContext: null,
      provenanceText: null,
      pmids: [],
    })).toBeNull();
  });
});

describe("get_education assemble source locks", () => {
  const assembleSrc = readFileSync(
    join(process.cwd(), "src/lib/jeffery/grounded/get-education-assemble.ts"),
    "utf8"
  );
  const wrapSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/get-education-wrap.ts"), "utf8");
  const retrieverSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/retriever.ts"), "utf8");

  it("names the READ-only helpers and does not HTTP-loopback or write tables", () => {
    expect(assembleSrc).toContain("loadConsumerEducationEntryByKey");
    expect(assembleSrc).toContain("dropPractitionerDepthEducation");
    expect(assembleSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\//);
    expect(assembleSrc).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(wrapSrc).toContain("edu_not_dx");
    expect(wrapSrc).toContain("no_new_dose");
    expect(retrieverSrc).toContain("education");
    expect(retrieverSrc).toContain("safety_never_say");
    expect(retrieverSrc).toContain("STAGE_A_RETRIEVER_ALLOWLIST_MAX");
  });

  it("keeps the leftover stub refuse-closed", () => {
    expect(getEducationStub({ topic_id: "edu-retatrutide" }).ok).toBe(false);
  });
});
