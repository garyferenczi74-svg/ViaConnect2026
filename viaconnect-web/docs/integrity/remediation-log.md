# Prompt 210d Remediation Log and Sign-Off Pack

Every row is one remediation unit. Nothing in the Apply column happens until the Gary sign-off column carries his approval. Applies are controller-executed via the Supabase MCP, stamping the migration FILENAME version, with the rollback run_id recorded here at apply time (per docs/integrity/apply-procedure.md, task P3-3).

Status values: BUILT (on branch, reviewed) / SIGNED (Gary approved) / APPLIED (live, run_id recorded) / DECLINED / PENDING (not yet built).

| Unit | Fixes | Artifact | Status | Gary sign-off | Applied | Rollback run_id |
|---|---|---|---|---|---|---|
| P0-2 audit_logs columns | Silent audit-trail loss on 7 routes | migration 20260707081200_prompt_210d_audit_logs_new_shape_columns.sql (commit 3a01f085, review clean) | APPLIED | Gary 2026-07-07 | 2026-07-07 | applied v20260707225210; revert: drop 4 columns |
| P0-3 orders.items | Stripe one-time order rows lost after payment | migration (commit 52eb10aa, review clean) | APPLIED | Gary 2026-07-07 | 2026-07-07 | applied v20260707225443; revert: drop column items |
| P0-3 subscriptions table | Membership subscription records lost | DRAFT migration (commit 52eb10aa); decision input: which URL is registered in Stripe dashboard | APPLIED (STORE decision) | Gary 2026-07-07 | 2026-07-07 | applied v20260707225453; revert: drop table subscriptions |
| P0-4 daily_scores columns + upsert index | Every daily-score persistence write rejected; 208k reader empty | migrations 20260707083321 + 20260707090000 (commits 627cea00 + 722e1073, review clean; apply columns then index) | APPLIED | Gary 2026-07-07 | 2026-07-07 | applied v20260707225426 + v20260707225436; revert: drop 8 columns + index |
| P0-5 helix + rewards keys | Live dashboard token-award inserts rejected (type key); redemption keys | code fix d8e844dd, review clean; P0-5b read-side follow-up queued | BUILT | | | |
| P0-6 profiles phone + timezone | Profile saves with phone rejected; timezone sync rejected | migration 20260707101532 (commit 4555f91b, review clean) | APPLIED | Gary 2026-07-07 | 2026-07-07 | applied v20260707225228 (client timeout, server success verified); revert: drop 2 columns |
| P0-7/7b GENEX import redirect | Parsed variants lost; profile summary write rejected | code fix 65a8383a + migration 20260707160000 (review clean) | APPLIED | Gary 2026-07-07 | 2026-07-07 | revert: drop 2 columns + code revert | | | |
| P0-8/8b ViaTokens | Dormant broken lane; recommend Option B retire | docs/integrity/p0-viatokens-decision.md  + retirement 73395890, micro-review clean | EXECUTED (Option B) | Gary 2026-07-07 | n/a | git revert 73395890 |
| P0-9b sentinel unification | fail_closed sentinel parity with route | code fix 96367881, controller-verified | BUILT | | | |
| P0-9 kelsey review keys | Compliance review rows lost | code fix 92161eb8, review clean; P0-9b sentinel unification queued | BUILT | | | |

Code-fix-only units (P0-5, P0-7, P0-9) reach prod through the normal main deploy, not a migration apply; their sign-off is the merge sign-off. Migration units additionally need the individual apply sign-off recorded here.

| F1 practitioner core additive split | Decision 1: practitioner logins read real data, drops deferred | migration 20260707150000 (commit 5ab280b8, fable review, applied 2x idempotent-safe) | APPLIED | Gary 2026-07-07 (Decision 1) | 2026-07-07 | applied v20260708003638 + v20260708004716; revert: drop 13 new tables + practitioners added columns |

| F3 certification/waitlist additive | Decision 2 schema portion: waitlist form has real tables; cron NOT armed | migration 20260707170000 (commit a21c3bbe, fable review, applied v20260708011939) | APPLIED | Gary 2026-07-07 (Decision 2) | 2026-07-07 | revert: drop 2 FKs then 5 tables |

| F3b practitioner_invitations slice | Decision 2 plan-gap closure; VIP invite flow objects | migration 20260707172000 (commits 582933ba + fix 45faf76d, live-validity test added, applied + RPC smoke-verified) | APPLIED | Gary 2026-07-07 (Decision 2) | 2026-07-07 | revert: drop function + table |

| F5 white label additive | Decision 3 schema: 15 tables, 2 locked views, 2 buckets, seeds | migration 20260708090000 (commits 9d7ec65e + 22691ae0, fable review, applied v20260709012307) | APPLIED | Gary 2026-07-07 (Decision 3) | 2026-07-08 | revert: per f5-tranche-verification.md rollback reference |

| F6-index one-current unique | Final-review launch prerequisite: DB-enforce one current label design per practitioner+product | migration 20260709000000 (commit 679fd893, applied, verified live) | APPLIED | Gary (final-review mandate) | 2026-07-09 | revert: drop index uq_label_design_one_current |

## Apply order recommendation (after sign-offs)

1. P0-2 audit_logs (restores audit trail platform-wide, zero behavior risk)
2. P0-6 profiles (unblocks profile saves)
3. P0-4 daily_scores (writer starts persisting; reader shows real history from that day forward)
4. P0-3 orders.items, then the subscriptions decision
5. Code fixes ride the next main deploy after merge

## Notes

- P0-8: no apply; awaiting Gary Option A/B/C selection (recommend B; C is the live default via drift tagging).
- P1 tranche applies are governed by docs/integrity/p1-decision-sheet.md, not this log; any P1 apply gets its own row here at execution time.

| 219k CI schema gate honesty | Migration parity 211a + drift baseline 36 tables + await createClient (114 files) | code + docs/integrity/snapshot/applied-manifest.json + scripts/schema/drift-baseline.json | BUILT | | | |

| Prompt #50 Hounddog command-center schema | live missing scripts/pipeline/performance/hooks/analytics_rollup + hounddog_is_admin (phantom 20260413000010) | migration 20260823224716_prompt_50_hounddog_command_center_schema.sql (PR 25 / f9eccaa) | APPLIED | Gary 2026-08-23 | 2026-08-23 | applied v20260823225944; revert: drop 5 command-center tables + 2 functions (keep collector/gated/staging) |

