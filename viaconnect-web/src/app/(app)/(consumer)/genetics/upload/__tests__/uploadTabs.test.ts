// Brief 17: Upload Genetic Data is one DNA upload. The seven per-panel
// tabs are gone. Epigenetic lives on /genetics/epigenetic/upload.
// Source-as-text per the repo convention.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const PAGE = path.resolve(__dirname, "..", "page.tsx");

describe("Upload Genetic Data (one DNA upload)", () => {
  const source = readFileSync(PAGE, "utf-8");

  it("is a single DNA upload with no per-panel tab bar", () => {
    expect(source).toContain("Upload Genetic Data");
    expect(source).toContain("UPLOAD DNA DATA, REPORT, OR PHOTO");
    expect(source).toContain("Upload data, PDF, or photo");
    expect(source).toContain("image/*");
    expect(source).not.toContain("type UploadTab");
    expect(source).not.toContain('label: "DNA Test"');
    expect(source).not.toContain('label: "Methylation"');
    expect(source).not.toContain('label: "Nutrition"');
    expect(source).not.toContain('label: "Hormone"');
    expect(source).not.toContain('label: "Epigenetic"');
    expect(source).not.toContain('label: "Peptide"');
    expect(source).not.toContain('label: "Cannabis"');
    expect(source).not.toContain("EpigenUploadPanel");
    expect(source).not.toContain("useSearchParams");
  });

  it("keeps GENEX360 auto-import and the provider grid on the one DNA surface", () => {
    expect(source).toContain("ViaConnect GENEX360");
    expect(source).toContain("SUPPORTED_PROVIDERS");
    expect(source).toContain("/api/genex/upload");
  });

  it("does not scope the upload to a per-tab panel", () => {
    expect(source).not.toContain("panelScope");
    expect(source).not.toContain('formData.append("panel"');
    expect(source).not.toContain("activeTab");
  });

  it("shows Not analyzed instead of 0 as a marker count", () => {
    expect(source).toContain("emptyMarkerCountLabel");
    expect(source).toContain("isEmptyMarkerCount");
    expect(source).not.toContain("0 genetic variants analyzed");
  });

  it("contains no em or en dashes", () => {
    expect(source.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(source.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
