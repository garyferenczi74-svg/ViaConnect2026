'use client'

/**
 * Prompt 138k Mobile Carousel Fix.
 *
 * Pattern C infinite-loop carousel for the landing hero pillar cards on
 * mobile only. Track contains 4 slides: Card 1, Card 2, Card 3, and a
 * clone of Card 1 marked aria-hidden. The track translates left through
 * all four; when it lands on the clone, after the 600ms transition
 * completes, the track resets to Card 1's position with transition: none,
 * then re-enables transitions on the next animation frame. The user
 * sees no gap on loop; the reset is invisible.
 *
 * Replaces the prior InfiniteSlider auto-marquee on mobile only. Desktop
 * and tablet keep the static grid in HeroPillars.tsx untouched.
 *
 * Spec source: Prompt 138k sections 2-5. Branch:
 * fix/hero-pillars-carousel-bugs.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { PillarData } from './HeroPillars'

const TRANSITION_MS = 600
const TRANSITION_EASING = 'cubic-bezier(0.21, 0.47, 0.32, 0.98)'
const AUTO_ADVANCE_MS = 5000
const TOUCH_RESUME_DELAY_MS = 2000
const SWIPE_DISTANCE_THRESHOLD_PX = 50

interface MobileOverride {
  surfaceOverlay: string
  numeralStroke: string
  shineRgba: string
}

// Per-card mobile overrides. Spec section 4.2 surface overlays use
// higher alpha than the desktop overlays (0.14 / 0.12+0.12 / 0.16) so
// the colour read-through is visible on a single full-width card.
// Numeral stroke alpha bumped above the spec's 0.18/0.20 so it reads on
// the navy background; Card 3 orange held at 0.40 (Bug 4 mitigation per
// Jeffery review: 0.60 was producing a -webkit-text-stroke artifact on
// the closed counter of "0" at 96px on iOS WebKit).
function getMobileOverride(_pillar: PillarData, realIndex: number): MobileOverride {
  if (realIndex === 0) {
    return {
      surfaceOverlay:
        'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.14), transparent 60%)',
      numeralStroke: 'rgba(45,165,160,0.55)',
      shineRgba: 'rgba(45,165,160,0.7)',
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

export function HeroPillarsMobileCarousel({ pillars }: Props) {
  const reduceMotion = useReducedMotion() ?? false
  const totalReal = pillars.length

  const [index, setIndex] = useState(0)
  const [transitionEnabled, setTransitionEnabled] = useState(true)
  const [isPausedByTouch, setIsPausedByTouch] = useState(false)
  const [isTabHidden, setIsTabHidden] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  const visualIndex = index >= totalReal ? 0 : index
  const slides = useMemo(() => [...pillars, pillars[0]], [pillars])

  const advance = useCallback(() => {
    setIndex((i) => i + 1)
  }, [])

  const retreat = useCallback(() => {
    setIndex((i) => {
      if (i <= 0) return totalReal - 1
      return i - 1
    })
  }, [totalReal])

  const goTo = useCallback((target: number) => {
    setIndex(target)
  }, [])

  // Auto-advance: 5s interval. Disabled under prefers-reduced-motion or
  // when the user is touching the carousel or the tab is hidden.
  useEffect(() => {
    if (reduceMotion || isPausedByTouch || isTabHidden) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = setInterval(() => {
      setIndex((i) => i + 1)
    }, AUTO_ADVANCE_MS)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [reduceMotion, isPausedByTouch, isTabHidden])

  // Page Visibility API: pause when tab is hidden, resume on focus.
  useEffect(() => {
    function handleVisibility() {
      setIsTabHidden(document.visibilityState === 'hidden')
    }
    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Pattern C clone-snap: when the track lands on the clone slide
  // (index === totalReal), wait for the transition to finish, then snap
  // back to index 0 with transition disabled. Re-enable transition on
  // the next animation frame so the next forward step animates again.
  useEffect(() => {
    if (index < totalReal) return
    snapTimerRef.current = setTimeout(() => {
      setTransitionEnabled(false)
      setIndex(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionEnabled(true)
        })
      })
    }, TRANSITION_MS + 32)
    return () => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current)
        snapTimerRef.current = null
      }
    }
  }, [index, totalReal])

  // Cleanup any outstanding resume timer on unmount.
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [])

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
    setIsPausedByTouch(true)
    touchStartXRef.current = event.touches[0].clientX
    touchStartYRef.current = event.touches[0].clientY
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current
    const startY = touchStartYRef.current
    if (startX !== null && startY !== null) {
      const endX = event.changedTouches[0].clientX
      const endY = event.changedTouches[0].clientY
      const dx = endX - startX
      const dy = endY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      // Horizontal-enough swipe: distance >= 50px and dominantly horizontal.
      if (absDx >= SWIPE_DISTANCE_THRESHOLD_PX && absDx > absDy) {
        if (dx < 0) advance()
        else retreat()
      }
    }
    touchStartXRef.current = null
    touchStartYRef.current = null
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      setIsPausedByTouch(false)
      resumeTimerRef.current = null
    }, TOUCH_RESUME_DELAY_MS)
  }

  return (
    <div className="mt-6 w-full sm:hidden">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="ViaConnect three step process"
        className="overflow-hidden rounded-[18px]"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: transitionEnabled
              ? `transform ${TRANSITION_MS}ms ${TRANSITION_EASING}`
              : 'none',
          }}
        >
          {slides.map((pillar, slideIndex) => {
            const isClone = slideIndex >= totalReal
            const realIndex = isClone ? 0 : slideIndex
            const override = getMobileOverride(pillar, realIndex)
            return (
              <MobilePillarSlide
                key={`${pillar.numeral}-${slideIndex}`}
                pillar={pillar}
                override={override}
                isClone={isClone}
              />
            )
          })}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Process step indicators"
        className="mt-5 flex items-center justify-center gap-2"
      >
        {pillars.map((p, dotIndex) => {
          const isActive = visualIndex === dotIndex
          const activeColor = p.accent.primary
          return (
            <button
              key={p.numeral}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Show ${p.eyebrow}: ${p.headline}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => goTo(dotIndex)}
              className="block rounded-full transition-all duration-300 ease-out"
              style={{
                width: isActive ? 24 : 8,
                height: 8,
                backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.20)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function MobilePillarSlide({
  pillar,
  override,
  isClone,
}: {
  pillar: PillarData
  override: MobileOverride
  isClone: boolean
}) {
  return (
    <article
      role={isClone ? 'presentation' : 'group'}
      aria-roledescription={isClone ? undefined : 'slide'}
      aria-hidden={isClone || undefined}
      className="relative w-full shrink-0 grow-0 basis-full"
    >
      <div
        className="relative flex flex-col justify-center overflow-hidden rounded-[18px] border border-white/[0.06]"
        style={{
          minHeight: 220,
          padding: '24px 22px',
          background: `${override.surfaceOverlay}, rgba(30, 48, 84, 0.45)`,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-2px] top-[-8px] z-[1] select-none font-bold leading-none"
          style={{
            fontSize: 96,
            letterSpacing: '-0.06em',
            color: 'transparent',
            WebkitTextStroke: `1.2px ${override.numeralStroke}`,
            paintOrder: 'stroke fill',
            textRendering: 'geometricPrecision',
          }}
        >
          {pillar.numeral}
        </span>

        <div className="relative z-[2] flex flex-col text-left">
          <span
            aria-label={pillar.ariaChapter}
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
