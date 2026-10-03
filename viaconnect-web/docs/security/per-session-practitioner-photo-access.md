# Per-session practitioner photo access

Date: 2026-10-03. **Design only.** No storage policy, bucket, photo column, or FormaVision file is changed by encryption slice 1.

Gary 2026-10-03: FormaVision Body Tracker is being rebuilt. Do not encrypt photos, do not change the Body Tracker bucket, and do not change FormaVision code until that rebuild lands.

This design is **not end-to-end encryption**. It is an access rule for a later slice. It does not say the product meets a regulatory standard.

## What the repository does today

**Repo**, `supabase/migrations/20260416000090_body_photo_sessions.sql`:

- `photo_share_permissions` is already one row per (`photo_session_id`, `practitioner_id`), with `expires_at` and `revoked_at`.
- Storage policy `"Practitioners view shared body photos"` on `storage.objects` for bucket `body-progress-photos` allows `SELECT` when any non-revoked, unexpired `photo_share_permissions` row exists for `practitioner_id = auth.uid()` and `photo_session_user_id` equal to the object folder. The policy joins `body_photo_sessions` on `s.id = p.photo_session_id` and does **not** compare the object name to that session's path columns.

So the grant table is per session, and the storage policy as written in that migration authorizes every object in the member's folder once any live share for that member exists.

Later migrations in this repo consolidate policies on `photo_share_permissions` (`20260424000010_photo_share_permissions_policy_consolidation.sql`). They were not compared to the live database on 2026-10-03. The live policy text may differ. **Do not change it in this slice.**

## What the 2026-10-02 assessment said (not re-checked)

- Bucket `body-progress-photos`: private, 56 objects, one user folder.
- Practitioner storage read was described as account-wide, matching the policy shape above.
- Client-minted signed URLs with TTL 3600 seconds were described in code. Those call sites were not re-listed for this file.
- Public bucket `Body Tracker` (space and capitals): 7 objects, contents unknown. **Out of scope** while FormaVision is rebuilt. Do not list object names, do not set the bucket private, and do not download objects as part of this slice.

## Target, after the rebuild (not implemented)

**Proposal**, from blueprint section 0.3, narrowed by Gary's hold:

1. Grant unit stays one `body_photo_sessions` row. Optional later narrowing by view (front, back, left, right) is not decided.
2. The member chooses the session, the practitioner, and an expiry. Expiry is required. The maximum duration is **not decided** (blueprint example of 30 days was a proposal, not a Gary decision).
3. Practitioners do not use a storage `SELECT` policy on the bucket. A server route checks that the session grant is live, checks the grantee's current role or naturopath credential under the same rules as the portal flag, writes an audit row that does not contain the image, and returns a short-lived signed URL or a byte stream. 60 to 300 seconds was the blueprint's range, not a decision.
4. Naturopath access uses the same consent and key mechanism as practitioner access. Licensing and data-access rules stay the naturopath credential's rules. A credential row alone does not grant photos.
5. After cutover, stop writing new `photo_share_permissions` rows that the storage policy still honors, or the account-wide path remains. That cutover is a later migration Gary applies. It is not this slice.
6. Encryption of the objects (`vcx1` header, per-session key) waits until the rebuild's upload path is known. See `encryption-plan-gcp-kms.md`. Photos are phase 4, after notes, genetics, and labs.

Existing share rows: the assessment said share tables were empty. **Not re-counted.** Confirm with a count only, no object download, immediately before any future cutover.

## What this slice does not change

Storage policies are not changed.

- No `CREATE POLICY` or `DROP POLICY` on `storage.objects`.
- No change to buckets `body-progress-photos`, `body-tracker-scans`, `body-scan-pdfs`, `Body Tracker`, or `FormaVision`.
- No change to FormaVision, scan, or body-tracker application code.
- No new signed-URL route.

## Store citations

Apple App Store Review Guidelines **5.1.1** (permission, including a way to withdraw it) and **5.1.3** (health data) support limiting a practitioner to the session a member granted, and ending that access when the grant is revoked or expired. Google Play **User Data** and **Data safety** (health info, photos and videos) support the same limit: access follows the purpose the member authorized.

Those citations describe the future grant. They are not a claim that the current storage policy already does this. The current policy shape is the folder-wide `SELECT` above.

Guideline text was read for the 2026-10-02 blueprint and was **not re-fetched** on 2026-10-03.

## Open points

- Maximum grant length and signed-URL TTL.
- Whether the rebuilt FormaVision path still writes `body-progress-photos` or a new bucket.
- Whether the Android or iOS client mints its own signed URLs. **Unknown** in this slice.
- Count of live `photo_share_permissions` rows at cutover. **Unknown** until a count is run. Not run here.
