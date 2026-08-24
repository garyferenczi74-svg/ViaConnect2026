/**
 * Prompt 221 Phase 1: embed compose + peptide grade map smoke.
 */

import { describe, expect, it } from "vitest";
import { composeItemEmbedText } from "../embedItem";

describe("221 phase1 embed compose", () => {
  it("builds representative text without inventing content", () => {
    const t = composeItemEmbedText({
      title: "Liposomal curcumin absorption",
      summary: "Study outcomes summary.",
      payload_type: "study",
      evidence_grade: "B",
    });
    expect(t).toMatch(/Liposomal curcumin/);
    expect(t).toMatch(/grade:B/);
    expect(t).toMatch(/type:study/);
  });

  it("handles empty fields", () => {
    expect(composeItemEmbedText({}).trim()).toBe("");
  });
});
