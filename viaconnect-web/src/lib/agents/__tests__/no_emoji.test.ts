import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Invariant: no emojis in any agent-panel source file.
// Matches Prompt #126 §3 hard rule and Marshall's standing rule.
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F100}-\u{1F1FF}]/u;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(name)) out.push(full);
  }
  return out;
}

describe("Agent-panel emoji invariant", () => {
  it("contains no emoji characters in source", () => {
    const roots = [
      "src/lib/agents",
      "src/hooks",
      "src/components/admin/jeffery/agents",
      "src/app/(app)/admin/jeffery/agents",
      "src/app/api/admin/agents",
    ];
    for (const root of roots) {
      let files: string[] = [];
      try {
        files = walk(root);
      } catch {
        continue;
      }
      for (const f of files) {
        const content = readFileSync(f, "utf8");
        expect(EMOJI_REGEX.test(content)).toBe(false);
      }
    }
  });
});
