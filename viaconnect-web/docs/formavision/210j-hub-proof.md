# Prompt 210j: Hub card consolidation proof

**Date:** 2026-08-11  
**Production:** https://www.viaconnectapp.com/body-tracker

## Title treatment decision (AC 1)

**Shipped: two-tone wordmark on the composition card**

- `Forma` in Orange `#B75E18`
- `Vision` in white
- ` Body Composition` in standard white title style
- Full aria/title string remains `FormaVision Body Composition`

Single-tone fallback: one-line change in `BentoCard.tsx` if Gary prefers.

## What changed

| Item | Action |
|------|--------|
| Standalone FormaVision hub card | **Removed** from `SURFACES` |
| Body Composition card title | Renamed **FormaVision Body Composition** (two-tone render) |
| Card href / media / Open | Unchanged: still opens `/body-tracker/composition` |
| Subtitle | Unchanged (line length preserved) |
| FormaVision route and tab | Untouched (210i / 210h) |

## Navigation path

Hub card **FormaVision Body Composition** → composition with four-tab row → **FormaVision** tab → `/body-tracker/formavision`.

Deep link `/body-tracker/formavision` still works.

## Pixel-diff note

Only the composition card title text changed and the formavision card slot was deleted. Dashboard, Progress, Weight, Milestones, Metabolic cards: config untouched.

## Automated test

```bash
npx vitest run src/components/body-tracker/hub/__tests__/hubConfigSurfaces.test.ts
```

## Gary walk-on

- [ ] No standalone FormaVision card on hub  
- [ ] Renamed card looks correct (two-tone)  
- [ ] Opens composition; FormaVision tab still reaches 3D  
- [ ] Grid reflows at desktop / tablet / phone  
