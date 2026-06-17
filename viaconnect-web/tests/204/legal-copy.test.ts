import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const privacy = () =>
  readFileSync(
    resolve(__dirname, "../../src/app/(legal)/privacy/page.tsx"),
    "utf8"
  );

describe("Privacy Policy page", () => {
  it("uses the corrected entity name and address, not the rejected variants", () => {
    const src = privacy();
    expect(src).toContain("Farmceutica Wellness LLC");
    expect(src).toContain("60 Lakefront Blvd");
    expect(src).not.toContain("Farmceutica Wellness Ltd");
    expect(src).not.toContain("Waterfront");
  });

  it("renders emails as mailto links", () => {
    expect(privacy()).toContain("mailto:info@farmceuticawellness.com");
  });

  it("shows the effective and last-updated dates", () => {
    const src = privacy();
    expect(src).toContain("Last Updated: June 17, 2026");
    expect(src).toContain("Effective Date: June 17, 2026");
  });

  it("sets an absolute page title so the root template does not append GeneX360", () => {
    const src = privacy();
    expect(src).toContain('absolute: "Privacy Policy | ViaConnect"');
    expect(src).toContain("index: true");
  });

  it("preserves the genetic-data section heading", () => {
    expect(privacy()).toContain("Genetic Information: Special Handling");
  });
});
