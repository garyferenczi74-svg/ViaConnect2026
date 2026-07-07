# Prompt 210d Remediation Log and Sign-Off Pack

Every row is one remediation unit. Nothing in the Apply column happens until the Gary sign-off column carries his approval. Applies are controller-executed via the Supabase MCP, stamping the migration FILENAME version, with the rollback run_id recorded here at apply time (per docs/integrity/apply-procedure.md, task P3-3).

Status values: BUILT (on branch, reviewed) / SIGNED (Gary approved) / APPLIED (live, run_id recorded) / DECLINED / PENDING (not yet built).

| Unit | Fixes | Artifact | Status | Gary sign-off | Applied | Rollback run_id |
|---|---|---|---|---|---|---|
| P0-2 audit_logs columns | Silent audit-trail loss on 7 routes | migration 20260707081200_prompt_210d_audit_logs_new_shape_columns.sql (commit 3a01f085, review clean) | BUILT | | | |
| P0-3 orders.items | Stripe one-time order rows lost after payment | migration ..._prompt_210d_orders_items_column.sql | PENDING | | | |
| P0-3 subscriptions table | Membership subscription records lost (store-vs-drop decision) | DRAFT migration ..._prompt_210d_subscriptions_table.sql | PENDING | | | |
| P0-4 daily_scores columns + upsert index | Every daily-score persistence write rejected; 208k reader empty | migrations 20260707083321 + 20260707090000 (commits 627cea00 + 722e1073, review clean; apply columns then index) | BUILT | | | |
| P0-5 helix + rewards keys | Live dashboard token-award inserts rejected (type key); redemption keys | code fix d8e844dd, review clean; P0-5b read-side follow-up queued | BUILT | | | |
| P0-6 profiles phone + timezone | Profile saves with phone rejected; timezone sync rejected | migration ..._prompt_210d_profiles_phone_timezone.sql | PENDING | | | |
| P0-7 GENEX import redirect | Parsed variants lost; profile summary write rejected | code fix (target table per investigation) | PENDING | | | |
| P0-8 ViaTokens decision | Dormant broken lane; recommend Option B retire | docs/integrity/p0-viatokens-decision.md | BUILT (decision doc) | | n/a | n/a |
| P0-9 kelsey review keys | Compliance review rows lost | code fix only | PENDING | | | |

Code-fix-only units (P0-5, P0-7, P0-9) reach prod through the normal main deploy, not a migration apply; their sign-off is the merge sign-off. Migration units additionally need the individual apply sign-off recorded here.

## Apply order recommendation (after sign-offs)

1. P0-2 audit_logs (restores audit trail platform-wide, zero behavior risk)
2. P0-6 profiles (unblocks profile saves)
3. P0-4 daily_scores (writer starts persisting; reader shows real history from that day forward)
4. P0-3 orders.items, then the subscriptions decision
5. Code fixes ride the next main deploy after merge

## Notes

- P0-8: no apply; awaiting Gary Option A/B/C selection (recommend B; C is the live default via drift tagging).
- P1 tranche applies are governed by docs/integrity/p1-decision-sheet.md, not this log; any P1 apply gets its own row here at execution time.
