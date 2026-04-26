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
        className="pillar-inner relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-3xl border border-white/10 p-[22px_20px_20px] transition-[border-color,box-shadow,background-color] duration-[400ms] sm:min-h-[280px] sm:p-8"
        style={{
          background: `${pillar.surfaceOverlay}, rgba(30, 48, 84, 0.72)`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
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
