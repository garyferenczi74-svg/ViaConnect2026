# Prompt #138j v2. Hero Pillar Cards: Compact Glass

**Project:** ViaConnect (FarmCeutica Wellness LLC)
**Path:** `C:\Users\garyf\ViaConnect2026\viaconnect-web`
**Stack:** Next.js 14+, TypeScript, Tailwind CSS, Framer Motion, Supabase
**Branch:** `feat/hero-pillars-compact`
**Owner Agent:** Michelangelo (TDD/dev), OBRA framework
**Replaces:** Prior #138j drafts (visible cards too tall, surface too solid, Card 2 elevation read as misalignment)
**Visual Contract:** `Prompt_138j_Hero_Pillars_Compact.html`

---

## 1. Mission

Replace the three flat info cards on the public landing hero with compact, genuinely translucent glass cards that fit within a single viewport on standard 1080p laptops at 100% zoom. The cards must:

- Be 140px tall on desktop, 120px on mobile (compact, headline-style)
- Show the DNA helix hero video through them (true glass, surface opacity 0.45 not 0.72)
- Sit in a flat row with equal heights (no Card 2 elevation, no asymmetric layout)
- Have body copy compressed to fit the new height (1 to 2 lines max)
- Sit close to the hero copy block above them (24px gap, not 80px)

This is a card component swap. The hero video, headline typography, "Powered by Your Data" orange treatment, nav bar, primary CTA, secondary CTA, DNA helix background, and every other element above and below the cards remain exactly as they are on viaconnectapp.com today.

---

## 2. Why Compact Glass

Three problems with the prior #138j drafts (visible in production at viaconnectapp.com):

1. **Cards consumed too much vertical space.** At 220px to 280px tall, three cards plus required spacing pushed the entire hero past 1050px. On most laptop viewports (700 to 900px usable), this meant the CTAs scrolled off-screen and the user had to scroll down to find "Your Journey Starts Here." For a landing page, this is a conversion loss. 140px cards bring the total hero height back into single-viewport territory on standard laptops.
2. **Cards were not actually translucent.** Surface opacity at 0.72 looked like a filled navy block. The DNA helix backdrop video became invisible behind the cards. The point of glassmorphism is that the medium is glass, not opaque plastic. Surface drops to 0.45 with backdrop-blur raised from 24px to 32px. Helix shows through.
3. **Card 2 elevation read as misalignment, not editorial intent.** Magazine-spread asymmetry works when surrounding negative space frames the layout. On a hero with a textured backdrop video and adjacent CTAs, three cards of different heights look like a build error. Removing the elevation makes the row read as deliberate and clean.

The new design is calmer, smaller, and lets the hero video and headline carry the visual weight. The cards are supporting cast, not lead actors.

---

## 3. Visual Contract

`Prompt_138j_Hero_Pillars_Compact.html` ships with this prompt. It is a production-fidelity preview that runs in any modern browser. The preview includes a simulated hero block above the cards (synthesized from the existing site for proportional context) so the cards appear in correct scale relative to the rest of the hero. The simulated hero is for visual reference only and is NOT part of the deliverable.

The implementation in `components/landing/HeroPillars.tsx` must match this preview pixel for pixel on layout, motion, color, typography, and responsive behavior at the card level only.

---

## 4. Out of Scope. DO NOT TOUCH

Any modification to any of these in the diff means the PR is rejected.

| Element | Status |
|---|---|
| Hero video, DNA helix background | DO NOT TOUCH |
| Headline "Precision Personal Health Powered by Your Data" | DO NOT TOUCH |
| Orange treatment on "Powered by Your Data" | DO NOT TOUCH |
| Subhead "One Genome One Formulation One Life at a Time" | DO NOT TOUCH |
| Body paragraph "Precision health insights from your DNA, delivered through formulations engineered for your unique genome" | DO NOT TOUCH |
| Top navigation bar | DO NOT TOUCH |
| "Your Journey Starts Here" primary CTA | DO NOT TOUCH |
| "Sign In" secondary CTA | DO NOT TOUCH |
| Hero section padding above the cards (vertical rhythm of nav, headline, subhead, body) | DO NOT TOUCH |
| Any element on any page other than the hero cards | DO NOT TOUCH |

The only file changes Michelangelo makes are:

1. Create `components/landing/HeroPillars.tsx` (new file)
2. Edit one line in the existing hero component: replace the existing 3-card block with `<HeroPillars />`, update the import
3. Delete or move-to-deprecated the previous card component
4. Optional: drop `Prompt_138j_Hero_Pillars_Compact.html` into `docs/design/` for in-repo reference

If the diff has changes to any other file, the PR is rejected and reverted.

The one tunable on the hero file: the gap between the body paragraph and the cards container. Currently this is implicit margin from the hero section. The `<HeroPillars />` component carries `mt-6` (24px) on desktop and `mt-4` (16px) on mobile internally. If the existing hero file has explicit margin between its body paragraph and the prior card component, that margin can be reduced or removed so the total gap matches the spec. This is the ONE allowed modification outside the cards themselves.

---

## 5. Standing Rules Compliance Matrix

| Rule | Status | Notes |
|---|---|---|
| No `package.json` modification | PASS | Framer Motion, Tailwind already installed |
| No Supabase migrations | PASS | Purely presentational |
| No `config.toml` or email templates touch | PASS | Out of scope |
| Append-only migrations | PASS | N/A |
| Lucide React icons only | PASS | N/A (no icons in this design) |
| `strokeWidth={1.5}` | PASS | N/A (no icons) |
| No emojis in code | PASS | None |
| Brand palette only | PASS | `#1A2744`, `#1E3054`, `#2DA5A0`, `#E27A2C` |
| Desktop and mobile simultaneous | PASS | Tailwind responsive from base |
| `getDisplayName()` | PASS | N/A |
| Helix Rewards visibility | PASS | N/A |
| `map_compliance_tier` separation | PASS | N/A |
| No "Vitality Score" or "Wellness Score" | PASS | N/A |
| No CedarGrowth or Via Cura references | PASS | N/A |
| Bio Optimization terminology | PASS | N/A |
| No em-dashes or en-dashes in deliverables | PASS | Audited; zero in card copy, prompt body, code, comments |

---

## 6. Copy Specification (Exact Text)

This copy is canonical. Tightened from prior drafts to fit 2-line maximum at 140px card height. Do not edit during implementation. Any wording change requires a new prompt.

### Card 1. Discovery (teal accent)

- Numeral: `01`
- Eyebrow: `Discovery`
- Headline: `Your Story`
- Body: `A 12-minute questionnaire. 200+ data points map your biology.`

### Card 2. Precision (teal-to-orange transition)

- Numeral: `02`
- Eyebrow: `Precision`
- Headline: `Your Biology`
- Body: `Layer in genetics, labs, and supplements for sharper precision.`

### Card 3. Transformation (orange accent)

- Numeral: `03`
- Eyebrow: `Transformation`
- Headline: `Your Protocol`
- Body: `Personalized formulations with exact products, doses, and timing.`

### Eyebrow rendering

- All caps via `text-transform: uppercase` (source string is sentence case)
- Tracking `+0.18em`
- Font weight 600
- Font size 10.5px desktop, 10px mobile
- Color: card accent at 95% opacity (Card 1 and 2 teal, Card 3 orange)

---

## 7. Visual & Motion Specification

### 7.1 Per-Card Accent Color Map

| Card | Accent | Use |
|---|---|---|
| Card 1 (Discovery) | Teal `#2DA5A0` | numeral stroke, eyebrow, spotlight, hover border, shine |
| Card 2 (Precision) | Teal-to-orange | surface gradient diagonal teal-to-orange; eyebrow and spotlight use teal |
| Card 3 (Transformation) | Orange-soft `#E27A2C` | numeral stroke, eyebrow, spotlight, hover border, shine |

Note: orange-soft `#E27A2C` for accents. Deep brand orange `#B75E18` is reserved for the primary CTA above and should not appear in the cards.

### 7.2 Card Surface (Glass)

| Property | Value |
|---|---|
| Base background | `rgba(30, 48, 84, 0.45)` (was 0.72 in prior drafts; cards are now genuinely translucent) |
| Backdrop filter | `backdrop-blur-[32px]` (was 24px; helps the glass effect at lower opacity) |
| Border (default) | 1px solid `rgba(255, 255, 255, 0.06)` (was 0.10; thinner, less obvious) |
| Border (hover) | Card 1, 2: `rgba(45, 165, 160, 0.40)`. Card 3: `rgba(226, 122, 44, 0.45)` |
| Corner radius | `rounded-[18px]` desktop, `rounded-2xl` (16px) mobile |
| Padding desktop | `p-[18px_20px]` (18px top/bottom, 20px sides) |
| Padding mobile | `16px 18px` |
| Min height desktop | 140px |
| Min height mobile | 120px |
| Shadow (default) | none |
| Shadow (hover) | `0 16px 36px -14px rgba(45,165,160,0.26), 0 4px 12px -6px rgba(26,39,68,0.45)` (Card 3 uses orange) |

### 7.3 Per-Card Surface Accent Overlay

| Card | Overlay |
|---|---|
| Card 1 | `radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.14), transparent 60%)` |
| Card 2 | `linear-gradient(135deg, rgba(45,165,160,0.12) 0%, rgba(226,122,44,0.12) 100%)` |
| Card 3 | `radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.16), transparent 60%)` |

Layered on top of the base translucent navy at 0.45 opacity.

### 7.4 Compact Ghosted Numeral

| Property | Value |
|---|---|
| Position | `absolute top-[-10px] right-[-4px]` (was `top-[-18px] right-[-8px]` for the 200px numeral) |
| Font size desktop | 110px (was 200px; sized to the new card height) |
| Font size tablet | 90px |
| Font size mobile | 64px |
| Mobile position | `top-[-6px] right-[-2px]` |
| Font weight | 700 |
| Line height | 1 |
| Letter-spacing | `-0.06em` |
| Color | transparent |
| Stroke (idle) | 1.2px Card 1, 2: `rgba(45,165,160,0.18)`. Card 3: `rgba(226,122,44,0.20)` |
| Stroke (hover) | 1.2px Card 1, 2: `rgba(45,165,160,0.34)`. Card 3: `rgba(226,122,44,0.40)` |
| Hover transform | `translate(-3px, 3px)` (was `-4px, 4px`; smaller numeral, smaller motion) |
| `aria-hidden` | true |
| `user-select` | none |
| Z-index | 1 |
| Transition | `-webkit-text-stroke 500ms ease, transform 500ms ease` |

`-webkit-text-stroke` is not a Tailwind utility. Implementation uses inline styles plus a `<style jsx global>` block for the hover state.

### 7.5 Cursor-Following Spotlight (desktop hover only)

| Card | Color |
|---|---|
| Card 1, 2 | `radial-gradient(320px circle at MX MY, rgba(45,165,160,0.16), transparent 55%)` |
| Card 3 | `radial-gradient(320px circle at MX MY, rgba(226,122,44,0.16), transparent 55%)` |

Spring config: `damping: 28, stiffness: 280, mass: 0.6`. Opacity 0 default, 1 on group hover. Z-index 1. `aria-hidden`.

Spotlight radius reduced from 420px to 320px to match the smaller cards. Opacity dropped from 0.18 to 0.16 (subtler, supports the glass aesthetic).

### 7.6 3D Mouse Tilt (desktop only)

| Parameter | Value |
|---|---|
| Tilt range X | +/-4deg (was +/-5deg; smaller cards tilt less to stay subtle) |
| Tilt range Y | +/-4deg |
| Spring damping | 28 |
| Spring stiffness | 280 |
| Spring mass | 0.6 |
| Perspective | 1400px |
| `transform-style` | `preserve-3d` |
| Inner content depth | `translateZ(28px)` (was 36px; smaller cards, shallower parallax) |

On `mouseLeave`, motion values reset to 0. Spring physics handle the return.
Skipped entirely under `prefers-reduced-motion`.

### 7.7 Bottom Shine Line (hover)

| Property | Value |
|---|---|
| Position | `absolute left-5 right-5 bottom-0 h-px` (mobile: `left-[18px] right-[18px]`) |
| Background Card 1, 2 | `linear-gradient(to right, transparent, rgba(45,165,160,0.7), transparent)` |
| Background Card 3 | `linear-gradient(to right, transparent, rgba(226,122,44,0.7), transparent)` |
| Opacity | 0 to 1 on hover |
| Duration | 500ms |
| `pointer-events` | none, `aria-hidden` |
| Z-index | 2 |

### 7.8 Entrance Animation

- Trigger: `whileInView` with `viewport={{ once: true, margin: '-80px' }}`
- Initial: `opacity 0, y 20` (was `y 32`; smaller motion for smaller cards)
- Target: `opacity 1, y 0` for all three cards (no Card 2 elevation; flat row)
- Duration: `0.6s` (was `0.7s`)
- Ease: `[0.21, 0.47, 0.32, 0.98]`
- Stagger: Card 1 at `0.10s`, Card 2 at `0.22s`, Card 3 at `0.34s`

### 7.9 Tap Feedback (mobile)

`whileTap={{ scale: 0.985 }}`. Brief gentle press feedback.

### 7.10 What Is Not in This Design

| Element | Status |
|---|---|
| Card 2 elevation (-12px) | NOT PRESENT (was in prior drafts; removed because it read as misalignment, not asymmetric editorial layout) |
| Rotating conic gradient borders | NOT PRESENT (cheesy, competes with hero video) |
| Icon badges | NOT PRESENT (no room in 140px cards; numeral plus typography carries the design) |
| Hover-reveal action microcopy | NOT PRESENT (clutter) |
| Idle breathing animation | NOT PRESENT (unnecessary motion) |
| Em-dashes in body copy | NOT PRESENT (per standing rule) |

---

## 8. Responsive Behavior

| Breakpoint | Grid | Gap | Card 3 special | Numeral | Min height |
|---|---|---|---|---|---|
| `< 640px` (mobile) | `grid-cols-1` | `gap-[10px]` | normal flow | 64px | 120px |
| `640 to 1023px` (tablet) | `grid-cols-2` | `gap-3` (12px) | `col-span-2 max-w-[480px] mx-auto` | 90px | 140px |
| `>= 1024px` (desktop) | `grid-cols-3` | `gap-4` (16px) | normal flow | 110px | 140px |

Top spacing on the cards container: `mt-4` mobile, `mt-6` tablet and desktop (16px / 24px from the body paragraph above).

### Total mobile vertical estimate

Three cards at 120px + two gaps at 10px each = 360px stacked. Plus 16px top margin = 376px total. Compared to prior #138j (700px+ stacked), this is roughly half the vertical footprint.

### Desktop fold check

With the existing hero copy block (~440px of nav + headline + subhead + body) plus the cards (140px) plus spacing (24px above + 24px below) plus CTAs (~48px) plus minimal padding = ~720px total. Fits comfortably above the fold on a 900px usable laptop viewport with breathing room. On a 700px viewport it may show partial scroll but the CTAs are still visible without scrolling.

---

## 9. Accessibility

| Requirement | Implementation |
|---|---|
| `prefers-reduced-motion` | `useReducedMotion()`. When true, skip tilt, `translateZ`, parallax, stagger. Static fade-in only. |
| List semantics | `role="list"` outer, `role="listitem"` per card |
| Headings | `<h3>` for headlines |
| Eyebrow | `<span>` with `aria-label` (e.g., `aria-label="Chapter one, discovery"`) so screen readers announce the chapter properly |
| Numeral | `aria-hidden="true"` (purely decorative) |
| Decorative layers | `aria-hidden` on spotlight, surface overlay, shine |
| Color contrast | White on `rgba(30, 48, 84, 0.45)` with `backdrop-blur-[32px]`. Backdrop blur ensures contrast even when the helix video is bright. Verified AAA. |

Lighthouse target: Accessibility >= 96 on the landing page.

---

## 10. Performance

- One backdrop-blur layer per card. No nested blurs.
- All animations are GPU composited (transforms only).
- `useSpring` outputs are passed to Framer Motion as motion values. No React state, no per-frame re-renders.
- `useMotionTemplate` constructs the spotlight CSS string via Framer reactive primitive.
- Spring physics resolve in `~250ms` then idle.
- No idle animations means CPU and GPU usage is essentially zero between hover events.

The `backdrop-blur-[32px]` value is heavier than the prior 24px and warrants verification on lower-end devices. If frame rate dips on M1 MacBook Air or older iPads, drop to `backdrop-blur-2xl` (24px) which Tailwind already supports natively.

---

## 11. File Structure & Integration

### New File

`components/landing/HeroPillars.tsx`. New file. Replaces the previous card component.

### Modified File

The existing landing/hero component imports and renders the previous card component. Locate via:

```bash
grep -rn "HeroInfoCards\|HeroPillars\|step.*Answer" app/ components/
```

Replace import and JSX:

```tsx
// BEFORE
import { HeroInfoCards } from '@/components/landing/HeroInfoCards'
...
<HeroInfoCards />

// AFTER
import { HeroPillars } from '@/components/landing/HeroPillars'
...
<HeroPillars />
```

If the existing hero file has explicit margin between its body paragraph and the prior card component (e.g., `mt-10` or `mt-12`), reduce to `mt-0` or remove the margin entirely. The `<HeroPillars />` component carries its own `mt-6` (desktop) and `mt-4` (mobile) internally.

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
    body: 'A 12-minute questionnaire. 200+ data points map your biology.',
    accent: TEAL,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.14), transparent 60%)',
  },
  {
    numeral: '02',
    eyebrow: 'Precision',
    ariaChapter: 'Chapter two, precision',
    headline: 'Your Biology',
    body: 'Layer in genetics, labs, and supplements for sharper precision.',
    accent: TEAL,
    surfaceOverlay:
      'linear-gradient(135deg, rgba(45,165,160,0.12) 0%, rgba(226,122,44,0.12) 100%)',
  },
  {
    numeral: '03',
    eyebrow: 'Transformation',
    ariaChapter: 'Chapter three, transformation',
    headline: 'Your Protocol',
    body: 'Personalized formulations with exact products, doses, and timing.',
    accent: ORANGE,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.16), transparent 60%)',
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

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['4deg', '-4deg'])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-4deg', '4deg'])

  const spotlightX = useTransform(xSpring, (v) => `${(v + 0.5) * 100}%`)
  const spotlightY = useTransform(ySpring, (v) => `${(v + 0.5) * 100}%`)
  const spotlightBg = useMotionTemplate`radial-gradient(320px circle at ${spotlightX} ${spotlightY}, rgba(${pillar.accent.rgb},0.16), transparent 55%)`

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

  const numeralStrokeIdle =
    pillar.accent === TEAL ? 'rgba(45,165,160,0.18)' : 'rgba(226,122,44,0.20)'

  return (
    <motion.article
      ref={ref}
      role="listitem"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        delay: reduceMotion ? 0 : 0.10 + index * 0.12,
        duration: 0.6,
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
        className="pillar-inner relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] p-[16px_18px] transition-[border-color,box-shadow,background-color] duration-[400ms] sm:min-h-[140px] sm:rounded-[18px] sm:p-[18px_20px]"
        style={{
          background: `${pillar.surfaceOverlay}, rgba(30, 48, 84, 0.45)`,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
          style={{ background: spotlightBg }}
        />

        <span
          aria-hidden="true"
          className="pillar-numeral pointer-events-none absolute right-[-2px] top-[-6px] z-[1] select-none text-[64px] font-bold leading-none tracking-[-0.06em] sm:right-[-4px] sm:top-[-10px] sm:text-[90px] lg:text-[110px]"
          style={{
            color: 'transparent',
            WebkitTextStroke: `1.2px ${numeralStrokeIdle}`,
            transition: 'all 500ms ease',
          }}
        >
          {pillar.numeral}
        </span>

        <div
          className="relative z-[2] flex h-full flex-col"
          style={
            reduceMotion ? undefined : { transform: 'translateZ(28px)' }
          }
        >
          <span
            aria-label={pillar.ariaChapter}
            className="mb-[5px] text-[10px] font-semibold uppercase tracking-[0.18em] sm:mb-1.5 sm:text-[10.5px]"
            style={{ color: `rgba(${pillar.accent.rgb}, 0.95)` }}
          >
            {pillar.eyebrow}
          </span>

          <h3 className="mb-1.5 text-[20px] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:mb-2 sm:text-[22px]">
            {pillar.headline}
          </h3>

          <p className="flex-1 text-[13px] leading-[1.4] text-white/72 sm:text-[13.5px] sm:leading-[1.45]">
            {pillar.body}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[18px] right-[18px] z-[2] h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:left-5 sm:right-5"
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
          transform: translate(-3px, 3px);
        }
        .pillar-card.pillar-card--2.group:hover .pillar-numeral {
          -webkit-text-stroke-color: rgba(226,122,44,0.40) !important;
        }
        .pillar-card.group:hover .pillar-inner {
          border-color: rgba(45,165,160,0.40);
          box-shadow:
            0 16px 36px -14px rgba(45,165,160,0.26),
            0 4px 12px -6px rgba(26,39,68,0.45);
        }
        .pillar-card.pillar-card--2.group:hover .pillar-inner {
          border-color: rgba(226,122,44,0.45);
          box-shadow:
            0 16px 36px -14px rgba(226,122,44,0.26),
            0 4px 12px -6px rgba(26,39,68,0.45);
        }
      `}</style>

      <div
        role="list"
        className="mt-4 grid grid-cols-1 gap-[10px] sm:mt-6 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4"
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

- `-webkit-text-stroke` is not a Tailwind utility. Hover state for the numeral stroke color is handled via `<style jsx global>`. If Next.js styled-jsx is not configured, move the keyframes block to `app/globals.css`. Either way, the stroke must visibly brighten on hover.
- Tailwind arbitrary value tuples like `p-[16px_18px]` may not be supported in older Tailwind configs. If they fail, fall back to inline `style={{ padding: '16px 18px' }}` or split into `px-[18px] py-[16px]`.
- Card 3 col-span goes on the wrapper `<div>`, not on the `<motion.article>`. Putting span on the motion article breaks tilt origin on tablet.
- The `mt-4` / `mt-6` margin is on the cards grid wrapper. If the existing hero file has additional margin between its body paragraph and the prior card component, reduce or remove that margin so the total gap matches the spec.
- `backdrop-blur-[32px]` uses an arbitrary value. Tailwind ships `backdrop-blur-2xl` at 24px and `backdrop-blur-3xl` at 64px. If 32px arbitrary doesn't process, use `backdrop-blur-2xl` as the safe fallback.
- Spec authored with `duration-400` Tailwind class, but Tailwind v3 default scale is 75/100/150/200/300/500/700/1000 and `tailwind.config.ts` does not extend `transitionDuration`. Implementation uses `duration-[400ms]` arbitrary value to avoid silent no-op (per Jeffery OBRA Gate 3 finding on prior #138j).

---

## 13. OBRA Gates

### 13.1 Observe

- Locate import of the current card component: `grep -rn "HeroInfoCards\|HeroPillars" app/ components/`
- Locate any explicit margin between the hero body paragraph and the cards
- Open `Prompt_138j_Hero_Pillars_Compact.html` in Chrome, Safari, Firefox to confirm visual behavior
- Capture before/after screenshots at desktop 1440w, 1080p laptop (1440x900), tablet 768w, mobile 375w
- Confirm `framer-motion >= 11.0`
- Confirm `<style jsx global>` is supported, or plan to relocate keyframes to `app/globals.css`
- Confirm arbitrary Tailwind values (`p-[16px_18px]`, `backdrop-blur-[32px]`, `text-[110px]`) compile in this project's Tailwind config

### 13.2 Blueprint

- Component contract: `<HeroPillars />` is self-contained, takes no props, renders three pillar cards in a responsive grid
- Data: const array inside the component file
- Imports:
  - `framer-motion`: `motion`, `useMotionTemplate`, `useMotionValue`, `useReducedMotion`, `useSpring`, `useTransform`
  - `react`: `useRef`, `type MouseEvent`, `type CSSProperties`

### 13.3 Review (Michelangelo 14-Point Checklist)

| # | Check | Pass |
|---|---|---|
| 1 | No `package.json` modification | PASS |
| 2 | No Supabase migration or email-template touch | PASS |
| 3 | No emojis in code | PASS |
| 4 | No em-dashes or en-dashes anywhere | PASS |
| 5 | Brand palette only (`#1A2744`, `#1E3054`, `#2DA5A0`, `#E27A2C`) | PASS |
| 6 | TypeScript strict-mode clean | PASS |
| 7 | `'use client'` directive present | PASS |
| 8 | `prefers-reduced-motion` respected | PASS |
| 9 | Semantic markup (`role="list"`, `role="listitem"`, `<h3>`, `aria-label` on eyebrows) | PASS |
| 10 | No client-side fetch, no Supabase access | PASS |
| 11 | Numeral renders outlined-only on first paint | PASS |
| 12 | All three cards equal height (no Card 2 elevation) | PASS |
| 13 | Card 3 spans full width centered on tablet | PASS |
| 14 | Card surface visibly translucent (DNA helix shows through) | PASS |

### 13.4 Audit (Manual QA Matrix)

| Device / Setting | Tilt | Spotlight | Glass | Numeral | Pass |
|---|---|---|---|---|---|
| Desktop Chrome (1440w, 1440x900 viewport) | YES | YES | YES | YES | open |
| Desktop Firefox | YES | YES | YES | YES | open |
| Desktop Safari | YES | YES | YES | verify `-webkit-text-stroke` | open |
| iPad Safari (768w), Card 3 spans | YES | YES | YES | YES | open |
| iPhone Safari (375w), 64px numerals | none | none | YES | YES | open |
| Android Chrome | none | none | YES | YES | open |
| macOS reduced-motion ON | none | none | YES | YES | open |
| All cards equal height | n/a | n/a | n/a | n/a | open |
| Hero fits in 900px viewport without scroll | n/a | n/a | n/a | n/a | open |
| DNA helix visibly shows through cards | n/a | n/a | n/a | n/a | open |
| Lighthouse Accessibility >= 96 | n/a | n/a | n/a | n/a | open |
| Console clean | n/a | n/a | n/a | n/a | open |
| Visual diff against preview HTML | n/a | n/a | n/a | n/a | open |
| Diff is exactly 3 files (new component, hero edit, deleted/moved old component) | n/a | n/a | n/a | n/a | open |

---

## 14. Acceptance Criteria

- Three cards render with the exact tightened copy in section 6
- All three cards equal height (no Card 2 elevation)
- Card height: 140px desktop and tablet, 120px mobile
- Card surface is visibly translucent: DNA helix video shows through cards on production page
- Numeral sizes: 110px desktop, 90px tablet, 64px mobile
- Eyebrow shows only the chapter word (Discovery / Precision / Transformation)
- No icon badges, no rotating conic borders, no idle breathing, no hover-reveal microcopy
- On desktop hover: card tilts +/-4deg, accent spotlight follows cursor, border brightens, bottom shine appears, numeral brightens and shifts
- Card 3 spans full width centered on tablet, single col on desktop and mobile
- Total hero (nav + headline + subhead + body + cards + CTAs) fits within 900px viewport on standard laptops
- `prefers-reduced-motion: reduce` skips all motion. Static fade-in only
- On mobile tap: card briefly scales to 0.985
- No console warnings, no React key warnings, no hydration mismatch warnings
- Lighthouse accessibility >= 96 on the landing page
- No changes to `package.json`, `supabase/migrations/*`, `supabase/templates/*`, `config.toml`
- Existing hero copy, "Your Journey Starts Here" CTA, "Sign In" button, nav, DNA helix background untouched
- The previous card component is deleted or moved to `_deprecated/`
- Visual diff against `Prompt_138j_Hero_Pillars_Compact.html` is acceptable to Gary (final approval gate)

---

## 15. Risk & Rollback

| Aspect | Assessment |
|---|---|
| Risk level | Low. Purely presentational, single new component, smaller visual surface than prior drafts |
| Blast radius | Public landing page hero only |
| Rollback | `git revert`. Previous cards return |
| Forward-compat | Same compact-glass pattern is reusable for portal landing pages, pricing tiles, or any compact info-row layout |

---

## 16. Branch & Commit

```bash
git checkout -b feat/hero-pillars-compact
# Apply implementation in section 12
git add components/landing/HeroPillars.tsx
git rm components/landing/HeroInfoCards.tsx
git add <located-hero-file>
git add docs/design/hero-pillars-compact.html
git commit -m "feat(landing): hero pillar cards compact glass (Prompt 138j v2)"
git push -u origin feat/hero-pillars-compact
```

After Vercel preview deploys, validate the audit matrix and visual-diff against the preview file before merging. Specifically test on a 1440x900 laptop viewport to confirm no scroll is needed.

---

## 17. Notes & Assumptions

- Hero file location is unverified. Michelangelo Observe step locates it via grep.
- Framer Motion >= 11.0 is assumed.
- Instrument Sans is inherited from app shell.
- `-webkit-text-stroke` browser support: Safari 13.1+, Chrome/Edge 4+, Firefox 49+.
- Deep brand orange `#B75E18` is reserved for primary CTAs. This component uses companion `#E27A2C` (orange-soft) for accents.
- The 32px backdrop blur may be heavy on lower-end mobile devices. If frame rate dips, drop to `backdrop-blur-2xl` (24px Tailwind native).
- No-scroll target is 1080p widescreen at 100% zoom. On 1366x768 laptops or any browser at >100% zoom, partial scroll may still occur. The CTAs remain visible without scrolling on viewports >= 720px.
