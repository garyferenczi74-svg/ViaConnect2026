# Prompt 211a STEP 0 Baseline (read-only discovery)

Date: 2026-07-10. Branch: feat/211a-growth (worktree, base 73c1e745 = post-210e main).
Read-only per Section 1. No code changed. Filed before building, per the prompt.

Summary: the four workstreams split cleanly. W3 (PDF report) and W4 (cadence + streak)
reuse existing platform capabilities and need NO new dependency. W1 (shareable video) and
W2 (health sync) hit the Section 6 dependency gate and are routed to Gary.

## Item 1 + 2: Video render path and client encode capability (W1)

- Morph: the time machine interpolates a BodyParamVector between real snap-point scans via
  lerpParamVector (src/lib/formavision/geometry/lerpParamVector.ts:58). PLAY mode runs 0..1
  over PLAY_DURATION_MS=4000 on requestAnimationFrame (JourneyTimeline.tsx:60,147). Scrub
  uses direct-set with a 90ms normals debounce (scrubController.ts); the morph tween is
  suspended during scrub so they never fight (FormaVisionCanvas.tsx:293).
- Capturable canvas: a real WebGL canvas exists, tagged data-testid formavision-avatar-canvas
  (FormaVisionCanvas.tsx:660). Constraints: frameloop is "demand" (capture must force "always"
  or pump invalidate during recording); no preserveDrawingBuffer is set (so captureStream is
  the route, not toDataURL). Only the cinematic and lite tiers have a canvas; the 2d floor has
  NONE, so W1 must produce a graceful non-video fallback (a static card image) for those users.
- Resolution ceilings: DPR caps are cinematic [1,2], lite [1,1.5] (tierCost.ts); mobile canvas
  is roughly 600x960 CSS px. The frame-budget monitor (34ms over a 20-frame window,
  frameBudgetMonitor.ts) can trip a tier step-down under recording load on marginal devices.
- Privacy win (satisfies the no-raw-photos rule by construction): the avatar carries NO photo
  texture. Its only texture is a procedural cell-grain DataTexture (cellTexture.ts); the shader
  uses token colors only. Nothing to redact.
- Numbers overlaid = the same card values: computeCompositionDeltas (compositionDeltas.ts),
  the exact source BodyFatReadout and the timeline readout use.
- Encode capability today: NONE. No MediaRecorder, WebCodecs, captureStream, or ffmpeg anywhere.
  Runtime is a hosted-web Capacitor shell (capacitor.config.ts loads viaconnectapp.com in the
  platform WebView). Desktop browsers and modern Android System WebView support
  MediaRecorder(canvas.captureStream()) -> WebM with zero dependency. iOS WKWebView is the
  blocker: MediaRecorder / captureStream / WebCodecs support is version-dependent with no MP4
  guarantee, and WebM is a poor iOS share target. This cannot be confirmed without a real iOS
  device check.

## Item 3: Capacitor health bridge (W2)

- No live HealthKit or Health Connect bridge exists. Installed @capacitor/* plugins: core, ios,
  android, app, camera, splash-screen, status-bar, cli, assets, plus community speech-recognition
  and a custom FormaVisionDepthPlugin (ARKit/ARCore depth). No health plugin of any kind.
- Health capability today = FILE IMPORT only: Apple Health export.zip -> apple-health-imports
  bucket -> apple-health/parse route -> ingest-body-composition. Plus a Google Health OAuth
  READ-only cloud connector. Health Connect is a registry scaffold ("upcoming app"). A
  native_health_bridge feature flag exists, default false, with its own comment stating no
  HealthKit package is added. No NSHealthShare/UpdateUsageDescription, no HealthKit entitlement,
  no Android Health Connect permissions in the native projects.
- Scan value source columns for a per-scan write: buildScanWrite.ts -> body_tracker_*. The vision
  scan legitimately produces ONLY total_body_fat_pct (body_tracker_segmental_fat, percent).
  weight_lbs (body_tracker_weight, pounds) and muscle mass (body_tracker_segmental_muscle, pounds)
  are NULL unless separately supplied. DB units are lbs/pct; HealthKit and Health Connect want kg.
  Sample date = body_tracker_entries.entry_date, source 'scan', device 'FormaVision'.

## Item 4: Existing PDF path (W3, NO new dependency)

- pdf-lib v1.17.1 is already installed (the only PDF engine; puppeteer was explicitly declined
  in prior prompts). Reusable server pattern: renderBoardPackPdf (executiveReporting/rendering/
  boardPackPdfRenderer.ts) returns Uint8Array from title/sections/rows with a forbidden-token
  guardrail and optional watermark footer, driven by a nodejs route that uploads to a bucket and
  writes an artifact/audit row. Edge precedents: payout_statement_generator, tax_form_year_end_
  generator.
- The body-scan-pdfs bucket exists live (private). The body-scan-export edge function is live but
  has NO repo source (one of the 14 unversioned live functions from the 210d audit) - reuse its
  BUCKET as the upload target, not its code.
- REUSE: W3 extends the renderBoardPackPdf pdf-lib pattern via a new nodejs route, reads scan
  history from useCompositionHistory / body_scan_measurements, uploads to body-scan-pdfs. No new
  engine.

## Item 5: Helix streak + notification primitives (W4, NO new dependency)

- Streak primitive: compliance_streaks (current_streak, longest_streak, last_checkin_date,
  streak_started_at, recovery_available, current_multiplier; own-row RLS) is the exact shape to
  model a consumer-only scan streak on. challenges / user_challenges exist; viatokens_ledger
  transaction_type CHECK already allows 'streak' and 'challenge'. Award lane: helixAward.ts /
  earning-engine.ts (server, never the avatar surface).
- Notification / cadence: user_notifications + Realtime is the nudge sink. cert-reminder-tick is
  the reminder-cron template (daily sweep, offset ladder, idempotent per id+offset, heartbeat).
  scan_calibration_nudges (trigger_key, shown_count, dismissed_at, acted_at, UNIQUE(user,key)) is
  a ready cadence/dismissal ledger.
- Helix invisibility enforcement (W4 re-verifies): consumer-only holds via (a) the (consumer)
  route grouping (the composition page is the only mount), (b) own-row RLS on all helix + streak
  tables, (c) the binding read-only economy contract in milestoneMoment.ts (no credit/write from
  the avatar surface, Gary decision 2026-06-27). The 210e invariant 4.3 structural test proves
  FormaVision never writes helix_score_events. W4 keeps any streak credit in the server award lane
  and never surfaces streak/Helix on a practitioner route.

## Item 6: Scan history + confidence + quality fields (report + captions)

- Circumference: body_tracker_circumference, 12 girths in cm numeric(5,1) each paired with a
  _confidence numeric(3,2): neck, shoulder_width, chest, waist, right/left_upper_arm,
  right/left_forearm, right/left_upper_thigh, right/left_calf. Hip is separate in
  body_tracker_weight.hips_in (inches) + hips_confidence.
- Composition history: body_scan_measurements has *_circ_cm, ratios, body_fat_pct_low/mid/high (%),
  lean_mass_kg, fat_mass_kg (kg), ffmi, estimation_method, overall_confidence numeric(3,2), and a
  confidence_map JSONB of per-measurement badges. Read via useCompositionHistory (cap 60 + genuine
  earliest) and useCircumferenceHistory.
- Confidence markers: confidenceToNumeric high=0.85 / moderate=0.60 / low=0.35 / UNKNOWN=null (never
  0). Display via confidenceDisplay.ts (numericToConfidenceLevel, confidenceBodyLabel Measured /
  Good estimate / Estimated) and ConfidenceChip.tsx. The report and captions carry these markers
  verbatim; neither may upgrade confidence.
- Quality fields for the W4 fingerprint: body_photo_sessions has scan_quality_score numeric(3,2),
  quality_issues text[], scan_status, calibration fields. captureQuality.ts assessCaptureQuality
  returns {score, issues[], pass} from pose/landmarks/tilt/contrast (thresholds documented). Plus
  time-of-capture (created_at / scan_date). These are the fingerprint inputs.

## Section 6 dependency gate (routed to Gary)

- W1 video encode, three options: (A) no-dependency MediaRecorder -> WebM (desktop + modern
  Android now, iOS graceful static-card fallback, honest limit per Section 6); (B) a WASM MP4
  muxer / ffmpeg-WASM dependency for uniform cross-platform MP4 including iOS (package.json gate +
  WASM payload/perf cost); (C) a server-side ffmpeg encode route (removes the iOS risk, adds a
  route + dependency + upload bandwidth).
- W2 health plugins: @perfood/capacitor-healthkit (iOS read+write) + capacitor-health-connect
  (Android insertRecords with per-record-type grants), plus native entitlement/manifest work.
  Alternative: keep the existing file-import (reads-from-export only) and defer live write.
- Environment (not a package change): the shared node_modules was wiped earlier this session; the
  211a worktree currently borrows a parallel session's install. A plain npm ci in the parent
  checkout restores a robust self-sufficient install for the multi-hour build. Routed to Gary
  since it touches the package-lock rule (it changes no dependencies).

## Workstream readiness

- W3 (PDF report): READY to build now. No dependency. Note: use FarmCeutica Wellness LLC as the
  legal entity line (Gary's 2026-07-08 decision), not the "Ltd" in the 211a prompt text - flagged
  for confirmation.
- W4 (cadence + streak): READY to build now. No dependency.
- W1 (video): BLOCKED on the encode option decision.
- W2 (health sync): BLOCKED on the plugin approval, and the honest-data design (write body_fat on
  a pure scan; the full triple only when a weight/composition entry accompanies).
