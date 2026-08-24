/**
 * Generate src/lib/kb/migrations/embedded225.ts from supabase migrations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "supabase/migrations/20260820130000_prompt_225_kb_peptides.sql",
  "supabase/migrations/20260820131000_prompt_225_keep_seed.sql",
  "supabase/migrations/20260820132000_prompt_225_new_seed.sql",
  "supabase/migrations/20260820133000_prompt_225_marshall_flagship_consumer_safe.sql",
  "supabase/migrations/20260820134000_prompt_225_snp_link_stubs.sql",
  "supabase/migrations/20260820135000_prompt_225_via_cura_adjacency.sql",
  "supabase/migrations/20260820136000_prompt_225_sample_regulatory_event.sql",
  "supabase/migrations/20260820137000_prompt_225_jeffery_apply_regulatory_event.sql",
  "supabase/migrations/20260820138000_prompt_225_marshall_consumer_safe_expand.sql",
  "supabase/migrations/20260820139000_prompt_225_flagship_depth_enrichment.sql",
  "supabase/migrations/20260820140000_prompt_225_hounddog_wada_verify_batch.sql",
];

const migrations = files.map((rel) => {
  const sql = fs.readFileSync(path.join(root, rel), "utf8");
  return { file: path.basename(rel), sql };
});

const out = `/**
 * Embedded Prompt 225 migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations (folder is vercelignored).
 * Re-run: node tmp/gen-embedded-225.mjs
 */

export const PROMPT_225_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = ${JSON.stringify(
  migrations,
  null,
  2,
)};
`;

const dest = path.join(root, "src/lib/kb/migrations/embedded225.ts");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log("wrote", dest, "migrations", migrations.length, "bytes", out.length);
