import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const selector = readFileSync(
  resolve(__dirname, "../../components/location/LocationSelector.tsx"),
  "utf8",
);
const combobox = readFileSync(
  resolve(__dirname, "../../components/location/TypeaheadCombobox.tsx"),
  "utf8",
);
const source = `${selector}\n${combobox}`;

describe("location selector contract", () => {
  it("uses accessible combobox roles, Hannah free-entry copy, and mobile input tokens", () => {
    expect(source).toContain('role="combobox"');
    expect(source).toContain('role="listbox"');
    expect(source).toContain("Use '");
    expect(source).toContain("min-h-[44px]");
    expect(source).toContain("text-base");
  });

  it("does not contain a literal em dash", () => {
    expect(selector).not.toMatch(/\u2014/);
    expect(combobox).not.toMatch(/\u2014/);
  });
});
