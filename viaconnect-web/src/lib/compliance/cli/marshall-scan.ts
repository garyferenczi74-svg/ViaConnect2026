/**
 * Marshall ad-hoc batch scanner. Walks a directory tree and runs every .ts/.tsx
 * through the source_code rule bundle. Outputs a newline-delimited JSON of
 * findings. Designed for CI jobs and Steve Rica's periodic sweeps.
 *
 * Usage:
 *   node marshall-scan.js --dir src/ --out findings.ndjson
 */

import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { RuleEngine } from "../engine/RuleEngine";
import { allRules } from "../rules";

function parseArg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules" || e.name === ".next") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && [".ts", ".tsx"].includes(extname(e.name))) {
      yield full;
    }
  }
}

async function main() {
  const dir = parseArg("dir", "src");
  if (!dir) { console.error("--dir required"); process.exit(2); }
  const engine = RuleEngine.fromRules(allRules);

  let scanned = 0;
  let findings = 0;
  for await (const file of walk(dir)) {
    const content = await readFile(file, "utf8");
    const r = await engine.evaluate({
      surface: "source_code",
      source: "claude_code",
      content,
      location: { filePath: file },
    });
    scanned++;
    for (const f of r.findings) {
      process.stdout.write(JSON.stringify({ ...f, location: { ...f.location, filePath: file } }) + "\n");
      findings++;
    }
  }
  process.stderr.write(`marshall-scan: ${scanned} files, ${findings} findings\n`);
}

main().catch((e) => { console.error(e); process.exit(3); });
