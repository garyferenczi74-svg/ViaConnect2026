'use client'

/**
 * Prompt 138k v2 Mobile Carousel: Continuous Marquee.
 *
 * Replaces the 138k Pattern C discrete slideshow on mobile only. Cards
 * scroll right-to-left at constant velocity, no waiting, no gap, no
 * dot indicators. The DOM contains 3 sets of 3 cards (9 slots total)
 * so that translating the track by exactly one set width
 * (calc(-3 * --slide-unit)) produces a seamless wrap that the user
 * never sees: at the loop boundary, set 2's first card occupies the
 * same viewport slot that set 1's first card had at translate(0).
 *
 * Speed: T_hero = T_footer / 1.6 (hero is 1.6x faster than the footer
 * "Backed by Science" marquee). Footer is 40s, so hero = 25s.
 *
 * Implementation matches the footer's CSS @keyframes pattern per spec
 * §5.3 decision rule. No Framer Motion animation cost; only useState
 * for pause-on-touch and useEffect for Page Visibility API.
 *
 * Card-internal layout is unchanged from 138k: 30px headline, 15px
 * body, 11px eyebrow, 96px ghosted numeral, justify-center vertical,
 * left-aligned horizontal, gradient bottom-shine div (never a text
 * character). Card 3 numeral stroke held at 0.40 alpha (Bug 4
 * mitigation from 138k for iOS WebKit text-stroke artifact at 96px).
 */

import { useEffect, useState, type TouchEvent as ReactTouchEvent } from 'react'
import type { PillarData } from './HeroPillars'

const FOOTER_DURATION_S = 40
// T_hero = T_footer / 1.6 (hero scrolls 1.6x faster than the footer
// "Backed by Science" marquee). Bumped from /1.3 on 2026-04-27.
const HERO_DURATION_S = Math.round(FOOTER_DURATION_S / 1.6) // 25s

const CARD_WIDTH_PX = 280
const CARD_GUTTER_PX = 16
const SLIDE_UNIT_PX = CARD_WIDTH_PX + CARD_GUTTER_PX // 296

interface MobileOverride {
  surfaceOverlay: string
  numeralStroke: string
  shineRgba: string
}

// Per-card mobile overrides. Surface overlays per spec §4.2 (boosted
// from desktop's 0.05-0.06 alpha so the colour reads through on a
// single full-width card). Numerals are rendered as outlined ghosts via
// -webkit-text-stroke with a transparent fill, matching the original
// design language. Stroke alphas boosted above the spec literal so the
// outline reads on the navy gradient at 96px.
function getMobileOverride(realIndex: number): MobileOverride {
  if (realIndex === 0) {
    return {
      surfaceOverlay:
        'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(69,122,0,0.14), transparent 60%)',
      numeralStroke: 'rgba(69,122,0,0.55)',
      shineRgba: 'rgba(69,122,0,0.7)',
    }
  }
  if (realIndex === 1) {
    return {
      surfaceOverlay:
        'linear-gradient(135deg, rgba(45,165,160,0.12) 0%, rgba(226,122,44,0.12) 100%)',
      numeralStroke: 'rgba(45,165,160,0.55)',
      shineRgba: 'rgba(45,165,160,0.7)',
    }
  }
  return {
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.16), transparent 60%)',
    numeralStroke: 'rgba(226,122,44,0.40)',
    shineRgba: 'rgba(226,122,44,0.7)',
  }
}

interface Props {
  pillars: PillarData[]
}

export function HeroPillarsMobileMarquee({ pillars }: Props) {
  const [isTouched, setIsTouched] = useState(false)
  const [isTabHidden, setIsTabHidden] = useState(false)

  useEffect(() => {
    function handleVisibility() {
      setIsTabHidden(document.visibilityState === 'hidden')
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  function handleTouchStart(_e: ReactTouchEvent<HTMLDivElement>) {
    setIsTouched(true)
  }
  function handleTouchEnd(_e: ReactTouchEvent<HTMLDivElement>) {
    setIsTouched(false)
  }

  const isPaused = isTouched || isTabHidden

  return (
    <div
      className="hero-pillar-marquee mt-6 w-full sm:hidden"
      data-paused={isPaused ? 'true' : 'false'}
      role="region"
      aria-roledescription="carousel"
      aria-label="ViaConnect three step process marquee"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <style jsx>{`
        @keyframes hero-pillar-marquee-rtl {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(calc(-3 * ${SLIDE_UNIT_PX}px), 0, 0);
          }
        }
        .hero-pillar-marquee {
          --hero-marquee-edge-mask: linear-gradient(
            to right,
            transparent 0%,
            #000 8%,
            #000 92%,
            transparent 100%
          );
          mask-image: var(--hero-marquee-edge-mask);
          -webkit-mask-image: var(--hero-marquee-edge-mask);
          overflow: hidden;
        }
        .hero-pillar-marquee-track {
          display: flex;
          gap: ${CARD_GUTTER_PX}px;
          width: max-content;
          padding-left: calc((100vw - ${CARD_WIDTH_PX}px) / 2);
          padding-right: calc((100vw - ${CARD_WIDTH_PX}px) / 2);
          animation: hero-pillar-marquee-rtl ${HERO_DURATION_S}s linear infinite;
          will-change: transform;
        }
        .hero-pillar-marquee:hover .hero-pillar-marquee-track,
        .hero-pillar-marquee[data-paused='true'] .hero-pillar-marquee-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-pillar-marquee-track {
            animation: none !important;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
      <div className="hero-pillar-marquee-track">
        {[0, 1, 2].map((setIdx) =>
          pillars.map((pillar, cardIdx) => {
            const isClone = setIdx > 0
            return (
              <MarqueePillarCard
                key={`set${setIdx}-card${cardIdx}`}
                pillar={pillar}
                realIndex={cardIdx}
                isClone={isClone}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

/**
 * Renders the ghosted numeral as hand-traced SVG <path> elements rather
 * than text. CSS -webkit-text-stroke and SVG <text> stroke both go
 * through the same glyph rasterizer pipeline on iOS, which produces a
 * star-shaped artifact at the bottom-right curl of the "2" glyph at
 * 96px. Hand-traced paths bypass the glyph rasterizer entirely so the
 * artifact cannot occur regardless of font, font features, or stroke
 * algorithm.
 *
 * Each digit is traced into a 60×96 box (matching font-size 96px and
 * approximate width of a bold sans-serif numeral). Outer outline traces
 * the bold glyph perimeter, inner counter (for "0") traces the closed
 * shape inside. Transparent fill + 1.2px stroke yields the same
 * "ghosted outline" aesthetic as the prior text approach.
 */
const DIGIT_BOX_W = 60
const DIGIT_PATHS: Record<string, string[]> = {
  // "0": outer rounded rectangle outline + inner counter
  '0': [
    'M 12,18 C 12,12 18,8 30,8 C 42,8 48,12 48,18 L 48,78 C 48,84 42,88 30,88 C 18,88 12,84 12,78 Z',
    'M 24,28 C 24,24 26,22 30,22 C 34,22 36,24 36,28 L 36,68 C 36,72 34,74 30,74 C 26,74 24,72 24,68 Z',
  ],
  // "1": bold vertical bar with top flag and base
  '1': [
    'M 22,18 L 36,8 L 36,80 L 46,80 L 46,88 L 14,88 L 14,80 L 24,80 L 24,22 L 18,26 Z',
  ],
  // "2": top curve, diagonal, bottom horizontal — modern bold "2"
  '2': [
    'M 10,28 C 10,16 18,8 30,8 C 42,8 50,16 50,28 C 50,38 44,44 36,52 L 18,72 L 50,72 L 50,88 L 8,88 L 8,76 L 30,52 C 36,46 40,40 40,32 C 40,24 36,20 30,20 C 24,20 20,24 20,30 L 10,30 Z',
  ],
  // "3": two stacked arcs forming the right side
  '3': [
    'M 10,22 C 14,12 22,8 30,8 C 42,8 50,16 50,26 C 50,34 44,40 36,42 C 46,44 52,52 52,62 C 52,76 42,90 28,90 C 18,90 10,84 8,76 L 18,72 C 20,78 24,82 30,82 C 38,82 42,76 42,68 C 42,60 36,54 26,54 L 26,46 C 34,46 40,42 40,34 C 40,28 36,22 30,22 C 24,22 20,26 20,30 L 10,30 Z',
  ],
}

function NumeralSvg({ digits, stroke }: { digits: string; stroke: string }) {
  const totalWidth = digits.length * DIGIT_BOX_W
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute z-[1] select-none"
      style={{
        top: -8,
        right: -2,
        height: 96,
        width: totalWidth,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${totalWidth} 96`}
      preserveAspectRatio="xMaxYMax meet"
      shapeRendering="geometricPrecision"
    >
      {digits.split('').map((digit, idx) => {
        const offset = idx * DIGIT_BOX_W
        const paths = DIGIT_PATHS[digit] ?? []
        return (
          <g key={idx} transform={`translate(${offset}, 0)`}>
            {paths.map((d, pi) => (
              <path
                key={pi}
                d={d}
                fill="transparent"
                stroke={stroke}
                strokeWidth="1.2"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

function MarqueePillarCard({
  pillar,
  realIndex,
  isClone,
}: {
  pillar: PillarData
  realIndex: number
  isClone: boolean
}) {
  const override = getMobileOverride(realIndex)
  return (
    <article
      role={isClone ? 'presentation' : 'group'}
      aria-roledescription={isClone ? undefined : 'slide'}
      aria-hidden={isClone || undefined}
      style={{ width: CARD_WIDTH_PX, flexShrink: 0 }}
    >
      <div
        className="relative flex h-full flex-col justify-center overflow-hidden rounded-[18px] border border-white/[0.06]"
        style={{
          minHeight: 220,
          padding: '24px 22px',
          background: `${override.surfaceOverlay}, rgba(30, 48, 84, 0.45)`,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        <NumeralSvg digits={pillar.numeral} stroke={override.numeralStroke} />

        <div className="relative z-[2] flex flex-col text-left">
          <span
            aria-label={isClone ? undefined : pillar.ariaChapter}
            className="font-semibold uppercase"
            style={{
              fontSize: 11,
              marginBottom: 10,
              letterSpacing: '0.18em',
              color: `rgba(${pillar.accent.rgb}, 0.95)`,
            }}
          >
            {pillar.eyebrow}
          </span>
          <h3
            className="font-semibold text-white"
            style={{
              fontSize: 30,
              marginBottom: 12,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {pillar.headline}
          </h3>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            {pillar.body}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-[2]"
          style={{
            left: 22,
            right: 22,
            bottom: 0,
            height: 1,
            opacity: 0.6,
            background: `linear-gradient(to right, transparent, ${override.shineRgba}, transparent)`,
          }}
        />
      </div>
    </article>
  )
}
