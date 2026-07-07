# Regenerating Supabase TypeScript types (types.ts + snapshot)

Task P3-1 (Prompt 210d) made `src/lib/supabase/types.ts` carry the live-generated
`Database` definition instead of a hand-maintained subset. From now on the file is
MACHINE OUTPUT plus one preserved hand-written tail block. Never hand-edit the
generated body; regenerate it with this procedure.

## The two files and their relationship

| File | Role |
|------|------|
| `docs/integrity/snapshot/live-types.ts` | Verbatim generator output. The schema truth snapshot. Never hand-edited, not even the tail. |
| `src/lib/supabase/types.ts` | Identical generator output PLUS the "Legacy hand-rolled exports" tail block re-appended verbatim (see below). This is the file application code imports. |

Invariant: `types.ts` == `live-types.ts` + one blank line + the preserved tail block.
The two files must be regenerated TOGETHER, from the same generator run, so they can
never drift from each other.

## When to regenerate (snapshot refresh policy)

Regenerate BOTH files together after ANY migration is applied to the live project
(project `nnhkcufyqjojdbvdrpky`). Applies are controller-executed with Gary sign-off
and recorded in `docs/integrity/remediation-log.md` per
`docs/integrity/apply-procedure.md` (task P3-3); the regen is the final step of that
apply procedure. Do not regenerate against a schema that has unapplied local
migrations; the snapshot must reflect what is actually live.

## Procedure A: Supabase MCP (preferred, no local token needed)

1. In a Claude Code session with the Supabase MCP connected (OAuth), call the
   `generate_typescript_types` tool for project `nnhkcufyqjojdbvdrpky`.
2. Paste the returned TypeScript verbatim into `docs/integrity/snapshot/live-types.ts`,
   replacing the whole file. Byte-for-byte, no edits, LF line endings.
3. Write the SAME content to `src/lib/supabase/types.ts`, then re-append the
   preserved tail block (below) after one blank line.
4. Run the verification steps.

## Procedure B: Supabase CLI (fallback)

1. Get a personal access token from https://supabase.com/dashboard/account/tokens
   (scoped to the ViaConnect2026 org). This is a developer-local credential;
   NO CI secret is required because this is a manual paste-to-file procedure.
2. Run:

   ```
   SUPABASE_ACCESS_TOKEN=<token> npx supabase gen types typescript \
     --project-id nnhkcufyqjojdbvdrpky --schema public > /tmp/live-types.ts
   ```

   (On a linked checkout `npx supabase gen types typescript --linked` is equivalent.)
3. Copy `/tmp/live-types.ts` over `docs/integrity/snapshot/live-types.ts` verbatim,
   then follow steps 3-4 of Procedure A.

## The preserved tail block (MUST survive every regen)

`src/lib/supabase/types.ts` ends with a hand-written block delimited by the comment
header `Legacy hand-rolled exports.`. It exists because `(app)/layout.tsx` and
`src/lib/store/auth-store.ts` import `mapDatabaseRoleToUserRole` at RUNTIME; if a
regen wipes it the SSR layout throws in production. The block exports:

- `DatabaseRole`, `UserRole` (string literal unions)
- `mapDatabaseRoleToUserRole()` (runtime function)
- Legacy `any` aliases: `Profile`, `Product`, `SupplementLog`, `GeneticVariant`,
  `Conversation`, `Message`, `Achievement`, `UserAchievement`, `Subscription`,
  `AssessmentResult`

After every regen, re-append that block verbatim (copy it from the previous git
revision of `types.ts` if the working copy was overwritten:
`git show HEAD:src/lib/supabase/types.ts | sed -n '/Legacy hand-rolled exports/,$p'`).
None of these exports reference generated table names, so they type-resolve
regardless of schema changes.

## Verification steps (run after every regen)

1. `npx tsc --noEmit 2>&1 | grep -c "error TS"` and compare against the count
   recorded in the previous regen commit message. New errors mean code references
   schema objects that no longer exist (that is the guardrail working); route them
   through the schema-drift allowlist process (task P3-4), do not hand-edit the
   generated body to silence them.
2. Shape tests (they parse the snapshot):

   ```
   npx vitest run src/lib/utils/__tests__/schema-drift.test.ts \
     src/app/actions/__tests__/daily-scores-shape.test.ts \
     src/lib/gamification/__tests__/live-shape.test.ts \
     src/lib/__tests__/profiles-write-shape.test.ts \
     src/lib/compliance/__tests__/kelsey-review-shape.test.ts \
     src/app/api/stripe/__tests__/webhook-shapes.test.ts
   ```

3. Confirm the tail block survived: `grep -c "mapDatabaseRoleToUserRole" src/lib/supabase/types.ts`
   must return at least 1.
4. Commit both files in the same commit, by explicit path, with the before/after
   tsc counts in the message, e.g.
   `chore(schema): regen types from live schema (tsc errors before=N after=M)`.

## Rules

- Never edit `docs/integrity/snapshot/live-types.ts` by hand.
- Never edit the generated body of `src/lib/supabase/types.ts` by hand.
- Never regenerate only one of the two files.
- Hand-written text in this repo is ASCII only (no em dashes, no en dashes,
  no emojis). The generated body is exempt because it is machine output; note
  any non-ASCII the generator emits in the commit message instead of editing it.
