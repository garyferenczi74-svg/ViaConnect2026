/**
 * Prompt 226f: popularity-aware goal links + most-discussed pin.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PROMPT_226D_MIGRATIONS } from "@/lib/kb/migrations/embedded226d";
import { SUGGESTION_COPY_226D } from "@/lib/peptides/suggestionCopy226d";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Prompt 226f popularity corpus", () => {
  const mig = PROMPT_226D_MIGRATIONS.find((m) =>
    m.file.includes("226f_goal_link_popularity"),
  );

  it("embeds familiarity_rank migration", () => {
    expect(mig).toBeTruthy();
    expect(mig!.sql).toContain("familiarity_rank");
    expect(mig!.sql).toContain("226f-goal-link-popularity");
  });

  it("seeds weight popular compounds and sexual pt-141", () => {
    expect(mig!.sql).toContain("retatrutide");
    expect(mig!.sql).toContain("aod-9604");
    expect(mig!.sql).toContain("5-amino-1mq");
    expect(mig!.sql).toContain("pt-141-bremelanotide");
    expect(mig!.sql).toContain("'sexual_function'");
  });

  it("seeds separate energy sleep longevity athletic lists", () => {
    expect(mig!.sql).toContain("'energy_fatigue'");
    expect(mig!.sql).toContain("'sleep_quality'");
    expect(mig!.sql).toContain("'longevity_healthy_aging'");
    expect(mig!.sql).toContain("'athletic_performance'");
    expect(mig!.sql).toContain("ipamorelin-standalone");
    expect(mig!.sql).toContain("mots-c");
  });

  it("seed rationales avoid G28 forbidden lexicon tokens", () => {
    const lower = mig!.sql.toLowerCase();
    for (const bad of [
      "prescription",
      "prescribe",
      "protocol",
      "recommend",
      "recommendation",
      "regimen",
      "you should take",
      "best for you",
    ]) {
      expect(lower, bad).not.toMatch(new RegExp("\\b" + bad.replace(/\\s+/g, "\\s+") + "\\b"));
    }
  });

  it("never mentions banned GLP-1 brand string", () => {
    expect(mig!.sql.toLowerCase()).not.toMatch(/semaglutide/);
    expect(read("supabase/migrations/20260821200000_prompt_226f_goal_link_popularity.sql").toLowerCase()).not.toMatch(/semaglutide/);
  });

  it("UI exposes most discussed pin copy", () => {
    expect(SUGGESTION_COPY_226D.mostDiscussedTitle).toBe(
      "Most discussed for this goal",
    );
    const ui = read(
      "src/components/peptide-protocol/PeptideSuggestionsClient.tsx",
    );
    expect(ui).toContain("suggestion-most-discussed");
    expect(ui).toContain("mostDiscussedCompounds");
  });
});
