import { describe, expect, it } from "vitest";
import { deriveJefferyVerdict } from "../runReview";
import { buildPrompt222JefferyInput } from "../prompt222Review";

describe("Prompt 222 Jeffery completion_report package", () => {
  it("packages completion_report as needs_human while apply is pending", () => {
    const input = buildPrompt222JefferyInput();
    expect(input.artifactType).toBe("completion_report");
    expect(input.producedByAgent).toBe("hounddog");
    expect(input.artifactRef).toBe(
      "docs/superpowers/reports/2026-08-18-prompt-222-headsup-teardown.md"
    );
    expect(input.checks.some((c) => c.name === "live_kb_apply_pending")).toBe(
      true
    );
    expect(
      input.checks.find((c) => c.name === "live_kb_apply_pending")?.result
    ).toBe("fail");
    const outcome = deriveJefferyVerdict(input.artifactType, input.checks, {
      producedByAgent: input.producedByAgent,
    });
    expect(outcome.verdict).toBe("needs_human");
    expect(outcome.hardBlock).toBe(true);
  });
});
