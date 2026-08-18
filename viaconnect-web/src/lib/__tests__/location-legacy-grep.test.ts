import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC_ROOT = join(__dirname, "..", "..");
const SELF_REL = "lib/__tests__/location-legacy-grep.test.ts";

/** Contiguous legacy column / metadata key; built so this file is the allowlisted mention site. */
const LOCATION_LEGACY = "location" + "_legacy";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") {
      continue;
    }
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      out.push(...walk(p));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function relPosix(abs: string): string {
  return relative(SRC_ROOT, abs).split(sep).join("/");
}

describe("location legacy grep proof", () => {
  const files = walk(SRC_ROOT);

  it(`keeps ${LOCATION_LEGACY} only under src/lib/location (plus this test)`, () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relPosix(file);
      if (rel.startsWith("lib/location/")) {
        continue;
      }
      if (rel === SELF_REL) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (text.includes(LOCATION_LEGACY)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no user_metadata?.location reads in src", () => {
    const offenders: string[] = [];
    const pattern = /user_metadata\?\.location\b/;
    for (const file of files) {
      const rel = relPosix(file);
      if (rel === SELF_REL) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (pattern.test(text)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("signup metadata does not write a combined location key", () => {
    const signupPage = readFileSync(
      join(SRC_ROOT, "app", "(auth)", "signup", "page.tsx"),
      "utf8",
    );
    // Combined legacy metadata key only (not location_is_free_entry / LocationSelector).
    expect(signupPage).not.toMatch(/^\s*location\s*:/m);
    expect(signupPage).not.toMatch(/user_metadata\?\.location\b/);
  });
});
