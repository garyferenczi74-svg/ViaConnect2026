import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ } from "../copy";
import { resolveGroundedChatTurn } from "../chat-stub";
import { LLM_GROUNDED_CHAT_FLAG } from "../flag";
import {
  EDUCATION_LISTING_EXPLANATION,
  assembleEducationListingText,
  detectSafetyRefuse,
} from "../refuse";
import {
  STAGE_A_AUTHORITIES_ALLOWLIST_MAX,
  STAGE_A_AUTHORITIES_CITE_ALLOWLIST,
  STAGE_A_AUTHORITIES_PARKED_DOMAINS,
  STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX,
  assertStageAAllowlistCapsHeld,
  citesFromApprovedAuthorityRows,
  fallbackAuthorityCites,
  loadApprovedAuthorityCites,
  mapAuthorityRowToCite,
} from "../authorities-cites";
import {
  STAGE_A_HOUNDDOG_URL_CITE_MAX,
  STAGE_A_HOUNDDOG_URL_CITES_ENABLED,
  citesFromHounddogResearchRows,
  loadHounddogUrlCites,
  mapHounddogRowToUrlCite,
} from "../hounddog-url-cites";
import {
  STAGE_A_EDUCATION_ALLOWLIST,
  STAGE_A_RETRIEVER_ALLOWLIST,
  STAGE_A_RETRIEVER_ALLOWLIST_MAX,
  STAGE_A_SAFETY_NEVER_SAY_IDS,
} from "../education-allowlist";
import { mergeEducationSourceLines } from "../retriever-cites";
import { isOffListSourceCite } from "../sources-off-list";
import { isAllowGenerateHardFalse } from "../tool-router";
import type { GetEducationData } from "../types";
import type { GetEducationEnginePayload, GetEducationStoredRow } from "../get-education-assemble";

const FLAG = LLM_GROUNDED_CHAT_FLAG;

const ABSTRACT_INVENT =
  "Randomized crossover of 88 adults found 12.4 mg oral Retatrutide stacking improved Muscle lbs.";

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

const PUBMED_CITE = {
  cite_id: "auth:pubmed.ncbi.nlm.nih.gov",
  label: "PubMed",
};

describe("Stage A Research Hub N lock", () => {
  it("holds edu+safety ≤20, authorities ≤15, combined ≤35, Hounddog ≤10", () => {
    expect(STAGE_A_SAFETY_NEVER_SAY_IDS).toHaveLength(5);
    expect(STAGE_A_EDUCATION_ALLOWLIST).toHaveLength(15);
    expect(STAGE_A_RETRIEVER_ALLOWLIST).toHaveLength(20);
    expect(STAGE_A_RETRIEVER_ALLOWLIST_MAX).toBe(20);
    expect(STAGE_A_AUTHORITIES_ALLOWLIST_MAX).toBe(15);
    expect(STAGE_A_RETRIEVER_COMBINED_ALLOWLIST_MAX).toBe(35);
    expect(STAGE_A_AUTHORITIES_CITE_ALLOWLIST).toHaveLength(12);
    expect(STAGE_A_HOUNDDOG_URL_CITE_MAX).toBe(10);
    expect(STAGE_A_HOUNDDOG_URL_CITES_ENABLED).toBe(false);
    expect(assertStageAAllowlistCapsHeld()).toBe(true);
  });

  it("parks remaining fallback domains until a NEW GATE", () => {
    const gated = new Set(STAGE_A_AUTHORITIES_CITE_ALLOWLIST.map((row) => row.domain));
    for (const domain of STAGE_A_AUTHORITIES_PARKED_DOMAINS) {
      expect(gated.has(domain)).toBe(false);
      expect(citesFromApprovedAuthorityRows([
        { domain, label: domain, is_active: true, approval_status: "approved" },
      ])).toEqual([]);
    }
    expect(fallbackAuthorityCites().map((cite) => cite.cite_id)).not.toContain("auth:who.int");
  });
});

describe("authorities cite lane", () => {
  it("maps approved+active allowlisted rows to auth: cite_id + stored label", () => {
    expect(
      citesFromApprovedAuthorityRows([
        {
          domain: "www.pubmed.ncbi.nlm.nih.gov",
          label: "PubMed",
          is_active: true,
          approval_status: "approved",
        },
        {
          domain: "fda.gov",
          label: "U.S. FDA",
          is_active: true,
          approval_status: "approved",
        },
        {
          domain: "who.int",
          label: "WHO",
          is_active: true,
          approval_status: "approved",
        },
        {
          domain: "nature.com",
          label: "Nature Portfolio",
          is_active: false,
          approval_status: "approved",
        },
        {
          domain: "nejm.org",
          label: "NEJM",
          is_active: true,
          approval_status: "rejected",
        },
      ])
    ).toEqual([
      { cite_id: "auth:pubmed.ncbi.nlm.nih.gov", label: "PubMed" },
      { cite_id: "auth:fda.gov", label: "U.S. FDA" },
    ]);
  });

  it("empty / miss → no phantom cites; fallback only when the READ loader is used", async () => {
    expect(citesFromApprovedAuthorityRows([])).toEqual([]);
    expect(citesFromApprovedAuthorityRows(undefined)).toEqual([]);
    expect(mapAuthorityRowToCite({ domain: "", label: "x" })).toBeNull();
    const fallback = await loadApprovedAuthorityCites(async () => []);
    expect(fallback.length).toBe(12);
    expect(fallback.every((cite) => cite.cite_id.startsWith("auth:"))).toBe(true);
  });

  it("caps authorities at 15 and never quotes notes/abstracts", () => {
    const overflow = STAGE_A_AUTHORITIES_CITE_ALLOWLIST.map((row) => ({
      domain: row.domain,
      label: row.label,
      is_active: true,
      approval_status: "approved" as const,
    })).concat(
      ["who.int", "cell.com", "a4m.com"].map((domain) => ({
        domain,
        label: ABSTRACT_INVENT,
        is_active: true,
        approval_status: "approved" as const,
      }))
    );
    const cites = citesFromApprovedAuthorityRows(overflow);
    expect(cites.length).toBeLessThanOrEqual(STAGE_A_AUTHORITIES_ALLOWLIST_MAX);
    expect(cites).toHaveLength(12);
    expect(JSON.stringify(cites)).not.toContain(ABSTRACT_INVENT);
    expect(JSON.stringify(cites)).not.toMatch(/\b(mg|mcg|Muscle lbs)\b/);
  });
});

describe("optional Hounddog URL cites", () => {
  const okRow = {
    id: "stg-1",
    title: "Peptide Society education brief",
    source_url: "https://www.peptidesociety.org/education/sermorelin",
    topic_key: "hounddog_research",
    relevance_score: 72,
    summary: "Take 10 mg twice daily — invented digest body.",
  };

  it("default OFF returns no cites even when rows are eligible", async () => {
    expect(STAGE_A_HOUNDDOG_URL_CITES_ENABLED).toBe(false);
    expect(citesFromHounddogResearchRows([okRow])).toEqual([]);
    expect(await loadHounddogUrlCites({ rows: [okRow] })).toEqual([]);
  });

  it("enabled + score≥50 non-GLP → url cite_id + title/host only", () => {
    expect(citesFromHounddogResearchRows([okRow], { enabled: true })).toEqual([
      {
        cite_id: "url:peptidesociety.org/education/sermorelin",
        label: "Peptide Society education brief",
      },
    ]);
    expect(mapHounddogRowToUrlCite(okRow)?.label).not.toContain("10 mg");
  });

  it("score<50, GLP, Semaglutide, or missing URL → no cite", () => {
    expect(
      citesFromHounddogResearchRows(
        [
          { ...okRow, relevance_score: 49 },
          {
            ...okRow,
            id: "glp",
            title: "GLP-1 recap",
            source_url: "https://example.com/glp1",
          },
          {
            ...okRow,
            id: "sema",
            title: "Semaglutide recap",
            source_url: "https://example.com/sema",
          },
          { ...okRow, id: "nourl", source_url: "" },
        ],
        { enabled: true }
      )
    ).toEqual([]);
  });

  it("never uses digest/summary body and caps at 10", () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      ...okRow,
      id: `stg-${index}`,
      source_url: `https://peptidesociety.org/edu/${index}`,
      title: `Education brief ${index}`,
      summary: ABSTRACT_INVENT,
    }));
    const cites = citesFromHounddogResearchRows(rows, { enabled: true });
    expect(cites).toHaveLength(STAGE_A_HOUNDDOG_URL_CITE_MAX);
    expect(JSON.stringify(cites)).not.toContain(ABSTRACT_INVENT);
    expect(JSON.stringify(cites)).not.toContain("hounddog_performance");
  });
});

describe("OFF lists never enter Sources", () => {
  it("rejects Marshall / box digest / IG / ViaCura / FormaVision keys", () => {
    const blocked = [
      { cite_id: "marshall-draft-01", label: "Marshall draft" },
      { cite_id: "peptide-education-staging:edu-x", label: "staging" },
      { cite_id: "box-yt-digest", label: "Box digest" },
      { cite_id: "url:instagram.com/reel/1", label: "IG dump" },
      { cite_id: "viacura-clinician-draft", label: "ViaCura" },
      { cite_id: "formavision:glb", label: "FormaVision mesh" },
      { cite_id: "hounddog_performance", label: "rollup" },
    ];
    for (const cite of blocked) {
      expect(isOffListSourceCite(cite)).toBe(true);
    }
    expect(
      mergeEducationSourceLines({
        sourceRoute: "peptide_education_entries / Stage A education allowlist",
        toolCitations: SERMORELIN_DATA.citations,
        authorityCites: [
          { cite_id: "auth:who.int", label: "WHO" },
          { cite_id: "formavision:scan", label: "FormaVision" },
          PUBMED_CITE,
        ],
        hounddogUrlCites: [
          { cite_id: "url:instagram.com/p/1", label: "IG dump" },
          { cite_id: "url:peptidesociety.org/edu", label: "Peptide Society education brief" },
        ],
      })
    ).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
      "cite_id: auth:pubmed.ncbi.nlm.nih.gov; label: PubMed",
      "cite_id: url:peptidesociety.org/edu; label: Peptide Society education brief",
    ]);
  });
});

describe("education success attach — Research Hub cites", () => {
  afterEach(() => {
    delete process.env[FLAG];
  });

  it("education success + authorities → Sources include auth: cite_id+label", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-auth-cites-ok",
      getEducationAssemble: async () => SS31_OK,
      loadAuthorityCites: async () => [PUBMED_CITE],
      loadHounddogUrlCites: async () => [],
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(turn.reason).toBe("assembled_from_tools");
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
    expect(turn.text).toContain("cite_id: auth:pubmed.ncbi.nlm.nih.gov; label: PubMed");
    expect(alreadyListedSection(turn.text)).not.toContain(ABSTRACT_INVENT);
    expect(alreadyListedSection(turn.text)).not.toContain("auth:pubmed");
    expect(turn.text).not.toContain("Retrieved from knowledge base:");
    expect(turn.text).not.toContain("Supporting education:");
    expect(turn.text).not.toMatch(/\b(10 mg|oral Retatrutide|Muscle lbs)\b/);
  });

  it("empty authorities → no phantom auth cites; Lex frame unchanged", async () => {
    process.env[FLAG] = "true";
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-auth-cites-empty",
      getEducationAssemble: async () => SS31_OK,
      loadAuthorityCites: async () => [],
      loadHounddogUrlCites: async () => [],
    });
    expect(turn.kind).toBe("static");
    if (turn.kind !== "static") return;
    expect(sourceBodies(turn.text)).toEqual([
      "peptide_education_entries / Stage A education allowlist",
      "PMID 12345678",
    ]);
    expect(turn.text).not.toContain("auth:");
    expect(turn.text).toContain(EDUCATION_LISTING_EXPLANATION);
  });

  it("optional Hounddog on education success; Semaglutide still refuses", async () => {
    process.env[FLAG] = "true";
    const hounddog = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-hd-cites-ok",
      getEducationAssemble: async () => SS31_OK,
      loadAuthorityCites: async () => [],
      loadHounddogUrlCites: async () => [
        {
          cite_id: "url:peptidesociety.org/education/sermorelin",
          label: "Peptide Society education brief",
        },
      ],
    });
    expect(hounddog.kind).toBe("static");
    if (hounddog.kind === "static") {
      expect(hounddog.text).toContain(
        "cite_id: url:peptidesociety.org/education/sermorelin; label: Peptide Society education brief"
      );
      expect(hounddog.text).not.toContain("Take 10 mg");
    }

    expect(detectSafetyRefuse("What education is on file for semaglutide?")).toBe("semaglutide");
    const sema = await resolveGroundedChatTurn({
      message: "What education is on file for semaglutide?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-hd-cites-sema",
      loadAuthorityCites: async () => [PUBMED_CITE],
      loadHounddogUrlCites: async () => [
        {
          cite_id: "url:peptidesociety.org/education/sermorelin",
          label: "Peptide Society education brief",
        },
      ],
    });
    expect(sema.kind).toBe("static");
    if (sema.kind === "static") {
      expect(sema.reason).toBe("safety_faq");
      expect(sema.text).toContain(FAQ.semaglutide);
      expect(sema.text).not.toContain("auth:pubmed");
      expect(sema.text).not.toContain("url:peptidesociety.org");
    }
  });

  it("protocol-only answers do not gain Research Hub cite spray", async () => {
    process.env[FLAG] = "true";
    const protocol = await resolveGroundedChatTurn({
      message: "What is already listed on my protocol?",
      role: "consumer",
      userId: "user-1",
      requestId: "req-auth-protocol",
      advisorContextVariables: { currentSupplements: "NAD+ (1 capsule daily)" },
      loadAuthorityCites: async () => [PUBMED_CITE],
      loadHounddogUrlCites: async () => [
        {
          cite_id: "url:peptidesociety.org/education/sermorelin",
          label: "Peptide Society education brief",
        },
      ],
    });
    expect(protocol.kind).toBe("static");
    if (protocol.kind === "static") {
      expect(protocol.requiredTools).toEqual(["get_protocol"]);
      expect(protocol.text).not.toContain("auth:pubmed");
      expect(protocol.text).not.toContain("url:peptidesociety.org");
    }
  });

  it("assemble never quotes Research Hub / Hounddog bodies into alreadyListed", () => {
    const text = assembleEducationListingText({
      role: "consumer",
      data: SERMORELIN_DATA,
      sourceRoute: "peptide_education_entries / Stage A education allowlist",
      authorityCites: [{ cite_id: "auth:nih.gov", label: "NIH" }],
      hounddogUrlCites: [
        {
          cite_id: "url:peptidesociety.org/education/sermorelin",
          label: "Peptide Society education brief",
        },
      ],
    });
    expect(alreadyListedSection(text)).not.toContain("NIH");
    expect(alreadyListedSection(text)).not.toContain("Peptide Society");
    expect(alreadyListedSection(text)).not.toContain(ABSTRACT_INVENT);
    expect(sourcesSection(text)).toContain("cite_id: auth:nih.gov; label: NIH");
    expect(sourcesSection(text)).toContain(
      "cite_id: url:peptidesociety.org/education/sermorelin; label: Peptide Society education brief"
    );
  });

  it("flag-off stays legacy; allow_generate stays hard false; FAQ keys unchanged", async () => {
    delete process.env[FLAG];
    const turn = await resolveGroundedChatTurn({
      message: "Show the ViaConnect education on file for edu-ss31",
      role: "consumer",
      userId: "user-1",
      requestId: "req-auth-cites-off",
      getEducationAssemble: async () => SS31_OK,
      loadAuthorityCites: async () => [PUBMED_CITE],
    });
    expect(turn.kind).toBe("legacy");
    expect(turn).not.toHaveProperty("text");
    expect(isAllowGenerateHardFalse()).toBe(true);
    expect(Object.keys(FAQ)).toEqual(
      expect.arrayContaining(["toolFailed", "outOfScope", "semaglutide"])
    );
    expect(Object.keys(FAQ)).not.toContain("researchHub");
    expect(Object.keys(FAQ)).not.toContain("hounddog");
  });
});

describe("Research Hub cite source locks", () => {
  it("READ-only helpers; no HTTP loopback, table writes, flag flip, or dose invent", () => {
    const authSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/authorities-cites.ts"),
      "utf8"
    );
    const hdSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/hounddog-url-cites.ts"),
      "utf8"
    );
    const stubSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/chat-stub.ts"),
      "utf8"
    );
    const flagSrc = readFileSync(join(process.cwd(), "src/lib/jeffery/grounded/flag.ts"), "utf8");
    const routerSrc = readFileSync(
      join(process.cwd(), "src/lib/jeffery/grounded/tool-router.ts"),
      "utf8"
    );
    expect(authSrc).toContain("authorities_sources");
    expect(authSrc).toContain("approval_status");
    expect(authSrc).toContain("is_active");
    expect(authSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\//);
    expect(authSrc).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(hdSrc).toContain("STAGE_A_HOUNDDOG_URL_CITES_ENABLED = false");
    expect(hdSrc).toContain("hounddog_research");
    expect(hdSrc).not.toContain("hounddog_performance");
    expect(hdSrc).not.toMatch(/fetch\s*\(\s*["'`][^"'`]*\/api\//);
    expect(stubSrc).toContain("authorityCites");
    expect(stubSrc).toContain("education.ok === true");
    expect(flagSrc).not.toMatch(/LLM_GROUNDED_CHAT_ENABLED.*=.*true/);
    expect(routerSrc).toContain("const ALLOW_GENERATE = false");
  });
});
