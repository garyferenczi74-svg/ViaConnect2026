/**
 * Prompt 221 step 2 wire: pipeline guards + capability registration.
 */

import { describe, expect, it } from "vitest";
import { CAPABILITY_IDS, CAPABILITY_DEFINITIONS } from "@/lib/jeffery/capabilities/types";
import { canRetrieveKbItem } from "../promote";
import { contentHashFromParts } from "../contentHash";
import { isKbItemRetrievable } from "@/lib/jeffery/reviews/runReview";

describe("221 wire capability registry", () => {
  it("registers kb_search and kb_read", () => {
    expect(CAPABILITY_IDS).toContain("kb_search");
    expect(CAPABILITY_IDS).toContain("kb_read");
    expect(CAPABILITY_DEFINITIONS.kb_search.requiresMarshallGate).toBe(false);
    expect(CAPABILITY_DEFINITIONS.kb_read.id).toBe("kb_read");
  });
});

describe("221 wire retrievability", () => {
  it("requires both Marshall gate and Jeffery approved", () => {
    expect(
      canRetrieveKbItem({ gateStatus: "approved", jefferyVerdict: "pending" })
    ).toBe(false);
    expect(
      canRetrieveKbItem({ gateStatus: "approved", jefferyVerdict: "approved" })
    ).toBe(true);
    expect(
      isKbItemRetrievable({
        gateStatus: "lex_approved",
        jefferyVerdict: "approved",
      })
    ).toBe(true);
  });
});

describe("221 wire bridge hash stability", () => {
  it("hashes gated source for dedupe", () => {
    const h = contentHashFromParts({
      source_url: "https://pubmed.ncbi.nlm.nih.gov/12345/",
      title: "Example study",
      summary: "Outcomes summary",
    });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    const h2 = contentHashFromParts({
      summary: "Outcomes summary",
      title: "Example study",
      source_url: "https://pubmed.ncbi.nlm.nih.gov/12345/",
    });
    expect(h).toBe(h2);
  });
});
