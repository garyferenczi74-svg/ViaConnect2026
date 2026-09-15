import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StageResult } from "@/lib/agents/synchronism/chainTypes";
import { quarantineStages } from "../quarantineStages";

const helperSrc = readFileSync(
  join(process.cwd(), "src/lib/jeffery/quarantineStages.ts"),
  "utf8",
);

describe("quarantineStages", () => {
  it("passes through an array without inventing rows", () => {
    const ingest = {
      stage: "ingest",
      status: "ok",
      producer: "jeffery",
      recordsIn: 0,
      recordsOut: 1,
      durationMs: 10,
      detail: {},
    } satisfies StageResult;
    const raw = [ingest];
    const out = quarantineStages<StageResult>(raw);
    expect(out).toBe(raw);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(ingest);
  });

  it("returns [] for object-shaped stages and never uses object keys", () => {
    const raw = { ingest: { status: "ok" }, gate: { status: "ok" } };
    const out = quarantineStages<StageResult>(raw);
    expect(out).toEqual([]);
    expect(out).not.toHaveLength(Object.keys(raw).length);
    expect(helperSrc).toContain("Array.isArray(raw)");
    expect(helperSrc).not.toMatch(/Object\.keys/);
  });

  it("returns [] for null, undefined, and non-array primitives", () => {
    expect(quarantineStages(null)).toEqual([]);
    expect(quarantineStages(undefined)).toEqual([]);
    expect(quarantineStages("ingest")).toEqual([]);
    expect(quarantineStages(7)).toEqual([]);
  });
});
