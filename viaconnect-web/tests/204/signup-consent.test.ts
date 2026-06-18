import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "../../src/app/(auth)/signup/page.tsx"),
  "utf8"
);

describe("signup consent", () => {
  it("tracks a consent state", () => {
    expect(src).toContain("consentAccepted");
  });

  it("links to privacy and terms in new tabs", () => {
    expect(src).toContain('href="/privacy"');
    expect(src).toContain('href="/terms"');
    expect(src).toContain('target="_blank"');
    expect(src).toContain("noopener noreferrer");
  });

  it("gates the Continue button on consent at step 1", () => {
    expect(src).toContain("step === 1 && !consentAccepted");
  });

  it("persists consent fields into signUp metadata", () => {
    expect(src).toContain("privacy_accepted_at");
    expect(src).toContain("terms_accepted_at");
    expect(src).toContain("policy_version");
    expect(src).toContain('"2026-06-17"');
  });
});
