import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.resolve(__dirname, "..", "page.tsx");

describe("Epigenetic upload page", () => {
  const source = readFileSync(PAGE, "utf-8");

  it("mounts EpigenUploadPanel on its own route, not a tab redirect", () => {
    expect(source).toContain("EpigenUploadPanel");
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("?tab=epigen");
    expect(source).toContain("bg-[#1A2744]");
    expect(source).toContain("strokeWidth={1.5}");
  });

  it("is a server component with metadata", () => {
    expect(source).not.toContain("'use client'");
    expect(source).toContain("export const metadata");
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
