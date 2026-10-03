# ViaConnect encryption plan: Google Cloud KMS

Date: 2026-10-03. Status: design, plus the migration files and TypeScript helper in encryption slice 1. **Migrations are NOT APPLIED.** Nothing in this document was run against the live database.

Gary's decisions used here (2026-10-03):

- Key management is **Google Cloud KMS**.
- Naturopath is a **credential on the practitioner account**, not a separate account role. Scope, licensing, and data-access rules for naturopath stay their own. Consent and the future key mechanism are shared.
- FormaVision Body Tracker is being rebuilt. Photos, the Body Tracker bucket, and FormaVision code are out of this slice.

This design is **not end-to-end encryption**. The server unwraps keys. Anyone who can run the app with the KMS role can read the data the app can read. Do not describe it as end-to-end, and do not tell a store form that the developer cannot read health data.

This document does not say the product meets a regulatory standard.

## Tag legend

- **Verified 2026-10-03**: read from a vendor page fetched that day. URL is named.
- **Repo**: read in this repository on 2026-10-03.
- **Assessment / blueprint**: from the 2026-10-02 gap assessment or blueprint. Not re-checked against the live project for this file.
- **Proposal**: a design choice, not an existing object.
- **Unverified**: not confirmed against a primary source on 2026-10-03.
- **Unknown**: the fact is not in the repo or the pages read today.

## 1. What slice 1 actually changes

| Item | Where | Applied? |
|---|---|---|
| Naturopath credential table and `profiles_role_check` widen | `supabase/migrations/20261003130000_practitioner_naturopath_credential.sql` | **No** |
| VIP note function: schema-qualify `extensions.digest` and `extensions.pgp_sym_encrypt` | `supabase/migrations/20261003130100_vip_sensitive_note_search_path.sql` | **No** |
| Helper `isNaturopathCredentialedPractitioner` | `src/lib/auth/naturopath-credential.ts` | Code only. Portal opening is off unless `NATUROPATH_CREDENTIAL_PORTAL_ACCESS` is `true` or `1`, and then only when `verification_status` is `verified`. |
| Per-session photo access | `docs/security/per-session-practitioner-photo-access.md` | Design only. Storage policies are not changed. |
| KMS client, envelope code, key table | Not in this slice | No new npm packages. `package.json` stays locked. |

Apply order, after Gary approves, is in section 8.

## 2. Key hierarchy

**Proposal**, using Google Cloud KMS as the KEK because Gary selected it. The shape follows the 2026-10-02 blueprint, with photos deferred.

```
Cloud KMS CryptoKey (KEK)
  purpose ENCRYPT_DECRYPT, one key per environment (production and non-production)
  symmetric, not exported
        |  wraps
        v
Per-user class key (UCK), 256-bit AES
  one per (user, class)
  classes in this program: notes, genetics, labs
        |
        v
Field ciphertext: AES-256-GCM
```

A per-session photo key is **deferred** until after the FormaVision rebuild. Do not add it in the photo slice's first implementation pass until that rebuild's data flow is known. See the photo design doc.

Google's envelope page (fetched 2026-10-03, https://cloud.google.com/kms/docs/envelope-encryption) says, **verified**:

- Generate data keys locally.
- Store data keys encrypted at rest, near the data.
- Do not use the same data key for two users.
- Prefer AES-256-GCM.
- The KEK does not leave Cloud KMS.
- Do not store a plaintext data key.
- `Encrypt` and `Decrypt` accept at most 64 KiB, so health payloads are encrypted locally and only the data key is sent to KMS.

Wrapped keys live in Postgres under a future table (blueprint placeholder `user_data_keys`). That table is **not** created in slice 1. When it is created: enable RLS, add no client policies, and revoke `anon` and `authenticated`. That revoke is a **proposal** copied from the blueprint because the assessment said `anon` has broad table grants. Those grants were **not** re-queried on 2026-10-03.

### Envelope string

**Proposal** from the blueprint, generalizing the wearable token prefix `wvx1` (assessment): 

`vcx1:<kid>:<iv>:<tag>:<ct>`

`kid` is the wrapped-key row id, not the Cloud KMS key version by itself. Reads accept any non-destroyed `kid`. Writes use the current `kid`. Slice 1 does not implement this format.

Associated data on the local AES-GCM operation, **proposal** from the blueprint: `table | column | row_id | owner_user_id | key_version`.

Whether Cloud KMS `Encrypt` takes a matching additional-authenticated-data field was **not re-fetched** on 2026-10-03 (the REST page timed out). Treat that field name as **unverified** until someone reads the current Encrypt reference before coding the client.

## 3. What Gary does in Google Cloud

No project id, key ring name, or Vercel project name is known in this repo. Placeholders below are not real resources.

### 3.1 Project, key ring, and key

**Unverified as click-path**: the exact current console labels for "create a key ring" were not re-fetched on 2026-10-03. Follow Google's current "Create a key ring" and "Create a key" pages. Properties that **were** read on the rotate-key page (https://cloud.google.com/kms/docs/rotate-key, fetched 2026-10-03):

- Purpose for this key: encryption (`--purpose "encryption"` on the gcloud example).
- Rotation period, if set at creation, must be at least 1 day and at most 100 years.
- The console can set a rotation period and a start time when the key is created.
- Rotating a key does **not** re-encrypt data that used older versions.
- Rotating a key does **not** disable or destroy older versions.
- Suggested role split on that page: Cloud KMS Admin (`roles/cloudkms.admin`) for rotation administration, and Cloud KMS CryptoKey Encrypter/Decrypter (`roles/cloudkms.cryptoKeyEncrypterDecrypter`) for encrypt and decrypt.

Use a **separate** key ring or at least a separate CryptoKey for non-production. Region is **unknown** (residency rules were not researched). Supabase for this app is recorded as `us-east-2` in `viaconnect-web/CLAUDE.md` and in the assessment. That is not a Cloud KMS location name.

Do not put health-record bytes in KMS `Encrypt`. Only the data key goes to KMS (envelope page, verified 2026-10-03).

### 3.2 Vercel OIDC and Workload Identity Federation

**Verified 2026-10-03** from https://vercel.com/docs/oidc/gcp. Steps below follow that page. The page's sample grants **Storage Object Admin**. Do **not** copy that role. Grant `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the ViaConnect CryptoKey only.

1. Google Cloud Console → IAM & Admin → Workload Identity Federation → Create Pool. The page's example name is `Vercel`, example id `vercel`.
2. Add an OIDC provider. Example name `Vercel`, example id `vercel`.
3. Issuer URL:
   - Team mode: `https://oidc.vercel.com/[TEAM_SLUG]`
   - Global mode: `https://oidc.vercel.com`
4. Leave the JWK file empty.
5. Audience, two options on that page:
   - Default audience: Google builds an audience URL. Pass that same URL as `audience` to `getVercelOidcToken`.
   - Allowed audiences: `https://vercel.com/[TEAM_SLUG]`.
6. Map `google.subject` to `assertion.sub`.
7. Create a service account. Example id on the page is `vercel`. Do not grant Storage Object Admin.
8. Grant that service account `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the CryptoKey (role name verified on the rotate-key page, not on the Vercel page).
9. In the service-account user binding, the page says to replace `SUBJECT_ATTRIBUTE_VALUE` with `owner:[VERCEL_TEAM]:project:[PROJECT_NAME]:environment:[ENVIRONMENT]`. Add one principal per project and environment that may unwrap keys. Production and preview should not share a production key.
10. Environment variables the page lists, set in Vercel, not committed:
   - `GCP_PROJECT_ID`
   - `GCP_PROJECT_NUMBER`
   - `GCP_SERVICE_ACCOUNT_EMAIL`
   - `GCP_WORKLOAD_IDENTITY_POOL_ID`
   - `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`
   - `GCP_AUDIENCE` if the default audience option is used

The page's code sample imports `@vercel/oidc` and `google-auth-library`. **Do not add those packages in this slice.** `package.json` is locked. A later slice needs Gary's approval before any new dependency. `@google-cloud/kms` is also not added.

Team slug, Vercel team, and Vercel project name for ViaConnect are **unknown** here.

Vercel OIDC token lifetime (the blueprint said up to 90 minutes reuse and a 2-hour function token) was **not re-fetched** on 2026-10-03. Treat those numbers as **unverified** until the OIDC reference is read again.

Supabase Edge Functions are not given KMS access in this design. The blueprint marked edge-function federation **unknown**. That was not researched again on 2026-10-03.

## 4. Rotation

**Verified 2026-10-03** (rotate-key page and the envelope page):

- Automatic rotation creates a new version and makes it the primary version used for new wraps. The RPC highlights read on 2026-10-03 say `rotation_period` must be at least 24 hours and at most 876,000 hours, and that `ENCRYPT_DECRYPT` keys support automatic rotation.
- Old versions stay available for decrypt until someone disables or destroys them.
- Existing ciphertext is not rewritten by rotation.

**Proposal** from the blueprint, still the plan:

- KEK rotation: re-wrap data keys under the new primary version when Gary wants every wrap on the new version. Not required for decrypt of old wraps.
- Per-user class-key rotation: new `kid`, re-encrypt that user's rows, keep the old wrapped key until a check passes.
- Never destroy a Cloud KMS version that still wraps a live data key.
- Deletion of a KMS key is the highest-risk operation. Pending-deletion window length was **unverified** on 2026-10-02 and was not re-fetched on 2026-10-03.

## 5. Audit logging

Two layers. Neither is built in slice 1 except the credential-table trigger.

1. **Cloud Audit Logs. Verified 2026-10-03** from https://cloud.google.com/kms/docs/audit-logging:
   - Service name filter: `protoPayload.serviceName="cloudkms.googleapis.com"`.
   - `Encrypt` and `Decrypt` are `DATA_READ` methods and produce Data Access audit logs.
   - `CreateKeyRing`, `CreateCryptoKey`, and `CreateCryptoKeyVersion` are `ADMIN_WRITE` and produce Admin Activity logs.
   - The page links to "Enable Data Access audit logs". Whether Data Access logs are off until that enable step was **not re-read** on 2026-10-03. Treat "off by default" as **unverified**.
2. **Application audit. Proposal** from the blueprint (`data_access_audit`): actor, owner, class, object id, action, result. No note text, no file names that contain names. Fail closed if the audit write fails. Not created in slice 1.

Slice 1's credential migration writes `audit_logs` rows for credential changes and for a transition that sets `profiles.role` to `naturopath`. The licence number is not copied into that payload. That trigger runs only after the migration is applied.

## 6. What is not end-to-end

- The operator unwraps the data key on the server (blueprint model S, still the recommendation). Staff with the KMS role and the database can read the classes this design covers.
- Plaintext still has to exist in the server process to show a screen or call a model. The assessment said `arnold-vision-analyze` sends a photo to Anthropic. That path was **not** re-read for this file, and photos are on hold.
- Metadata left in the clear (ids, dates, consent flags) is still readable in the database.
- Store forms: the blueprint said Google Play's end-to-end carve-out applies only when the developer cannot read the data, and that this design does not qualify. That Play page was **not re-fetched** on 2026-10-03. Treat the carve-out sentence as **unverified today**, inherited from the blueprint. Do not use the carve-out.

## 7. Phased order

Gary 2026-10-03, photos held for the FormaVision rebuild. This replaces the blueprint's order that put photos before genetics.

| Order | Class | Notes |
|---|---|---|
| 1 | Clinician notes | Includes the VIP note path after the search_path fix. Likely little or no data (assessment: VIP table count 0; not re-counted). |
| 2 | Genetics | Permanent identifiers. Blueprint proposal: one encrypted document per user upload, not SQL `WHERE rsid = ...`. |
| 3 | Labs | Assessment: no clinician read path is built yet. Design the grant encrypted from the start. |
| 4 | Photos | After the FormaVision Body Tracker rebuild. Design only until then: `docs/security/per-session-practitioner-photo-access.md`. |

Before any of those classes: the KMS key, the `vcx1` module, wrapped-key storage, a server decrypt gate, and audit. That is later work. It needs the packages in section 3.2 and Gary's approval to add them.

Plaintext that later slices may keep (blueprint **proposal**, not decided): ids, timestamps, consent flags, and non-identifying status fields. Each field left in the clear is a decision (blueprint D7).

## 8. Migrations NOT APPLIED

Do not apply these until Gary says so. Do not apply them from an agent, a cron route, or a production SQL session as part of merging this branch.

1. `viaconnect-web/supabase/migrations/20261003130000_practitioner_naturopath_credential.sql`
2. `viaconnect-web/supabase/migrations/20261003130100_vip_sensitive_note_search_path.sql`

They do not depend on each other. Apply in that filename order. Roll back in reverse order.

Versions are `20261003130000` and `20261003130100` so they do not share a prefix with `20261003120000_via_10_ai_data_sharing_consent.sql`.

Rollback notes are comments inside each file. Short version:

- VIP file: `CREATE OR REPLACE` back to the body in `20260421000008_vip_sensitive_note_encryption.sql`. That puts the unqualified `pgp_sym_encrypt` calls back. It does not rewrite ciphertext.
- Credential file: drop the new trigger, function, and table; drop the self-assign trigger and function; restore `profiles_role_check` to the 20260423000010 list (no `naturopath`). If any row already has `role = 'naturopath'`, that restore fails until those rows are changed. Changing them is a data edit and needs a separate approval.
- `VALIDATE CONSTRAINT` aborts the credential migration if an existing `profiles.role` is outside the new list. The transaction rolls back. No partial apply inside that file. Roles kept from `20260423000010`: `patient`, `practitioner`, `admin`, `compliance_officer`, `legal_ops`, `cfo`, `ceo`, `medical_director`, plus `naturopath`. `consumer`, `board_member`, and `exec_reporting_admin` are not added. If a live row uses one of those three, apply fails and nothing in the file is kept. That was not tested on a database.

After apply, leave `NATUROPATH_CREDENTIAL_PORTAL_ACCESS` unset. Unset means off. Setting it to `true` lets a practitioner with `verification_status = verified` open `/naturopath/*`. Unverified, pending, rejected, and expired do not open it. Existing routes that already allow `profiles.role` of `naturopath` or `admin` are unchanged.

The credential table is not read while the flag is off, so the web code can ship before the migration is applied.

`practitioners.credential_type` (`nd`, `dc`, `lac`, and the other codes in `20260418000080_practitioners.sql`) is not copied into the new table. A naturopath-like credential type does not by itself verify a licence.

## 9. Open decisions

| Topic | State on 2026-10-03 |
|---|---|
| KMS vendor | **Decided:** Google Cloud KMS. Account, project id, key ring, region, and two administrators are **unknown**. |
| Supabase plan | Assessment said the org plan was `pro`. **Not re-checked** today. |
| BAA | **Unknown** whether one is signed with Supabase, Vercel, the AI vendor, or Google. |
| Covered-entity status | **Open.** Counsel has to say whether ViaConnect or its practitioners are a covered entity or a business associate, or whether the driver is something else. This file does not answer that. |
| Portal flag | **Default off.** Gary turns on `NATUROPATH_CREDENTIAL_PORTAL_ACCESS` after the migration is applied and a verification path exists. |
| Who may set `verification_status = verified` | Migration: admin, or `service_role` / `postgres` / `supabase_admin` / `supabase_auth_admin`. Not the account owner. A product UI for verification is not in this slice. |
| Field list left in plaintext, share duration, break-glass | Still the blueprint's D7, D8, and D6. Not decided here. |
| Mobile clients reading columns directly | **Unknown.** Not inventoried in this slice. |

## 10. Store citations

| Change | Citation | Why it is fair |
|---|---|---|
| Credential row, unverified by default, portal flag off | Apple 5.1.1 (permission) and 5.1.3 (health data). Google Play User Data and Data safety. | Naturopath portal sections are not opened by an unverified self-declaration. Data-access rules for health records are not widened in this slice. |
| VIP `search_path` fix | Gary-directed security hardening | 5.1.1, 5.1.3, and Play User Data do not name a Postgres search path. |
| KMS envelope (not built) | Gary-directed security hardening | The Apple text the blueprint read does not require a specific at-rest scheme. Play Data safety, as described in the blueprint, asks about transit and deletion, and its end-to-end carve-out does not fit this design. That Play page was not re-fetched today. |
| Photo session grants | See the photo design doc | Design only. |

Apple guideline wording in the blueprint was read on 2026-10-02. It was **not re-fetched** on 2026-10-03.
