#!/usr/bin/env node
/**
 * scan-code-refs.mjs (Prompt 210d, Task P3-2)
 *
 * Schema drift gate. Scans app code for Supabase table, rpc, and storage
 * bucket string literals and diffs them against the committed schema
 * snapshot (live-types.ts + db-functions.json + buckets.json).
 *
 * Zero dependencies (node built-ins only). Deterministic: sorted walk,
 * sorted findings, no timestamps.
 *
 * Usage:
 *   node scripts/schema/scan-code-refs.mjs --snapshot <dir> [--baseline <path>]
 *
 * Exit codes:
 *   0  every referenced name exists in the snapshot or is baselined
 *   1  at least one non-baselined finding (listed on stdout)
 *   2  usage error or unreadable input file
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import process from "node:process";

const CODE_ROOTS = ["src", join("supabase", "functions")];
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "__tests__"]);
const FROM_EXCLUDED_RECEIVERS = new Set([
  "Array",
  "Buffer",
  "Uint8Array",
  "Object",
  "BigInt",
]);

// Kind names contain no spaces, so "<kind> <name>" is an unambiguous
// composite key even for bucket names that contain spaces.
function makeKey(kind, name) {
  return `${kind} ${name}`;
}

function fail(message) {
  console.error(`scan-code-refs: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { baseline: null, snapshot: null };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--baseline") {
      args.baseline = argv[i + 1];
      i += 1;
    } else if (flag === "--snapshot") {
      args.snapshot = argv[i + 1];
      i += 1;
    } else {
      fail(`unknown argument: ${flag}`);
    }
  }
  if (!args.snapshot) {
    fail("missing required --snapshot <dir>");
  }
  return args;
}

function readTextOrFail(path, label) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    fail(`cannot read ${label} at ${path}: ${error.message}`);
    return "";
  }
}

function readJsonOrFail(path, label) {
  const text = readTextOrFail(path, label);
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`cannot parse ${label} at ${path}: ${error.message}`);
    return null;
  }
}

/**
 * Extract table and view names from a Supabase generated types file by
 * streaming its lines. Section boundaries are "    Tables: {" or
 * "    Views: {" (4-space indent); keys are "      name: {" (6-space
 * indent); a section closes at a 4-space "}".
 */
function parseTablesAndViews(liveTypesText) {
  const names = new Set();
  const sectionRe = /^    (Tables|Views): \{/;
  const keyRe = /^      ([A-Za-z0-9_]+): \{/;
  const sectionEndRe = /^    \}/;
  let inSection = false;
  for (const line of liveTypesText.split(/\r?\n/)) {
    if (!inSection) {
      if (sectionRe.test(line)) {
        inSection = true;
      }
      continue;
    }
    const keyMatch = keyRe.exec(line);
    if (keyMatch) {
      names.add(keyMatch[1]);
    } else if (sectionEndRe.test(line)) {
      inSection = false;
    }
  }
  return names;
}

/** Depth-first sorted walk collecting .ts/.tsx files, minus exclusions. */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      walk(join(dir, entry.name), out);
    } else if (entry.isFile()) {
      if (!/\.(ts|tsx)$/.test(entry.name)) {
        continue;
      }
      if (/\.test\./.test(entry.name)) {
        continue;
      }
      out.push(join(dir, entry.name));
    }
  }
}

/** Extract bucket/table/rpc string-literal references from one file. */
function extractRefs(text) {
  const storageRe = /\bstorage\s*\.\s*from\s*\(\s*['"]([^'"]+)['"]/g;
  const fromRe = /\.\s*from\s*\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g;
  const rpcRe = /\.\s*rpc\s*\(\s*['"]([A-Za-z0-9_]+)['"]/g;

  const buckets = [];
  const tables = [];
  const rpcs = [];
  const storageSpans = [];

  let match;
  while ((match = storageRe.exec(text)) !== null) {
    storageSpans.push([match.index, match.index + match[0].length]);
    buckets.push({ name: match[1], index: match.index });
  }
  while ((match = fromRe.exec(text)) !== null) {
    const start = match.index;
    if (storageSpans.some(([s, e]) => start >= s && start < e)) {
      continue;
    }
    const before = text.slice(Math.max(0, start - 64), start);
    const receiver = /([A-Za-z0-9_$]+)\s*$/.exec(before);
    if (receiver && FROM_EXCLUDED_RECEIVERS.has(receiver[1])) {
      continue;
    }
    tables.push({ name: match[1], index: start });
  }
  while ((match = rpcRe.exec(text)) !== null) {
    rpcs.push({ name: match[1], index: match.index });
  }
  return { buckets, tables, rpcs };
}

function lineOfIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

function loadBaseline(path) {
  const raw = readJsonOrFail(path, "baseline");
  const entries = Array.isArray(raw) ? raw : raw && raw.entries;
  if (!Array.isArray(entries)) {
    fail(`baseline at ${path} must be an array or an object with an entries array`);
  }
  const keys = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.kind !== "string" || typeof entry.name !== "string") {
      fail(`baseline at ${path} has a malformed entry (need kind and name strings)`);
    }
    keys.add(makeKey(entry.kind, entry.name));
  }
  return keys;
}

function main() {
  const args = parseArgs(process.argv);

  const liveTypesText = readTextOrFail(
    join(args.snapshot, "live-types.ts"),
    "snapshot live-types.ts",
  );
  const dbFunctions = readJsonOrFail(
    join(args.snapshot, "db-functions.json"),
    "snapshot db-functions.json",
  );
  const bucketRows = readJsonOrFail(
    join(args.snapshot, "buckets.json"),
    "snapshot buckets.json",
  );

  const tableNames = parseTablesAndViews(liveTypesText);
  const functionNames = new Set(dbFunctions.map((row) => row.proname));
  const bucketNames = new Set(bucketRows.map((row) => row.name));
  if (tableNames.size === 0) {
    fail("parsed zero table/view names from live-types.ts; snapshot format changed?");
  }

  const files = [];
  for (const root of CODE_ROOTS) {
    walk(root, files);
  }

  const firstSite = new Map();
  const record = (kind, name, site) => {
    const key = makeKey(kind, name);
    if (!firstSite.has(key)) {
      firstSite.set(key, site);
    }
  };

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const relPath = file.split(sep).join("/");
    const { buckets, tables, rpcs } = extractRefs(text);
    for (const ref of buckets) {
      if (!bucketNames.has(ref.name)) {
        record("bucket", ref.name, `${relPath}:${lineOfIndex(text, ref.index)}`);
      }
    }
    for (const ref of rpcs) {
      if (!functionNames.has(ref.name)) {
        record("rpc", ref.name, `${relPath}:${lineOfIndex(text, ref.index)}`);
      }
    }
    for (const ref of tables) {
      if (!tableNames.has(ref.name)) {
        record("table", ref.name, `${relPath}:${lineOfIndex(text, ref.index)}`);
      }
    }
  }

  const findings = [...firstSite.entries()]
    .map(([key, site]) => {
      const sepIndex = key.indexOf(" ");
      return { kind: key.slice(0, sepIndex), name: key.slice(sepIndex + 1), site };
    })
    .sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind < b.kind ? -1 : 1;
      }
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

  const baselineKeys = args.baseline ? loadBaseline(args.baseline) : new Set();
  const offenders = findings.filter(
    (finding) => !baselineKeys.has(makeKey(finding.kind, finding.name)),
  );

  if (offenders.length > 0) {
    console.log(
      `scan-code-refs: FAIL. ${offenders.length} schema drift finding(s) not in baseline (scanned ${files.length} files):`,
    );
    for (const finding of offenders) {
      console.log(`  [${finding.kind}] ${finding.name} (${finding.site})`);
    }
    process.exit(1);
  }

  console.log(
    `scan-code-refs: OK. ${findings.length} known finding(s), all baselined; scanned ${files.length} files.`,
  );
  process.exit(0);
}

main();
