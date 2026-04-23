/**
 * Claude Code Marshall sibling — pre-commit / PR-time linter.
 * Reads staged .ts/.tsx/.sql content from stdin, returns findings as JSON.
 *
 * Invoked by the Claude Code Marshall agent (dev-side) and optionally by a
 * Husky pre-commit hook. Exit code: 0 = clean; 1 = warnings; 2 = P0 hit.
 *
 * Usage:
 *   node marshall-lint.js --file path/to/file.ts < file_content
 *   cat file.tsx | node marshall-lint.js --file path/to/file.tsx --surface source_code
 */

import { RuleEngine } from "../engine/RuleEngine";
import { allRules } from "../rules";
import type { Surface } from "../engine/types";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function parseArg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const file = parseArg("file", "<stdin>") as string;
  const surface = (parseArg("surface", "source_code") as Surface);
  const text = await readStdin();
  if (!text.trim()) {
    process.stdout.write("[]\n");
    process.exit(0);
  }

  const engine = RuleEngine.fromRules(allRules);
  const result = await engine.evaluate({
    surface,
    source: "claude_code",
    content: text,
    location: { filePath: file },
  });

  process.stdout.write(JSON.stringify(result.findings, null, 2) + "\n");
  const worst = result.findings.reduce<string>((acc, f) => {
    if (f.severity === "P0") return "P0";
    if (f.severity === "P1" && acc !== "P0") return "P1";
    if (!acc) return f.severity;
    return acc;
  }, "");
  if (worst === "P0") process.exit(2);
  if (worst === "P1" || worst === "P2") process.exit(1);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(3); });
