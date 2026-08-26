import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENT_IDS, ACC_SEAT_COUNT as TYPES_ACC_SEAT_COUNT } from "@/lib/agents/types";
import { orderedRegistry } from "@/lib/agents/registry";
import {
  ACC_SEAT_COUNT,
  displayJefferyJson,
  formatAccRosterReviewedPhrase,
  formatEvolutionReportSummary,
  rewriteJefferyHeadcountCopy,
} from "../accSeatAuthority";

const root = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** 25 Aug 2026 Admin walk of /admin/jeffery Live Feed. */
const WALK_25_AUG =
  "Reviewed 22 agents, processed 0 lessons, 0 agents flagged, 0 decisions reviewed.";

describe("Brief 39 ACC seat authority", () => {
  it("ACC seat count is 17 and matches the Command Center registry", () => {
    expect(ACC_SEAT_COUNT).toBe(17);
    expect(TYPES_ACC_SEAT_COUNT).toBe(17);
    expect(AGENT_IDS).toHaveLength(17);
    expect(orderedRegistry()).toHaveLength(17);
    expect(orderedRegistry()).toHaveLength(ACC_SEAT_COUNT);
  });

  it("rewrites the 25 Aug walk string off 22 and onto ACC 17", () => {
    const out = rewriteJefferyHeadcountCopy(WALK_25_AUG);
    expect(out).toBe(
      "Reviewed the ACC roster (17), processed 0 lessons, 0 agents flagged, 0 decisions reviewed.",
    );
    expect(out).not.toMatch(/22\s+agents/);
    expect(out).not.toContain("Reviewed 22");
    expect(out).toContain("17");
  });

  it("keeps a matching ACC review as Reviewed 17 agents", () => {
    expect(rewriteJefferyHeadcountCopy("Reviewed 17 agents, processed 1 lessons.")).toBe(
      "Reviewed 17 agents, processed 1 lessons.",
    );
  });

  it("says N of 17 when the job reviewed a subset", () => {
    expect(formatAccRosterReviewedPhrase(5)).toBe("Reviewed 5 of 17 agents");
    expect(rewriteJefferyHeadcountCopy("Reviewed 5 agents")).toBe("Reviewed 5 of 17 agents");
  });

  it("drops any non-ACC headcount, including 22, without inventing a second noun", () => {
    expect(formatAccRosterReviewedPhrase(22)).toBe("Reviewed the ACC roster (17)");
    expect(formatAccRosterReviewedPhrase(18)).toBe("Reviewed the ACC roster (17)");
    expect(rewriteJefferyHeadcountCopy("Flagged 22 agents in the weekly pass")).toBe(
      "Flagged the ACC roster (17) in the weekly pass",
    );
  });

  it("writer summary never prints Reviewed 22 agents", () => {
    expect(
      formatEvolutionReportSummary({
        reviewedCount: 22,
        lessonsProcessed: 0,
        agentsFlagged: 0,
        decisionsReviewed: 0,
      }),
    ).toBe(
      "Reviewed the ACC roster (17), processed 0 lessons, 0 agents flagged, 0 decisions reviewed.",
    );
    expect(
      formatEvolutionReportSummary({
        reviewedCount: 17,
        lessonsProcessed: 0,
        agentsFlagged: 2,
        decisionsReviewed: 1,
      }),
    ).toBe(
      "Reviewed 17 agents, processed 0 lessons, 2 agents flagged, 1 decisions reviewed.",
    );
  });

  it("rewrites stored evolution JSON agents_reviewed: 22 for display only", () => {
    const json = displayJefferyJson({
      flagged: [],
      flags_raised: 0,
      agents_reviewed: 22,
      lessons_applied: 0,
      snapshots_written: 22,
      decisions_reviewed: 0,
    });
    expect(json).toContain("ACC roster: 17");
    expect(json).not.toMatch(/agents_reviewed"\s*:\s*22/);
    expect(json).not.toMatch(/22\s+agents/);
    // snapshots stay; that is not the header "agents" noun
    expect(json).toContain('"snapshots_written": 22');
  });

  it("Evolution Timeline agents_reviewed: 22.00 line becomes ACC 17", () => {
    const line = rewriteJefferyHeadcountCopy("agents_reviewed: 22.00");
    expect(line).toBe("ACC roster: 17");
  });
});

describe("Brief 39 page + writer locks", () => {
  it("header Agents badge stays ACC registry length, not ultrathink", () => {
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(client).toContain("agentRegistry.length");
    expect(client).not.toMatch(/ultrathink_agent_registry/);
    expect(client).toContain("Jeffery Online");
  });

  it("Live Feed / MessageCard / Evolution / Review Queue apply the rewrite", () => {
    const card = read("src/components/admin/jeffery/MessageCard.tsx");
    const feed = read("src/components/admin/jeffery/LiveFeed.tsx");
    const evo = read("src/components/admin/jeffery/EvolutionTimeline.tsx");
    const queue = read("src/components/admin/jeffery/ReviewQueue.tsx");
    expect(card).toContain("rewriteJefferyHeadcountCopy");
    expect(feed).toContain("displayJefferyJson");
    expect(feed).toContain("displayJefferyJson(msg.detail)");
    expect(feed).toContain("displayJefferyJson(msg.proposed_action)");
    expect(feed).not.toMatch(/JSON\.stringify\(\s*msg\.proposed_action/);
    expect(evo).toContain("rewriteJefferyHeadcountCopy");
    expect(evo).toContain("formatAccRosterReviewedPhrase");
    expect(queue).toContain("displayJefferyJson");
  });

  it("self-evolution writer binds public headcount to ACC 17, not registry length", () => {
    const src = read("supabase/functions/jeffery-self-evolution/index.ts");
    expect(src).toContain("const ACC_SEAT_COUNT = 17");
    expect(src).toContain("Reviewed the ACC roster (${ACC_SEAT_COUNT})");
    expect(src).not.toMatch(/Reviewed \$\{.*agents \?\? \[\]/);
    expect(src).not.toMatch(/p_metric_value:\s*\(agents \?\? \[\]\)\.length/);
    expect(src).toContain("p_metric_value: ACC_SEAT_COUNT");
    expect(src).toContain("jeffery_emit_message");
    expect(src).toContain("Weekly Evolution Report");
  });

  it("does not invent a healthier feed or touch the Online pill", () => {
    const client = read("src/app/(app)/admin/jeffery/JefferyClient.tsx");
    expect(client).toContain("Jeffery Online");
    expect(client).toContain("bg-emerald-500");
    const authority = read("src/lib/jeffery/accSeatAuthority.ts");
    expect(authority).toContain("Does not write the database");
    expect(authority).not.toMatch(/createTick|invent.*tick/i);
  });
});
