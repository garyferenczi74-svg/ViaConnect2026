'use client'
import { useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS } from '../shared/sectionConstants'
import { featureCards, type FeatureCard } from '../shared/featureCards'

export function FeaturesSectionMobile() {
    const [openId, setOpenId] = useState<string | null>(null)
    const reduceMotion = useReducedMotion()

    const handleToggle = (id: string) => {
        setOpenId((current) => (current === id ? null : id))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape' && openId) {
            setOpenId(null)
        }
    }

    return (
        <SectionAnchor
            id={SECTION_IDS.features}
            ariaLabel="ViaConnect Features"
            className="min-h-screen py-20 px-5"
        >
            <div className="max-w-md mx-auto" onKeyDown={handleKeyDown}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                        What You Get
                    </p>
                    <h2 className="text-white text-4xl font-light leading-tight mb-4">
                        Features built for your biology
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        One platform. Genomic testing, AI protocols, peptide therapeutics, and a three-portal ecosystem.
                    </p>
                </motion.div>

                <div className="flex flex-col gap-3">
                    {featureCards.map((feature, i) => (
                        <AccordionCard
                            key={feature.id}
                            feature={feature}
                            isOpen={openId === feature.id}
                            onToggle={handleToggle}
                            index={i}
                            reduceMotion={!!reduceMotion}
                        />
                    ))}
                </div>
            </div>
        </SectionAnchor>
    )
}

interface AccordionCardProps {
    feature: FeatureCard
    isOpen: boolean
    onToggle: (id: string) => void
    index: number
    reduceMotion: boolean
}

function AccordionCard({ feature, isOpen, onToggle, index, reduceMotion }: AccordionCardProps) {
    const Icon = feature.icon
    const headlineId = `feature-headline-${feature.id}`
    const bodyId = `feature-body-${feature.id}`

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
        >
            <motion.div
                animate={{
                    borderColor: isOpen ? 'rgba(45,165,160,1)' : 'rgba(255,255,255,0.08)',
                    backgroundColor: isOpen ? 'rgba(26,39,68,0.85)' : 'rgba(255,255,255,0.05)',
                    boxShadow: isOpen ? '0 0 24px rgba(45,165,160,0.15)' : '0 0 0px rgba(45,165,160,0)',
                }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                className="rounded-xl backdrop-blur-sm border"
            >
                <h3 className="m-0">
                    <button
                        type="button"
                        onClick={() => onToggle(feature.id)}
                        aria-expanded={isOpen}
                        aria-controls={bodyId}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2DA5A0]"
                    >
                        <motion.span
                            animate={{
                                backgroundColor: isOpen ? 'rgba(45,165,160,0.15)' : 'rgba(45,165,160,0)',
                                width: isOpen ? 40 : 28,
                                height: isOpen ? 40 : 28,
                            }}
                            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                            className="flex flex-shrink-0 items-center justify-center rounded-full"
                        >
                            <Icon strokeWidth={1.5} className="w-6 h-6 text-[#2DA5A0]" />
                        </motion.span>
                        <span className="flex-1 min-w-0">
                            <span id={headlineId} className="block text-white text-base font-medium leading-snug">
                                {feature.headline}
                            </span>
                            {!isOpen && (
                                <span className="block text-white/60 text-xs mt-1 leading-relaxed">
                                    {feature.teaser}
                                </span>
                            )}
                        </span>
                        <motion.span
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: 'easeOut' }}
                            className="flex-shrink-0 text-white/50"
                        >
                            <ChevronDown className="w-5 h-5" strokeWidth={1.5} />
                        </motion.span>
                    </button>
                </h3>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            id={bodyId}
                            role="region"
                            aria-labelledby={headlineId}
                            initial={{ height: 0 }}
                            animate={{
                                height: 'auto',
                                transition: reduceMotion
                                    ? { duration: 0 }
                                    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                            }}
                            exit={{
                                height: 0,
                                transition: reduceMotion
                                    ? { duration: 0 }
                                    : { duration: 0.22, ease: [0.4, 0, 1, 1] },
                            }}
                            style={{ overflow: 'hidden' }}
                        >
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: 1,
                                    transition: reduceMotion
                                        ? { duration: 0 }
                                        : { duration: 0.2, delay: 0.05 },
                                }}
                                exit={{
                                    opacity: 0,
                                    transition: reduceMotion
                                        ? { duration: 0 }
                                        : { duration: 0.2, delay: 0 },
                                }}
                                className="text-white/70 text-sm leading-relaxed px-5 pb-5"
                            >
                                {feature.body}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
