/**
 * Generate src/lib/kb/migrations/embedded226d.ts from supabase migrations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "supabase/migrations/20260821180000_prompt_226d_peptide_routes.sql",
  "supabase/migrations/20260821181000_prompt_226d_goal_domains_and_links.sql",
  "supabase/migrations/20260821182000_prompt_226d_suggestion_sessions.sql",
];

const migrations = files.map((rel) => {
  const sql = fs.readFileSync(path.join(root, rel), "utf8");
  return { file: path.basename(rel), sql };
});

const out = `/**
 * Embedded Prompt 226d migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations (folder is vercelignored).
 * Re-run: node tmp/gen-embedded-226d.mjs
 */

export const PROMPT_226D_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = ${JSON.stringify(
  migrations,
  null,
  2,
)};
`;

const dest = path.join(root, "src/lib/kb/migrations/embedded226d.ts");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log("wrote", dest, "migrations", migrations.length, "bytes", out.length);
