# Prompt 210m: FormaVision Avatar Controls Layout Proof

Date: 2026-08-12 (spec) / 2026-08-19 (implementation). Surface: FormaVision
(`/body-tracker/formavision`), `src/app/(app)/(consumer)/body-tracker/formavision/page.tsx`.
Layout and positioning only. No renderer, data, or behavior changes.

## Defect (before)

Gary's mobile screenshot of 2026-08-12, 4:36: on the FormaVision surface, the
Select Body Part pill, its All (full body) dropdown, and the Show Comparison
Overlay control rendered overlapping above the avatar. The avatar itself
rendered correctly on the transparent canvas.

Before positions (absolute over the canvas):

- Select Body Part: `absolute left-2 top-2`
- Show Comparison Overlay: `absolute right-2 top-2`

## Decision recorded

1. **Select Body Part** moves to sit centered below the avatar's feet (between
   the canvas and the Your Journey bar). This placement applies at all
   breakpoints.
2. **Show Comparison Overlay** recorded home (Gary chose 2026-08-19):
   - **md+ (width >= 768):** right of the in/cm units toggle on the top control
     row (`comparison-overlay-home-top`).
   - **phone (width < 768):** full-width-friendly pill directly above the Your
     Journey bar, below Select Body Part (`comparison-overlay-home-phone`).
3. Male / Female and the in/cm units toggle keep the top row above the avatar.

## 210f supersession

Prompt 210f placed Select Body Part at top-left (`left-2 top-2`) on the Body
Composition surface so the Neck region tab was unblocked and no region callout
was covered. That top-left ruling is **superseded for FormaVision** by this
prompt: Select Body Part now sits centered below the avatar feet.

The 210f **goals** remain requirements and are satisfied by the new placement:

- Neck region is never covered by the control or its open menu.
- No region callout is covered by the control or its open menu.
- Position/stacking only; pill styling unchanged.

See `docs/formavision/210f-ui-fixes.md` for the original Defect 1 record.

## Layout after (composed column)

```
[ Male | Female ]     [ in | cm ]  [ Show Comparison Overlay ]   <- md+ only for Comparison
[                 FormaVision avatar canvas                    ]
[              Select Body Part (centered)                     ]
[         Show Comparison Overlay (phone only)                 ]
[                 Your Journey bar (when history)              ]
```

Testids added for proof and E2E:

- `formavision-top-controls`
- `formavision-select-body-part-slot`
- `comparison-overlay-home-top`
- `comparison-overlay-home-phone`

Existing testids retained: `formavision-canvas-grid`, `select-body-part`,
`comparison-overlay-toggle`, `formavision-gender-male`, `formavision-gender-female`,
`journey-timeline`.

## Overlap check (programmatic)

Spec: `tests/e2e/formavision/control-cluster-layout.spec.ts`

- Closed state: no intersecting bounding boxes among gender, units, Select Body
  Part slot, visible Comparison toggle, and Journey (when present).
- Open/active select: after focusing and choosing a region, the same zero-overlap
  check passes for in-page controls (native OS option chrome is not DOM-measurable).
- Comparison home matches breakpoint (phone vs md+).
- Top row controls remain distinct, tappable, and unclipped.

Run (app already listening at `PLAYWRIGHT_BASE_URL`):

```
npx playwright test tests/e2e/formavision/control-cluster-layout.spec.ts
```

Projects covered by playwright.config.ts: mobile-375, mobile-414, tablet-768,
laptop-1024, desktop-1440.

## Screenshots

Layout-shell captures (positions only; live 3D avatar is auth-gated in agent runners).
Shell: `docs/formavision/210m-shots/layout-shell-preview.html`.
Programmatic overlap report: `docs/formavision/210m-shots/overlap-report.json`
(all three viewports `pass: true` on 2026-08-19).

| Breakpoint | File | Status |
| ---------- | ---- | ------ |
| phone (414) | docs/formavision/210m-shots/phone-414.png | captured (layout shell) |
| tablet (768) | docs/formavision/210m-shots/tablet-768.png | captured (layout shell) |
| desktop (1440) | docs/formavision/210m-shots/desktop-1440.png | captured (layout shell) |
| Capacitor WebView | docs/formavision/210m-shots/capacitor.png | pending Gary phone confirm |

## Acceptance checklist

- [x] Select Body Part centered below avatar feet at all breakpoints
- [x] Comparison Overlay recorded home (md+ top row; phone above Journey)
- [x] Absolute overlays removed from canvas (Neck / callouts unblocked)
- [x] No restyle, resize, or rename of controls (position/stack only)
- [x] Avatar size and position unchanged
- [x] Overlap E2E authored (`tests/e2e/formavision/control-cluster-layout.spec.ts`)
- [x] Layout-shell overlap report green at 414 / 768 / 1440
- [x] 210f supersession recorded here
- [ ] Suites green on GL / authenticated runner
- [ ] Live production screenshots (optional; shell is the agent proof)
- [ ] Gary confirms on his own phone (non-delegable)

## Substitution bans (observed)

1. Did not restyle, resize, or rename any control.
2. Did not shrink or move the avatar.
3. Did not hide Comparison or the dropdown.
4. Did not introduce a new container style; existing pill / card language only.
