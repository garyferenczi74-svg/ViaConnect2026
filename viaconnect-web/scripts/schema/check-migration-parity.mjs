#!/usr/bin/env node
/**
 * check-migration-parity.mjs (Prompt 210d, Task P3-3)
 *
 * CI migration-parity gate. Compares the repo migration directory against
 * the applied-migrations manifest and fails when they disagree about
 * anything newer than the manifest's baseline_stamp.
 *
 * Rules:
 *   1. Every repo migration file whose filename stamp is at or after
 *      baseline_stamp must match a manifest entry. A match is either
 *      "<version>_<name>" equal to the filename stem (CLI-style rows where
 *      the DB version is the filename stamp) or the entry's name field
 *      containing the stem (MCP applies record the filename stem as the
 *      name while the DB version is the apply timestamp).
 *   2. An unmatched post-baseline file is allowed only while its mtime is
 *      younger than the grace window (default 7 days). The grace window
 *      covers migrations that are committed but still awaiting apply
 *      sign-off.
 *   3. Every post-baseline manifest entry must match at least one repo
 *      migration file. An entry without a file is an orphan and fails.
 *      Entries with a non-numeric version (for example
 *      "pending-verification") are treated as post-baseline.
 *   4. Anything older than baseline_stamp is accepted history (the
 *      documented historical version-name disjunction) and never fails.
 *
 * Zero dependencies (node built-ins only). Output ordering is
 * deterministic. The only current-time dependence is the grace
 * comparison: isWithinGrace takes nowMs as a parameter, and Date.now()
 * is called at the CLI entry only (tests inject a fixed clock with
 * --now-ms).
 *
 * Usage:
 *   node scripts/schema/check-migration-parity.mjs \
 *     --manifest docs/integrity/snapshot/applied-manifest.json \
 *     --migrations supabase/migrations [--grace-days N] [--now-ms MS]
 *
 * Exit codes:
 *   0  parity holds
 *   1  at least one offender (listed on stdout)
 *   2  usage error or unreadable input
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STEM_STAMP_RE = /^(\d{14})_.+$/;
const VERSION_RE = /^\d{14}$/;

function fail(message) {
  console.error(`check-migration-parity: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { manifest: null, migrations: null, graceDays: 7, nowMs: null };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--manifest") {
      args.manifest = argv[i + 1];
      i += 1;
    } else if (flag === "--migrations") {
      args.migrations = argv[i + 1];
      i += 1;
    } else if (flag === "--grace-days") {
      args.graceDays = Number(argv[i + 1]);
      i += 1;
    } else if (flag === "--now-ms") {
      args.nowMs = Number(argv[i + 1]);
      i += 1;
    } else {
      fail(`unknown argument: ${flag}`);
    }
  }
  if (!args.manifest) {
    fail("missing required --manifest <path>");
  }
  if (!args.migrations) {
    fail("missing required --migrations <dir>");
  }
  if (!Number.isFinite(args.graceDays) || args.graceDays < 0) {
    fail("--grace-days must be a non-negative number");
  }
  if (args.nowMs !== null && !Number.isFinite(args.nowMs)) {
    fail("--now-ms must be a number of milliseconds since the epoch");
  }
  return args;
}

function loadManifest(path) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read manifest at ${path}: ${error.message}`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`manifest at ${path} must be a JSON object`);
  }
  if (typeof raw.baseline_stamp !== "string" || !VERSION_RE.test(raw.baseline_stamp)) {
    fail(`manifest at ${path} needs a 14 digit baseline_stamp string`);
  }
  if (!Array.isArray(raw.entries)) {
    fail(`manifest at ${path} needs an entries array`);
  }
  for (const entry of raw.entries) {
    if (!entry || typeof entry.version !== "string" || typeof entry.name !== "string") {
      fail(`manifest at ${path} has a malformed entry (need version and name strings)`);
    }
  }
  return raw;
}

/** Sorted list of migration files as { fileName, stem, stamp }. */
function listMigrationFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    fail(`cannot read migrations dir at ${dir}: ${error.message}`);
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".sql")) {
      continue;
    }
    const stem = entry.name.slice(0, -".sql".length);
    const stampMatch = STEM_STAMP_RE.exec(stem);
    if (!stampMatch) {
      continue;
    }
    files.push({ fileName: entry.name, stem, stamp: stampMatch[1] });
  }
  files.sort((a, b) => (a.stem < b.stem ? -1 : a.stem > b.stem ? 1 : 0));
  return files;
}

/**
 * A manifest entry matches a repo filename stem when the CLI-style
 * composite "<version>_<name>" equals the stem, or when the name field
 * contains the stem (MCP applies stamp their own version, so the name
 * carries the filename stem and is the durable join key).
 */
function entryMatchesStem(entry, stem) {
  if (`${entry.version}_${entry.name}` === stem) {
    return true;
  }
  return entry.name.includes(stem);
}

/** Entries with non-numeric versions are post-baseline by definition. */
function isPostBaselineEntry(entry, baselineStamp) {
  if (VERSION_RE.test(entry.version)) {
    return entry.version >= baselineStamp;
  }
  return true;
}

/**
 * The single place current time is consulted. nowMs is injected; the CLI
 * entry defaults it to Date.now(), tests pass --now-ms.
 */
function isWithinGrace(mtimeMs, graceDays, nowMs) {
  return nowMs - mtimeMs < graceDays * MS_PER_DAY;
}

function checkParity(manifest, files, migrationsDir, graceDays, nowMs) {
  const offenders = [];
  const graced = [];
  let matchedFileCount = 0;

  const postBaselineFiles = files.filter(
    (file) => file.stamp >= manifest.baseline_stamp,
  );
  for (const file of postBaselineFiles) {
    if (manifest.entries.some((entry) => entryMatchesStem(entry, file.stem))) {
      matchedFileCount += 1;
      continue;
    }
    let mtimeMs;
    try {
      mtimeMs = statSync(join(migrationsDir, file.fileName)).mtimeMs;
    } catch (error) {
      fail(`cannot stat ${file.fileName}: ${error.message}`);
    }
    if (isWithinGrace(mtimeMs, graceDays, nowMs)) {
      graced.push(file.fileName);
    } else {
      offenders.push(
        `[missing-from-manifest] ${file.fileName} (post-baseline, no manifest entry, mtime older than ${graceDays} day grace)`,
      );
    }
  }

  const postBaselineEntries = manifest.entries.filter((entry) =>
    isPostBaselineEntry(entry, manifest.baseline_stamp),
  );
  for (const entry of postBaselineEntries) {
    if (!files.some((file) => entryMatchesStem(entry, file.stem))) {
      offenders.push(
        `[orphan-entry] version=${entry.version} name=${entry.name} (no matching repo migration file)`,
      );
    }
  }

  offenders.sort();
  graced.sort();
  return {
    offenders,
    graced,
    matchedFileCount,
    postBaselineFileCount: postBaselineFiles.length,
    postBaselineEntryCount: postBaselineEntries.length,
  };
}

function main() {
  const args = parseArgs(process.argv);
  const nowMs = args.nowMs === null ? Date.now() : args.nowMs;
  const manifest = loadManifest(args.manifest);
  const files = listMigrationFiles(args.migrations);
  const result = checkParity(
    manifest,
    files,
    args.migrations,
    args.graceDays,
    nowMs,
  );

  const summary =
    `baseline ${manifest.baseline_stamp}; ` +
    `post-baseline files: ${result.postBaselineFileCount} ` +
    `(matched ${result.matchedFileCount}, in grace ${result.graced.length}); ` +
    `post-baseline manifest entries: ${result.postBaselineEntryCount}`;

  if (result.offenders.length > 0) {
    console.log(
      `check-migration-parity: FAIL. ${result.offenders.length} offender(s); ${summary}:`,
    );
    for (const line of result.offenders) {
      console.log(`  ${line}`);
    }
    process.exit(1);
  }

  console.log(`check-migration-parity: OK. ${summary}.`);
  for (const fileName of result.graced) {
    console.log(`  [grace] ${fileName}`);
  }
  process.exit(0);
}

main();
