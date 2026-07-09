/**
 * Tests for scripts/schema/check-schema-type-errors.mjs (Prompt 210d,
 * Task P3-4). The gate is exercised end to end through child_process,
 * so every assertion covers the real CLI exit code and output, exactly
 * as CI consumes them. Fixtures cover both tsc output formats (plain
 * "file(line,col): error TSxxxx:" and pretty "file:line:col - error
 * TSxxxx:").
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/schema/check-schema-type-errors.mjs", import.meta.url),
);

interface GateRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface AllowlistEntry {
  file: string;
  code: string;
  note: string;
}

/** Spawn the real CLI so exit codes come from an actual child process. */
function runGate(cliArgs: string[]): GateRun {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...cliArgs], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "check-schema-type-errors-"));
  tempDirs.push(dir);
  return dir;
}

function writeFixture(dir: string, name: string, content: string): string {
  const filePath = join(dir, name);
  writeFileSync(filePath, content, "utf8");
  return filePath;
}

afterEach(() => {
  // Windows-safe cleanup: force + retries ride out transient locks
  // (antivirus scans, delayed handle release) instead of throwing.
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
});

const PLAIN_SCHEMA_ERROR = [
  `src/app/example/page.tsx(42,18): error TS2339: Property 'bogus_column' does not exist on type 'Database["public"]["Tables"]["daily_scores"]["Row"]'.`,
  "",
].join("\n");

const PRETTY_SCHEMA_ERROR = [
  "src/lib/example/service.ts:7:31 - error TS2345: Argument of type '{ user_id: string; }' is not assignable to parameter of type 'never'.",
  "",
  "7   const result = await supabase.from('nope').insert(payload);",
  "                                  ~~~~~~~~~~~~~~",
  "",
].join("\n");

const NON_SCHEMA_ERRORS = [
  "src/lib/example/util.ts(3,9): error TS2304: Cannot find name 'undeclaredThing'.",
  "src/lib/example/dom.ts(11,14): error TS2339: Property 'customField' does not exist on type 'Window & typeof globalThis'.",
  "",
].join("\n");

const ALLOWLIST_BOTH: AllowlistEntry[] = [
  { file: "src/app/example/page.tsx", code: "TS2339", note: "legacy, frozen 2026-07-07" },
  { file: "src/lib/example/service.ts", code: "TS2345", note: "legacy, frozen 2026-07-07" },
];

const ALLOWLIST_PLAIN_ONLY: AllowlistEntry[] = [
  { file: "src/app/example/page.tsx", code: "TS2339", note: "legacy, frozen 2026-07-07" },
];

describe("check-schema-type-errors gate", () => {
  it("exits 1 and names the offender for a plain-format schema-shaped error", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(dir, "tsc-plain.txt", PLAIN_SCHEMA_ERROR);
    const run = runGate(["--tsc-output", tscOut]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("FAIL");
    expect(run.stdout).toContain("src/app/example/page.tsx(42,18) TS2339");
  });

  it("exits 1 for a pretty-format schema-shaped error (never from untyped .from insert)", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(dir, "tsc-pretty.txt", PRETTY_SCHEMA_ERROR);
    const run = runGate(["--tsc-output", tscOut]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("FAIL");
    expect(run.stdout).toContain("src/lib/example/service.ts(7,31) TS2345");
    expect(run.stdout).toContain("pretty format 1");
  });

  it("exits 1 for an excess-property error against a named Insert shape", () => {
    const dir = makeTempDir();
    const fixture = [
      `src/lib/example/insert.ts(19,5): error TS2322: Type '{ nope: string; }' is not assignable to type 'Database["public"]["Tables"]["profiles"]["Insert"]'. Object literal may only specify known properties, and 'nope' does not exist in type 'Database["public"]["Tables"]["profiles"]["Insert"]'.`,
      "",
    ].join("\n");
    const tscOut = writeFixture(dir, "tsc-insert.txt", fixture);
    const run = runGate(["--tsc-output", tscOut]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("src/lib/example/insert.ts(19,5) TS2322");
  });

  it("exits 0 when every schema-shaped error is in the allowlist", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(
      dir,
      "tsc-mixed.txt",
      PLAIN_SCHEMA_ERROR + PRETTY_SCHEMA_ERROR,
    );
    const allowlist = writeFixture(
      dir,
      "allowlist.json",
      JSON.stringify(ALLOWLIST_BOTH, null, 2),
    );
    const run = runGate(["--tsc-output", tscOut, "--allowlist", allowlist]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("check-schema-type-errors: OK");
    expect(run.stdout).toContain("schema-shaped 2 (allowlisted 2)");
  });

  it("exits 0 for non-schema type errors (advisory only)", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(dir, "tsc-non-schema.txt", NON_SCHEMA_ERRORS);
    const run = runGate(["--tsc-output", tscOut]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("check-schema-type-errors: OK");
    expect(run.stdout).toContain("advisory non-schema 2");
  });

  it("exits 1 naming only the non-allowlisted offender in mixed output", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(
      dir,
      "tsc-mixed.txt",
      PLAIN_SCHEMA_ERROR + PRETTY_SCHEMA_ERROR + NON_SCHEMA_ERRORS,
    );
    const allowlist = writeFixture(
      dir,
      "allowlist.json",
      JSON.stringify(ALLOWLIST_PLAIN_ONLY, null, 2),
    );
    const run = runGate(["--tsc-output", tscOut, "--allowlist", allowlist]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("1 new schema-shaped type error(s)");
    expect(run.stdout).toContain("[schema-error] src/lib/example/service.ts(7,31) TS2345");
    expect(run.stdout).not.toContain("[schema-error] src/app/example/page.tsx");
  });

  it("exits 0 on empty tsc output", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(dir, "tsc-empty.txt", "");
    const run = runGate(["--tsc-output", tscOut]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("parsed 0 tsc error(s)");
  });

  it("exits 2 on an unreadable tsc output path", () => {
    const dir = makeTempDir();
    const run = runGate(["--tsc-output", join(dir, "does-not-exist.txt")]);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("cannot read tsc output");
  });

  it("prints regeneration JSON with --print-allowlist and exits 0", () => {
    const dir = makeTempDir();
    const tscOut = writeFixture(
      dir,
      "tsc-mixed.txt",
      PLAIN_SCHEMA_ERROR + PRETTY_SCHEMA_ERROR,
    );
    const run = runGate([
      "--tsc-output",
      tscOut,
      "--print-allowlist",
      "--note",
      "legacy, frozen 2026-07-07",
    ]);
    expect(run.status).toBe(0);
    const entries = JSON.parse(run.stdout) as AllowlistEntry[];
    expect(entries).toEqual([
      { file: "src/app/example/page.tsx", code: "TS2339", note: "legacy, frozen 2026-07-07" },
      { file: "src/lib/example/service.ts", code: "TS2345", note: "legacy, frozen 2026-07-07" },
    ]);
  });
});
