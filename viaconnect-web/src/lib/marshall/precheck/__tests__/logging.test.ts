import { describe, it, expect, vi } from "vitest";
import { precheckLog } from "../logging";

describe("PII-safe logging", () => {
  it("redacts long strings", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const longString = "x".repeat(500);
    precheckLog("info", { event: "test", hash: "abc", sessionId: "s1", anyField: longString });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).toContain("[redacted:500ch]");
    expect(line).not.toContain(longString);
    spy.mockRestore();
  });

  it("passes short strings through", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    precheckLog("info", { event: "test", hash: "abc123" });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).toContain("abc123");
    spy.mockRestore();
  });

  it("does not serialize nested objects verbosely", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    precheckLog("info", { event: "test", nested: { secret: "x".repeat(500) } as never });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).toContain("[object]");
    spy.mockRestore();
  });
});
