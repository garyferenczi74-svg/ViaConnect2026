'use client'

// Prompt #138i: Hero Info Cards with 3D mouse-tilt, cursor-following teal
// spotlight, conic gradient border halo, glassmorphism surface, glowing icon
// halos, staggered entrance, and bottom shine line. Replaces the flat 3-step
// cards previously rendered by HowItWorksStrip.
//
// Performance contract: tilt + spotlight are driven by Framer Motion springs
// + useMotionTemplate, so the cursor handler does pure DOM measurement and
// React never re-renders per frame. All transforms are GPU-composited.
//
// Accessibility: prefers-reduced-motion strips tilt + parallax + stagger and
// renders a static fade-in. Outer list semantics + h3 titles. Decorative
// layers are aria-hidden.

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import {
  ClipboardList,
  Sparkles,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useRef, type MouseEvent } from 'react'

type InfoCardData = {
  step: string
  title: string
  description: string
  icon: LucideIcon
}

const CARDS: InfoCardData[] = [
  {
    step: '1',
    title: 'Answer',
    description: 'Complete your CAQ, about 12 minutes',
    icon: ClipboardList,
  },
  {
    step: '2',
    title: 'Upload',
    description:
      'Add labs, genetics, and supplements (optional, more accurate)',
    icon: Upload,
  },
  {
    step: '3',
    title: 'Receive',
    description:
      'Personalized protocol with the exact products, doses, and timing your body needs',
    icon: Sparkles,
  },
]

function InfoCard({
  card,
  index,
  reduceMotion,
}: {
  card: InfoCardData
  index: number
  reduceMotion: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 28, stiffness: 280, mass: 0.6 }
  const xSpring = useSpring(mouseX, springConfig)
  const ySpring = useSpring(mouseY, springConfig)

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['6deg', '-6deg'])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-6deg', '6deg'])

  const spotlightX = useTransform(
    xSpring,
    (v) => `${(v + 0.5) * 100}%`,
  )
  const spotlightY = useTransform(
    ySpring,
    (v) => `${(v + 0.5) * 100}%`,
  )
  const spotlightBg = useMotionTemplate`radial-gradient(420px circle at ${spotlightX} ${spotlightY}, rgba(45,165,160,0.22), transparent 55%)`

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

  const Icon = card.icon

  return (
    <motion.article
      ref={ref}
      role="listitem"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        delay: reduceMotion ? 0 : 0.12 * index,
        duration: 0.55,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      style={
        reduceMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              transformPerspective: 1200,
            }
      }
      whileTap={{ scale: 0.985 }}
      className="group relative h-full will-change-transform"
    >
      {/* Animated conic gradient border halo */}
      <div
        aria-hidden
        className="absolute -inset-[1px] rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,rgba(45,165,160,0.5)_0deg,rgba(255,255,255,0.08)_120deg,rgba(183,94,24,0.45)_240deg,rgba(45,165,160,0.5)_360deg)] opacity-50 blur-[2px] transition-opacity duration-500 group-hover:opacity-100"
      />

      {/* Card surface */}
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1E3054]/65 p-6 backdrop-blur-xl transition-[border-color,box-shadow] duration-500 group-hover:border-[#2DA5A0]/45 group-hover:shadow-[0_24px_60px_-12px_rgba(45,165,160,0.35),0_8px_24px_-8px_rgba(26,39,68,0.6)] sm:p-7">
        {/* Cursor-following spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: spotlightBg }}
        />

        {/* Inner content with z-depth */}
        <div
          style={
            reduceMotion ? undefined : { transform: 'translateZ(36px)' }
          }
          className="relative flex h-full flex-col"
        >
          {/* Icon with glowing halo */}
          <div className="relative mb-5 inline-flex w-fit">
            <div
              aria-hidden
              className="absolute inset-0 rounded-xl bg-[#2DA5A0]/25 blur-xl transition-all duration-500 group-hover:bg-[#2DA5A0]/45 group-hover:blur-2xl"
            />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#2DA5A0]/35 bg-[#2DA5A0]/10 transition-colors duration-500 group-hover:border-[#2DA5A0]/65 group-hover:bg-[#2DA5A0]/20">
              <Icon
                className="h-5 w-5 text-[#2DA5A0]"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </div>

          {/* Step number + Title */}
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-sm font-medium tracking-wide text-[#2DA5A0]">
              {card.step}.
            </span>
            <h3 className="text-lg font-semibold text-white sm:text-xl">
              {card.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-white/70 sm:text-[15px]">
            {card.description}
          </p>
        </div>

        {/* Bottom shine line on hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-[#2DA5A0]/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </div>
    </motion.article>
  )
}

export function HeroInfoCards() {
  const shouldReduceMotion = useReducedMotion() ?? false

  return (
    <div
      role="list"
      aria-label="How ViaConnect works"
      className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
    >
      {CARDS.map((card, index) => (
        <InfoCard
          key={card.step}
          card={card}
          index={index}
          reduceMotion={shouldReduceMotion}
        />
      ))}
    </div>
  )
}
