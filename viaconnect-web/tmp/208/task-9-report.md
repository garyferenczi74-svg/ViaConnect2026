# Task 9 Report - publishRule compliance-gated Gate B

## Status: COMPLETE

## Commit
SHA: 63650b6c
Subject: feat(kb): add publishRule compliance-gated path to published status (Prompt 208 Task 9)

## Files changed (staged by explicit path only)
- src/lib/kb/snpProtocolRules.ts (additive: new imports + ruleClaimText + publishRule)
- src/lib/kb/__tests__/snpProtocolRules.publish.test.ts (new file, 8 tests)

## Implementation summary

### Imports added to snpProtocolRules.ts
- reviewServerText + ServerReviewDecision from @/lib/compliance/review-server-text
- canTransitionToPublished from ./knowledgeBus
- safeLog from @/lib/utils/safe-log

### ruleClaimText(rule)
Composes consumer-facing text from effect, recommended_form ("Prefer X."),
flagged_form ("Flag X."), and avoid_list. Falls back to gene + rsid identity
string so text is never empty.

### publishRule(ruleId)
1. Fetch rule by id via admin client. Not found -> { published:false, decision:'BLOCKED' }.
2. canTransitionToPublished guard. Not in_review -> { published:false, decision:<current> }.
3. ruleClaimText(rule) composes text.
4. reviewServerText({ text, jurisdiction:'US', subject_type:'protocol', actor_role:'system' }).
5. pass_stage_1 | APPROVED | CONDITIONAL -> UPDATE review_status='published'; return { published:true }.
   BLOCKED | ESCALATE -> safeLog.warn + return { published:false }. Rule stays in_review.
6. No manual knowledge_bus insert (DB trigger handles it on UPDATE).
Fail-safe: any throw -> safeLog.error + { published:false, decision:'ESCALATE' }.

## Test results
Focused (RED -> GREEN): 8/8 pass
Full suite: 543 test files passed, 5 skipped, 7627 tests passed - no new failures.

## Jurisdiction and SubjectType choices
- jurisdiction: 'US' (mirrored from hannahDecipher.ts and arnold-recommender.ts callers)
- subject_type: 'protocol' (mirrored from hannahDecipher.ts; fits SNP protocol recommendation)

## Concerns
None. The update error path also returns ESCALATE to remain fail-safe.
The guard uses the existing canTransitionToPublished real implementation (not mocked).

## Fix (review findings)

Command: `npx vitest run src/lib/kb/__tests__/snpProtocolRules.publish.test.ts`

Output:
```
 RUN  v4.1.4 C:/Users/garyf/ViaConnect2026/viaconnect-web

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  02:37:39
   Duration  286ms (transform 72ms, setup 0ms, import 112ms, tests 7ms, environment 0ms)
```

### Change 1 (correctness bug) - check Supabase update error result
In `publishRule`, the `await supabase.from(...).update(...).eq(...)` call previously
discarded its return value inside a try/catch. Because the Supabase JS client resolves
(never throws) on DB errors, a failed UPDATE silently fell through to `return { published: true }`.
Fixed by destructuring `{ error: updateError }` from the update call and returning
`{ published: false, decision: 'ESCALATE' }` when `updateError` is truthy. The
surrounding try/catch is kept for genuine throws. New Test 6 covers this path.

### Change 2 (type safety) - guard-path decision value
The not-in_review guard returned `decision: rule.review_status as ServerReviewDecision`,
which was a type lie (e.g. 'draft' is not a ServerReviewDecision). Changed to return
`decision: 'BLOCKED'` (semantically correct: rule is blocked from transitioning). Test 4
updated to assert `expect(result.decision).toBe('BLOCKED')`.
