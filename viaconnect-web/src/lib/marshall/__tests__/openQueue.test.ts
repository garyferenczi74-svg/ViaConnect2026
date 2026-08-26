import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countOpenQueue,
  filterOpenQueue,
  selectOpenQueueFindings,
  type JefferyOpenQueueRow,
} from "../openQueue";
import { sanitizeConsentCopy } from "@/lib/compliance/consentCopy";

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** 25 Aug 2026 walk: Jeffery Live Feed still lists these June P0s as AWAITING REVIEW. */
function consentP0(id: string, createdAt: string): JefferyOpenQueueRow {
  return {
    id,
    status: "pending",
    severity: "critical",
    title: "Marshall P0: MARSHALL.GENETIC.GENEX360_CONSENT",
    summary: "Finding: GeneX360 report attempt without valid vundefined consent (have: none).",
    detail: {
      findingId: `M-2026-0603-${id}`,
      ruleId: "MARSHALL.GENETIC.GENEX360_CONSENT",
    },
    created_at: createdAt,
    source_agent: "marshall",
  };
}

const WALK_JUNE_P0S: JefferyOpenQueueRow[] = [
  consentP0("a", "2026-06-10T14:20:28.000Z"),
  consentP0("b", "2026-06-10T14:20:14.000Z"),
  consentP0("c", "2026-06-03T15:40:12.000Z"),
];

const KEY_ERROR: JefferyOpenQueueRow = {
  id: "key-1",
  status: "pending",
  severity: "critical",
  title: "Advisor chat error (consumer)",
  summary: "ANTHROPIC_API_KEY not set",
  detail: { error: "ANTHROPIC_API_KEY not set" },
  created_at: "2026-06-13T12:00:00.000Z",
  source_agent: "hannah",
};

describe("Brief 41 Marshall open queue", () => {
  it("if an AWAITING REVIEW P0 exists, Marshall P0 count is not 0", () => {
    const listed = selectOpenQueueFindings(WALK_JUNE_P0S);
    const counts = countOpenQueue(listed);
    expect(counts.p0).not.toBe(0);
    expect(counts.p0).toBe(3);
    expect(counts.open).toBe(3);
  });

  it("Open N equals the listed real rows", () => {
    const mixed: JefferyOpenQueueRow[] = [
      ...WALK_JUNE_P0S,
      KEY_ERROR,
      {
        id: "p1",
        status: "pending",
        severity: "review_required",
        title: "Marshall P1: MARSHALL.GENETIC.DEIDENTIFICATION_CHECK",
        summary: "k=2",
        detail: { ruleId: "MARSHALL.GENETIC.DEIDENTIFICATION_CHECK" },
        created_at: "2026-08-01T00:00:00.000Z",
        source_agent: "marshall",
      },
      {
        id: "resolved",
        status: "approved",
        severity: "critical",
        title: "Marshall P0: MARSHALL.GENETIC.GENEX360_CONSENT",
        summary: "already reviewed",
        detail: { ruleId: "MARSHALL.GENETIC.GENEX360_CONSENT" },
        created_at: "2026-08-20T00:00:00.000Z",
        source_agent: "marshall",
      },
    ];
    const listed = selectOpenQueueFindings(mixed);
    const counts = countOpenQueue(listed);
    expect(counts.open).toBe(listed.length);
    expect(counts.open).toBe(4);
    expect(counts.p0).toBe(3);
    expect(counts.p1).toBe(1);
    expect(listed.every((row) => row.ruleId.startsWith("MARSHALL."))).toBe(true);
    expect(listed.some((row) => row.summary.includes("ANTHROPIC_API_KEY"))).toBe(false);
  });

  it("does not invent findings when the queue is empty", () => {
    const listed = selectOpenQueueFindings([]);
    const counts = countOpenQueue(listed);
    expect(counts).toEqual({ p0: 0, p1: 0, open: 0 });
    expect(listed).toEqual([]);
  });

  it("P0 filter lists only those P0 rows", () => {
    const listed = filterOpenQueue(selectOpenQueueFindings(WALK_JUNE_P0S), "P0");
    expect(listed).toHaveLength(3);
    expect(countOpenQueue(listed).p0).toBe(listed.length);
  });

  it("rewrites stored vundefined on open-queue summaries", () => {
    const listed = selectOpenQueueFindings(WALK_JUNE_P0S);
    for (const row of listed) {
      expect(row.summary).not.toContain("vundefined");
      expect(row.summary).toContain("have: none");
      expect(row.summary).toContain("valid none consent");
    }
  });
});

describe("Brief 41 page locks", () => {
  it("Marshall landing binds P0 / P1 / Open to jeffery_messages pending, not a 30d findings window", () => {
    const page = read("src/app/(app)/admin/marshall/page.tsx");
    expect(page).toContain('from("jeffery_messages")');
    expect(page).toContain('eq("status", "pending")');
    expect(page).toContain("selectOpenQueueFindings");
    expect(page).toContain("countOpenQueue");
    expect(page).toContain('href="/admin/marshall/findings?queue=open"');
    expect(page).not.toMatch(/compliance_findings"\)\.select\("id".*severity.*P0/);
    expect(page).not.toContain(".eq(\"severity\", \"P0\").gte(\"created_at\", since)");
  });

  it("Open findings list uses the same open-queue selectors", () => {
    const findings = read("src/app/(app)/admin/marshall/findings/page.tsx");
    expect(findings).toContain('params.queue === "open"');
    expect(findings).toContain("selectOpenQueueFindings");
    expect(findings).toContain("filterOpenQueue");
    expect(findings).toContain("sanitizeConsentCopy");
  });

  it("useMarshallStatus shares the Jeffery pending bind", () => {
    const hook = read("src/hooks/useMarshallStatus.ts");
    expect(hook).toContain('from("jeffery_messages")');
    expect(hook).toContain('eq("status", "pending")');
    expect(hook).toContain("selectOpenQueueFindings");
    expect(hook).not.toContain("24 * 60 * 60 * 1000");
  });

  it("source never prints vundefined on Marshall or Jeffery consent copy", () => {
    const genetic = read("src/lib/compliance/rules/genetic.ts");
    const page = read("src/app/(app)/admin/marshall/page.tsx");
    const findings = read("src/app/(app)/admin/marshall/findings/page.tsx");
    const card = read("src/components/admin/jeffery/MessageCard.tsx");
    const feed = read("src/components/admin/jeffery/LiveFeed.tsx");
    expect(genetic).not.toContain("v${input.requiredVersion}");
    expect(genetic).toContain("formatRequiredConsentPhrase");
    expect(`${page}${findings}${card}${feed}`).not.toContain("vundefined");
    expect(sanitizeConsentCopy("without valid vundefined consent (have: none).")).toBe(
      "without valid none consent (have: none).",
    );
  });

  it("Jeffery Live Feed collapses duplicate KEY rows and sanitizes consent copy", () => {
    const feed = read("src/components/admin/jeffery/LiveFeed.tsx");
    const card = read("src/components/admin/jeffery/MessageCard.tsx");
    expect(feed).toContain("collapseDuplicateKeyErrors");
    expect(feed).toContain("sanitizeConsentCopy");
    expect(card).toContain("sanitizeConsentCopy");
  });
});
