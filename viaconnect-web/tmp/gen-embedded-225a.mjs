/**
 * Generate src/lib/kb/migrations/embedded225a.ts from supabase migrations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "supabase/migrations/20260820150000_prompt_225a_clinical_evidence_schema.sql",
];

const migrations = files.map((rel) => {
  const sql = fs.readFileSync(path.join(root, rel), "utf8");
  return { file: path.basename(rel), sql };
});

const out = `/**
 * Embedded Prompt 225a migration SQL for Vercel runtime apply.
 * Generated from supabase/migrations (folder is vercelignored).
 * Re-run: node tmp/gen-embedded-225a.mjs
 */

export const PROMPT_225A_MIGRATIONS: ReadonlyArray<{ file: string; sql: string }> = ${JSON.stringify(
  migrations,
  null,
  2,
)};
`;

const dest = path.join(root, "src/lib/kb/migrations/embedded225a.ts");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log("wrote", dest, "migrations", migrations.length, "bytes", out.length);
