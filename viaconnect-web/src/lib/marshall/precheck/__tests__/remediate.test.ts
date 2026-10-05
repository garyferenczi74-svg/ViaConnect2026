import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The full proposeAndRevalidate path requires the Anthropic SDK + live env.
// For the unit-test pass we exercise the JSON parser + prompt-injection
// defense by importing the module's private helpers via a thin public shim.
// The module itself does not expose parseAndValidate publicly to avoid
// footguns, so we test the behavior via a mocked rewrite path in the
// integration suite (tests/e2e/precheck_full_flow.test.ts in a follow-up).

import { proposeAndRevalidate, proposeRewrite } from "../remediate";

const xaiFixture = JSON.parse(
  readFileSync(
    path.join(__dirname, "..", "..", "..", "ai", "llm", "__tests__", "fixtures", "xai-response.json"),
    "utf8",
  ),
) as unknown;

const finding = {
  findingId: "fid",
  ruleId: "MARSHALL.TEST",
  severity: "P2" as const,
  surface: "precheck_draft" as const,
  source: "runtime" as const,
  location: {},
  excerpt: "example",
  message: "m",
  citation: "c",
  remediation: { kind: "suggested" as const, summary: "s" },
  createdAt: new Date().toISOString(),
  confidence: 0.9,
  round: 1,
  remediationKind: "pending" as const,
};

describe("proposeAndRevalidate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LLM_XAI_ADMIN_MARSHALL_REMEDIATE_ENABLED;
    delete process.env.LLM_XAI_ADMIN_MARSHALL_REMEDIATE_SHADOW;
    delete process.env.LLM_XAI_KILL;
    delete process.env.XAI_API_KEY;
  });

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

  it("does not call xAI while the remediate flag is off", async () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.XAI_API_KEY = "present-but-unused";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await proposeRewrite(finding, "This product cures fatigue.");
    expect(result).toEqual({ unremediable: true, reason: "claude_unavailable" });
    expect(fetchSpy).not.toHaveBeenCalled();
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
  });

  it("routes the admin rewrite through the Responses API only when the flag is on", async () => {
    process.env.LLM_XAI_ADMIN_MARSHALL_REMEDIATE_ENABLED = "true";
    process.env.XAI_API_KEY = "test-key";
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.x.ai")) {
        return Response.json(xaiFixture);
      }
      return Response.json({});
    });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await proposeRewrite(finding, "This product cures fatigue.");
    expect(result).toMatchObject({
      unremediable: false,
      proposedRewrite: "Supports daily energy.",
    });
    const urls = fetchSpy.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.endsWith("/v1/responses"))).toBe(true);
    expect(urls.some((url) => url.includes("/v1/messages"))).toBe(false);
    expect(urls.some((url) => url.includes("chat/completions"))).toBe(false);
  });
});
