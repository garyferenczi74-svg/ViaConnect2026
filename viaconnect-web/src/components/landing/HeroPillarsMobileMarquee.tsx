'use client'

/**
 * Prompt 220 (revised): mobile journey cards auto-rotating scroll-snap carousel.
 *
 * Root cause (pre-220): continuous CSS marquee with overflow:hidden; touch only
 * paused animation; cards 02/03 unreachable by swipe or rotation.
 * 220 first pass: snap + swipe + dots, no auto-advance.
 * 220 revised: auto-rotate (primary), swipe/dots as supplements that reset the timer.
 *
 * Desktop: HeroPillars grid (sm+) is static; no rotation there.
 * No carousel library. No package.json changes.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import type { PillarData } from './HeroPillars'

/** Dwell per card before auto-advance (Gary-tunable). */
export const HERO_PILLAR_DWELL_MS = 6000

interface MobileOverride {
  surfaceOverlay: string
  numeralStroke: string
  shineRgba: string
}

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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return reduced
}

export function HeroPillarsMobileMarquee({ pillars }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const reducedMotion = usePrefersReducedMotion()

  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(true)
  const [userTouching, setUserTouching] = useState(false)
  const [userScrolling, setUserScrolling] = useState(false)
  /** Bumps to restart the dwell timer after manual input. */
  const [timerEpoch, setTimerEpoch] = useState(0)

  const programmaticScrollRef = useRef(false)
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const n = pillars.length

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const slides = track.querySelectorAll<HTMLElement>('[data-pillar-slide]')
    if (slides.length === 0) return

    const trackCenter = track.scrollLeft + track.clientWidth / 2
    let bestIdx = 0
    let bestDist = Number.POSITIVE_INFINITY
    slides.forEach((slide, i) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2
      const dist = Math.abs(center - trackCenter)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })
    activeRef.current = bestIdx
    setActive((prev) => (prev === bestIdx ? prev : bestIdx))
  }, [])

  const goTo = useCallback(
    (index: number, opts?: { fromUser?: boolean; smooth?: boolean }) => {
      const track = trackRef.current
      if (!track || n === 0) return
      const target = ((index % n) + n) % n
      const slide = track.querySelector<HTMLElement>(
        `[data-pillar-slide="${target}"]`,
      )
      if (!slide) return

      if (opts?.fromUser) {
        setTimerEpoch((e) => e + 1)
      }

      programmaticScrollRef.current = true
      const left =
        slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2
      const smooth = opts?.smooth ?? !reducedMotion
      track.scrollTo({
        left: Math.max(0, left),
        behavior: smooth ? 'smooth' : 'auto',
      })
      activeRef.current = target
      setActive(target)

      // Clear programmatic flag after scroll settles so user swipes are detected.
      window.setTimeout(
        () => {
          programmaticScrollRef.current = false
          syncActiveFromScroll()
        },
        smooth ? 450 : 50,
      )
    },
    [n, reducedMotion, syncActiveFromScroll],
  )

  // Scroll listener: sync dots; user pan resets timer.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const onScroll = () => {
      syncActiveFromScroll()
      if (programmaticScrollRef.current) return

      setUserScrolling(true)
      setTimerEpoch((e) => e + 1)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = setTimeout(() => {
        setUserScrolling(false)
        setTimerEpoch((e) => e + 1)
      }, 180)
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', syncActiveFromScroll)
    syncActiveFromScroll()
    return () => {
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', syncActiveFromScroll)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
    }
  }, [syncActiveFromScroll, n])

  // IntersectionObserver: pause when carousel leaves viewport.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]
        setInView(Boolean(hit?.isIntersecting))
      },
      { threshold: 0.25 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  // Page Visibility API: pause when tab hidden.
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible')
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Auto-rotate: only when not reduced-motion and not paused.
  const rotationPaused =
    reducedMotion ||
    !inView ||
    !tabVisible ||
    userTouching ||
    userScrolling ||
    n < 2

  useEffect(() => {
    if (rotationPaused) return
    const id = window.setInterval(() => {
      const next = (activeRef.current + 1) % n
      goTo(next, { fromUser: false, smooth: true })
    }, HERO_PILLAR_DWELL_MS)
    return () => window.clearInterval(id)
  }, [rotationPaused, n, goTo, timerEpoch])

  const onTouchStart = (_e: ReactTouchEvent) => {
    setUserTouching(true)
    setTimerEpoch((e) => e + 1)
  }
  const onTouchEnd = () => {
    setUserTouching(false)
    setTimerEpoch((e) => e + 1)
  }

  const onDotClick = (i: number) => {
    goTo(i, { fromUser: true, smooth: !reducedMotion })
  }

  return (
    <div
      ref={rootRef}
      className="hero-pillar-snap mt-6 w-full sm:hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="ViaConnect three step process"
      data-testid="hero-pillars-mobile-carousel"
      data-auto-rotate={rotationPaused ? 'paused' : 'on'}
      data-dwell-ms={HERO_PILLAR_DWELL_MS}
    >
      <style jsx>{`
        .hero-pillar-snap-track {
          display: flex;
          gap: 12px;
          width: 100%;
          max-width: 100vw;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          scroll-padding-inline: 7.5vw;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
          scrollbar-width: none;
          padding-left: 7.5vw;
          padding-right: 7.5vw;
        }
        .hero-pillar-snap-track::-webkit-scrollbar {
          display: none;
        }
        .hero-pillar-snap-slide {
          flex: 0 0 85vw;
          max-width: 85vw;
          scroll-snap-align: center;
          scroll-snap-stop: always;
        }
      `}</style>

      <div
        ref={trackRef}
        className="hero-pillar-snap-track"
        data-testid="hero-pillars-mobile-track"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {pillars.map((pillar, cardIdx) => (
          <div
            key={pillar.numeral}
            className="hero-pillar-snap-slide"
            data-pillar-slide={cardIdx}
          >
            <SnapPillarCard pillar={pillar} realIndex={cardIdx} />
          </div>
        ))}
      </div>

      <div
        className="mt-4 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Journey steps"
        data-testid="hero-pillars-mobile-dots"
      >
        {pillars.map((pillar, i) => {
          const isActive = i === active
          return (
            <button
              key={pillar.numeral}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Go to step ${i + 1}`}
              data-testid={`hero-pillars-dot-${i}`}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onDotClick(i)}
              className="flex h-11 min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <span
                className="block h-2 w-2 rounded-full transition-colors"
                style={{
                  background: isActive
                    ? '#2DA5A0'
                    : 'rgba(255,255,255,0.28)',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SnapPillarCard({
  pillar,
  realIndex,
}: {
  pillar: PillarData
  realIndex: number
}) {
  const override = getMobileOverride(realIndex)
  return (
    <article
      role="group"
      aria-roledescription="slide"
      aria-label={`${pillar.eyebrow}: ${pillar.headline}`}
      tabIndex={0}
      data-testid={`hero-pillar-slide-${realIndex}`}
    >
      <div
        className="relative flex h-full flex-col justify-center overflow-hidden rounded-[18px] border border-white/[0.06]"
        style={{
          minHeight: 187,
          padding: '20px 19px',
          background: `${override.surfaceOverlay}, rgba(30, 48, 84, 0.45)`,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-2px] top-[-8px] z-[1] select-none font-bold leading-none"
          style={
            {
              fontSize: 82,
              letterSpacing: '-0.06em',
              color: 'transparent',
              WebkitTextStroke: `1px ${override.numeralStroke}`,
              paintOrder: 'stroke fill',
              textRendering: 'geometricPrecision',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              isolation: 'isolate',
              transform: 'translateZ(0)',
            } as CSSProperties
          }
        >
          {pillar.numeral}
        </span>

        <div className="relative z-[2] flex flex-col text-left">
          <span
            aria-label={pillar.ariaChapter}
            className="font-semibold uppercase"
            style={{
              fontSize: 9,
              marginBottom: 9,
              letterSpacing: '0.18em',
              color: `rgba(${pillar.accent.rgb}, 0.95)`,
            }}
          >
            {pillar.eyebrow}
          </span>
          <h3
            className="font-semibold text-white"
            style={{
              fontSize: 26,
              marginBottom: 10,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {pillar.headline}
          </h3>
          <p
            style={{
              fontSize: 13,
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
            left: 19,
            right: 19,
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
