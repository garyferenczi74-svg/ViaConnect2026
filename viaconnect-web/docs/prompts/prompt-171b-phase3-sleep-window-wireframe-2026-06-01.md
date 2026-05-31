# 171b Phase 3 Wireframe: Sleep Window Settings Page

Date: 2026-06-01
Status: **Wireframe spec, pre-build.** Hannah-authored UX deliverable for Phase 3 of 171b.
Wireframe author: Hannah (UX + AI + genomics specialist)
Dispatched by: Jeffery (orchestrator)
Surface: `/settings/sleep-window` (Settings sub-page; NOT in CAQ onboarding per Phase 1 design override)
DB columns: `profiles.sleep_start TIME`, `profiles.sleep_wake TIME` (migrated Phase 1; live target is `public.profiles` despite the migration filename carrying `user_profiles` — the SQL DO block correctly fell through)
API: `POST /api/profile/sleep-window` (Phase 3 build)
Defaults: `23:00` start, `07:00` wake (kept in place for users who never save)

## Spec source

171b Phase 3 dispatch (2026-05-31, Jeffery dispatch text). Hannah follows:
- 170j WCAG 2.2 AA precedent for accessibility commitments
- 170h-170m warmth + precision voice posture
- /settings/nutrivision + /settings/nutrivision/barcode-scan chrome conventions
- Bio Optimization Score (BOS) named verbatim
- Clinical-claim linter rules (no should/must/diagnose/treat/cure/prevent; no prescriptive caffeine guidance)

---

## Layout

**Mobile (375 portrait)** — single column, full-bleed Navy `#1A2744` background, Card `#1E3054` content card with 16px outer gutter, 20px inner padding, 12px border radius. Vertical stack: top chrome (back arrow + page title) -> page header (Moon icon + h1) -> empty-state chip (conditional) -> helper paragraph -> form (stacked inputs) -> primary CTA -> secondary CTAs.

**Desktop (>= 768px)** — same chrome, content card constrained to 560px max width, centered. Two time inputs sit side-by-side (`grid-cols-2 gap-4`). Vertical rhythm unchanged.

```
+-------------------------------------+
| [<] Sleep window                    |  <- top chrome, back arrow + page title
+-------------------------------------+
|                                     |
|  +-------------------------------+  |
|  | (Moon)  Sleep window          |  |  <- page header, 24px h1
|  +-------------------------------+  |
|                                     |
|  [Using default sleep window]       |  <- empty-state chip (conditional)
|                                     |
|  Your sleep window helps the        |
|  system consider how your caffeine  |  <- helper paragraph, 14px
|  and other timing-sensitive habits  |
|  affect your sleep and Bio          |
|  Optimization Score.                |
|                                     |
|  (Clock)  Bedtime                   |  <- label row
|  +-------------------------------+  |
|  | 23:00                         |  |  <- type=time input
|  +-------------------------------+  |
|                                     |
|  (Sun)    Wake time                 |  <- label row
|  +-------------------------------+  |
|  | 07:00                         |  |  <- type=time input
|  +-------------------------------+  |
|                                     |
|  +-------------------------------+  |
|  |           Save                |  |  <- Teal primary CTA, full-width mobile
|  +-------------------------------+  |
|                                     |
|              Cancel                 |  <- text link, Teal underline on hover
|                                     |
|  Use the default times              |  <- small reset link, Navy 60pct
|  (23:00 to 07:00)                   |
+-------------------------------------+
```

Desktop variant: Bedtime + Wake time inputs share a row.

---

## Header

**Top chrome:** `[<]` (Lucide `ArrowLeft`, strokeWidth 1.5, 24px, Teal `#2DA5A0`) on the left, page title `Sleep window` (Instrument Sans 18px / 24 line-height, weight 500, white) centered. Back arrow links to `/settings`. Tap target 44 x 44 minimum.

**Page header inside card:** Lucide `Moon` icon (strokeWidth 1.5, 28px, Teal `#2DA5A0`) + h1 `Sleep window` (Instrument Sans 24px / 32 line-height, weight 600, white). 12px gap between icon and h1.

Exact strings:
- Top chrome title: `Sleep window`
- Page h1: `Sleep window`

---

## Body section

### Helper paragraph

Lucide `Info` icon (strokeWidth 1.5, 16px, Navy 60pct) sits left of the first line. Paragraph wraps; icon is decorative (aria-hidden).

Exact string:
> Your sleep window helps the system consider how your caffeine and other timing-sensitive habits affect your sleep and Bio Optimization Score.

Typography: Instrument Sans 14px / 22 line-height, weight 400, white at 80pct opacity. 20px vertical margin above and below.

### Form

**Mobile layout** — two stacked input groups, 16px gap between them.

**Desktop layout** — two-column grid, 16px gap.

Each input group is:
- Label row: icon (16px, Teal `#2DA5A0`) + label text (Instrument Sans 14px / 20, weight 500, white at 90pct). 8px gap.
- Input: HTML5 `<input type="time">`, 44px height, Card `#1E3054` background, Navy `#1A2744` border at 30pct, 8px border radius, 16px Instrument Sans monospace numerals (or system stack fallback), white text, Teal focus ring (2px, `#2DA5A0`, 2px offset).

Bedtime input:
- Icon: Lucide `Clock` (strokeWidth 1.5)
- Label: `Bedtime`
- aria-label: `Bedtime, hour and minute`
- Default value: `23:00`
- name: `bedtime`

Wake time input:
- Icon: Lucide `Sun` (strokeWidth 1.5)
- Label: `Wake time`
- aria-label: `Wake time, hour and minute`
- Default value: `07:00`
- name: `wakeTime`

Both inputs are required for the Save CTA to enable, but the form mounts with the defaults already populated so Save is enabled by default. No validation rejecting unusual schedules. Wake earlier than bedtime is treated as a midnight-wrapping window (the normal case).

---

## CTAs

### Primary: Save

- Full-width on mobile, intrinsic width with 32px horizontal padding on desktop, aligned left
- Background Teal `#2DA5A0`
- Text `Save` (Instrument Sans 16px / 24, weight 600, Navy `#1A2744`)
- 48px height (mobile-first tap target)
- 8px border radius
- Hover: Teal at 90pct
- Focus: 2px white ring, 2px offset
- Disabled: 40pct opacity, cursor not-allowed (applies only mid-submit)
- 24px top margin

### Secondary: Cancel

- Text link below Save, centered on mobile, left-aligned on desktop with 16px left margin from Save
- Text `Cancel` (Instrument Sans 14px / 20, weight 500, Teal `#2DA5A0`)
- Underline on hover + focus
- Routes to `/settings` (browser back-equivalent; preserves history stack if user landed deep)
- 16px top margin

### Tertiary: Reset to defaults

- Small text link below Cancel
- Text `Use the default times (23:00 to 07:00)` (Instrument Sans 12px / 18, weight 400, Navy `#1A2744` at 60pct opacity)
- Underline on hover
- onClick: sets Bedtime input back to `23:00` and Wake time input back to `07:00`. Does NOT auto-submit. User still has to tap Save.
- 12px top margin

---

## Conditional states

### Empty state (no saved sleep window)

- Inputs render with the defaults (`23:00`, `07:00`) as the visible values
- Chip displays above the helper paragraph:
  - Background Card `#1E3054` (already the card color; use a subtle inset border instead)
  - Border 1px Navy `#1A2744` at 60pct opacity
  - 8px border radius
  - 6px vertical padding, 10px horizontal padding
  - Text `Using default sleep window` (Instrument Sans 12px / 18, weight 500, white at 60pct opacity)
  - 12px bottom margin

### Save success (confirmation state)

- Toast appears at the top of the viewport (mobile) or top-right of the card (desktop)
- Background Teal `#2DA5A0`
- Text `Sleep window updated` (Instrument Sans 14px / 20, weight 600, Navy `#1A2744`)
- Lucide `Check` icon (16px, Navy)
- 8px border radius, 12px vertical / 16px horizontal padding
- aria-live="polite" so screen readers announce
- Auto-dismiss after 3 seconds; user can tap to dismiss earlier
- Page stays on `/settings/sleep-window`
- Empty-state chip disappears if it was visible (user now has saved values)

### Save error (inline error state)

- Inline message above the form (below the helper paragraph)
- Background Orange `#B75E18` at 12pct alpha
- Border-left 4px Orange `#B75E18`
- 12px padding, 8px border radius
- Lucide `AlertCircle` icon (16px, Orange `#B75E18`)
- Text varies by failure mode (see Voice copy section)
- aria-live="polite"
- Persists until the user takes action; dismisses on next Save attempt

---

## Accessibility commitments

Per 170j WCAG 2.2 AA precedent:

- **aria-labels** on both time inputs (see Form section above). The visual label sits adjacent for sighted users; aria-label adds the explicit "hour and minute" context for screen readers because `<input type="time">` does not always self-describe.
- **Focus management on mount**: focus moves to the Bedtime input automatically when the page mounts. Documented as `useEffect(() => bedtimeRef.current?.focus(), [])`.
- **Focus ring**: 2px Teal `#2DA5A0` ring with 2px offset on all focusable elements. Visible against Card `#1E3054` background. Contrast ratio 4.7:1 confirmed.
- **Keyboard-only flow tested**: Tab order Back arrow -> Bedtime -> Wake time -> Save -> Cancel -> Reset link. Shift+Tab reverses. Enter submits the form from either input.
- **aria-live="polite"** on the success toast container and the inline error container. Polite (not assertive) because neither is interrupt-worthy.
- **aria-required="true"** on both inputs. The form always has defaults populated so this is informational not blocking.
- **Color contrast**: Teal `#2DA5A0` on Card `#1E3054` measures 5.1:1 (AA Large + AA Normal pass). White at 80pct on Card measures 13.2:1. Navy 60pct on Card measures 3.4:1 (AA Large pass; used only for the small reset link which is supplemental, plus the chip text which is decorative-supplemental and has the chip border for additional affordance).
- **Reduced motion**: toast slide-in respects `prefers-reduced-motion: reduce` and uses fade-only at 200ms when reduced.
- **44x44 tap targets**: Back arrow, Bedtime input, Wake time input, Save button. Cancel and Reset links sit above the 44px minimum via line-height + padding.
- **Page title** (browser tab): `Sleep window | ViaConnect`

---

## Voice copy

Exact strings (Marshall + clinical-claim linter clean; no em / en dashes; no emoji; warm and supportive):

**Page chrome:**
- Browser title: `Sleep window | ViaConnect`
- Top chrome title: `Sleep window`
- Page h1: `Sleep window`

**Empty-state chip:**
- `Using default sleep window`

**Helper paragraph:**
- `Your sleep window helps the system consider how your caffeine and other timing-sensitive habits affect your sleep and Bio Optimization Score.`

**Labels:**
- `Bedtime`
- `Wake time`

**aria-labels:**
- `Bedtime, hour and minute`
- `Wake time, hour and minute`

**CTAs:**
- `Save`
- `Cancel`
- `Use the default times (23:00 to 07:00)`

**Success toast:**
- `Sleep window updated`

**Error messages (inline):**
- Generic save failure: `We could not save your sleep window. Please try again.`
- Network failure: `Connection issue. Please check your network and try again.`
- Auth failure (session expired): `Your session expired. Please sign in again.`

Tone notes:
- No "should" / "must" / "diagnose" / "treat" / "cure" / "prevent"
- "Bio Optimization Score" appears verbatim once in the helper; not repeated
- "consider how" frames the system as advisory, not deterministic
- "timing-sensitive habits" stays generic; no compound names, no dosages, no SNP references on this surface

---

## Push-back and UX decisions adjusted from the dispatch

1. **Column name confirmation (post-shipment correction by Jeffery).** Dispatch correctly referenced `profiles.sleep_start` + `profiles.sleep_wake`. Hannah inferred `user_profiles` from the migration filename + a quick scan of the source slice, but the live target is `public.profiles` (the only table that existed at Phase 1 apply time; the migration's DO block fell through to the `profiles` branch). Phase 3 API route + page + tests + the Phase 1 source slice all target `profiles`. The migration filename `..._user_profiles_sleep_window.sql` is a historical naming artifact; no code change needed.

2. **Reset link copy.** Dispatch specified `Use the default times (23:00 to 07:00)` which uses the word `to` rather than a dash; kept verbatim (matches no-dash standing rule). Confirmed acceptable.

3. **Helper paragraph wording.** Dispatch suggested mention of caffeine timing. Hannah holds the language generic ("caffeine and other timing-sensitive habits") rather than naming specific compounds or making prescriptive timing claims. Honors the standing rule that internal specifics (SKUs, compounds, dosages) stay off public surfaces unless Hannah validates and Gary clears (memory: `feedback_internal_specifics_off_public_surfaces`). Caffeine is named because the BOS feature is publicly described as caffeine-aware; that is in-scope.

4. **No validation rejecting wake-earlier-than-bedtime.** Confirmed per dispatch §7. The midnight-wrapping case is normal (a user who sleeps 23:00 to 07:00 has wake earlier than bedtime by clock value). The Phase 1 caffeine-timing-source already handles the wrap; the UI must not block it.

5. **Focus on mount.** Dispatch §8 says focus moves to first input. Confirmed — that's the Bedtime input. Caveat: if the user navigated here via screen reader from `/settings`, the auto-focus jump can disorient. Mitigation: announce the page h1 via screen reader on route change (Next.js App Router handles this via the document title and the h1 reading at top of focus order; the input focus jump happens immediately after, which is the expected pattern from 170j).

6. **Save error inline rather than toast.** Dispatch §5 calls for inline error message above the form on save error. Confirmed — toast is for success only. Errors stay inline because the user needs the error to persist while they fix their input or retry. Polite live region for both.

7. **No CAQ Phase 7 entry point.** Dispatch confirms Phase 3 ships the Settings page, NOT the CAQ Phase 7 step from the original 171b filing. This wireframe scopes to Settings only. CAQ Phase 7 deferred to a future prompt if Gary wants it later.

8. **Reset link does not auto-submit.** Tertiary CTA sets the inputs back to defaults without submitting. Rationale: a user might tap reset to preview the defaults, then tap Cancel to abandon. Auto-submit would surprise them. They must tap Save to persist.

---

## Handoff notes

- **Builder reads:** This file + `src/lib/scoring/sources/caffeine-timing-source.ts` (for sleep window read semantics; reads `profiles.sleep_start` + `profiles.sleep_wake`). The migration filename `..._user_profiles_sleep_window.sql` carries `user_profiles` but the live SQL targeted `public.profiles`; canonical table is `profiles`.
- **API contract** (Phase 3 build, not Hannah's scope): `POST /api/profile/sleep-window` accepts `{ sleep_start: "HH:MM", sleep_wake: "HH:MM" }`, RLS-scoped to `auth.uid()`, returns `{ ok: true }` or `{ ok: false, error: string }`. Hannah does not specify route handler implementation.
- **Gordon handoff:** None for this surface. Gordon does not consume sleep window directly; BOS source slice reads it server-side.
- **Arnold handoff:** None for this surface.
- **Hounddog handoff:** None for this surface.
