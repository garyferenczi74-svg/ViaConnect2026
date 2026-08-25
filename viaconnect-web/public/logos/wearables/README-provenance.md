# Wearable vendor mark provenance (Prompt 230, Task 11)

Tracks the source and LEX clearance status for each first-class wearable
tile's identity mark, rendered by
`src/components/body-tracker/connections/WearableBrandMark.tsx` via the
`WEARABLE_MARK_ASSETS` map.

**Hard gate:** `WearableBrandMark` only renders a vendor's real local asset
(the `<img data-vendor-mark={id}>` path) when that vendor's
`WEARABLE_MARK_ASSETS[id].lexCleared === true`. Every entry below ships
`lexCleared: false` as of this task. **No real vendor logo image file is
committed to this directory in this task** -- the `src` path recorded for
each vendor is the *intended destination* once LEX clears the mark for use,
not a file that exists in the repo today. Until a vendor's entry flips to
`lexCleared: true` (and the corresponding file is actually added here),
production renders the Lucide fallback (`data-vendor-mark="fallback"`) for
that vendor everywhere `WearableBrandMark` is used (the wearable tile card,
the active-source detail panel header, and the contributor source glyphs).

## Status per vendor

| Vendor (tile id) | Intended asset path | Lex status | Lucide fallback |
| --- | --- | --- | --- |
| Whoop (`whoop`) | `/logos/wearables/whoop.svg` | Not cleared | `Watch` |
| Oura (`oura`) | `/logos/wearables/oura.svg` | Not cleared | `Circle` |
| Apple Health (`apple_health`) | `/logos/wearables/apple-health.svg` | Not cleared | `Heart` |
| Hume Body Pod (`hume`) | `/logos/wearables/hume.svg` | Not cleared | `Scan` |
| Google Health (`google_health`) | `/logos/wearables/google-health.svg` | Not cleared | `HeartPulse` |
| Garmin (`garmin`) | `/logos/wearables/garmin.svg` | Not cleared | `Activity` |

Any id not listed above (including a future/unknown vendor) renders the
component's safe default fallback (`Circle`), never a blank tile or a
thrown error.

## What "cleared" will mean

When LEX signs off on a vendor's mark:

1. Obtain the vendor's official brand-guideline SVG (or a permitted usage
   variant) through the vendor's own brand/press-kit channel -- never a
   hotlinked or scraped copy, and never redrawn from memory without a
   licensing basis LEX has reviewed.
2. Add the file at the exact path listed above, under
   `public/logos/wearables/`.
3. Flip that vendor's `lexCleared` to `true` in
   `WEARABLE_MARK_ASSETS` (`WearableBrandMark.tsx`).
4. Record the clearance here: date, LEX reviewer, and the specific usage
   terms (e.g. "Whoop brand guidelines, nominative use, reviewed 2026-XX-XX
   by LEX").

Until step 3 happens for a given vendor, that vendor keeps rendering the
Lucide fallback -- this is enforced by `WearableBrandMark.tsx`'s render
logic, not just by omission of the file.

## Change log

- 2026-08-24 -- Task 11 shipped `WearableBrandMark` with all six vendors
  `lexCleared: false`. No image files added. Zero legal exposure in this
  commit; this file is the pending-clearance ledger.
