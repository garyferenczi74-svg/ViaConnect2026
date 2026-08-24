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
 *      equal to the stem (MCP applies record the filename stem as the
 *      name while the DB version is the apply timestamp).
 *   2. An unmatched post-baseline file is allowed only while its filename
 *      stamp is younger than the grace window (default 7 days). The grace
 *      window covers migrations that are committed but still awaiting apply
 *      sign-off. Grace is derived from the 14-digit filename stamp parsed
 *      as UTC (CI-deterministic; no fs.stat call).
 *   3. Every post-baseline manifest entry must match at least one repo
 *      migration file. An entry without a file is an orphan and fails.
 *      Entries with a non-numeric version (for example
 *      "pending-verification") are treated as post-baseline.
 *   4. Anything older than baseline_stamp is accepted history (the
 *      documented historical version-name disjunction) and never fails.
 *   5. Optional manifest.unapplied_stems is a reviewed inventory of
 *      filename stems that exist in the repo but were confirmed absent
 *      from supabase_migrations.schema_migrations. Those stems do not
 *      count as applied. They silence missing-from-manifest after grace
 *      so CI does not invent an apply record. A listed stem with no
 *      matching repo file is a stale-unapplied-stem offender.
 *
 * Zero dependencies (node built-ins only). Output ordering is
 * deterministic. The only current-time dependence is the grace
 * comparison: isWithinGrace takes nowMs as a parameter, and Date.now()
 * is called at the CLI entry only (tests inject a fixed clock with
 * --now-ms). The grace age is derived from the 14-digit filename stamp
 * (CI-deterministic; no fs.stat call).
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

import { readFileSync, readdirSync } from "node:fs";
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
  if (raw.unapplied_stems === undefined) {
    raw.unapplied_stems = [];
  }
  if (!Array.isArray(raw.unapplied_stems)) {
    fail(`manifest at ${path} unapplied_stems must be an array of filename stems`);
  }
  for (const stem of raw.unapplied_stems) {
    if (typeof stem !== "string" || !STEM_STAMP_RE.test(stem)) {
      fail(
        `manifest at ${path} has a malformed unapplied_stems entry (need a 14-digit filename stem)`,
      );
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
 * equals the stem exactly (MCP applies stamp their own version, so the
 * name carries the filename stem and is the durable join key).
 */
function entryMatchesStem(entry, stem) {
  if (`${entry.version}_${entry.name}` === stem) {
    return true;
  }
  return entry.name === stem;
}

/** Entries with non-numeric versions are post-baseline by definition. */
function isPostBaselineEntry(entry, baselineStamp) {
  if (VERSION_RE.test(entry.version)) {
    return entry.version >= baselineStamp;
  }
  return true;
}

/**
 * Parse a 14-digit filename stamp (YYYYMMDDHHMMSS) as a UTC millisecond
 * epoch. CI-deterministic: does not stat the file.
 */
function stampToMs(stamp) {
  return Date.UTC(
    Number(stamp.slice(0, 4)),
    Number(stamp.slice(4, 6)) - 1,
    Number(stamp.slice(6, 8)),
    Number(stamp.slice(8, 10)),
    Number(stamp.slice(10, 12)),
    Number(stamp.slice(12, 14)),
  );
}

/**
 * The single place current time is consulted. nowMs is injected; the CLI
 * entry defaults it to Date.now(), tests pass --now-ms. The age compared
 * is the filename stamp parsed as UTC (not fs mtime).
 */
function isWithinGrace(stampMs, graceDays, nowMs) {
  return nowMs - stampMs < graceDays * MS_PER_DAY;
}

function checkParity(manifest, files, graceDays, nowMs) {
  const offenders = [];
  const graced = [];
  const reviewedUnapplied = [];
  let matchedFileCount = 0;
  const unappliedStems = new Set(manifest.unapplied_stems || []);

  const postBaselineFiles = files.filter(
    (file) => file.stamp >= manifest.baseline_stamp,
  );
  for (const file of postBaselineFiles) {
    if (manifest.entries.some((entry) => entryMatchesStem(entry, file.stem))) {
      matchedFileCount += 1;
      continue;
    }
    if (unappliedStems.has(file.stem)) {
      reviewedUnapplied.push(file.fileName);
      continue;
    }
    const stampMs = stampToMs(file.stamp);
    if (isWithinGrace(stampMs, graceDays, nowMs)) {
      graced.push(file.fileName);
    } else {
      offenders.push(
        `[missing-from-manifest] ${file.fileName} (post-baseline, no manifest entry, filename stamp older than ${graceDays} day grace)`,
      );
    }
  }

  for (const stem of unappliedStems) {
    if (!files.some((file) => file.stem === stem)) {
      offenders.push(
        `[stale-unapplied-stem] ${stem} (no matching repo migration file)`,
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
  reviewedUnapplied.sort();
  return {
    offenders,
    graced,
    reviewedUnapplied,
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
    args.graceDays,
    nowMs,
  );

  const summary =
    `baseline ${manifest.baseline_stamp}; ` +
    `post-baseline files: ${result.postBaselineFileCount} ` +
    `(matched ${result.matchedFileCount}, in grace ${result.graced.length}, ` +
    `reviewed-unapplied ${result.reviewedUnapplied.length}); ` +
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
  for (const fileName of result.reviewedUnapplied) {
    console.log(`  [unapplied] ${fileName}`);
  }
  process.exit(0);
}

main();
