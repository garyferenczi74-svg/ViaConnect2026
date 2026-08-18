import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const DOCX = resolve(
  __dirname,
  "../../../../docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.docx"
);

const SCRIPT = resolve(
  __dirname,
  "../../../../scripts/prompt-222-docx.mjs"
);

describe("prompt222 docx", () => {
  it("exists as a PK zip over 5000 bytes with US Letter page size in the generator", () => {
    expect(existsSync(DOCX)).toBe(true);
    const buf = readFileSync(DOCX);
    expect(buf.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(statSync(DOCX).size).toBeGreaterThan(5000);
    const script = readFileSync(SCRIPT, "utf8");
    expect(script).toContain("12240");
    expect(script).toContain("15840");
  });
});
