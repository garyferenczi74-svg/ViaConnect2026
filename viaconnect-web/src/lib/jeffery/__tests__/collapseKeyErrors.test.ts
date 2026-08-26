import { describe, expect, it } from "vitest";
import { collapseDuplicateKeyErrors, isAnthropicKeyError } from "../collapseKeyErrors";

describe("collapse duplicate ANTHROPIC_API_KEY rows", () => {
  it("keeps the first-seen date and drops later copies of the same error", () => {
    const rows = [
      {
        id: "newest",
        title: "Advisor chat error (consumer)",
        summary: "ANTHROPIC_API_KEY not set",
        created_at: "2026-06-13T12:00:00.000Z",
      },
      {
        id: "mid",
        title: "Advisor chat error (consumer)",
        summary: "ANTHROPIC_API_KEY not set",
        created_at: "2026-06-10T12:00:00.000Z",
      },
      {
        id: "first",
        title: "Advisor chat error (consumer)",
        summary: "ANTHROPIC_API_KEY not set",
        created_at: "2026-06-01T15:40:12.000Z",
      },
    ];
    const collapsed = collapseDuplicateKeyErrors(rows);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].id).toBe("first");
    expect(collapsed[0].created_at).toBe("2026-06-01T15:40:12.000Z");
  });

  it("does not drop a different pending finding", () => {
    const rows = [
      {
        id: "key",
        title: "Advisor chat error (consumer)",
        summary: "ANTHROPIC_API_KEY not set",
        created_at: "2026-06-13T12:00:00.000Z",
      },
      {
        id: "p0",
        title: "Marshall P0: MARSHALL.GENETIC.GENEX360_CONSENT",
        summary: "Finding: GeneX360 report attempt without valid none consent (have: none).",
        created_at: "2026-06-03T15:40:12.000Z",
      },
    ];
    const collapsed = collapseDuplicateKeyErrors(rows);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((r) => r.id)).toEqual(["key", "p0"]);
  });

  it("recognizes the walk copy as a KEY error", () => {
    expect(isAnthropicKeyError({ summary: "ANTHROPIC_API_KEY not set" })).toBe(true);
    expect(isAnthropicKeyError({ title: "Advisor chat error (consumer)", summary: "timeout" })).toBe(false);
  });
});
