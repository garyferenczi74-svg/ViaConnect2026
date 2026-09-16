import { afterEach, describe, expect, it } from "vitest";
import { FAQ } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import {
  EDUCATION_LISTING_EXPLANATION,
  INTERACTIONS_LISTING_EXPLANATION,
  PEPTIDE_LISTING_EXPLANATION,
  SNP_LISTING_EXPLANATION,
  assembleEducationListingText,
  detectSafetyRefuse,
} from "../refuse";
import {
  citesFromRetrieverChunks,
  formatAllowlistSourceLine,
  mergeEducationSourceLines,
} from "../retriever-cites";
import { isAllowGenerateHardFalse } from "../tool-router";
import type { GetEducationData, RetrieverChunk } from "../types";
import type { GetEducationEnginePayload, GetEducationStoredRow } from "../get-education-assemble";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const DOSE_CHUNK_TEXT = "Take 10 mg twice daily — invented oral Retatrutide stacking schedule.";

const SERMORELIN_DATA: GetEducationData = {
  topic_id: "edu-sermorelin",
  title: "Sermorelin",
  audience: "consumer",
  text: "Stored Sermorelin mechanism on file.",
  citations: [{ cite_id: "pmid:12345678", label: "PMID 12345678" }],
  safety_flags: ["edu_not_dx", "no_new_dose"],
};

const TOOL_PMID_CHUNK: RetrieverChunk = {
  chunk_id: "edu-sermorelin",
  cite_id: "pmid:12345678",
  doc_type: "education",
  text: DOSE_CHUNK_TEXT,
  audience: "consumer",
};

const EXTRA_EDU_CHUNK: RetrieverChunk = {
  chunk_id: "edu-ipamorelin",
  cite_id: "pmid:87654321",
  doc_type: "education",
  text: "Ipamorelin 200 mcg titration invented from chunk text.",
  audience: "consumer",
};

const SAFETY_CHUNK: RetrieverChunk = {
  chunk_id: "safety_never_say:diagnosis:01",
  cite_id: "safety_never_say:diagnosis:01",
  doc_type: "safety_never_say",
  text: "You should take this — safe to take after meals.",
  audience: "consumer",
};

function sourcesSection(text: string): string {
  const start = text.indexOf("3. Sources");
  const end = text.indexOf("4. Next action");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

function sourceBodies(text: string): string[] {
  return sourcesSection(text)
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

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

/** edu-ss31 is education-only (does not trip PEPTIDE_RE). */
const SS31_OK: GetEducationEnginePayload = {
  loadStatus: "ok",
  topicId: "edu-ss31",
  education: storedRow({
    entryKey: "edu-ss31",
    title: "SS-31",
    mechanism: "Stored SS-31 mechanism on file.",
    pmids: ["12345678"],
  }),
};

function educationCiteTurn(
  extra: Partial<Parameters<typeof resolveGroundedChatTurn>[0]> = {}
) {
  return resolveGroundedChatTurn({
    message: "Show the ViaConnect education on file for edu-ss31",
    role: "consumer",
    userId: "user-1",
    requestId: "req-edu-cites",
    getEducationAssemble: async () => SS31_OK,
    loadAuthorityCites: async () => [],
    loadHounddogUrlCites: async () => [],
    ...extra,
  });
}

describe("retriever cites merge (cite≠dose)", () => {
  it("maps education chunks to cite_id + label and omits safety_never_say + empty", () => {
    expect(citesFromRetrieverChunks([])).toEqual([]);
    expect(citesFromRetrieverChunks(undefined)).toEqual([]);
    expect(
      citesFromRetrieverChunks([
        TOOL_PMID_CHUNK,
        EXTRA_EDU_CHUNK,
        EXTRA_EDU_CHUNK,
        SAFETY_CHUNK,
        { ...EXTRA_EDU_CHUNK, cite_id: "   ", chunk_id: "blank" },
      ])
    ).toEqual([
      { cite_id: "pmid:12345678", label: "PMID 12345678" },
      { cite_id: "pmid:87654321", label: "PMID 87654321" },
    ]);
    expect(formatAllowlistSourceLine({ cite_id: "pmid:87654321", label: "PMID 87654321" })).toBe(
      "cite_id: pmid:87654321; label: PMID 87654321"
    );
  });

  it("dedupes retriever cite_id against tool PMIDs and invents no phantom rows", () => {
    expect(
      mergeEducationSourceLines({
        sourceRoute: "peptide_education_entries / Stage A education allowlist",
        toolCitations: SERMORELIN_DATA.citations,
        retrieverChunks: [TOOL_PMID_CHUNK, EXTRA_EDU_CHUNK, SAFETY_CHUNK],
      })
    ).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
      "cite_id: pmid:87654321; label: PMID 87654321",
    ]);

    expect(
      mergeEducationSourceLines({
        sourceRoute: "peptide_education_entries / Stage A education allowlist",
        toolCitations: SERMORELIN_DATA.citations,
        retrieverChunks: [],
      })
    ).toEqual(["peptide_education_entries / Stage A education allowlist", "PMID 12345678"]);
  });

  it("education assemble appends id/label Sources only — never chunk dose prose", () => {
    const withChunks = assembleEducationListingText({
      role: "consumer",
      data: SERMORELIN_DATA,
      sourceRoute: "peptide_education_entries / Stage A education allowlist",
      retrieverChunks: [TOOL_PMID_CHUNK, EXTRA_EDU_CHUNK, SAFETY_CHUNK],
    });
    expect(withChunks).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(withChunks).toContain("PMID 12345678");
    expect(withChunks).toContain("cite_id: pmid:87654321; label: PMID 87654321");
    expect(sourcesSection(withChunks).split("PMID 12345678").length - 1).toBe(1);
    expect(withChunks).not.toContain(DOSE_CHUNK_TEXT);
    expect(withChunks).not.toContain("200 mcg");
    expect(withChunks).not.toContain("Retrieved from knowledge base:");
    expect(withChunks).not.toContain("Supporting education:");
    expect(withChunks).not.toContain(SAFETY_CHUNK.cite_id);
    expect(withChunks.toLowerCase()).not.toMatch(/safe to take|you should take/);
    for (const body of sourceBodies(withChunks)) {
      expect(body).not.toMatch(/\b(mg|mcg|dose|titration|stacking schedule)\b/i);
      expect(body).not.toBe("none");
    }

    const empty = assembleEducationListingText({
      role: "consumer",
      data: SERMORELIN_DATA,
      sourceRoute: "peptide_education_entries / Stage A education allowlist",
      retrieverChunks: [],
    });
    expect(empty).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(empty).toContain("PMID 12345678");
    expect(empty).not.toContain("cite_id: pmid:87654321");
    expect(sourceBodies(empty)).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
    ]);
  });
});

describe("chat-stub retriever cites — education success only", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("education success + allowlist chunks → Sources include deduped cite_id/labels", async () => {
    process.env[FLAG] = "true";
    const turn = await educationCiteTurn({
      requestId: "req-edu-cites-ok",
      retrieveChunks: async () => ({
        chunks: [TOOL_PMID_CHUNK, EXTRA_EDU_CHUNK, SAFETY_CHUNK],
        index_version: "test-allowlist-cites",
      }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(turn.text).toContain("topic_id: edu-ss31");
    expect(turn.text).toContain("PMID 12345678");
    expect(turn.text).toContain("cite_id: pmid:87654321; label: PMID 87654321");
    expect(sourcesSection(turn.text).split("PMID 12345678").length - 1).toBe(1);
    expect(turn.text).not.toContain(DOSE_CHUNK_TEXT);
    expect(turn.text).not.toContain("200 mcg");
    expect(turn.text).not.toContain("Retrieved from knowledge base:");
    expect(turn.text).not.toContain("Supporting education:");
    expect(turn.text).not.toContain("safety_never_say:diagnosis:01");
    expect(turn.text.toLowerCase()).not.toMatch(/safe to take|you should take/);
    for (const body of sourceBodies(turn.text)) {
      expect(body).not.toMatch(/\b(mg|mcg|dose|titration|stacking schedule)\b/i);
    }
  });

  it("empty retriever → no phantom cites; Lex education frame unchanged", async () => {
    process.env[FLAG] = "true";
    const turn = await educationCiteTurn({
      requestId: "req-edu-cites-empty",
      retrieveChunks: async () => ({ chunks: [], index_version: "test-empty" }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(EDUCATION_LISTING_EXPLANATION).toBe(
      "Here is the ViaConnect education on file for that topic."
    );
    expect(turn.text).toContain("text: Stored SS-31 mechanism on file.");
    expect(sourceBodies(turn.text)).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
    ]);
    expect(turn.text).not.toContain("cite_id: pmid:87654321");
    expect(turn.text).not.toMatch(/Retrieved from knowledge base|Supporting education/);
  });

  it("failed retrieve matches empty — no phantom cites", async () => {
    process.env[FLAG] = "true";
    const turn = await educationCiteTurn({
      requestId: "req-edu-cites-throw",
      retrieveChunks: async () => {
        throw new Error("retriever down");
      },
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(sourceBodies(turn.text)).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
    ]);
  });

  it("Semaglutide / depth frameworks still refuse even when chunks are present", async () => {
    process.env[FLAG] = "true";
    expect(detectSafetyRefuse("What education is on file for semaglutide?")).toBe("semaglutide");
    const sema = await resolveGroundedChatTurn({
      message: "What education is on file for semaglutide?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-edu-cites-sema",
      retrieveChunks: async () => ({
        chunks: [EXTRA_EDU_CHUNK],
        index_version: "test-sema",
      }),
    });
    expect(sema.kind).toBe("static");
    if (sema.kind === "static") {
      expect(sema.reason).toBe("safety_faq");
      expect(sema.text).toContain(FAQ.semaglutide);
      expect(sema.text).not.toContain("cite_id: pmid:87654321");
      expect(sema.text).not.toContain(DOSE_CHUNK_TEXT);
    }

    const depth = await resolveGroundedChatTurn({
      message: "Show the education topic depth-bpc157-framework",
      role: "consumer",
      userId: "user-1",
      requestId: "req-edu-cites-depth",
      getEducationAssemble: async () => ({
        loadStatus: "ok",
        topicId: "depth-bpc157-framework",
        education: null,
        blocked: "depth",
      }),
      retrieveChunks: async () => ({
        chunks: [EXTRA_EDU_CHUNK],
        index_version: "test-depth",
      }),
    });
    expect(depth.kind).toBe("static");
    if (depth.kind === "static") {
      expect(depth.reason).toBe("tool_refuse");
      expect(depth.text).not.toContain("cite_id: pmid:87654321");
      expect(depth.text).not.toContain("200 mcg");
    }
  });

  it("protocol / interactions / snp / peptide-only answers do not gain allowlist cite spray", async () => {
    process.env[FLAG] = "true";
    const spray = {
      chunks: [TOOL_PMID_CHUNK, EXTRA_EDU_CHUNK, SAFETY_CHUNK],
      index_version: "test-spray",
    };

    const protocol = await resolveGroundedChatTurn({
      message: "What is already listed on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-cites-protocol",
      advisorContextVariables: { currentSupplements: "NAD+ (1 capsule daily)" },
      retrieveChunks: async () => spray,
    });
    expect(protocol.kind).toBe("static");
    if (protocol.kind === "static") {
      expect(protocol.reason).toBe("assembled_from_tools");
      expect(protocol.requiredTools).toEqual(["get_protocol"]);
      expect(protocol.text).not.toContain("cite_id: pmid:87654321");
      expect(protocol.text).not.toContain(DOSE_CHUNK_TEXT);
      expect(protocol.text).not.toContain(EDUCATION_LISTING_EXPLANATION);
    }

    const interactions = await resolveGroundedChatTurn({
      message: "Does this interact with my warfarin?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-cites-interact",
      checkInteractionsAssemble: async () => ({
        interactions: [
          {
            medication: "Warfarin",
            interactsWith: "NAD+",
            severity: "moderate",
            mechanism: "engine mechanism",
            clinicalEffect: "engine effect",
            mitigation: "engine mitigation",
          },
        ],
        summary: { major: 0, moderate: 1, minor: 0, synergistic: 0 },
        blockedProducts: [],
      }),
      retrieveChunks: async () => spray,
    });
    expect(interactions.kind).toBe("static");
    if (interactions.kind === "static") {
      expect(interactions.requiredTools).toEqual(["check_interactions"]);
      expect(interactions.text).toContain(INTERACTIONS_LISTING_EXPLANATION);
      expect(interactions.text).not.toContain("cite_id: pmid:87654321");
      expect(interactions.text).not.toContain(DOSE_CHUNK_TEXT);
    }

    const snp = await resolveGroundedChatTurn({
      message: "What does rs1801133 mean on my genetic card?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-cites-snp",
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
      }),
      retrieveChunks: async () => spray,
    });
    expect(snp.kind).toBe("static");
    if (snp.kind === "static") {
      expect(snp.requiredTools).toEqual(["lookup_snp"]);
      expect(snp.text).toContain(SNP_LISTING_EXPLANATION);
      expect(snp.text).not.toContain("cite_id: pmid:87654321");
      expect(snp.text).not.toContain(DOSE_CHUNK_TEXT);
    }

    const peptide = await resolveGroundedChatTurn({
      message: "What does ViaConnect have on file for retatrutide peptide education?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-cites-peptide",
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
      retrieveChunks: async () => spray,
    });
    expect(peptide.kind).toBe("static");
    if (peptide.kind === "static") {
      expect(peptide.requiredTools).toEqual(["lookup_peptide"]);
      expect(peptide.text).toContain(PEPTIDE_LISTING_EXPLANATION);
      expect(peptide.text).not.toContain("cite_id: pmid:87654321");
      expect(peptide.text).not.toContain(DOSE_CHUNK_TEXT);
      expect(peptide.text).not.toMatch(/\b(mcg|mg)\b/);
    }
  });

  it("flag-off stays legacy; allow_generate stays hard false", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-edu-cites-off",
      getEducationAssemble: async () => SS31_OK,
      retrieveChunks: async () => ({
        chunks: [EXTRA_EDU_CHUNK],
        index_version: "test-off",
      }),
    });
    expect(turn.kind).toBe("legacy");
    expect(turn).not.toHaveProperty("text");
    expect(isAllowGenerateHardFalse()).toBe(true);
  });
});
