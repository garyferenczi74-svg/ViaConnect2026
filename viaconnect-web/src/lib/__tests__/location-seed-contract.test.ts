import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase/migrations");
const file = readdirSync(dir).find((f) => f.includes("prompt_223_location_seeds"));

describe("prompt 223 location seeds", () => {
  it("records source and license in the migration comment", () => {
    expect(file).toBeTruthy();
    const sql = readFileSync(join(dir, file!), "utf8");
    expect(sql).toMatch(/public domain|CC0/i);
    expect(sql).toMatch(/naturalearth|census\.gov|ISO 3166/i);
    expect(sql).not.toMatch(/latitude|longitude|lat\b|lon\b|lng\b/i);
  });
  it("inserts the launch-market countries", () => {
    const sql = readFileSync(join(dir, file!), "utf8");
    expect(sql).toMatch(/'US'/);
    expect(sql).toMatch(/'CA'/);
    expect(sql).toMatch(/Canada/i);
    expect(sql).toMatch(/United States/i);
  });
});
