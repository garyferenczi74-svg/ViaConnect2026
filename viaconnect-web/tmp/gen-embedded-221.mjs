import fs from "node:fs";
import path from "node:path";

const files = [
  "20260820000010_prompt_221_kb_schema.sql",
  "20260820000011_prompt_221_kb_collections_seed.sql",
  "20260820000012_prompt_221_kb_promote_search.sql",
  "20260820000013_prompt_221a_jeffery_reviews.sql",
  "20260820000014_prompt_221_phase2_competitive_allowlist.sql",
  "20260820000015_prompt_221_phase2_competitive_allowlist_expand.sql",
  "20260820000016_prompt_221_cymbiotika_ca_allowlist.sql",
  "20260820000017_prompt_221_canprev_com_allowlist.sql",
  "20260820000018_prompt_221_pureforyou_com_allowlist.sql",
];
const dir = path.join("supabase", "migrations");
const outDir = path.join("src", "lib", "kb", "migrations");
fs.mkdirSync(outDir, { recursive: true });
const parts = files.map((f) => {
  const body = fs.readFileSync(path.join(dir, f), "utf8");
  console.log(f, "bytes", body.length);
  return { file: f, body };
});
const entries = parts
  .map(
    (p) => `  {
    file: ${JSON.stringify(p.file)},
    sql: ${JSON.stringify(p.body)},
  }`
  )
  .join(",\n");
const src = `/**
 * Embedded Prompt 221/221A migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations (folder is vercelignored).
 * Re-run: node tmp/gen-embedded-221.mjs
 */

export const PROMPT_221_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = [
${entries}
];
`;
fs.writeFileSync(path.join(outDir, "embedded221.ts"), src, "utf8");
console.log("wrote", path.join(outDir, "embedded221.ts"), "bytes", src.length);
