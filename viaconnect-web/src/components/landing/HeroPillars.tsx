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
import { HeroPillarsMobileMarquee } from './HeroPillarsMobileMarquee'

export type AccentTheme = {
  primary: string
  rgb: string
}

export const TEAL: AccentTheme = { primary: '#2DA5A0', rgb: '45,165,160' }
export const ORANGE: AccentTheme = { primary: '#E27A2C', rgb: '226,122,44' }

export type PillarData = {
  numeral: string
  eyebrow: string
  ariaChapter: string
  headline: string
  body: string
  accent: AccentTheme
  surfaceOverlay: string
}

export const PILLARS: PillarData[] = [
  {
    numeral: '01',
    eyebrow: 'Discovery',
    ariaChapter: 'Chapter one, discovery',
    headline: 'Your Story',
    body: 'In 8 minutes, our onboarding assessment captures 200+ biological data points and translates them into a precision wellness protocol built for your unique physiology.',
    accent: TEAL,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(45,165,160,0.06), transparent 60%)',
  },
  {
    numeral: '02',
    eyebrow: 'Precision',
    ariaChapter: 'Chapter two, precision',
    headline: 'Your Biology',
    body: 'Layer in genetics, labs, and supplements for sharper precision.',
    accent: TEAL,
    surfaceOverlay:
      'linear-gradient(135deg, rgba(45,165,160,0.05) 0%, rgba(226,122,44,0.05) 100%)',
  },
  {
    numeral: '03',
    eyebrow: 'Transformation',
    ariaChapter: 'Chapter three, transformation',
    headline: 'Your Protocol',
    body: 'Personalized formulations with exact products, doses, and timing.',
    accent: ORANGE,
    surfaceOverlay:
      'radial-gradient(ellipse 80% 60% at 100% 0%, rgba(226,122,44,0.06), transparent 60%)',
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
          background: `${pillar.surfaceOverlay}, rgba(30, 48, 84, 0.18)`,
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
          className="relative z-[2] flex h-full flex-col text-left sm:text-inherit"
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

      {/* Mobile: continuous CSS marquee, 3 sets of 3 cards, right-to-left
          at constant velocity, footer × 1/1.3 cycle duration, pause on
          touch + tab hidden + reduced-motion. Replaces the 138k Pattern C
          discrete slideshow. See HeroPillarsMobileMarquee for spec
          details (Prompt 138k v2). */}
      <HeroPillarsMobileMarquee pillars={PILLARS} />

      {/* Tablet and desktop: existing grid */}
      <div
        role="list"
        className="mt-6 hidden sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:gap-4"
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
