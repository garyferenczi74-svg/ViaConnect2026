# Prompt 170l Accessibility Audit (Phase 1c-4)

Date: 2026-05-30
Status: WCAG 2.2 AA audit checklist for the shipped surfaces. Mirrors the
Hannah commitments encoded inline per surface in
`docs/prompts/prompt-170l-filed-2026-05-30.md` §11.

## Scope

Six user-visible surfaces from Phase 1c-1 through Phase 1c-3:

1. §11.1 NutriVisionTab three-entry-path idle (Photo + Scan Barcode peers)
2. §11.2 BarcodeScannerOverlay full-viewport scanner
3. §11.3 inline §11.2 loading mid-state
4. §11.4 ProductConfirmation screen
5. §11.5 NotFoundFallback
6. §11.6 ManualBarcodeEntry modal
7. §11.8 MacroEditPanel modal
8. §11.9 BarcodeSettingsSection (sub-page route)

## Checklist by surface

### §11.1 IdleSurface (NutriVisionTab)

| Requirement | Status |
|---|---|
| Each entry card is a `<button>` with explicit `aria-label` | DONE |
| Tab order: Photo > Scan Barcode > Upload from gallery > recent meals | DONE |
| Tap target 144x144 mobile (>= 44x44 floor) | DONE |
| Disabled state on isCapturing reflected in `disabled` attribute + 50pct opacity | DONE |
| Focus visible: 2px Teal outline with 2px offset on keyboard focus | DONE |
| Color contrast: Teal icon on Card 4.7:1, label Navy 95pct 6.5:1 | DONE |
| Reduced-motion: cards no transform on tap; hover bg change only | DONE |
| NEW chip dismiss on first scan (Phase 1c-2 deferred polish) | DEFERRED |

### §11.2 BarcodeScannerOverlay

| Requirement | Status |
|---|---|
| `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to sr-only title | DONE |
| Focus moves to manual-entry link on mount (gesture-only camera affordance) | DONE |
| `aria-live="polite"` on helper text region | DONE |
| `aria-live="assertive"` on detection ("Barcode detected. Looking up product.") | DONE |
| Camera viewfinder element is `aria-hidden="true"` | DONE |
| Close X `aria-label="Close scanner"` | DONE |
| Flashlight toggle `aria-label="Toggle flashlight"` with `aria-pressed` | DONE |
| Manual entry link `aria-label="Enter barcode manually"` | DONE |
| 44x44 tap targets on Close + Flashlight + Manual entry | DONE |
| Bracket pulse reduced-motion fallback: 70pct opacity flash 200ms | DONE |
| Loading dots reduced-motion fallback: opacity fade not bounce | DONE |
| Permission denied: inline fallback message + role="alert" | DONE |
| Helper text escalation 15s coaching + 30s escalation | DONE |
| Helper copy is action-oriented, not punishing | DONE |

### §11.3 inline loading mid-state

| Requirement | Status |
|---|---|
| Pill replaces helper text region in place (same vertical position) | DONE |
| `role="status"` + `aria-live="polite"` | DONE |
| "Looking up product..." copy non-judgmental | DONE |

### §11.4 ProductConfirmation

| Requirement | Status |
|---|---|
| Product name is `<h2>` with `id` linked to `aria-labelledby` on hero | DONE |
| Brand chip has `aria-label="Brand: {brand}"` | DONE |
| Barcode digits have `aria-label="Barcode {code}"` | DONE |
| Per-portion radiogroup with `role="radiogroup"` + `aria-checked` per chip | DONE |
| Quality chip `aria-label` includes label and value verbosely | DONE |
| Long-press / tap popover `role="tooltip"` + `aria-live="polite"` | DONE |
| Ingredients section header is `<button aria-expanded>` | DONE |
| Allergens section header is `<button aria-expanded>` | DONE |
| User-flagged allergen note `aria-live="polite"` | DONE |
| Data completeness notice `role="status"` + `aria-live="polite"` | DONE |
| Save button `aria-label` includes product name and portion | DONE |
| Tap targets >= 44x44 throughout | DONE |
| Reduced-motion: no slide-in animations | DONE |
| Color contrast: section headers 4.7:1, body text 5.4:1, Orange allergen 5.1:1 | DONE |
| Quality indicators below portion adjust (Hannah anti-moralism) | DONE |
| Allergen warning non-blocking (Save remains active on match) | DONE |
| Per-100g toggle (Phase 1c-3 deferred polish) | DEFERRED |
| Continuous portion slider + custom grams (deferred polish) | DEFERRED |

### §11.5 NotFoundFallback

| Requirement | Status |
|---|---|
| Surface is `<main>` landmark; headline is `<h2>` | DONE |
| Each action card is a `<button>` with verbose `aria-label` | DONE |
| Card 3 (Contribute) opens in new tab with `rel="noopener noreferrer"` | DONE |
| Card 3 aria-label includes "Opens in a new tab" | DONE |
| Tap targets exceed 44x44 (96px tall cards) | DONE |
| Tab order: back > close > card 1 > card 2 > card 3 > cancel | DONE |
| Gentle Navy 60pct icon, not Orange (Hannah anti-failure-framing) | DONE |
| Body copy includes barcode digits for scan identification | DONE |
| Network-error variant adds Try again CTA | DONE |
| Color contrast: 24px headline 6.5:1, body 5.4:1 | DONE |

### §11.6 ManualBarcodeEntry

| Requirement | Status |
|---|---|
| `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to title | DONE |
| Focus moves to input on mount | DONE |
| Input `inputmode="numeric"` + `pattern="[0-9]*"` for mobile numeric keypad | DONE |
| Input `aria-label="Enter barcode digits, 8 to 14 numbers"` | DONE |
| Checksum feedback `aria-live="polite"` | DONE |
| Look up `aria-disabled` matches visual disabled state | DONE |
| Format hints header `<button aria-expanded>` | DONE |
| 44x44 tap targets on close + look up + cancel + hints toggle | DONE |
| Color contrast: 24px input 6.5:1, Teal feedback 4.7:1, Orange feedback 4.6:1 | DONE |
| Enter key submits when valid (no required mouse click) | DONE |
| Paste from clipboard supported (no `inputmode=numeric` paste blocker) | DONE |

### §11.8 MacroEditPanel

| Requirement | Status |
|---|---|
| `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to title | DONE |
| Cancel button `aria-label="Cancel"` | DONE |
| Each macro field is `<label>` with associated `<input>` | DONE |
| Fields use `type="number"` + `inputmode="decimal"` for numeric keypad | DONE |
| Footer disclosure "Your edits apply to this meal only" preserves trust | DONE |
| 44x44 tap targets throughout | DONE |
| Blank-slate vs prefilled mode produces different headings ("Enter macros" vs "Edit macros") | DONE |
| Save button text matches mode ("Add to meal" vs "Save edits") | DONE |

### §11.9 BarcodeSettingsSection

| Requirement | Status |
|---|---|
| Section `aria-labelledby` to heading | DONE |
| Each toggle is `<button role="switch" aria-checked>` | DONE |
| Toggle disabled during save with `disabled` attribute + opacity | DONE |
| Sub-label "These are informational, not recommendations." primes interpretation | DONE |
| Loading state indicated by text fallback | DONE |
| ODbL attribution rendered as `AttributionFooter` (Kelsey-reviewable copy) | DONE |
| External OFF link rel="noopener noreferrer" target="_blank" | DONE |

## Low-vision celebration (Hannah architectural decision)

The low-vision unlock is real: barcode scanning eliminates the need to read
tiny nutrition panels by eye. The design celebrates this architecturally
rather than via literal copy:

- Larger viewfinder typography (14px helper text on tinted backdrop, exceeds
  the small-text floor)
- High-contrast viewfinder cutout (transparent over Navy 92pct backdrop)
- Audio chime opt-in (default OFF to respect public spaces, opt-in via §11.9)
- Default-on haptic (positive accessibility signal for tactile-preferring
  users)
- Announcement chain as primary path: scanner mount > helper text > detection
  announce > looking up > product found (every state transition announced)

## Deferred items (Phase 1c-3 polish or post-launch)

The following items are not blocking ship but tracked for future polish:

- §11.1 NEW chip on Scan Barcode card with 7-day localStorage dismissal
- §11.4 Per-100g toggle
- §11.4 Continuous portion slider 0.25x-5x + custom grams input
- §11.4 Long-press popover for quality indicators (currently click-to-toggle)
- §11.7 "Add to meal" copy variation on sticky CTA when multi-product flow active
- Capacitor ML Kit native plugin landing per Gate 1 (a) Phase 1c-5

## Manual verification (post-deploy)

Required before production launch:

- [ ] iOS VoiceOver pass on all 7 surfaces in TestFlight build
- [ ] Android TalkBack pass on all 7 surfaces in Play Internal track
- [ ] Keyboard-only navigation pass on web at viaconnectapp.com staging
- [ ] Reduced-motion preference enabled OS-level pass
- [ ] Color contrast verification via Chrome DevTools Lighthouse + axe-core
- [ ] Voice Control / Voice Access labels verified per surface

## Related

- 170l filing artifact: `docs/prompts/prompt-170l-filed-2026-05-30.md`
- 170l Blueprint gates memorialization: `project_prompt_170l_blueprint_gates.md`
- 170j a11y precedent: voice editing tutorial + capture overlay (shipped
  2026-05-30; same WCAG 2.2 AA posture)
