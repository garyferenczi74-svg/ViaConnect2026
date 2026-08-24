# Prompt 210i: Four-tab row proof

**Date:** 2026-08-11  
**Production:** `/body-tracker/composition` and `/body-tracker/formavision`

## Label decision (Section 1.2 / AC 4)

**Shipped: two-tone FormaVision tab label**

- `Forma` in Orange `#B75E18` (slightly muted when inactive)
- `Vision` in the row standard text tone (white when active, 50% white when inactive)
- Existing teal/blue pill active treatment (`layoutId="composition-pill"`) unchanged

If Gary prefers single-tone for cohesion on mobile, reverse is one-line in `CompositionSectionToggle` TabLabel.

## What changed

| Item | Action |
|------|--------|
| Tab order | Body Fat, Muscle Mass, Measurements, FormaVision |
| Composition surface | Toggle navigates to `/body-tracker/formavision` on fourth tab |
| FormaVision surface | Same toggle; other tabs go to `/body-tracker/composition?section=` |
| Inline link | Removed (`View your 3D body in FormaVision`) |
| Manual Log form | Still three tabs only (`includeFormaVision={false}`) |

## Navigation matrix

| From | Tap | Lands on |
|------|-----|----------|
| Composition (any section) | FormaVision | `/body-tracker/formavision` |
| FormaVision | Body Fat | `/body-tracker/composition?section=fat` |
| FormaVision | Muscle Mass | `/body-tracker/composition?section=muscle` |
| FormaVision | Measurements | `/body-tracker/composition?section=measurements` |

## Pixel-diff note (three original tabs)

Active treatment for fat / muscle / measurements is unchanged: same classes, same spring pill, same icons and type scale. Only addition is a fourth button and optional wrap (`flex-wrap`) for phone widths.

## Automated test

```bash
npx vitest run src/components/body-tracker/__tests__/CompositionSectionToggle.test.ts
```

## Gary walk-on

- [ ] Four tabs visible both surfaces  
- [ ] Active state correct  
- [ ] FormaVision opens 3D body  
- [ ] Legacy tabs return to correct section  
- [ ] Mobile Capacitor: no truncation/overlap  
