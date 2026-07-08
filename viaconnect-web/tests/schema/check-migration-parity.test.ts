/**
 * Fixture-driven test for scripts/schema/check-migration-parity.mjs
 * (210d P3-3 / P3-3b).
 *
 * Spawns the real CLI against temp fixture trees (a manifest json plus a
 * migrations dir with controlled filenames) under a fixed injected clock
 * (--now-ms), asserting:
 *   1. a post-baseline unmanifested migration whose filename stamp is older
 *      than grace exits 1 and is named
 *   2. the same migration with a filename stamp younger than grace exits 0
 *      (grace window)
 *   3. a post-baseline manifest entry without a repo file exits 1 (orphan)
 *   4. pre-baseline breaks on both sides exit 0 (accepted history)
 *   5. name-equals-stem matching holds beyond grace, including the
 *      double-apply shape (two versions, one file) and CLI-style rows
 *   6. false-match regression: manifest has the longer _additive name;
 *      a file with the shorter prefix stem must fail as unmanifested when
 *      stale (strict-equality guard)
 *
 * Control knobs: filename stamp encodes the age, --now-ms injects the
 * clock. No utimesSync -- grace is CI-deterministic.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/schema/check-migration-parity.mjs", import.meta.url),
);

const BASELINE_STAMP = "20260707000000";
/** Fixed test clock: 2026-07-20T12:00:00Z. */
const NOW_MS = Date.UTC(2026, 6, 20, 12, 0, 0);

interface ManifestEntry {
  version: string;
  name: string;
  note?: string;
}

interface FixtureFile {
  fileName: string;
}

const fixtureDirs: string[] = [];

function createFixture(entries: ManifestEntry[], files: FixtureFile[]): string {
  const dir = mkdtempSync(join(tmpdir(), "migration-parity-"));
  fixtureDirs.push(dir);
  mkdirSync(join(dir, "migrations"), { recursive: true });
  writeFileSync(
    join(dir, "manifest.json"),
    JSON.stringify(
      {
        baseline_stamp: BASELINE_STAMP,
        baseline_note: "fixture baseline",
        entries,
      },
      null,
      2,
    ),
  );
  for (const file of files) {
    writeFileSync(join(dir, "migrations", file.fileName), "select 1;\n");
  }
  return dir;
}

function runChecker(fixtureDir: string) {
  return spawnSync(
    process.execPath,
    [
      SCRIPT_PATH,
      "--manifest",
      join(fixtureDir, "manifest.json"),
      "--migrations",
      join(fixtureDir, "migrations"),
      "--now-ms",
      String(NOW_MS),
    ],
    { encoding: "utf8" },
  );
}

afterAll(() => {
  for (const dir of fixtureDirs) {
    // Windows-safe cleanup: retry while handles settle, never throw.
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

describe("check-migration-parity CLI", () => {
  it("exits 1 and names a post-baseline unmanifested migration older than grace", () => {
    // Stamp 20260708 = 12 days before NOW (2026-07-20); exceeds 7-day grace.
    const dir = createFixture(
      [],
      [{ fileName: "20260708090000_prompt_fixture_unsigned.sql" }],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("check-migration-parity: FAIL.");
    expect(result.stdout).toContain(
      "[missing-from-manifest] 20260708090000_prompt_fixture_unsigned.sql",
    );
  });

  it("exits 0 while the unmanifested migration is younger than grace", () => {
    // Stamp 20260715 = 5 days before NOW (2026-07-20); within 7-day grace.
    const dir = createFixture(
      [],
      [{ fileName: "20260715000000_prompt_fixture_unsigned.sql" }],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("check-migration-parity: OK.");
    expect(result.stdout).toContain(
      "[grace] 20260715000000_prompt_fixture_unsigned.sql",
    );
  });

  it("exits 1 for a post-baseline manifest entry with no repo file", () => {
    const dir = createFixture(
      [
        {
          version: "20260709120000",
          name: "20260708110000_prompt_fixture_ghost",
        },
      ],
      [],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "[orphan-entry] version=20260709120000 name=20260708110000_prompt_fixture_ghost",
    );
  });

  it("exits 0 for pre-baseline breaks on both sides (accepted history)", () => {
    const dir = createFixture(
      [
        // Pre-baseline entry whose file never existed in the repo.
        { version: "20260102000000", name: "legacy_entry_without_file" },
      ],
      [
        // Pre-baseline repo file never recorded as applied.
        { fileName: "20260101000000_legacy_never_applied.sql" },
      ],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("check-migration-parity: OK.");
  });

  it("matches by name-equals-stem beyond grace, including double-apply and CLI-style rows", () => {
    const dir = createFixture(
      [
        // MCP double-apply: two apply-time versions, one file, name = stem.
        { version: "20260722003638", name: "20260708090000_prompt_fixture_core" },
        { version: "20260722004716", name: "20260708090000_prompt_fixture_core" },
        // Non-numeric version placeholder still joins by name.
        {
          version: "pending-verification",
          name: "20260709100000_prompt_fixture_pending",
        },
        // CLI-style row: version is the filename stamp, name the remainder.
        { version: "20260710000000", name: "prompt_fixture_cli_style" },
      ],
      [
        { fileName: "20260708090000_prompt_fixture_core.sql" },
        { fileName: "20260709100000_prompt_fixture_pending.sql" },
        { fileName: "20260710000000_prompt_fixture_cli_style.sql" },
      ],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("check-migration-parity: OK.");
    expect(result.stdout).toContain("post-baseline files: 3 (matched 3, in grace 0)");
    expect(result.stdout).toContain("post-baseline manifest entries: 4");
  });

  it("exits 1 when a short-stem file is not matched by a longer _additive manifest name (false-match regression)", () => {
    // Manifest has _core_additive; repo has _core_additive (satisfies the
    // entry) and _core (no entry). Under the old includes() check _core
    // would have falsely matched _core_additive; strict equality rejects it.
    // Stamp 20260708 = 12 days before NOW; exceeds 7-day grace -> stale.
    const dir = createFixture(
      [
        {
          version: "20260722003638",
          name: "20260708090000_prompt_fixture_core_additive",
        },
      ],
      [
        // The file the manifest entry actually refers to.
        { fileName: "20260708090000_prompt_fixture_core_additive.sql" },
        // Shorter-prefix file that must NOT match the _additive entry.
        { fileName: "20260708090000_prompt_fixture_core.sql" },
      ],
    );
    const result = runChecker(dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "[missing-from-manifest] 20260708090000_prompt_fixture_core.sql",
    );
  });
});
