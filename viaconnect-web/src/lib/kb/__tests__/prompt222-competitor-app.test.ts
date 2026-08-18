import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KB_COLLECTION_CHARTERS,
  KB_COLLECTION_SLUGS,
  charterBySlug,
  isKbCollectionSlug,
} from "../collections";

const MIGRATION = resolve(
  __dirname,
  "../../../../supabase/migrations/20260818120000_prompt_222_competitor_app.sql"
);

describe("prompt222 competitor_app", () => {
  it("registers competitor_platforms as the thirteenth collection", () => {
    expect(KB_COLLECTION_SLUGS).toContain("competitor_platforms");
    expect(KB_COLLECTION_SLUGS).toHaveLength(13);
    expect(isKbCollectionSlug("competitor_platforms")).toBe(true);
    const c = charterBySlug("competitor_platforms");
    expect(c?.owningAgent).toBe("hounddog");
    expect(c?.coOwnerAgents).toEqual(["sherlock", "jeffery"]);
    expect(c?.gateProfile).toBe("standard");
    expect(c?.cadenceClass).toBe("weekly");
    expect(c?.seedingPhase).toBe(2);
  });

  it("migration expands payload_type and seeds the collection", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/competitor_app/);
    expect(sql).toMatch(/competitor_platforms/);
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS kb_items_payload_type_check/);
    expect(sql).toMatch(/consumer_safe = false/);
    expect(sql).not.toMatch(/[\u2013\u2014]/);
  });
});
