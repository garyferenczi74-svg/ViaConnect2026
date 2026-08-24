import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const middleware = readFileSync(
  resolve(__dirname, "../supabase/middleware.ts"),
  "utf8",
);

describe("location search public allowlist", () => {
  it("allowlists /api/location/ so logged-out signup can typeahead", () => {
    expect(middleware).toContain('pathname.startsWith("/api/location/")');
  });
});
