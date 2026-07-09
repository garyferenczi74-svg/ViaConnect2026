#!/usr/bin/env node
/**
 * check-schema-type-errors.mjs (Prompt 210d, Task P3-4)
 *
 * Schema-scoped blocking tsc gate. Full-blocking tsc is not achievable
 * yet (hundreds of legacy errors), so this gate parses `tsc --noEmit`
 * output and fails ONLY on new schema-shaped type errors:
 *
 *   1. the error code is one of TS2339 / TS2345 / TS2769 / TS2322, AND
 *   2. the message references a Database row/table shape (heuristics
 *      below), AND
 *   3. the file+code pair is NOT in the committed allowlist
 *      (scripts/schema/tsc-allowlist.json, the frozen legacy debt).
 *
 * Everything else (other codes, non-schema messages, allowlisted pairs)
 * stays advisory: counted in the summary, never failing.
 *
 * Schema-shape heuristics (any one is sufficient, given a gated code):
 *   - message contains "does not exist on type" (property reads) or
 *     "does not exist in type" (object literal excess properties)
 *     together with a Row / Insert / Update type word (generated
 *     Database row shapes)
 *   - message mentions the type 'never' (the signature of Supabase
 *     .from() calls against tables missing from the generated types)
 *     or contains ".from("
 *   - message names a type from lib/supabase/types
 *
 * Both tsc output formats are tolerated and detected per line:
 *   plain:  src/foo.ts(12,5): error TS2339: message
 *   pretty: src/foo.ts:12:5 - error TS2339: message
 * In plain format, indented continuation lines are appended to the
 * message before the heuristics run; pretty continuation lines are code
 * frames and are ignored. ANSI color codes are stripped first.
 *
 * Zero dependencies (node built-ins only). Output ordering is
 * deterministic (file, then line, then column, then code).
 *
 * Usage:
 *   node scripts/schema/check-schema-type-errors.mjs \
 *     [--allowlist scripts/schema/tsc-allowlist.json] \
 *     [--tsc-output path/to/captured-output.txt] \
 *     [--print-allowlist] [--note "text"]
 *
 * Without --tsc-output the script spawns `npx tsc --noEmit --pretty
 * false` in the current working directory (takes minutes on this repo);
 * CI captures tsc output to a file once and passes --tsc-output.
 * Without --allowlist every schema-shaped error is an offender.
 * --print-allowlist prints the current offenders as allowlist JSON
 * (entries {file, code, note}) instead of pass/fail, always exiting 0;
 * use it to regenerate scripts/schema/tsc-allowlist.json after paying
 * down legacy debt. --note sets the note field (default "legacy").
 *
 * Exit codes:
 *   0  no new schema-shaped errors (or --print-allowlist mode)
 *   1  at least one new schema-shaped error (listed on stdout)
 *   2  usage error or unreadable input
 */

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const GATED_CODES = new Set(["TS2339", "TS2345", "TS2769", "TS2322"]);
const PLAIN_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const PRETTY_RE = /^(.+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
// ESC (char code 27) built without an escape sequence so this source
// file stays pure ASCII.
const ANSI_RE = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
const ROW_SHAPE_RE = /\b(Row|Insert|Update)\b/;
const MESSAGE_PREVIEW_LENGTH = 160;

function fail(message) {
  console.error(`check-schema-type-errors: ${message}`);
  process.exit(2);
}

/**
 * Allowlist pair key. "::" cannot appear in a relative posix-normalized
 * file path or in a TS error code, so the join is unambiguous.
 */
function pairKey(file, code) {
  return `${file}::${code}`;
}

function parseArgs(argv) {
  const args = {
    allowlist: null,
    tscOutput: null,
    printAllowlist: false,
    note: "legacy",
  };
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--allowlist") {
      args.allowlist = argv[i + 1];
      i += 1;
    } else if (flag === "--tsc-output") {
      args.tscOutput = argv[i + 1];
      i += 1;
    } else if (flag === "--print-allowlist") {
      args.printAllowlist = true;
    } else if (flag === "--note") {
      args.note = argv[i + 1];
      i += 1;
    } else {
      fail(`unknown argument: ${flag}`);
    }
  }
  if (
    args.allowlist === undefined ||
    args.tscOutput === undefined ||
    args.note === undefined
  ) {
    fail("a flag is missing its value");
  }
  return args;
}

/** Forward slashes only, no leading "./", so pairs match across OSes. */
function normalizeFile(file) {
  let normalized = file.replace(/\\/g, "/").trim();
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

/** Allowlist file is a JSON array of { file, code, note } objects. */
function loadAllowlist(path) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read allowlist at ${path}: ${error.message}`);
  }
  if (!Array.isArray(raw)) {
    fail(`allowlist at ${path} must be a JSON array`);
  }
  const pairs = new Set();
  for (const entry of raw) {
    if (!entry || typeof entry.file !== "string" || typeof entry.code !== "string") {
      fail(`allowlist at ${path} has a malformed entry (need file and code strings)`);
    }
    pairs.add(pairKey(normalizeFile(entry.file), entry.code));
  }
  return pairs;
}

function readTscOutput(tscOutputPath) {
  if (tscOutputPath !== null) {
    try {
      return readFileSync(tscOutputPath, "utf8");
    } catch (error) {
      fail(`cannot read tsc output at ${tscOutputPath}: ${error.message}`);
    }
  }
  const result = spawnSync("npx tsc --noEmit --pretty false", {
    shell: true,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) {
    fail(`cannot spawn npx tsc --noEmit: ${result.error.message}`);
  }
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

/**
 * Parse tsc output into { file, line, col, code, message } records.
 * Detects the format per line (plain and pretty are mutually exclusive:
 * plain has "(line,col): error", pretty has ":line:col - error").
 * Returns per-format counts so the summary reports which was seen.
 */
function parseTscOutput(text) {
  const lines = text.replace(ANSI_RE, "").split(/\r?\n/);
  const errors = [];
  let plainCount = 0;
  let prettyCount = 0;
  let continuable = null;
  for (const line of lines) {
    const plain = PLAIN_RE.exec(line);
    if (plain) {
      continuable = {
        file: normalizeFile(plain[1]),
        line: Number(plain[2]),
        col: Number(plain[3]),
        code: plain[4],
        message: plain[5],
      };
      errors.push(continuable);
      plainCount += 1;
      continue;
    }
    const pretty = PRETTY_RE.exec(line);
    if (pretty) {
      // Lines after a pretty error are code frames, not message text.
      continuable = null;
      errors.push({
        file: normalizeFile(pretty[1]),
        line: Number(pretty[2]),
        col: Number(pretty[3]),
        code: pretty[4],
        message: pretty[5],
      });
      prettyCount += 1;
      continue;
    }
    if (continuable !== null && /^\s+\S/.test(line)) {
      // Plain-format multi-line elaboration; fold into the message so
      // the heuristics see nested type names too.
      continuable.message += ` ${line.trim()}`;
      continue;
    }
    continuable = null;
  }
  return { errors, plainCount, prettyCount };
}

/**
 * Schema-shaped means the error plausibly comes from code disagreeing
 * with the generated Database row/table types. A gated code alone is
 * not enough; the message must look like a row-shape mismatch. The
 * 'never' check is broad on purpose: in this codebase, assignability to
 * 'never' under these codes is the signature of Supabase .from() calls
 * against tables absent from src/lib/supabase/types.
 */
function isSchemaShaped(error) {
  if (!GATED_CODES.has(error.code)) {
    return false;
  }
  const msg = error.message.replace(/\\/g, "/");
  if (msg.includes("lib/supabase/types")) {
    return true;
  }
  if (
    (msg.includes("does not exist on type") ||
      msg.includes("does not exist in type")) &&
    ROW_SHAPE_RE.test(msg)
  ) {
    return true;
  }
  if (msg.includes("'never'") || msg.includes(".from(")) {
    return true;
  }
  return false;
}

function compareErrors(a, b) {
  if (a.file !== b.file) {
    return a.file < b.file ? -1 : 1;
  }
  if (a.line !== b.line) {
    return a.line - b.line;
  }
  if (a.col !== b.col) {
    return a.col - b.col;
  }
  if (a.code !== b.code) {
    return a.code < b.code ? -1 : 1;
  }
  return 0;
}

function analyze(errors, allowedPairs) {
  const offenders = [];
  let schemaShapedCount = 0;
  let allowlistedCount = 0;
  for (const error of errors) {
    if (!isSchemaShaped(error)) {
      continue;
    }
    schemaShapedCount += 1;
    if (allowedPairs.has(pairKey(error.file, error.code))) {
      allowlistedCount += 1;
    } else {
      offenders.push(error);
    }
  }
  offenders.sort(compareErrors);
  return { offenders, schemaShapedCount, allowlistedCount };
}

/** Deduped, sorted { file, code, note } entries for the offenders. */
function toAllowlistEntries(offenders, note) {
  const seen = new Map();
  for (const error of offenders) {
    const key = pairKey(error.file, error.code);
    if (!seen.has(key)) {
      seen.set(key, { file: error.file, code: error.code, note });
    }
  }
  const entries = [...seen.values()];
  entries.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file < b.file ? -1 : 1;
    }
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  });
  return entries;
}

function preview(message) {
  if (message.length <= MESSAGE_PREVIEW_LENGTH) {
    return message;
  }
  return `${message.slice(0, MESSAGE_PREVIEW_LENGTH)}...`;
}

function main() {
  const args = parseArgs(process.argv);
  const allowedPairs =
    args.allowlist === null ? new Set() : loadAllowlist(args.allowlist);
  const text = readTscOutput(args.tscOutput);
  const { errors, plainCount, prettyCount } = parseTscOutput(text);
  const { offenders, schemaShapedCount, allowlistedCount } = analyze(
    errors,
    allowedPairs,
  );

  if (args.printAllowlist) {
    console.log(JSON.stringify(toAllowlistEntries(offenders, args.note), null, 2));
    process.exit(0);
  }

  const advisoryCount = errors.length - schemaShapedCount;
  const summary =
    `parsed ${errors.length} tsc error(s) ` +
    `(plain format ${plainCount}, pretty format ${prettyCount}); ` +
    `schema-shaped ${schemaShapedCount} (allowlisted ${allowlistedCount}); ` +
    `advisory non-schema ${advisoryCount}`;

  if (offenders.length > 0) {
    console.log(
      `check-schema-type-errors: FAIL. ${offenders.length} new schema-shaped type error(s) not in allowlist; ${summary}:`,
    );
    for (const error of offenders) {
      console.log(
        `  [schema-error] ${error.file}(${error.line},${error.col}) ${error.code}: ${preview(error.message)}`,
      );
    }
    process.exit(1);
  }

  console.log(`check-schema-type-errors: OK. ${summary}.`);
  process.exit(0);
}

main();
