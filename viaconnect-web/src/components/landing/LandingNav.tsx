'use client'
import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'
import { useScroll } from 'framer-motion'
import { useActiveSection } from './scroll-sections/shared/useActiveSection'
import { useSmoothScrollAnchor } from './scroll-sections/shared/useSmoothScrollAnchor'
import { NAV_ITEMS } from './scroll-sections/shared/sectionConstants'

// Landing nav. Lives at the page root (outside <main>) so position:fixed
// pins to the viewport unambiguously. Was previously HeroHeader inline
// inside HeroSection, but with <main className="relative overflow-x-clip">
// added for LandingHeroCarousel positioning, certain browsers may treat
// the relative ancestor as a containing block for fixed descendants.
// Mounting at the page root sidesteps that entirely.
const Logo = () => {
    return (
        <span className="text-xl font-bold tracking-tight">
            <span className="text-[#b75e18]">Via</span><span className="text-white">Connect</span>
        </span>
    )
}

export function LandingNav() {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)

    const { scrollY } = useScroll()

    const sectionIds = React.useMemo(() => NAV_ITEMS.map((n) => n.id), [])
    const activeId = useActiveSection(sectionIds)
    const scrollTo = useSmoothScrollAnchor()

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
                            <Link href="/" aria-label="home">
                                <Logo />
                            </Link>
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 flex items-center justify-center w-10 h-10 rounded-lg lg:hidden hover:bg-white/10 transition-colors">
                                <div aria-hidden="true" className="size-5 text-white">
                                    {menuState ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
                                </div>
                            </button>
                        </div>

                        <div className="bg-[#0d1225] group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end gap-6 rounded-3xl border border-white/5 p-6 shadow-2xl shadow-zinc-600/10 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:pr-4">
                                <ul className="flex flex-col gap-6 text-base lg:flex-row lg:gap-0 lg:text-sm">
                                    {NAV_ITEMS.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                href={`/#${item.id}`}
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    scrollTo(item.id)
                                                    setMenuState(false)
                                                }}
                                                aria-current={activeId === item.id ? 'location' : undefined}
                                                className={cn(
                                                    'text-slate-300 block duration-150 hover:text-white md:px-4 lg:text-sm text-left w-full lg:w-auto',
                                                    activeId === item.id && 'text-white border-b-2 border-[#B87333] pb-0.5'
                                                )}>
                                                <span>{item.label}</span>
                                            </Link>
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
