/**
 * Generate src/lib/kb/migrations/embedded226.ts from supabase migrations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "supabase/migrations/20260820160000_prompt_226_converter_schema.sql",
  "supabase/migrations/20260820161000_prompt_226_marshall_converter_allowlist_seed.sql",
  "supabase/migrations/20260820162000_prompt_226_lex_clear_disclaimer_v1.sql",
  "supabase/migrations/20260820170000_prompt_226_module_b_deidentified.sql",
  "supabase/migrations/20260820171000_prompt_226_user_prescribed_peptides.sql",
];

const migrations = files.map((rel) => {
  const sql = fs.readFileSync(path.join(root, rel), "utf8");
  return { file: path.basename(rel), sql };
});

const out = `/**
 * Embedded Prompt 226 migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations (folder is vercelignored).
 * Re-run: node tmp/gen-embedded-226.mjs
 */

export const PROMPT_226_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = ${JSON.stringify(
  migrations,
  null,
  2,
)};
`;

const dest = path.join(root, "src/lib/kb/migrations/embedded226.ts");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log("wrote", dest, "migrations", migrations.length, "bytes", out.length);
