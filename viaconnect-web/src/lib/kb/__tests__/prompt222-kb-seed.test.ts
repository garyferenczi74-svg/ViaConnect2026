import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HEADSUP_KB_TITLES } from "../competitorAppPayload";

const SEED_MIGRATION = resolve(
  __dirname,
  "../../../../supabase/migrations/20260820121100_prompt_222_headsup_kb_seed.sql"
);

describe("prompt222 kb seed", () => {
  it("exports five exact Heads Up KB titles", () => {
    expect(HEADSUP_KB_TITLES).toHaveLength(5);
    expect(HEADSUP_KB_TITLES).toEqual([
      "Heads Up Health platform overview",
      "Heads Up Health feature matrix",
      "Heads Up Health integration inventory",
      "Heads Up Health pricing structure",
      "Heads Up Health review themes",
    ]);
  });

  it("seed SQL inserts competitor_app rows with consumer isolation flags", () => {
    const sql = readFileSync(SEED_MIGRATION, "utf8");
    for (const title of HEADSUP_KB_TITLES) {
      expect(sql).toContain(title);
    }
    expect(sql).toMatch(/internal_strategy/);
    expect(sql).not.toMatch(/[\u2013\u2014]/);

    // Assert INSERT/VALUES literals (not header comments alone).
    const inserts = sql.match(/INSERT\s+INTO\s+public\.kb_items\b/gi) ?? [];
    expect(inserts).toHaveLength(5);
    const payloadFlags =
      sql.match(/'competitor_app',\s*false,\s*false/g) ?? [];
    expect(payloadFlags).toHaveLength(5);
    const gradeVerdictGate =
      sql.match(/'E',\s*'approved',\s*'needs_human'/g) ?? [];
    expect(gradeVerdictGate).toHaveLength(5);
  });
});
