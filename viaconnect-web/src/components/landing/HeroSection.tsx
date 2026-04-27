'use client'
import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useScroll, motion } from 'framer-motion'
import { TabDropdownPanel } from './TabDropdownPanel'
import type { TabId } from './TabContent'
import { HeroPillars } from './HeroPillars'

const menuItems: { name: string; id: TabId }[] = [
    { name: 'Features', id: 'features' },
    { name: 'Genomics', id: 'genomics' },
    { name: 'Process', id: 'process' },
    { name: 'About', id: 'about' },
]

const Logo = () => {
    return (
        <span className="text-xl font-bold tracking-tight">
            <span className="text-[#b75e18]">Via</span><span className="text-white">Connect</span>
        </span>
    )
}

function HeroHeader({ activeTab, onTabClick, onClose }: { activeTab: TabId | null; onTabClick: (id: TabId) => void; onClose: () => void }) {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

    const { scrollY } = useScroll()

    React.useEffect(() => {
        return scrollY.on('change', (latest) => {
            setIsScrolled(latest > 50)
        })
    }, [scrollY])

    return (
        <header>
            <nav
                data-state={menuState ? 'active' : 'inactive'}
                className="group fixed z-20 w-full px-2">
                <div className={cn('mx-auto mt-2 max-w-2xl px-6 transition-all duration-300 lg:max-w-7xl lg:px-12', isScrolled && 'bg-[#0d1225]/80 max-w-4xl rounded-3xl border border-white/5 backdrop-blur-2xl lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 md:gap-0 md:py-4">
                        <div className="flex w-full items-center justify-between lg:w-auto">
                            <Link href="/" aria-label="home" onClick={() => onClose()}>
                                <Logo />
                            </Link>
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 flex items-center justify-center w-10 h-10 rounded-lg lg:hidden hover:bg-white/10 transition-colors">
                                <div aria-hidden="true" className="size-5 text-white">
                                    {menuState ? <X /> : <Menu />}
                                </div>
                            </button>
                        </div>

                        <div className="bg-[#0d1225] group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end gap-6 rounded-3xl border border-white/5 p-6 shadow-2xl shadow-zinc-600/10 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:pr-4">
                                <ul className="flex flex-col gap-6 text-base lg:flex-row lg:gap-0 lg:text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <button
                                                onClick={() => { onTabClick(item.id); setMenuState(false); }}
                                                className={cn(
                                                    'text-slate-300 block duration-150 hover:text-white md:px-4 lg:text-sm text-left w-full lg:w-auto',
                                                    activeTab === item.id && 'text-white border-b-2 border-[#B87333] pb-0.5'
                                                )}>
                                                <span>{item.name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex w-full flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row md:w-fit md:border-0 md:pt-0">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10">
                                    <span>Login</span>
                                </Link>
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center rounded-md bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60">
                                    <span>Sign Up</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}

// Prompt #138a Phase 4: optional copy props for hero variant rendering.
// Defaults preserve the original control copy when no variant is active, so
// the visual non-disruption guarantee in spec section 3 holds for the
// untouched homepage.
export interface HeroSectionProps {
    variantHeadline?: string;
    variantSubheadline?: string;
    variantCtaLabel?: string;
    variantCtaHref?: string;
}

export function HeroSection({
    variantHeadline,
    variantSubheadline,
    variantCtaLabel,
    variantCtaHref,
}: HeroSectionProps = {}) {
    const [activeTab, setActiveTab] = useState<TabId | null>(null)

    const handleTabClick = useCallback((id: TabId) => {
        setActiveTab(prev => prev === id ? null : id)
    }, [])

    const handleClose = useCallback(() => {
        setActiveTab(null)
    }, [])

    return (
        <>
            <HeroHeader activeTab={activeTab} onTabClick={handleTabClick} onClose={handleClose} />
            <TabDropdownPanel activeTab={activeTab} onClose={handleClose} />
            <main className="overflow-x-hidden flex min-h-[100svh] flex-col relative">
                <div className="fixed inset-0 bg-gradient-to-b from-[#0d1225] to-[#141c35] -z-10" />
                <div className="fixed top-0 right-0 w-[55vw] h-[55vh] bg-[radial-gradient(ellipse_at_top_right,rgba(120,60,180,0.12),transparent_65%)] pointer-events-none -z-10" />
                <section className="relative flex-1 flex flex-col">
                    <div className="relative flex-1 pt-[80px] pb-[100px] md:pt-0 md:pb-0 md:flex md:flex-col md:justify-center">
                        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                                <h1 className="max-w-2xl lg:max-w-5xl text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1]">
                                    {variantHeadline ? (
                                        <span className="block">{variantHeadline}</span>
                                    ) : (
                                        <>
                                            <span className="block">Precision Personal Health</span>
                                            <span className="block text-[#B75E18]">Powered by Your Data</span>
                                        </>
                                    )}
                                </h1>
                                {!variantSubheadline && (
                                    <p className="mt-4 mx-auto lg:mx-0 text-sm sm:text-base text-slate-400 leading-relaxed text-balance lg:whitespace-nowrap">
                                        Precision health insights from your DNA, delivered through formulations engineered for your unique genome
                                    </p>
                                )}
                                <HeroPillars />
                                {variantSubheadline ? (
                                    <p className="mt-4 sm:mt-10 max-w-2xl text-balance text-base sm:text-lg text-slate-300 leading-relaxed">
                                        {variantSubheadline}
                                    </p>
                                ) : (
                                    <p className="mt-4 sm:mt-10 max-w-2xl text-balance text-base sm:text-lg text-slate-300 leading-relaxed">
                                        One Genome  One Formulation  One Life at a Time
                                    </p>
                                )}
                                <div className="mt-4 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row lg:justify-start">
                                    <Link
                                        href={variantCtaHref ?? "/signup"}
                                        className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center rounded-full bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 pl-6 pr-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60 hover:shadow-[0_0_30px_rgba(183,94,24,0.6)]">
                                        <span>{variantCtaLabel ?? "Your Journey Starts Here"}</span>
                                        <ChevronRight className="ml-1" />
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-6 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                        <span>Sign In</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 overflow-hidden border border-white/5">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="size-full object-cover opacity-30 lg:opacity-50"
                                src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4"
                            />
                        </div>
                    </div>
                </section>
                <section className="absolute bottom-0 left-0 right-0 pb-2">
                    <div className="group relative">
                        <div className="flex flex-col items-center md:flex-row">
                            <div className="relative py-6 w-full">
                                <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Backed by Science</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">HIPAA Compliant</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">GMP Certified</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">CAP/CLIA Lab Partners</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">Dual Liposomal-Micellar Delivery</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">10-28X Bioavailability</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">28-Peptide Product Data</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">SNP-Targeted Nutraceuticals</span>
                                    </div>
                                </InfiniteSlider>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
