# Prompt 170 Blueprint Deliverable 4: Privacy Review Note

Date: 2026-05-28
Author: Hannah (UX), reviewed by Michelangelo (build), Jeffery (orchestrator)
Status: Blueprint, awaiting Gary signoff per OBRA gate

## Scope of this note
What we send out of ViaConnect, what we keep, what we delete, and what we deliberately do not protect.

## Photo retention, 24 hour TTL
- Default policy ephemeral_24h on photo_meal_blobs.retention_policy.
- scheduled_deletion_at = created_at + 24 hours.
- Hourly Edge Function photo-meal-blob-cleanup deletes expired rows and the storage objects they point at.
- Per-user setting "Save my meal photos" flips the row to opt_in_retain and the cleanup job skips it. Lives in user_nutrivision_settings.photo_retention_policy.
- Per-user setting "Contribute my photos to ViaConnect accuracy research" flips a separate flag in user_nutrivision_settings.corpus_opt_in. When true, the save endpoint copies a stripped photo (no EXIF, no GPS) to the corpus storage path and writes contributed_photo_path on the user_meal_corpus row.

## PHI redaction at the vision provider boundary
- Request payload to LogMeal, Gemini, and Claude Vision contains: image bytes, opaque request_id, captured_at timestamp, device_class.
- Request payload does NOT contain: auth.uid, email, profile name, phone, IP, geolocation, condition strings, protocol identifiers, supplement identifiers, household composition.
- Enforcement: src/lib/nutrition/privacy/redact.ts wraps every outbound vision call and stamps a deny-list assertion log. CI grep gate against the new vision client files asserts no Supabase auth getters are imported in the request-shaping path.

## Image-level PHI residual, honest disclosure per 170a §4.3
- We do not redact background content from the photo before sending it to the vision provider.
- A meal photo can incidentally contain medication labels, hospital wristbands, identifying tattoos, or personal documents.
- This is a known residual. We surface it in two places.
  - Capture screen disclaimer beneath the capture button: "Photos may capture background details. Keep medications, ID, and personal documents out of frame for best privacy."
  - Settings, Privacy section: "ViaConnect does not redact background content from photos. If a meal photo contains medication labels or other personal documents, those pixels are sent to the vision provider as part of the analyze request."
- A future enhancement, filed as placeholder 170c, explores client-side blur of non-food regions via a lightweight on-device segmentation model. Out of scope for 170, 170a, and 170b.

## user_meal_corpus, pseudonymous not anonymous
- user_hash column is digest(user_id || current_setting('app.corpus_salt'), 'sha256').
- salt_version column tags each row with the active salt at write time. Lets the salt rotate annually without rewriting history.
- Anyone with Postgres service-role access can read both the salt and user_id mapping table, so the hash is reversible to a service-role holder. We frame this honestly. It is pseudonymous at the application tier, not cryptographically anonymous against a DB admin.
- The protection is procedural and depends on operational controls described in the corpus governance memo (Blueprint deliverable 5).

## Opt-in revocation, 7 day grace window
- When the user toggles corpus_opt_in from true to false in Settings, user_nutrivision_settings.opt_in_revoked_at is stamped.
- Hard deletion of contributed_photo_path blobs runs 7 days after opt_in_revoked_at via the same hourly cleanup function.
- During the grace window, the user can re-enable contribution without losing prior contributions. After the window, contributed_photo_path is NULL'd on the row and the storage object is deleted.
- The user_meal_corpus row itself stays. user_hash plus structured edit_diff_json plus final_state_json are retained as training data per the opt-in legal posture documented in Terms of Service.

## Recognition cache
- food_recognition_cache is keyed by image_hash_sha256 plus provider plus phash_64. Never by user_id. There is no cross-user data leak risk because the cache holds public food recognition outputs, not user state.

## What this note does not cover
- Edge function attribution and audit log of Helix events is covered in the corpus governance memo.
- HIPAA workforce training and BAAs are operational programs outside the 170 scope. Standing compliance posture is "HIPAA aware" until Gary confirms BAAs.

## Required surface copy
Capture screen disclaimer
"Photos may capture background details. Keep medications, ID, and personal documents out of frame for best privacy."

Settings privacy paragraph
"ViaConnect does not redact background content from photos. If a meal photo contains medication labels or other personal documents, those pixels are sent to the vision provider as part of the analyze request. Photos are deleted from our servers 24 hours after upload unless you opt in to save them. If you opt in to contribute photos to accuracy research, we keep an anonymized copy. You can revoke at any time. Revocations take 7 days to remove your contributed photos."
