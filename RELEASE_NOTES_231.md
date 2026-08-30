# Release notes: Prompt 231 FormaVision 4-pose body scan capture

Shipped 2026-08-30. This note documents the FormaVision hands-free 4-pose body scan capture flow (protocol 4pose_v1) and its follow-ups, which are already merged into main.

## What is included
- 231: hands-free 4-pose capture (front, right, back, left) with on-device MediaPipe pose QA, a per-pose 5 second countdown, consent gate, review, and client-direct signed-upload persistence onto the existing body_photo_sessions schema and body-progress-photos bucket. Route: /body-tracker/formavision/scan.
- 231a: MediaPipe assets trimmed to the SIMD-only bundle, moved to a versioned immutable path /mediapipe/1.0.1/, plus the landmarks not persisted (G81) hardening.
- 231b: role-independent landmarks CHECK constraint, /mediapipe on the public route allowlist, and the practitioner photo-share management UI (grant, list, revoke) in settings.
- Countdown fix: the per-pose capture now fires on the real 5 second completion rather than a tick count, so it can never fire early.

## Pending go-live steps (owned by Gary and Lex, not code)
- Apply the two migrations 20260829150000 (frames revoke) and 20260829160000 (landmarks check constraint) after confirming zero non-null landmarks rows.
- Lex signs the consent copy plus the photo-share wording and clears the seeded 231-scan-v1 consent version (pending to cleared) via a follow-up migration. Until then the capture route sits on a consent-unavailable state and the scan surfaces are gated closed.
- Regenerate the Supabase DB types, run the device matrix, and capture the completion-proof scan row.

Merging this note is the trigger for the standard PR merge auto-deploy so the changes above go live.
