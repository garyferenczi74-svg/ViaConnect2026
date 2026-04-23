// Prompt #113 — Kelsey cache hashSubject determinism tests.

import { describe, it, expect } from "vitest";
import { hashSubject } from "@/lib/compliance/kelsey/cache";

describe("hashSubject", () => {
  it("produces a SHA-256 hex hash (64 chars)", () => {
    const h = hashSubject("Supports healthy immune function", "US", []);
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
  it("is stable across calls with identical inputs", () => {
    const a = hashSubject("Supports healthy immune function", "US", []);
    const b = hashSubject("Supports healthy immune function", "US", []);
    expect(a).toBe(b);
  });
  it("differentiates by jurisdiction", () => {
    const us = hashSubject("Supports healthy immune function", "US", []);
    const ca = hashSubject("Supports healthy immune function", "CA", []);
    expect(us).not.toBe(ca);
  });
  it("sorts the ingredient scope so order does not change the hash", () => {
    const a = hashSubject("text", "US", ["ing-a", "ing-b", "ing-c"]);
    const b = hashSubject("text", "US", ["ing-c", "ing-a", "ing-b"]);
    expect(a).toBe(b);
  });
  it("is case-insensitive on ingredient scope", () => {
    const a = hashSubject("text", "US", ["ING-A"]);
    const b = hashSubject("text", "US", ["ing-a"]);
    expect(a).toBe(b);
  });
  it("normalization-equivalent texts hash identically", () => {
    const a = hashSubject("  Supports   Healthy  Immune  Function!  ", "US", []);
    const b = hashSubject("supports healthy immune function", "US", []);
    expect(a).toBe(b);
  });
});
