# FormaVision 211a Growth Brief

Companion to [211-formavision-v2-charter.md](211-formavision-v2-charter.md) and
[211-competitive-matrix.md](211-competitive-matrix.md). This brief states, honestly, what
Prompt 211a ("Growth Engine and Parity Pack") shipped, the growth loop each workstream drives,
and what remains before a claim is earned. It follows the series-wide rule: nothing is described
as shipped unless it is live and evidenced. Where a feature is partial, this brief says so.

## The thesis

211a turns FormaVision from a private measurement tool into a product with outward loops. Three
loops plus one parity foundation:

- **Share loop (W1):** a user broadcasts their transformation, which acquires the next user.
- **Trust loop (W3):** a user hands a clinician a report whose numbers match the app, which earns
  credibility and a referral channel.
- **Retention loop (W4):** gentle scan-cadence coaching brings the user back, which compounds data
  and habit.
- **Parity foundation (W2):** health-platform sync, a table-stakes checkbox against ZOZOFIT and
  Hume. Built as an inert foundation this pass, not yet an earned claim (see honest state).

## Workstream by workstream

### W1 Shareable transformation video (the growth engine) - PARTIAL SHIP
- **What ships:** on-device, no-dependency WebM export of the avatar morph on desktop and modern
  Android (MediaRecorder + canvas.captureStream). One-source numbers (identical to the composition
  cards). Privacy-safe by construction: the avatar is procedural (token colors + cell texture), so
  no raw user photo can enter the clip, caption, or share payload. Explicit consent gate before
  anything leaves the device.
- **The honest gap:** iOS (WKWebView) cannot produce the WebM, so iOS currently shows an honest
  "video export coming to iOS" progress card as text, but NOT yet an actually-shareable card
  artifact. iOS is the largest sharing demographic, so the share loop is not fully closed until the
  fast-follow lands.
- **Fast-follow (#31):** render the progress card to a PNG (canvas toBlob, no dependency) and wire
  the platform share sheet, so iOS gets a real shareable artifact.
- **Growth impact:** live on desktop/Android now; the loop's highest-volume surface (iOS mobile)
  activates with the follow-up.

### W3 Doctor-ready PDF report (the trust loop) - SHIPPED
- **What ships:** a one-page PDF a user can hand a clinician. Every value reads the same
  body_tracker_* spine the in-app cards render, so the report can never disagree with the app -
  the credibility guarantee. Honest confidence (UNKNOWN renders as UNKNOWN, never a fabricated 0;
  estimates keep their "Estimated" marker). Non-dismissible AI-estimate / not-a-medical-diagnosis
  disclaimer. FarmCeutica Wellness LLC entity, Via Cura brand.
- **Growth impact:** clinicians become a referral channel; a report that matches the app builds the
  trust that a wellness estimate needs. Fully shipped.

### W4 Scan cadence, fingerprint, and streak (the retention loop) - SHIPPED
- **What ships:** opt-in scan-cadence nudges (idempotent, ledger-first cron; gentle, never spammy),
  a consistency "fingerprint" signal, a consistency tip, and a scan streak - all consumer-only and
  Helix-invisible (the streak never writes to the Helix economy; proven structurally by the
  invariant harness). Honest by construction: streak is null on thin history, the fingerprint never
  upgrades UNKNOWN, tips never claim a trend that is not there.
- **Growth impact:** cadence nudges drive re-engagement without dark patterns; the streak rewards
  habit. Fully shipped.

### W2 Health platform sync (the parity foundation) - FLAG-OFF FOUNDATION, NOT AN EARNED CLAIM
- **What ships:** a correct, fully-tested sync service behind the `native_health_bridge` flag
  (default OFF), with a clean HealthBridge abstraction, honest all-three-when-any writes (RULE 9:
  writes only real values, never a fabricated 0), per-metric revocable grants, lbs-to-kg
  conversion, fail-open resilience, and no-PHI telemetry.
- **The honest gaps (why this is a foundation, not a shipped feature):**
  - **iOS write is non-functional.** The approved plugin (@perfood/capacitor-healthkit) is
    read-only - it has no write API on any Capacitor-6-compatible release. The iOS bridge throws a
    visible NotImplementedError rather than faking success. A write-capable plugin or a native Swift
    bridge is required.
  - **Android is partial.** Health Connect v1 has no LeanBodyMass record type, so lean mass is
    honestly omitted; body fat and weight can write.
  - **Native builds are device-untested.** Both plugins were force-installed with --legacy-peer-deps
    on Capacitor 6 (neither has a Cap-6 release), so the native podspec/gradle compatibility must be
    verified on a device before the flag is enabled.
- **Positioning consequence:** the competitive-matrix "Health platform sync" row must NOT move to
  Shipped. It remains a 211a foundation with the gaps noted. Claiming HealthKit/Health Connect
  read-and-write today would be an overclaim under the charter's governance.
- **Follow-up:** source or build a write-capable iOS HealthKit path, verify both native builds on a
  device, then flip the flag.

## Competitive-matrix deltas this merge earns (evidence-backed)

| Row | Before | After (honest) |
|---|---|---|
| PDF and doctor report | 211a | **Shipped** (W3, one-source verified) |
| Gamification and streaks (streak) | Streak in 211a | Streak **Shipped** (W4) |
| Shareable transformation video | 211a | **Shipped, partial** (WebM desktop/Android; iOS card follow-up) |
| Health platform sync | 211a (read and write) | **211a foundation** (flag-off; iOS write pending, Android partial) - NOT Shipped |

## What to measure

- **W1:** clip creation rate, share-completion rate, and (post-#31) iOS share rate. The share loop's
  health is iOS share volume.
- **W3:** report generation count; qualitative clinician feedback on trust.
- **W4:** cadence opt-in rate, nudge-to-return conversion, streak retention curve.
- **W2:** not measured until the flag is enabled post device-verification.

## Honest one-line

211a ships two fully-working loops (doctor report, cadence retention), one partially-working growth
engine (share video: desktop/Android live, iOS artifact is the next follow-up), and one correct but
inert parity foundation (health sync, gated off until a write-capable iOS path exists). Every gap is
a loud, documented degradation, not a silent overclaim.
