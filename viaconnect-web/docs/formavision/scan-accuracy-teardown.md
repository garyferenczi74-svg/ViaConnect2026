# FormaVision Scan Accuracy: Competitive Teardown and Benchmark-Design Brief

Prompt 210c, Section 16 deliverable 1. Author: Sherlock. Date: 2026-06-29.

Purpose: place FormaVision's photo-to-measurement accuracy approach next to how the
leading consumer body-scan products pursue accuracy, document OUR method exactly as
built, and define the benchmark that must pass before any accuracy figure is shown to a
user. This is a research and design artifact. It asserts NO achieved accuracy figure for
FormaVision. The 90 percent target named here is a defined, gated goal, not a result.

A note on honesty up front: every competitor number below is presented as THAT vendor's or
study's claim, with a source URL, and is not independently verified by us. Where a claim is
a marketing number with no stated error range or validation cohort, this brief says so.

---

## 1. Competitive accuracy context

Consumer body measurement from a phone splits into three broad approaches.

### 1.1 Few-photo silhouette plus anthropometric regression (the closest analog to us)

3DLOOK Mobile Tailor builds 3D models and "over 80 body measurements" from two smartphone
photos and markets "96-97 percent accuracy compared with manual measurements" plus "95
percent-plus repeatability" and an "average weight prediction error of just 3.5 percent."
The public substantiation given is that the model is "trained on large datasets" and
"validated by over 100 customers" (3DLOOK, mobile-tailor product and content pages).
This is a vendor claim. The pages do not publish a per-region error range, an ICC, a
held-out cohort size, or a peer-reviewed validation. Source:
https://3dlook.ai/mobile-tailor/ and https://3dlook.ai/content-hub/virtual-body-measurements/

This is the central honesty gap in the category: a single precise headline percentage
("96-97 percent") quoted without naming the measurement set it was computed on, the
ground-truth method, or the spread across body regions.

### 1.2 Many-photo rotation plus avatar reconstruction (higher data, higher cost)

Size Stream's MeThreeSixty captures a turning subject (roughly 150 serial images) and
reconstructs a non-rigid avatar. A vendor-adjacent line of work reports digital-anthropometry
technical error of measurement (TEM) averaging about 0.5 cm or 0.9 percent across common
girths, similar to or better than fixed scanning booths (TEM 0.6 to 0.8 cm). Frontiers and
PMC, smartphone 3D imaging:
https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2024.1485450/full

The independent picture is more sobering than the marketing TEM. A peer-reviewed evaluation
of the SAME MeThreeSixty app against manual tape on 54 adults (BMI near 30, racially and
ethnically diverse) reported root-mean-square error of 6.1 cm at the waist, 4.6 cm at the
hip, about 5.1 cm at the thigh, and 2.5 to 2.7 cm at the arm, with correlations R-squared
0.72 to 0.93. So the app tracks a person's shape well (high correlation) yet can be several
centimetres off in absolute girth, especially at the torso. Source:
https://pmc.ncbi.nlm.nih.gov/articles/PMC9177647/

The lesson we carry: correlation (good trend over repeat scans) and absolute accuracy (the
single-scan number) are different things, and the torso is the hardest region. Our tolerance
design (Section 3) reflects exactly this, using wider cm bands for chest, waist, and hip.

### 1.3 Body-composition apps (fat percent, not girth)

Amazon's Halo Body estimated total body fat percentage from phone photos. A study of 134
adults at two sites reported the app tracked DXA closely and beat several consumer scales and
air-displacement plethysmography. The same study carried real caveats: small sample, vendor
funding, and a skew toward white bodies, which limits generalizability. Sources:
https://www.fiercebiotech.com/medtech/amazon-halo-app-s-ai-powered-body-fat-calculator-par-lab-quality-devices-study-finds
and the critical view at https://gizmodo.com/amazons-weird-body-fat-scanner-is-still-a-problem-1847123581
This is adjacent to our composition path (Pipeline A), not our girth path, but it models the
right disclosure posture: name the cohort, name the reference, name the limits.

### 1.4 The vendor-comparison trap

Dedicated-scanner vendors publish comparison tables that flatter their own hardware: one such
table lists a professional scanner at plus or minus 3 to 5 mm and "99 percent" repeatability
versus mobile apps at plus or minus 15 to 30 mm and "75 to 85 percent" repeatability. The page
cites no validation study for either column and is authored by the scanner vendor, an inherent
conflict. Source: https://tg3ds.com/blog/3d-body-scanner-vs-mobile-apps/ We cite it only to
show the range of unsubstantiated numbers in the market, not as truth.

### 1.5 What the category teaches us

- Headline accuracy percentages are common; stated error ranges, cohort sizes, and ICC are rare.
- Independent validation, where it exists, shows several-cm torso error even for mature apps.
- Trend or correlation is easier to achieve than absolute single-scan accuracy.
- The honest products name the ground-truth method (DXA, tape, booth) and the cohort.

FormaVision's design choice is to NOT publish a headline number until our own held-out cohort
earns it, and to show per-measurement confidence and honest UNKNOWN in the meantime.

---

## 2. Our method (documented as built)

FormaVision's geometric measurement path (the hardened Pipeline B in
`src/lib/arnold/scanning/`) is a four-view silhouette-and-landmark accuracy chain. It runs
client-side on the in-memory capture photos; pixels never leave the device for the geometric
measurement (only the separate composition call has egress, under its existing notice).

### 2.1 The accuracy chain, stage by stage

1. Capture and landmarks. Four views (front, back, left, right). MediaPipe Pose gives 33
   keypoints per view; TensorFlow body-segmentation gives a binary silhouette and contour.
2. Scale from height. `computeScale` derives pixels-per-cm from the user's height across the
   landmark extent. An optional in-frame reference object and a forthcoming native
   LiDAR/ARCore depth booster are independent scale anchors that DEGRADE GRACEFULLY: if absent,
   the height-derived scale carries the measurement and nothing blocks.
   (`silhouetteProcessor.ts`, `accuracy/scaleCalibration.ts`, `accuracy/referenceObjectScale.ts`.)
3. Per-level breadths. At each anatomical level the front view gives a width (semi-axis a) and
   the side views give a depth (semi-axis b). Left and right depths are averaged and their
   disagreement is surfaced as asymmetry; the back view corroborates front torso widths and
   refines the hip and glute contour. (`measurementEngine.ts`, `accuracy/corroboration.ts`.)
4. Ellipse perimeter times calibrated per-region shape correction. Each level's circumference
   is the Ramanujan ellipse perimeter of (a, b) multiplied by a per-region, per-sex correction
   factor read from a single versioned config, never scattered literals.
   (`circumferencePredictor.ts`, `accuracy/calibrationConfig.ts`.)
5. Per-measurement confidence and honest UNKNOWN. Capture quality, mask-edge certainty,
   landmark visibility, scale agreement, and left/right and front/back corroboration feed a
   confidence score. Below threshold, the measurement renders as UNKNOWN with an estimated
   marker. It is NEVER 0 and never fabricated. (`accuracy/confidenceModel.ts`; the old
   `missing()` that returned cm 0 was fixed to a null-bearing value.)
6. Contract write. The thirteen girths plus per-field confidence and the calibration version
   write to the existing `body_tracker_circumference` table (hip in `body_tracker_weight`),
   the SAME contract the mesh and cards already read. No second source, no recompute.

### 2.2 The one-model guarantee

The same semi-axes (a from front width, b from side depth) feed BOTH the circumference
prediction and the rendered cross-section of the avatar. In `measurementEngine.ts`, the
`axes()` helper receives the identical `frontWidth` and `sideDepth` arguments as the `circ()`
helper, so the ellipse the user sees on the avatar is the ellipse whose perimeter is the
reported circumference. The avatar therefore cannot drift away from the measured body: there is
one model end to end, not a measurement number bolted onto a cosmetic mannequin.

### 2.3 Honest UNKNOWN, never 0

When a level's front width or side depth cannot be extracted with confidence, the value is
null (UNKNOWN), the aspect ratio is null, and the avatar renders that ring from the template
default while flagging it estimated. A missing depth never becomes 0, and a missing girth never
becomes 0. This is the project RULE 9 backbone and it is the opposite of the category habit of
emitting a clean-looking number for every field regardless of evidence.

### 2.4 What is honest about our single-scan limits

The current shape-correction factors are rough heuristics, not yet fit to any cohort; the code
comment in `circumferencePredictor.ts` states individual-measurement error is typically several
percent and that trend accuracy over repeat scans is better than single-scan accuracy. That is
consistent with the independent literature in Section 1.2 and is stated, not hidden.

---

## 3. Benchmark design

The validation harness (`accuracy/validationHarness.ts`) and the targets
(`accuracy/accuracyTargets.ts`) define how the 90 percent goal is proven before it is ever
shown. The harness is pure, re-runnable, and wired as a CI gate.

### 3.1 The four per-region metrics

For each of the eight girth regions (neck, upper arm, forearm, upper leg, lower leg, chest,
waist, hip):

- MAPE. Mean of absolute(predicted minus truth) divided by truth, times 100. Target per region
  at or below 10 percent.
- Within-tolerance pass rate. Fraction of samples inside the band. The band is the GREATER of
  10 percent of truth or the region cm tolerance (limbs plus or minus 2 cm, torso plus or minus
  3 cm). Aggregate target at or above 90 percent.
- ICC(1,1). One-way ANOVA absolute-agreement intraclass correlation between predicted and
  ground truth, so a systematic over- or under-estimate correctly lowers the score. Target at
  or above 0.90.
- Signed bias. Mean of (predicted minus truth) in cm. Surfaces systematic over- or
  under-estimation that correlation alone hides.

### 3.2 Targets, split, and re-fit

The three pass criteria (aggregate within-tolerance 0.90, per-region MAPE 10 percent, per-region
ICC 0.90) are checked on a held-out split, not the training split. The cohort is split 80/20 per
region; correction factors are re-fit on the training portion only and clamped to a sane range
(0.85 to 1.15); the held-out portion is scored with those fitted factors. A re-fit produces a
NEW versioned config proposal; it does not silently mutate the live calibration version. The
`scan:validate` CI script fails the build on regression.

### 3.3 Ground-truth protocol and minimum cohort

The team supplies the labeled set: tape-measure or reference 3D-scan girths paired with the
pipeline output, per region, across a diverse cohort. Minimum is 30 labeled pairs per region (8
regions, 240 pairs total), with 50 per region recommended for robust ICC. The cohort must span
body sizes, sexes, and skin tones to avoid the generalizability gap that limited the Halo and
MeThreeSixty studies in Section 1.

### 3.4 Current status: UNPROVEN

Stated plainly, with no softening:

- There is NO real cohort yet. The harness runs on synthetic fixtures only.
- `heldOutPass` is false and `cohortStatus` is "unproven" on those fixtures.
- The 90 percent figure is a TARGET, not an achievement. No FormaVision accuracy percentage is
  claimed as achieved anywhere in this brief or the product.
- The accuracy claim stays HIDDEN from users until two conditions both hold: the harness reports
  `heldOutPass` true on a real held-out cohort meeting the minimum, AND a human (Kelsey for claim
  clearance) signs off. Until then the UI shows per-field confidence, an estimated or UNKNOWN
  state, and a standing AI-estimate disclaimer.

No medical claims are made. Measurements are AI-derived estimates with a stated error range, not
a diagnosis.

---

## 4. Sources

All competitor figures are THEIR claims or THIRD-PARTY studies, not verified by us.

- 3DLOOK Mobile Tailor (two-photo, 96-97 percent claim): https://3dlook.ai/mobile-tailor/ and
  https://3dlook.ai/content-hub/virtual-body-measurements/
- Size Stream MeThreeSixty, independent peer-reviewed RMSE (waist 6.1 cm, hip 4.6 cm):
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9177647/
- Smartphone digital anthropometry, multi-image rotation (TEM about 0.5 cm or 0.9 percent):
  https://www.frontiersin.org/journals/medicine/articles/10.3389/fmed.2024.1485450/full
- Amazon Halo Body fat-percent validation and its caveats:
  https://www.fiercebiotech.com/medtech/amazon-halo-app-s-ai-powered-body-fat-calculator-par-lab-quality-devices-study-finds
  and https://gizmodo.com/amazons-weird-body-fat-scanner-is-still-a-problem-1847123581
- Scanner-vendor comparison table (unsubstantiated, cited as market context only):
  https://tg3ds.com/blog/3d-body-scanner-vs-mobile-apps/
