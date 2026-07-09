/**
 * Fixture-driven test for scripts/schema/scan-code-refs.mjs (210d P3-2).
 *
 * Spawns the real CLI against a temp fixture tree: a mini live-types.ts
 * (one table, one view), mini db-functions.json and buckets.json, and a
 * src file referencing both real and phantom names. Asserts:
 *   1. a broken baseline path is a hard failure (failure detection proof)
 *   2. a non-baselined phantom ref exits 1 and is named on stdout
 *   3. a fully baselined run exits 0
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/schema/scan-code-refs.mjs", import.meta.url),
);

const LIVE_TYPES_FIXTURE = [
  "export type Database = {",
  "  public: {",
  "    Tables: {",
  "      real_table: {",
  "        Row: {",
  "          id: string",
  "        }",
  "      }",
  "    }",
  "    Views: {",
  "      real_view: {",
  "        Row: {",
  "          id: string",
  "        }",
  "      }",
  "    }",
  "  }",
  "}",
  "",
].join("\n");

const EXAMPLE_SOURCE_FIXTURE = [
  "type QueryResult = { select: (columns: string) => unknown };",
  "type FixtureClient = {",
  "  from: (table: string) => QueryResult;",
  "  rpc: (fn: string) => unknown;",
  "  storage: { from: (bucket: string) => unknown };",
  "};",
  "",
  "export function demo(supabase: FixtureClient): string[] {",
  "  supabase.from('real_table').select('*');",
  "  supabase.from('phantom_table').select('*');",
  "  supabase.rpc('real_fn');",
  "  supabase.rpc('phantom_fn');",
  "  supabase.storage.from('real-bucket');",
  "  supabase.storage.from('phantom-bucket');",
  "  return Array.from('not_a_table');",
  "}",
  "",
].join("\n");

interface BaselineEntry {
  kind: string;
  name: string;
}

function writeBaseline(path: string, entries: BaselineEntry[]): void {
  writeFileSync(path, JSON.stringify({ comment: "fixture baseline", entries }, null, 2));
}

function runScanner(cwd: string, extraArgs: string[]) {
  return spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--snapshot", join(cwd, "snapshot"), ...extraArgs],
    { cwd, encoding: "utf8" },
  );
}

describe("scan-code-refs CLI", () => {
  let fixtureDir = "";
  let partialBaselinePath = "";
  let fullBaselinePath = "";

  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), "scan-code-refs-"));
    mkdirSync(join(fixtureDir, "snapshot"), { recursive: true });
    mkdirSync(join(fixtureDir, "src"), { recursive: true });

    writeFileSync(join(fixtureDir, "snapshot", "live-types.ts"), LIVE_TYPES_FIXTURE);
    writeFileSync(
      join(fixtureDir, "snapshot", "db-functions.json"),
      JSON.stringify([{ proname: "real_fn", args: "", returns: "void" }]),
    );
    writeFileSync(
      join(fixtureDir, "snapshot", "buckets.json"),
      JSON.stringify([{ id: "real-bucket", name: "real-bucket", public: false }]),
    );
    writeFileSync(join(fixtureDir, "src", "example.ts"), EXAMPLE_SOURCE_FIXTURE);

    partialBaselinePath = join(fixtureDir, "baseline-partial.json");
    writeBaseline(partialBaselinePath, [
      { kind: "rpc", name: "phantom_fn" },
      { kind: "bucket", name: "phantom-bucket" },
    ]);

    fullBaselinePath = join(fixtureDir, "baseline-full.json");
    writeBaseline(fullBaselinePath, [
      { kind: "bucket", name: "phantom-bucket" },
      { kind: "rpc", name: "phantom_fn" },
      { kind: "table", name: "phantom_table" },
    ]);
  });

  afterAll(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("fails hard when the baseline path does not exist", () => {
    const result = runScanner(fixtureDir, [
      "--baseline",
      join(fixtureDir, "does-not-exist", "baseline.json"),
    ]);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("cannot read baseline");
  });

  it("exits 1 and names a phantom ref that is not baselined", () => {
    const result = runScanner(fixtureDir, ["--baseline", partialBaselinePath]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("[table] phantom_table (src/example.ts:");
    expect(result.stdout).not.toContain("phantom_fn");
    expect(result.stdout).not.toContain("phantom-bucket");
    expect(result.stdout).not.toContain("real_table");
    expect(result.stdout).not.toContain("not_a_table");
  });

  it("exits 0 when every phantom ref is baselined", () => {
    const result = runScanner(fixtureDir, ["--baseline", fullBaselinePath]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("scan-code-refs: OK.");
    expect(result.stdout).toContain("3 known finding(s)");
  });
});
