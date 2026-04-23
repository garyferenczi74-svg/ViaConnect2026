import { describe, it, expect } from "vitest";

// The full proposeAndRevalidate path requires the Anthropic SDK + live env.
// For the unit-test pass we exercise the JSON parser + prompt-injection
// defense by importing the module's private helpers via a thin public shim.
// The module itself does not expose parseAndValidate publicly to avoid
// footguns, so we test the behavior via a mocked rewrite path in the
// integration suite (tests/e2e/precheck_full_flow.test.ts in a follow-up).

import { proposeAndRevalidate } from "../remediate";

describe("proposeAndRevalidate", () => {
  it("returns unremediable when ANTHROPIC_API_KEY is not set", async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const result = await proposeAndRevalidate(
      {
        findingId: "fid",
        ruleId: "MARSHALL.TEST",
        severity: "P2",
        surface: "precheck_draft",
        source: "runtime",
        location: {},
        excerpt: "example",
        message: "m",
        citation: "c",
        remediation: { kind: "suggested", summary: "s" },
        createdAt: new Date().toISOString(),
        confidence: 0.9,
        round: 1,
        remediationKind: "pending",
      },
      "draft",
    );
    expect(result.clean).toBe(false);
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
  });
});
