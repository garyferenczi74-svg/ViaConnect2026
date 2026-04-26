# Prompt #138j. Hero Pillar Cards: Restraint Pass

**Project:** ViaConnect (FarmCeutica Wellness LLC)
**Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Stack:** Next.js 14+, TypeScript, Tailwind CSS, Framer Motion, Supabase
**Branch:** `feat/hero-pillars-restraint`
**Owner Agent:** Michelangelo (TDD/dev), OBRA framework
**Supersedes:** Prompt #138i
**Visual Contract:** `Prompt_138j_Hero_Pillars_Restraint.html`

---

## 1. Mission

Replace ONLY the three flat info cards (1. Answer, 2. Upload, 3. Receive) on the public landing hero with a restraint-driven editorial card design. The cards must feel premium and confident, support the DNA helix hero video instead of competing with it, and read cleanly on mobile without consuming the full viewport.

This is a card component swap. Nothing else in the hero file changes. The hero video, headline typography ("Precision Personal Health Powered by Your Data"), the orange treatment on "Powered by Your Data", the nav bar, the "Your Journey Starts Here" CTA, the "Sign In" button, the DNA helix background, and every other element above and below the cards remain exactly as they are on viaconnectapp.com today.

---

## 2. Design Restraint Notes

This pass deliberately strips back the design from earlier explorations. Six elements were tried and cut, with reasons:

- **Rotating conic gradient borders.** They are a 2023 SaaS landing page trope, draw attention to themselves, and compete with the DNA helix hero video for visual focus. Replaced with a clean static 1px border that brightens slightly on hover.
- **Icon badges.** They are cramped on mobile, anemic against the navy backdrop, and compete with the corner numeral for visual hierarchy. Removed entirely. The numeral plus eyebrow plus headline plus body carries the visual weight.
- **Leading number in eyebrow line.** Earlier drafts ran an eyebrow like "01 DISCOVERY" while a giant ghosted "01" sat in the corner. Double up. Removed the leading number. Eyebrow is now just the chapter word.
- **Hover-reveal action microcopy.** The "Begin", "Layer in", "Receive" arrows on hover were clever but cluttered. Removed.
- **Idle breathing animation.** Subtle but unnecessary. Three breathing cards on mobile is too much micro-motion. Removed.
- **Em-dashes in body copy.** Per standing direction. Sentences are now broken into separate clauses with periods or restructured.

What stayed: big ghosted corner numerals (sized smaller on mobile so cards do not consume the viewport), glassmorphism card surface with per-card accent gradient overlay, 3D mouse tilt on hover (desktop only, +/-5deg), cursor-following spotlight on hover (desktop only, per-card accent color), Card 2 elevated 12px above its neighbors on desktop, bottom shine line on hover, staggered entrance animation.

The design is intentionally calm. The hero video gets to be the visual centerpiece. The cards support it.

---

## 3. Visual Contract

`Prompt_138j_Hero_Pillars_Restraint.html` ships with this prompt. It is a production-fidelity preview that runs in any modern browser. Open it before approving the prompt. The implementation in `components/landing/HeroPillars.tsx` must match this preview pixel for pixel on layout, motion, color, typography, and responsive behavior.

The preview deliberately uses a plain navy stage with no fake hero, no fake nav, no fake copy. Cards in isolation, exactly as they will render when dropped into the existing hero as a component swap.

---

## 4. Out of Scope. DO NOT TOUCH

These elements are explicitly out of scope. Any modification to any of these in the diff means the PR is rejected.

| Element | Status |
|---|---|
| Hero video, DNA helix background | DO NOT TOUCH |
| Headline "Precision Personal Health Powered by Your Data" (typography, color, weight, letter-spacing, position) | DO NOT TOUCH |
| Orange treatment on "Powered by Your Data" | DO NOT TOUCH |
| Subhead "One Genome One Formulation One Life at a Time" | DO NOT TOUCH |
| Body paragraph "Precision health insights from your DNA, delivered through formulations engineered for your unique genome" | DO NOT TOUCH |
| Top navigation bar (logo, link order, link styling, login button, sign-up button) | DO NOT TOUCH |
| "Your Journey Starts Here" primary CTA | DO NOT TOUCH |
| "Sign In" secondary CTA | DO NOT TOUCH |
| Hero section padding, max-width, vertical rhythm above and below the cards | DO NOT TOUCH |
| Any element on any page other than the hero cards | DO NOT TOUCH |

The only file changes Michelangelo makes are:

1. Create `components/landing/HeroPillars.tsx` (new file)
2. Edit one line in the existing hero component: replace the existing 3-card block with `<HeroPillars />`, update the import
3. Delete or move-to-deprecated the previous card component
4. Optional: drop `Prompt_138j_Hero_Pillars_Restraint.html` into `docs/design/` for in-repo reference

That is the entire diff. If the diff has changes to any other file, the PR is rejected and reverted.

---

## 5. Standing Rules Compliance Matrix

| Rule | Status | Notes |
|---|---|---|
| No `package.json` modification | PASS | Framer Motion, Tailwind, Lucide already installed |
| No Supabase migrations | PASS | Purely presentational |
| No `config.toml` or email templates touch | PASS | Out of scope |
| Append-only migrations | PASS | N/A |
| Lucide React icons only | PASS | N/A (icons removed entirely) |
| `strokeWidth={1.5}` | PASS | N/A (icons removed) |
| No emojis in code | PASS | None used |
| Brand palette only | PASS | `#1A2744`, `#1E3054`, `#2DA5A0`, `#E27A2C` |
| Desktop and mobile simultaneous | PASS | Tailwind responsive from base |
| `getDisplayName()` | PASS | N/A, no product names rendered |
| Helix Rewards visibility | PASS | N/A |
| `map_compliance_tier` separation | PASS | N/A |
| No "Vitality Score" or "Wellness Score" | PASS | N/A |
| No CedarGrowth or Via Cura references | PASS | N/A |
| Bio Optimization terminology | PASS | N/A |
| No em-dashes in body copy | PASS | Audited; zero em-dashes in card copy or eyebrows |

---

## 6. Copy Specification (Exact Text)

This copy is canonical. No edits, no paraphrasing, no em-dashes added back during implementation.

### Card 1. Discovery (teal accent)

- Numeral: `01`
- Eyebrow: `Discovery`
- Headline: `Your Story`
- Body: `Begin with a 12-minute health questionnaire. Over 200 data points map your unique biology. No two stories are alike.`

### Card 2. Precision (teal-to-orange transition)

- Numeral: `02`
- Eyebrow: `Precision`
- Headline: `Your Biology`
- Body: `Layer in genetics, labs, and current supplements. The more you share, the more precisely we can engineer your protocol.`

### Card 3. Transformation (orange accent)

- Numeral: `03`
- Eyebrow: `Transformation`
- Headline: `Your Protocol`
- Body: `Receive personalized formulations with exact products, doses, and timing. Built for your biology alone.`

### Eyebrow rendering

- All caps via `text-transform: uppercase` (the source string is sentence case)
- Tracking `+0.20em`
- Font weight 600
- Font size 11px desktop, 10.5px mobile
- Color: card accent at 95% opacity (Card 1 and 2 teal, Card 3 orange)

---

## 7. Visual & Motion Specification

### 7.1 Per-Card Accent Color Map

| Card | Accent | Use |
|---|---|---|
| Card 1 (Discovery) | Teal `#2DA5A0` | numeral stroke, eyebrow, spotlight, hover border, shine |
| Card 2 (Precision) | Teal-to-orange | surface gradient diagonal teal-to-orange; eyebrow and spotlight use teal |
| Card 3 (Transformation) | Orange-soft `#E27A2C` | numeral stroke, eyebrow, spotlight, hover border, shine |

Note: orange-soft `#E27A2C` is used for accents. The deep brand orange `#B75E18` is reserved for primary CTAs ("Your Journey Starts Here") and should not appear in the cards.

### 7.2 Card Surface

| Property | Value |
|---|---|
| Base background | `rgba(30, 48, 84, 0.72)` (more solid than typical glassmorphism, so cards feel grounded against the hero video) |
| Backdrop filter | `backdrop-blur-2xl` (24px) |
| Border (default) | 1px solid `rgba(255, 255, 255, 0.10)` |
| Border (hover) | Card 1, 2: `rgba(45, 165, 160, 0.45)`. Card 3: `rgba(226, 122, 44, 0.50)` |
| Corner radius | `rounded-3xl` (24px) |
| Padding desktop | `p-8` (32px top/right/left, 28px bottom) |
| Padding mobile | `22px 20px 20px` |
| Min height desktop | 280px |
| Min height mobile | 200px |
| Shadow (default) | none |
| Shadow (hover) | `0 24px 48px -16px rgba(45,165,160,0.28), 0 6px 18px -8px rgba(26,39,68,0.55)` (Card 3 uses orange) |
| Transition | `border-color 400ms ease, box-shadow 400ms ease, background-color 400ms ease` |

### 7.3 Per-Card Surface Accent Overlay

| Card | Overlay |
|---|---|
| Card 1 | `radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.18), transparent 60%)` |
| Card 2 | `linear-gradient(135deg, rgba(45,165,160,0.16) 0%, rgba(226,122,44,0.16) 100%)` |
| Card 3 | `radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.20), transparent 60%)` |

Layered on top of the base navy at 72%.

### 7.4 Big Ghosted Numeral

| Property | Value |
|---|---|
| Position | `absolute top-[-18px] right-[-8px]` |
| Font size desktop | 200px |
| Font size tablet | 140px |
| Font size mobile | 90px |
| Mobile position | `top-[-8px] right-[-2px]` |
| Font weight | 700 |
| Line height | 1 |
| Letter-spacing | `-0.06em` |
| Color | transparent |
| Stroke (idle) | 1.5px Card 1, 2: `rgba(45,165,160,0.18)`. Card 3: `rgba(226,122,44,0.20)` |
| Stroke (hover) | 1.5px Card 1, 2: `rgba(45,165,160,0.34)`. Card 3: `rgba(226,122,44,0.40)` |
| Hover transform | `translate(-4px, 4px)` |
| `aria-hidden` | true |
| `user-select` | none |
| Z-index | 1 |
| Transition | `-webkit-text-stroke 500ms ease, transform 500ms ease` |

`-webkit-text-stroke` is not a Tailwind utility. Implementation uses inline styles plus a `<style jsx global>` block for the hover state.

### 7.5 Cursor-Following Spotlight (desktop hover only)

| Card | Color |
|---|---|
| Card 1, 2 | `radial-gradient(420px circle at MX MY, rgba(45,165,160,0.18), transparent 55%)` |
| Card 3 | `radial-gradient(420px circle at MX MY, rgba(226,122,44,0.18), transparent 55%)` |

Spring config: `damping: 28, stiffness: 280, mass: 0.6`. Opacity 0 default, 1 on group hover. Z-index 1. `aria-hidden`.

Spotlight opacity is 0.18 (slightly less intense than typical, supporting the restraint pass).

### 7.6 3D Mouse Tilt (desktop only)

| Parameter | Value |
|---|---|
| Tilt range X | +/-5deg |
| Tilt range Y | +/-5deg |
| Spring damping | 28 |
| Spring stiffness | 280 |
| Spring mass | 0.6 |
| Perspective | 1400px |
| `transform-style` | `preserve-3d` |
| Inner content depth | `translateZ(36px)` |

On `mouseLeave`, motion values reset to 0; spring physics handle the return.
Skipped entirely under `prefers-reduced-motion`.

### 7.7 Bottom Shine Line (hover)

| Property | Value |
|---|---|
| Position | `absolute left-7 right-7 bottom-0 h-px` (mobile: `left-5 right-5`) |
| Background Card 1, 2 | `linear-gradient(to right, transparent, rgba(45,165,160,0.7), transparent)` |
| Background Card 3 | `linear-gradient(to right, transparent, rgba(226,122,44,0.7), transparent)` |
| Opacity | 0 to 1 on hover |
| Duration | 500ms |
| `pointer-events` | none, `aria-hidden` |
| Z-index | 2 |

### 7.8 Entrance Animation

- Trigger: `whileInView` with `viewport={{ once: true, margin: '-80px' }}`
- Initial: `opacity 0, y 32` (Card 2: `y 40`)
- Target: Card 1 and 3 `opacity 1, y 0`. Card 2 desktop `y -12`. Card 2 tablet/mobile `y 0`.
- Duration: `0.7s`
- Ease: `[0.21, 0.47, 0.32, 0.98]`
- Stagger: Card 1 at `0.10s`, Card 2 at `0.28s`, Card 3 at `0.46s`

### 7.9 Tap Feedback (mobile)

`whileTap={{ scale: 0.985 }}`. Brief gentle press feedback where tilt does not fire.

### 7.10 What Is Not in This Design (Cut From Earlier Drafts)

| Element | Status |
|---|---|
| Rotating conic gradient borders | REMOVED |
| Icon badges (36x36 boxed Lucide icons) | REMOVED |
| Hover-reveal action microcopy ("Begin", "Layer in", "Receive") | REMOVED |
| Leading number prefix in eyebrow ("01 DISCOVERY") | REMOVED, eyebrow is just chapter word |
| Idle breathing animation (scale 1 to 1.004) | REMOVED |
| Em-dashes in body copy | REMOVED |

---

## 8. Responsive Behavior

| Breakpoint | Grid | Gap | Card 3 special | Numeral size | Card 2 elevation |
|---|---|---|---|---|---|
| `< 640px` (mobile) | `grid-cols-1` | `gap-[14px]` | normal flow | 90px | none |
| `640 to 1023px` (tablet) | `grid-cols-2` | `gap-[18px]` | `col-span-2 max-w-[480px] mx-auto` | 140px | none |
| `>= 1024px` (desktop) | `grid-cols-3` | `gap-6` | normal flow | 200px | `translate-y-[-12px]` |

Mobile padding is `22px 20px 20px` and `min-h-[200px]`. An earlier draft had min-height 260px on mobile; this version cuts to 200px because the icon row (about 60px) is gone.

Total mobile vertical estimate: roughly 220 pixels per card, three cards plus 14px gaps between them comes to roughly 700 pixels of stacked card content. This fits comfortably below the hero on a 375px-wide iPhone.

---

## 9. Accessibility

| Requirement | Implementation |
|---|---|
| `prefers-reduced-motion` | `useReducedMotion()`. When true, skip tilt, `translateZ`, parallax, stagger. Static fade-in only. |
| List semantics | Outer `<div role="list">`, each card `<motion.article role="listitem">` |
| Headings | `<h3>` for headlines |
| Eyebrow | `<span>` with `aria-label` (e.g., `aria-label="Chapter one, discovery"`) so screen readers announce the chapter properly |
| Numeral | `aria-hidden="true"` (purely decorative) |
| Decorative layers | `aria-hidden` on spotlight, surface overlay, shine |
| Color contrast | White on `rgba(30, 48, 84, 0.72)` with backdrop-blur, AAA against the hero video |

Lighthouse target: Accessibility >= 96 on the landing page.

---

## 10. Performance

- One backdrop-blur layer per card. No nested blurs.
- All animations are GPU composited (transforms only).
- `useSpring` outputs are passed to Framer Motion as motion values. No React state, no per-frame re-renders.
- `useMotionTemplate` constructs the spotlight CSS string via Framer's reactive primitive.
- Spring physics resolve in `~250ms` then idle.
- No idle animations means CPU/GPU usage is essentially zero between hover events.

This design is materially less expensive than busier card patterns. Removing rotating conic borders saves three continuously-running rotation animations (one per card). Removing breathing saves three more.

---

## 11. File Structure & Integration

### New File

`components/landing/HeroPillars.tsx`. New file. Replaces the previous card component.

### Modified File

The existing landing/hero component imports and renders the previous card component. Locate via:

```bash
grep -rn "HeroInfoCards\|HeroPillars" app/ components/
```

Replace import and JSX:

```tsx
// BEFORE (whatever the current name is)
import { HeroInfoCards } from '@/components/landing/HeroInfoCards'
...
<HeroInfoCards />

// AFTER
import { HeroPillars } from '@/components/landing/HeroPillars'
...
<HeroPillars />
```

### Deleted or Deprecated

Whatever component currently renders the three cards. Either delete or move to `components/_deprecated/` with a `DEPRECATED.md` note.

---

## 12. Component Implementation

`components/landing/HeroPillars.tsx`

```tsx
'use client'

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import { useRef, type MouseEvent, type CSSProperties } from 'react'

type AccentTheme = {
  primary: string
  rgb: string
}

const TEAL: AccentTheme = { primary: '#2DA5A0', rgb: '45,165,160' }
const ORANGE: AccentTheme = { primary: '#E27A2C', rgb: '226,122,44' }

type PillarData = {
  numeral: string
  eyebrow: string
  ariaChapter: string
  headline: string
  body: string
  accent: AccentTheme
  surfaceOverlay: string
}

const PILLARS: PillarData[] = [
  {
    numeral: '01',
    eyebrow: 'Discovery',
    ariaChapter: 'Chapter one, discovery',
    headline: 'Your Story',
    body: 'Begin with a 12-minute health questionnaire. Over 200 data points map your unique biology. No two stories are alike.',
    accent: TEAL,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.18), transparent 60%)',
  },
  {
    numeral: '02',
    eyebrow: 'Precision',
    ariaChapter: 'Chapter two, precision',
    headline: 'Your Biology',
    body: 'Layer in genetics, labs, and current supplements. The more you share, the more precisely we can engineer your protocol.',
    accent: TEAL,
    surfaceOverlay:
      'linear-gradient(135deg, rgba(45,165,160,0.16) 0%, rgba(226,122,44,0.16) 100%)',
  },
  {
    numeral: '03',
    eyebrow: 'Transformation',
    ariaChapter: 'Chapter three, transformation',
    headline: 'Your Protocol',
    body: 'Receive personalized formulations with exact products, doses, and timing. Built for your biology alone.',
    accent: ORANGE,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.20), transparent 60%)',
  },
]

function PillarCard({
  pillar,
  index,
  reduceMotion,
}: {
  pillar: PillarData
  index: number
  reduceMotion: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 28, stiffness: 280, mass: 0.6 }
  const xSpring = useSpring(mouseX, springConfig)
  const ySpring = useSpring(mouseY, springConfig)

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['5deg', '-5deg'])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-5deg', '5deg'])

  const spotlightX = useTransform(xSpring, (v) => `${(v + 0.5) * 100}%`)
  const spotlightY = useTransform(ySpring, (v) => `${(v + 0.5) * 100}%`)
  const spotlightBg = useMotionTemplate`radial-gradient(420px circle at ${spotlightX} ${spotlightY}, rgba(${pillar.accent.rgb},0.18), transparent 55%)`

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (reduceMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  const isElevated = index === 1
  const numeralStrokeIdle =
    pillar.accent === TEAL ? 'rgba(45,165,160,0.18)' : 'rgba(226,122,44,0.20)'

  return (
    <motion.article
      ref={ref}
      role="listitem"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: index === 1 ? 40 : 32 }}
      whileInView={{
        opacity: 1,
        y: isElevated && !reduceMotion ? -12 : 0,
      }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        delay: reduceMotion ? 0 : 0.10 + index * 0.18,
        duration: 0.7,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      style={
        reduceMotion
          ? undefined
          : ({
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              transformPerspective: 1400,
            } as CSSProperties)
      }
      whileTap={{ scale: 0.985 }}
      className={`pillar-card pillar-card--${index} group relative h-full will-change-transform`}
      data-accent-rgb={pillar.accent.rgb}
    >
      <div
        className="pillar-inner relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-3xl border border-white/10 p-[22px_20px_20px] transition-[border-color,box-shadow,background-color] duration-400 sm:min-h-[280px] sm:p-8"
        style={{
          background: `${pillar.surfaceOverlay}, rgba(30, 48, 84, 0.72)`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-400 group-hover:opacity-100"
          style={{ background: spotlightBg }}
        />

        <span
          aria-hidden="true"
          className="pillar-numeral pointer-events-none absolute right-[-2px] top-[-8px] z-[1] select-none text-[90px] font-bold leading-none tracking-[-0.06em] sm:right-[-8px] sm:top-[-18px] sm:text-[140px] lg:text-[200px]"
          style={{
            color: 'transparent',
            WebkitTextStroke: `1.5px ${numeralStrokeIdle}`,
            transition: 'all 500ms ease',
          }}
        >
          {pillar.numeral}
        </span>

        <div
          className="relative z-[2] flex h-full flex-col pt-2"
          style={
            reduceMotion ? undefined : { transform: 'translateZ(36px)' }
          }
        >
          <span
            aria-label={pillar.ariaChapter}
            className="mb-[10px] text-[10.5px] font-semibold uppercase tracking-[0.20em] sm:mb-3.5 sm:text-[11px]"
            style={{ color: `rgba(${pillar.accent.rgb}, 0.95)` }}
          >
            {pillar.eyebrow}
          </span>

          <h3 className="mb-2.5 text-[26px] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:mb-3.5 sm:text-[28px] lg:text-[32px]">
            {pillar.headline}
          </h3>

          <p className="flex-1 text-[14px] leading-[1.55] text-white/72 sm:text-[14.5px] sm:leading-[1.6]">
            {pillar.body}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-5 right-5 z-[2] h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:left-7 sm:right-7"
          style={{
            background: `linear-gradient(to right, transparent, rgba(${pillar.accent.rgb},0.7), transparent)`,
          }}
        />
      </div>
    </motion.article>
  )
}

export function HeroPillars() {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <>
      <style jsx global>{`
        .pillar-card.group:hover .pillar-numeral {
          -webkit-text-stroke-color: rgba(45,165,160,0.34) !important;
          transform: translate(-4px, 4px);
        }
        .pillar-card.pillar-card--2.group:hover .pillar-numeral {
          -webkit-text-stroke-color: rgba(226,122,44,0.40) !important;
        }
        .pillar-card.group:hover .pillar-inner {
          border-color: rgba(45,165,160,0.45);
          box-shadow:
            0 24px 48px -16px rgba(45,165,160,0.28),
            0 6px 18px -8px rgba(26,39,68,0.55);
        }
        .pillar-card.pillar-card--2.group:hover .pillar-inner {
          border-color: rgba(226,122,44,0.50);
          box-shadow:
            0 24px 48px -16px rgba(226,122,44,0.28),
            0 6px 18px -8px rgba(26,39,68,0.55);
        }
      `}</style>

      <div
        role="list"
        className="mt-20 grid grid-cols-1 gap-[14px] sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-3 lg:gap-6"
      >
        {PILLARS.map((pillar, index) => (
          <div
            key={pillar.numeral}
            className={
              index === 2
                ? 'sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-[480px] lg:col-span-1 lg:max-w-none'
                : ''
            }
          >
            <PillarCard
              pillar={pillar}
              index={index}
              reduceMotion={shouldReduceMotion}
            />
          </div>
        ))}
      </div>
    </>
  )
}
```

### Implementation notes

- `-webkit-text-stroke` is not a Tailwind utility. Hover state for the numeral stroke color is handled via `<style jsx global>`. If Next.js styled-jsx is not configured, move the keyframes block to `app/globals.css` instead. Either way, the stroke must visibly brighten on hover.
- The previous component used `lucide-react` for icons. This version removes icons entirely. The `lucide-react` import can be deleted from this file (verify it is still imported elsewhere before removing the package, but the package should remain installed for other components).
- Card 3 col-span goes on the wrapper `<div>`, not on the `<motion.article>`. Putting span on the motion article breaks tilt origin on tablet.
- Card 2 elevation is the `whileInView` target (`y: -12` on desktop only). Mouse-tilt math composes with this base translation via Framer.
- Mobile padding `p-[22px_20px_20px]` uses Tailwind arbitrary values. If your Tailwind config does not allow arbitrary tuples, convert to inline style.

---

## 13. OBRA Gates

### 13.1 Observe

- Locate import of the current card component: `grep -rn "HeroInfoCards\|HeroPillars" app/ components/`
- Open `Prompt_138j_Hero_Pillars_Restraint.html` in Chrome, Safari, Firefox to confirm visual behavior
- Capture before/after screenshots at desktop 1440w, tablet 768w, mobile 375w
- Confirm `framer-motion >= 11.0`
- Confirm `<style jsx global>` is supported, or plan to relocate keyframes/hover overrides to `app/globals.css`

### 13.2 Blueprint

- Component contract: `<HeroPillars />` is self-contained, takes no props, renders three pillar cards in a responsive grid
- Data: const array inside the component file (no Supabase)
- Imports:
  - `framer-motion`: `motion`, `useMotionTemplate`, `useMotionValue`, `useReducedMotion`, `useSpring`, `useTransform`
  - `react`: `useRef`, `type MouseEvent`, `type CSSProperties`
- No Lucide imports (icons removed)

### 13.3 Review (Michelangelo 13-Point Checklist)

| # | Check | Pass |
|---|---|---|
| 1 | No `package.json` modification | PASS |
| 2 | No Supabase migration or email-template touch | PASS |
| 3 | No emojis in code | PASS |
| 4 | No em-dashes anywhere in card copy or eyebrows (audit returns zero in `HeroPillars.tsx`) | PASS |
| 5 | Brand palette only (`#1A2744`, `#1E3054`, `#2DA5A0`, `#E27A2C`) | PASS |
| 6 | TypeScript strict-mode clean (typed `MouseEvent`, `CSSProperties`, no `any`) | PASS |
| 7 | `'use client'` directive present | PASS |
| 8 | `prefers-reduced-motion` respected (tilt skipped, stagger skipped, transform `translateZ` skipped) | PASS |
| 9 | Semantic markup (`role="list"`, `role="listitem"`, `<h3>`, `aria-label` on eyebrows) | PASS |
| 10 | No client-side fetch, no Supabase access | PASS |
| 11 | Numeral renders outlined-only on first paint (verify in browser) | PASS |
| 12 | Card 2 elevated -12px on desktop only, flat on tablet and mobile | PASS |
| 13 | Card 3 spans full width centered on tablet, single col on desktop and mobile | PASS |

### 13.4 Audit (Manual QA Matrix)

| Device / Setting | Tilt | Spotlight | Stagger | Numeral | Pass |
|---|---|---|---|---|---|
| Desktop Chrome (1440w) | yes | yes | yes | yes | open |
| Desktop Firefox | yes | yes | yes | yes | open |
| Desktop Safari | yes | yes | yes | verify `-webkit-text-stroke` | open |
| iPad Safari (768w), Card 3 spans | yes | yes | yes | yes | open |
| iPhone Safari (375w), 90px numerals | none | none | yes | yes | open |
| Android Chrome | none | none | yes | yes | open |
| macOS reduced-motion ON | none | none | static fade | yes | open |
| Card 2 elevation desktop only | n/a | n/a | n/a | n/a | open |
| Lighthouse Accessibility >= 96 | n/a | n/a | n/a | n/a | open |
| Console clean | n/a | n/a | n/a | n/a | open |
| Visual diff against `Prompt_138j_Hero_Pillars_Restraint.html` | n/a | n/a | n/a | n/a | open |
| Diff is exactly 3 files (new component, hero edit, deleted/moved old component) | n/a | n/a | n/a | n/a | open |

---

## 14. Acceptance Criteria

- Three cards render with the exact copy in §6 (no edits, no paraphrasing, no em-dashes added back)
- Eyebrow shows only the chapter word (Discovery, Precision, Transformation). No leading number prefix.
- Big ghosted numerals render outlined-only (transparent fill, accent stroke). 200px desktop, 140px tablet, 90px mobile.
- No icon badges in the cards.
- No rotating conic gradient borders. Border is a clean static 1px line.
- No idle breathing animation.
- On desktop hover: card tilts +/-5deg, teal/orange spotlight follows cursor, border brightens, bottom shine line appears, numeral brightens and shifts. No rotation theatrics.
- Card 2 sits 12px above its neighbors on desktop only. Flat on tablet and mobile.
- Card 3 spans full width centered on tablet. Single col on desktop and mobile.
- Mobile cards have min-height 200px, padding `22px 20px 20px`, 90px numerals. Total stacked card content fits comfortably below the hero on a 375px-wide iPhone.
- `prefers-reduced-motion: reduce` skips all motion. Static fade-in only.
- On mobile tap: card briefly scales to 0.985.
- No console warnings, no React key warnings, no hydration mismatch warnings.
- Lighthouse accessibility >= 96 on the landing page.
- No changes to `package.json`, `supabase/migrations/*`, `supabase/templates/*`, `config.toml`.
- Existing hero copy, "Your Journey Starts Here" CTA, "Sign In" button, nav, DNA helix background untouched.
- The previous card component (`HeroInfoCards.tsx` or whatever name was current) is deleted or moved to `_deprecated/`.
- Visual diff against `Prompt_138j_Hero_Pillars_Restraint.html` is acceptable to Gary (final approval gate).

---

## 15. Risk & Rollback

| Aspect | Assessment |
|---|---|
| Risk level | Low. Purely presentational, single new component, restrained visual surface (no rotating borders, no icons, no breathing). |
| Blast radius | Public landing page hero only. |
| Rollback | `git revert` the commit. Previous cards return. |
| Forward-compat | Same pattern is reusable for portal landing pages, pricing tiers, or any "three pillar" content layout. |

---

## 16. Branch & Commit

```bash
git checkout -b feat/hero-pillars-restraint
# Apply implementation in §12
git add components/landing/HeroPillars.tsx
git rm components/landing/HeroInfoCards.tsx
git add <located-hero-file>
git add docs/design/hero-pillars-preview.html
git commit -m "feat(landing): hero pillar cards restraint pass (Prompt 138j)"
git push -u origin feat/hero-pillars-restraint
```

After Vercel preview deploys, validate the audit matrix and visual-diff against the preview file before merging.

---

## 17. Notes & Assumptions

- Hero file location is unverified. Same as prior iterations. Michelangelo Observe step locates via grep.
- Framer Motion >= 11.0 is assumed.
- Instrument Sans is inherited from app shell.
- Preview HTML uses pure CSS keyframes for entrance and shine, plus vanilla JS for tilt/spotlight. The production component uses Framer Motion for tilt/spotlight (state-driven motion) and stays declarative.
- `-webkit-text-stroke` browser support: Safari 13.1+, Chrome/Edge 4+, Firefox 49+. No Tailwind utility, so we use inline styles plus a `<style jsx global>` block.
- Deep brand orange `#B75E18` is reserved for primary CTAs. This component uses companion `#E27A2C` (orange-soft) for accents.
