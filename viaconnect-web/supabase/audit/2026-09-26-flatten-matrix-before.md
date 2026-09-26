# Flatten allow/deny matrix (before)

Policies loaded: 42
Tables: 30
Actors: anon (no jwt), owner (authenticated sub of the fixture row), other (a different authenticated user; practitioner on advisor_peptide_shares), admin (authenticated jwt role admin, profiles.role admin), service (database role service_role, BYPASSRLS).
Commands: select (visible rows), insert (ok or SQLSTATE), update (rows changed or SQLSTATE), delete (rows changed or SQLSTATE).
Cells: 600

SELECT/INSERT/UPDATE/DELETE run inside a subtransaction that rolls back, so each cell sees the same seed.

## profiles

Shape: owner-only uid = id.
Policies: Users can view own profile; Users can insert own profile; Users can update own profile.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | 42501 | rows=1 | rows=0 |
| service | rows=2 | ok | rows=2 | rows=2 |

## ai_insights

Shape: owner-only uid = user_id.
Policies: Users can view own ai_insights; Users can insert own ai_insights; Users can update own ai_insights.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## naturopath_profiles

Shape: owner-only delete.
Policies: Naturopaths delete own profile.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## nutrition_logs

Shape: owner-only delete.
Policies: Users delete own nutrition logs.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## recommendations

Shape: owner-only delete.
Policies: Users can delete own recommendations.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## body_tracker_activity

Shape: owner-only ALL.
Policies: Users own activity.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## assessment_results

Shape: owner-only ALL.
Policies: Users manage own assessment results.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## body_photo_sessions

Shape: owner-only ALL.
Policies: Users manage own photo sessions.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## photo_share_permissions

Shape: owner-only delete.
Policies: photo_share_permissions_delete_owner.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## audit_logs

Shape: admin via profiles.role.
Policies: Only admins can view audit logs.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## approver_assignments

Shape: admin via profiles.role ALL.
Policies: approver_assignments_admin_all.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | ok | rows=1 | rows=1 |
| service | rows=1 | ok | rows=1 | rows=1 |

## aggregation_snapshots

Shape: admin via profiles.role array.
Policies: agg_snapshots_exec_admin_all.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | ok | rows=1 | rows=1 |
| service | rows=1 | ok | rows=1 | rows=1 |

## appeal_agreement_rollups

Shape: jwt role claim.
Policies: agreement_admin_read.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## appeal_patterns

Shape: jwt role claim ALL.
Policies: patterns_admin_rw.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | ok | rows=1 | rows=1 |
| service | rows=1 | ok | rows=1 | rows=1 |

## marketing_copy_conversions

Shape: jwt role claim.
Policies: conversions_admin_read.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## appeal_analyses

Shape: jwt role claim.
Policies: appeals_admin_read.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=1 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## bundles

Shape: auth.role() = authenticated.
Policies: Authenticated read bundles.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## email_otps

Shape: auth.role() = service_role.
Policies: service_role_only_email_otps.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## herbs

Shape: auth.role() = authenticated.
Policies: Authenticated users can view herbs.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## forecast_monthly

Shape: auth.role() = authenticated.
Policies: Authenticated read forecast_monthly.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## rewards

Shape: auth.role() = authenticated.
Policies: Authenticated users can view rewards.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## executive_recommendations

Shape: auth.role() = authenticated.
Policies: Authenticated read executive_recommendations.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## verification_codes

Shape: jwt email claim.
Policies: Users can read own codes; Users can insert own codes; Users can update own codes; Users can delete own codes.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## advisor_peptide_shares

Shape: patient or practitioner linked row.
Policies: peptide_shares_read; peptide_shares_practitioner_update; peptide_shares_patient_insert.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=0 | rows=0 |
| other | rows=1 | 42501 | rows=1 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## botanical_formulas

Shape: practitioner_id = uid.
Policies: Practitioners can insert formulas; Practitioners can update own formulas; Practitioners can view own formulas.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=1 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## botanical_formula_items

Shape: EXISTS linked formula.
Policies: Items viewable with formula access; Items insertable with formula access.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | ok | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## board_packs

Shape: JOIN board member.
Policies: bp_board_member_distributed.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## board_pack_download_events

Shape: JOIN board member insert.
Policies: bpde_member_insert_own.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | ok | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## protocol_ingredients

Shape: EXISTS parent protocol.
Policies: Users can delete protocol ingredients.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=0 | 42501 | rows=0 | rows=1 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

## soc2_auditor_grants

Shape: jwt email or compliance reader.
Policies: soc2_auditor_grants_select_merged.

| actor | select | insert | update | delete |
| --- | --- | --- | --- | --- |
| anon | rows=0 | 42501 | rows=0 | rows=0 |
| owner | rows=1 | 42501 | rows=0 | rows=0 |
| other | rows=0 | 42501 | rows=0 | rows=0 |
| admin | rows=0 | 42501 | rows=0 | rows=0 |
| service | rows=1 | ok | rows=1 | rows=1 |

