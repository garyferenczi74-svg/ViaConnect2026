import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ, VIA_CURA_DRAFT_BANNER } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import {
  EDUCATION_LISTING_EXPLANATION,
  assembleEducationListingText,
  detectSafetyRefuse,
} from "../refuse";
import {
  STAGE_A_AUTHORITIES_ALLOWLIST_MAX,
  STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX,
  assertStageAAllowlistCapsHeld,
} from "../authorities-cites";
import {
  STAGE_A_EDUCATION_ALLOWLIST,
  STAGE_A_RETRIEVER_ALLOWLIST,
  STAGE_A_RETRIEVER_ALLOWLIST_MAX,
  STAGE_A_SAFETY_NEVER_SAY_IDS,
} from "../education-allowlist";
import {
  citesFromRetrieverChunks,
  mergeEducationSourceLines,
} from "../retriever-cites";
import { retrieveGroundedChunks } from "../retriever";
import { isOffListSourceCite, rejectOffListCites } from "../sources-off-list";
import { isAllowGenerateHardFalse } from "../tool-router";
import {
  STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST,
  STAGE_A_VIACURA_SUPP_EDU_MAX,
  STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS,
  extractViacuraSupplementEduIds,
  isEducationShapedViacuraSupplementEduCite,
  isStageAViacuraSupplementEduId,
  mapViacuraSupplementEduToChunk,
} from "../viacura-supplement-edu";
import type { GetEducationData, RetrieverChunk } from "../types";
import type { GetEducationEnginePayload, GetEducationStoredRow } from "../get-education-assemble";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const NAD_CITE_ID = "edu-viacura:nad-plus";
const MTHFR_CITE_ID = "edu-viacura:mthfr-plus";
const CATALOG_INDEX_ID = "edu-viacura:catalog-index";
const RISE_CITE_ID = "edu-viacura:rise-plus";
const RELAX_CITE_ID = "edu-viacura:relax-plus";

const APPROVED_SLICE = [
  { cite_id: NAD_CITE_ID, label: "ViaCura Replenish NAD+", product_skus: ["NAD+", "Replenish NAD+"] },
  { cite_id: MTHFR_CITE_ID, label: "ViaCura MTHFR+", product_skus: ["MTHFR+"] },
  { cite_id: CATALOG_INDEX_ID, label: "ViaCura catalog", product_skus: [] },
  { cite_id: RISE_CITE_ID, label: "ViaCura RISE+", product_skus: ["RISE+"] },
  { cite_id: RELAX_CITE_ID, label: "ViaCura RELAX+", product_skus: ["RELAX+", "RELAX+ 2.0"] },
] as const;

const HELD_OUT_IDS = [
  "edu-viacura:creatine-hcl-hmb-fa",
  "edu-viacura:flex-plus",
  "edu-viacura:grow-plus",
  "edu-viacura:digestizorb-plus",
  "edu-viacura:magnesium-synergy-matrix",
  "edu-viacura:amino-acid-matrix",
  "edu-viacura:neurocalm-plus",
  "edu-viacura:tesofensine",
  "edu-viacura:bpc-157",
] as const;

const ADVERSARIAL_DOSE =
  "Take 5 mg twice daily — invented 10x absorption monograph, 28x PK fold, CT genotype, 12 sources.";

const SERMORELIN_DATA: GetEducationData = {
  topic_id: "edu-sermorelin",
  title: "Sermorelin",
  audience: "consumer",
  text: "Stored Sermorelin mechanism on file.",
  citations: [{ cite_id: "pmid:12345678", label: "PMID 12345678" }],
  safety_flags: ["edu_not_dx", "no_new_dose"],
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

function alreadyListedSection(text: string): string {
  const start = text.indexOf("2. What ViaConnect already listed");
  const end = text.indexOf("3. Sources");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

function assertNoDoseInvent(serialized: string): void {
  expect(serialized).not.toContain(ADVERSARIAL_DOSE);
  expect(serialized).not.toMatch(/\b(take 5 mg|10x absorption|28x|monograph|genotype|12 sources)\b/i);
  expect(serialized).not.toMatch(/\b(mg|mcg|dosage|Muscle lbs)\b/);
}

describe("Stage A ViaCura supplement-edu NEW GATE caps", () => {
  it("keeps a separate ≤5 lane and does not expand PeptideIQ edu+safety past 20", () => {
    expect(STAGE_A_VIACURA_SUPP_EDU_MAX).toBe(5);
    expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST.length).toBeGreaterThan(0);
    expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST.length).toBeLessThanOrEqual(5);
    expect(STAGE_A_SAFETY_NEVER_SAY_IDS).toHaveLength(5);
    expect(STAGE_A_EDUCATION_ALLOWLIST).toHaveLength(15);
    expect(STAGE_A_RETRIEVER_ALLOWLIST).toHaveLength(20);
    expect(STAGE_A_RETRIEVER_ALLOWLIST_MAX).toBe(20);
    expect(STAGE_A_AUTHORITIES_ALLOWLIST_MAX).toBe(15);
    expect(STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX).toBe(35);
    expect(assertStageAAllowlistCapsHeld()).toBe(true);
    for (const id of STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST) {
      expect(STAGE_A_EDUCATION_ALLOWLIST).not.toContain(id);
      expect(STAGE_A_RETRIEVER_ALLOWLIST).not.toContain(id);
    }
    expect([...STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST]).toEqual(APPROVED_SLICE.map((row) => row.cite_id));
    for (const row of APPROVED_SLICE) {
      const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[row.cite_id];
      expect(seed.label).toBe(row.label);
      expect([...seed.product_skus]).toEqual([...row.product_skus]);
      expect(seed.doc_type).toBe("education");
      expect(seed.audience).toBe("consumer");
      expect(seed.safety_flags).toEqual(["edu_not_dx", "no_new_dose"]);
      expect(seed.label).not.toMatch(/\b(mg|mcg|milligram)\b/i);
    }
    for (const id of HELD_OUT_IDS) {
      expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST).not.toContain(id);
      expect(isStageAViacuraSupplementEduId(id)).toBe(false);
    }
  });
});

describe("OFF-list carve — allowlist-exact only", () => {
  it("allows education-shaped allowlisted ViaCura cite_id+label and keeps via-?cura for others", () => {
    const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[MTHFR_CITE_ID];
    const allowed = { cite_id: seed.cite_id, label: seed.label };
    expect(isEducationShapedViacuraSupplementEduCite(allowed)).toBe(true);
    expect(isOffListSourceCite(allowed)).toBe(false);
    expect(rejectOffListCites([allowed])).toEqual([allowed]);
  });

  it("rejects non-allowlisted via-cura / Via Cura strings and clinician drafts", () => {
    const blocked = [
      { cite_id: "viacura-clinician-draft", label: "ViaCura" },
      { cite_id: "via-cura-brand-bleed", label: "Via Cura" },
      { cite_id: "edu-viacura:not-on-list", label: "MTHFR+" },
      { cite_id: MTHFR_CITE_ID, label: "ViaCura clinician draft" },
      { cite_id: MTHFR_CITE_ID, label: VIA_CURA_DRAFT_BANNER },
      { cite_id: "", label: "Via Cura" },
    ];
    for (const cite of blocked) {
      expect(isEducationShapedViacuraSupplementEduCite(cite)).toBe(false);
      expect(isOffListSourceCite(cite)).toBe(true);
    }
  });

  it("keeps Marshall / box / IG / FormaVision / hounddog_performance OFF", () => {
    const regression = [
      { cite_id: "marshall-draft-01", label: "Marshall draft" },
      { cite_id: "box-yt-digest", label: "Box digest" },
      { cite_id: "url:instagram.com/reel/1", label: "IG dump" },
      { cite_id: "formavision:glb", label: "FormaVision mesh" },
      { cite_id: "hounddog_performance", label: "rollup" },
    ];
    for (const cite of regression) {
      expect(isOffListSourceCite(cite)).toBe(true);
    }
  });
});

describe("ViaCura seed + retriever mapping", () => {
  it("maps allowlisted ids to consumer education chunks without invented bodies", () => {
    const chunk = mapViacuraSupplementEduToChunk(MTHFR_CITE_ID);
    expect(chunk).not.toBeNull();
    if (!chunk) return;
    expect(chunk.doc_type).toBe("education");
    expect(chunk.audience).toBe("consumer");
    expect(chunk.cite_id).toBe(MTHFR_CITE_ID);
    expect(chunk.text).toBe("");
    assertNoDoseInvent(JSON.stringify(chunk));
    const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[MTHFR_CITE_ID];
    expect(seed.safety_flags).toEqual(["edu_not_dx", "no_new_dose"]);
    expect(seed.product_skus).toEqual(["MTHFR+"]);
    const catalog = mapViacuraSupplementEduToChunk(CATALOG_INDEX_ID);
    expect(catalog?.cite_id).toBe(CATALOG_INDEX_ID);
    expect(catalog?.text).toBe("");
    expect(isStageAViacuraSupplementEduId(CATALOG_INDEX_ID)).toBe(true);
    expect(mapViacuraSupplementEduToChunk("edu-viacura:flex-plus")).toBeNull();
  });

  it("retrieves allowlisted ViaCura edu on explicit id / education ask only", async () => {
    const hit = await retrieveGroundedChunks({
      message: `Show the ViaConnect education on file for ${MTHFR_CITE_ID}`,
      role: "consumer",
      userId: "user-1",
    });
    expect(hit.chunks.some((chunk) => chunk.cite_id === MTHFR_CITE_ID)).toBe(true);
    expect(hit.chunks.every((chunk) => chunk.audience !== "clinician")).toBe(true);

    const bareSku = await retrieveGroundedChunks({
      message: "MTHFR+",
      role: "consumer",
      userId: "user-1",
    });
    expect(bareSku.chunks).toEqual([]);

    const miss = await retrieveGroundedChunks({
      message: "Show the ViaConnect education on file for edu-viacura:not-on-list",
      role: "consumer",
      userId: "user-1",
    });
    expect(miss.chunks.some((chunk) => chunk.cite_id.startsWith("edu-viacura:"))).toBe(false);
  });

  it("extracts explicit allowlisted ids and never invents dropped catalog-index", () => {
    expect(extractViacuraSupplementEduIds(`please cite ${MTHFR_CITE_ID}`)).toEqual([MTHFR_CITE_ID]);
    expect(extractViacuraSupplementEduIds("education topic MTHFR+")).toContain(MTHFR_CITE_ID);
    expect(extractViacuraSupplementEduIds(`education on file ${CATALOG_INDEX_ID}`)).toEqual([
      CATALOG_INDEX_ID,
    ]);
    expect(
      extractViacuraSupplementEduIds(
        "education on file for FLEX+ GROW+ Tesofensine BPC-157 NeuroCalm+ DigestiZorb+"
      )
    ).toEqual([]);
    expect(extractViacuraSupplementEduIds("")).toEqual([]);
  });
});

describe("cite≠dose — Sources attach on education success", () => {
  it("education assemble attaches allowlisted ViaCura cite_id+label only", () => {
    const chunk = mapViacuraSupplementEduToChunk(MTHFR_CITE_ID);
    expect(chunk).not.toBeNull();
    if (!chunk) return;
    const adversarial: RetrieverChunk = {
      ...chunk,
      text: ADVERSARIAL_DOSE,
    };
    const text = assembleEducationListingText({
      role: "consumer",
      data: SERMORELIN_DATA,
      sourceRoute: "peptide_education_entries / Stage A education allowlist",
      retrieverChunks: [adversarial],
    });
    const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[MTHFR_CITE_ID];
    expect(text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(sourcesSection(text)).toContain(`cite_id: ${seed.cite_id}; label: ${seed.label}`);
    expect(alreadyListedSection(text)).not.toContain(ADVERSARIAL_DOSE);
    expect(alreadyListedSection(text)).not.toContain(seed.cite_id);
    expect(text).not.toContain(ADVERSARIAL_DOSE);
    for (const body of sourceBodies(text)) {
      expect(body).not.toMatch(/\b(mg|mcg|dose|absorption|monograph|genotype)\b/i);
    }
  });

  it("rejects adversarial dose/PK/monograph cites and non-allowlisted ViaCura retriever chunks", () => {
    const poison: RetrieverChunk = {
      chunk_id: "via-cura-monograph",
      cite_id: "via-cura-monograph",
      doc_type: "education",
      text: ADVERSARIAL_DOSE,
      audience: "consumer",
    };
    const draft: RetrieverChunk = {
      chunk_id: "viacura-clinician-draft",
      cite_id: "viacura-clinician-draft",
      doc_type: "education",
      text: VIA_CURA_DRAFT_BANNER,
      audience: "clinician",
    };
    const doseLabel: RetrieverChunk = {
      chunk_id: ADVERSARIAL_DOSE,
      cite_id: MTHFR_CITE_ID,
      doc_type: "education",
      text: ADVERSARIAL_DOSE,
      audience: "consumer",
    };
    const cites = citesFromRetrieverChunks([poison, draft, doseLabel]);
    expect(cites).toEqual([]);
    expect(JSON.stringify(cites)).not.toContain(ADVERSARIAL_DOSE);
    expect(
      mergeEducationSourceLines({
        sourceRoute: "peptide_education_entries / Stage A education allowlist",
        toolCitations: SERMORELIN_DATA.citations,
        retrieverChunks: [poison, draft, doseLabel],
      })
    ).toEqual(["peptide_education_entries / Stage A education allowlist", "PMID 12345678"]);
  });

  it("empty ViaCura miss → no phantom cites", () => {
    expect(citesFromRetrieverChunks([])).toEqual([]);
    expect(
      mergeEducationSourceLines({
        sourceRoute: "peptide_education_entries / Stage A education allowlist",
        toolCitations: SERMORELIN_DATA.citations,
        retrieverChunks: [],
      })
    ).toEqual(["peptide_education_entries / Stage A education allowlist", "PMID 12345678"]);
  });
});

describe("chat-stub ViaCura supplement-edu — education success only", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("education success + allowlisted ViaCura chunk → Sources cite_id+label", async () => {
    process.env[FLAG] = "true";
    const chunk = mapViacuraSupplementEduToChunk(MTHFR_CITE_ID);
    expect(chunk).not.toBeNull();
    if (!chunk) return;
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-viacura-edu-ok",
      getEducationAssemble: async () => SS31_OK,
      loadAuthorityCites: async () => [],
      loadHounddogUrlCites: async () => [],
      retrieveChunks: async () => ({
        chunks: [{ ...chunk, text: ADVERSARIAL_DOSE }],
        index_version: "test-viacura-edu",
      }),
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    const seed = STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[MTHFR_CITE_ID];
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(turn.text).toContain(`cite_id: ${seed.cite_id}; label: ${seed.label}`);
    expect(alreadyListedSection(turn.text)).not.toContain(ADVERSARIAL_DOSE);
    expect(turn.text).not.toContain(ADVERSARIAL_DOSE);
    expect(turn.text).not.toContain("Retrieved from knowledge base:");
    expect(turn.text).not.toContain(VIA_CURA_DRAFT_BANNER);
  });

  it("flag-off stays legacy; ALLOW_GENERATE false; Semaglutide refuse unchanged", async () => {
    delete process.env[FLAG];
    const chunk = mapViacuraSupplementEduToChunk(MTHFR_CITE_ID);
    const off = await resolveGroundedChatTurn({
      message: `Show the ViaConnect education on file for edu-ss31 ${MTHFR_CITE_ID}`,
      role: "consumer",
      userId: "user-1",
      requestId: "req-viacura-edu-off",
      getEducationAssemble: async () => SS31_OK,
      retrieveChunks: async () => ({
        chunks: chunk ? [chunk] : [],
        index_version: "test-viacura-off",
      }),
    });
    expect(off.kind).toBe("legacy");
    expect(off).not.toHaveProperty("text");
    expect(isAllowGenerateHardFalse()).toBe(true);

    process.env[FLAG] = "true";
    expect(detectSafetyRefuse("What education is on file for semaglutide?")).toBe("semaglutide");
    const sema = await resolveGroundedChatTurn({
      message: "What education is on file for semaglutide?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-viacura-edu-sema",
      retrieveChunks: async () => ({
        chunks: chunk ? [chunk] : [],
        index_version: "test-viacura-sema",
      }),
    });
    expect(sema.kind).toBe("static");
    if (sema.kind === "static") {
      expect(sema.reason).toBe("safety_faq");
      expect(sema.text).toContain(FAQ.semaglutide);
      expect(sema.text).not.toContain(MTHFR_CITE_ID);
    }
  });
});

describe("ViaCura supplement-edu source locks", () => {
  it("keeps via-?cura in OFF_LIST_RE and only carves allowlisted cite_ids", () => {
    const offSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/sources-off-list.ts"),
      "utf8"
    );
    const viacuraSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/viacura-supplement-edu.ts"),
      "utf8"
    );
    const eduSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/education-allowlist.ts"),
      "utf8"
    );
    const flagSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/flag.ts"), "utf8");
    const routerSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/tool-router.ts"),
      "utf8"
    );
    const stageA = readFileSync(join(process.cwd(), "../docs/viaconnect-llm/STAGE-A.md"), "utf8");
    const contracts = readFileSync(
      join(process.cwd(), "../docs/viaconnect-llm/TOOL-CONTRACTS.md"),
      "utf8"
    );
    expect(offSrc).toContain("via-?cura");
    expect(offSrc).toMatch(/marshall\[-_ \]\?draft/);
    expect(offSrc).toContain("formavision");
    expect(offSrc).toContain("instagram\\.com");
    expect(offSrc).toContain("hounddog_performance");
    expect(offSrc).not.toMatch(/OFF_LIST_RE[\s\S]*via-?cura[\s\S]*replace/);
    expect(viacuraSrc).toContain("STAGE_A_VIACURA_SUPP_EDU_MAX = 5");
    expect(viacuraSrc).toContain("edu-viacura:mthfr-plus");
    expect(viacuraSrc).toContain(CATALOG_INDEX_ID);
    expect(viacuraSrc).toContain("ViaCura Replenish NAD+");
    expect(viacuraSrc).toContain("ViaCura RELAX+");
    expect(viacuraSrc).not.toMatch(/\b(10x|28x|take 5 mg|monograph body)\b/i);
    expect(viacuraSrc).not.toMatch(/edu-viacura:(flex-plus|grow-plus|tesofensine|bpc-157)/);
    expect(viacuraSrc).not.toMatch(/competitiveSkuSeeds|competitor_pricing|viacura_comparable/);
    expect(eduSrc).not.toContain("edu-viacura:");
    expect(eduSrc).not.toMatch(/STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST\s*=/);
    expect(flagSrc).not.toMatch(/LLM_GROUNDED_CHAT_ENABLED.*=.*true/);
    expect(routerSrc).toContain("const ALLOW_GENERATE = false");
    expect(stageA).toMatch(/STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST/);
    expect(stageA).toMatch(/combined extra cites still ≤35/);
    expect(stageA).toMatch(/CAQ comparison only/);
    expect(contracts).toMatch(/ViaCura supplement education is a separate ≤5 cite lane/);
    expect(contracts).toMatch(/CAQ comparison only/);
    expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[NAD_CITE_ID]?.label).toBe("ViaCura Replenish NAD+");
    expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[RISE_CITE_ID]?.label).toBe("ViaCura RISE+");
    expect(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS[RELAX_CITE_ID]?.label).toBe("ViaCura RELAX+");
  });

  it("keeps competitor comparison seeds out of Hannah ViaCura Sources", () => {
    const competitor = {
      cite_id: "competitor:caq-comparison-nad",
      label: "CAQ comparison NAD+",
    };
    expect(isStageAViacuraSupplementEduId(competitor.cite_id)).toBe(false);
    expect(isEducationShapedViacuraSupplementEduCite(competitor)).toBe(false);
    expect(mapViacuraSupplementEduToChunk(competitor.cite_id)).toBeNull();
    expect(
      extractViacuraSupplementEduIds("education on file for Thorne zinc picolinate CAQ comparison")
    ).toEqual([]);
    const laneCites = citesFromRetrieverChunks(
      STAGE_A_VIACURA_SUPPLEMENT_EDU_ALLOWLIST.map((id) => mapViacuraSupplementEduToChunk(id)).filter(
        (chunk): chunk is NonNullable<typeof chunk> => chunk !== null
      )
    );
    expect(laneCites).toHaveLength(5);
    expect(laneCites.every((cite) => isStageAViacuraSupplementEduId(cite.cite_id))).toBe(true);
    expect(JSON.stringify(laneCites)).not.toMatch(/competitor|thorne|pure encapsulations|life extension/i);
    for (const seed of Object.values(STAGE_A_VIACURA_SUPPLEMENT_EDU_SEEDS)) {
      expect(seed.label.startsWith("ViaCura")).toBe(true);
      expect(seed.label).not.toMatch(/competitor|thorne|pure encapsulations|life extension/i);
    }
  });
});
