// Prompt #164 follow-up: re-append the legacy hand-rolled exports to
// src/lib/supabase/types.ts that commit 2f5554c1 restored after the previous
// regen. The current orchestrator (32f20377) regenerated types.ts and again
// wiped this block, breaking (app)/layout.tsx + auth-store.ts at runtime with
// "Application error: a server-side exception has occurred". Idempotent: if
// the block already exists, this is a no-op.

const fs = require('fs');
const file = 'C:/Users/garyf/ViaConnect2026/viaconnect-web/src/lib/supabase/types.ts';
const marker = '// Legacy hand-rolled exports.';
const current = fs.readFileSync(file, 'utf8');

if (current.includes(marker)) {
  console.log('Legacy block already present. No-op.');
  process.exit(0);
}

const block = `
// ---------------------------------------------------------------------------
// Legacy hand-rolled exports.
//
// These lived at the bottom of the hand-rolled types.ts before it was
// regenerated via \`supabase gen types typescript --linked\` in commit a47e80d.
// Re-appending them here because the regenerate wiped them, and (app)/layout.tsx
// + auth-store.ts import mapDatabaseRoleToUserRole at runtime; when the
// function is undefined the SSR layout throws and produces the Next.js
// production fallback "Application error: a server-side exception has occurred".
//
// Each subsequent \`supabase gen types typescript --linked\` run must preserve
// this block. If you re-run the generator, re-append this section by hand.
// ---------------------------------------------------------------------------

export type DatabaseRole = "patient" | "practitioner" | "admin" | "naturopath"
export type UserRole = "consumer" | "practitioner" | "naturopath" | "admin"

export function mapDatabaseRoleToUserRole(dbRole: DatabaseRole | string): UserRole {
  switch (dbRole) {
    case "patient": return "consumer"
    case "practitioner": return "practitioner"
    case "naturopath": return "naturopath"
    case "admin": return "admin"
    default: return "consumer"
  }
}

// Legacy type aliases from the pre-regen types.ts. Kept as \`any\` because
// they were \`any\` before; the TypeScript callers narrow via their own
// guards. Do not tighten these without auditing every import site.
export type Profile = any
export type Product = any
export type SupplementLog = any
export type GeneticVariant = any
export type Conversation = any
export type Message = any
export type Achievement = any
export type UserAchievement = any
export type Subscription = any
export type AssessmentResult = any
`;

fs.appendFileSync(file, block);
const final = fs.readFileSync(file, 'utf8');
console.log(`Appended ${block.length} chars. File now ${final.length} chars. Marker present: ${final.includes(marker)}`);
