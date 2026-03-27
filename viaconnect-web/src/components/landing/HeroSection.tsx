'use client'
import React from 'react'
import Link from 'next/link'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useScroll, motion } from 'framer-motion'

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Genomics', href: '#genomics' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
]

const Logo = ({ className }: { className?: string }) => {
    return (
        <span className={cn('text-xl font-bold tracking-tight', className)}>
            <span className="text-[#b75e18]">Via</span><span className="text-white">Connect</span>
        </span>
    )
}

function HeroHeader() {
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
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-[#0d1225]/80 max-w-4xl rounded-3xl border border-white/5 backdrop-blur-2xl lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 md:gap-0 md:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link href="/" aria-label="home">
                                <Logo />
                            </Link>
                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -mr-6 block p-6 lg:hidden">
                                <div aria-hidden="true" className="m-auto size-6 text-white">
                                    {menuState ? <X /> : <Menu />}
                                </div>
                            </button>
                        </div>

                        <div className="bg-[#0d1225] group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end gap-6 rounded-3xl border border-white/5 p-6 shadow-2xl shadow-zinc-600/10 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:pr-4">
                                <ul className="flex flex-col gap-6 text-base lg:flex-row lg:gap-0 lg:text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-slate-300 block duration-150 hover:text-white md:px-4 lg:text-sm">
                                                <span>{item.name}</span>
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
                                    className="inline-flex items-center justify-center rounded-md border-0 bg-[#b75e18] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#d4741f]">
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

export function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-x-hidden">
                <div className="fixed inset-0 bg-gradient-to-b from-[#0d1225] to-[#141c35] -z-10" />
                <div className="fixed top-0 right-0 w-[55vw] h-[55vh] bg-[radial-gradient(ellipse_at_top_right,rgba(120,60,180,0.12),transparent_65%)] pointer-events-none -z-10" />
                <section className="relative">
                    <div className="relative py-24 md:pb-32 lg:pb-36 lg:pt-72">
                        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                                <h1 className="mt-8 max-w-2xl text-balance text-5xl md:text-6xl lg:mt-16 xl:text-7xl font-bold text-white">
                                    Precision Health<br className="hidden sm:block" /> Powered by Your DNA
                                </h1>
                                <p className="mt-8 max-w-2xl text-balance text-lg text-slate-300">
                                    One Genome  One Formulation  One Life at a Time
                                </p>
                                <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                                    <Link
                                        href="/signup"
                                        className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full bg-[#b75e18] pl-5 pr-3 text-base font-medium text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#d4741f] hover:shadow-[0_0_30px_rgba(183,94,24,0.6)]">
                                        <span className="text-nowrap">Your Journey Starts Here</span>
                                        <ChevronRight className="ml-1" />
                                    </Link>
                                    <Link
                                        href="/genex360"
                                        className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-5 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                        <span className="text-nowrap">Explore GeneX360</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="absolute inset-0 overflow-hidden rounded-3xl border border-white/5 lg:rounded-[3rem]">
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
                <section className="bg-[#0d1225] pb-2">
                    <div className="group relative m-auto max-w-7xl px-6">
                        <div className="flex flex-col items-center md:flex-row">
                            <div className="md:max-w-44 md:border-r md:border-white/10 md:pr-6">
                                <p className="text-end text-sm text-slate-400">Backed by science</p>
                            </div>
                            <div className="relative py-6 md:w-[calc(100%-11rem)]">
                                <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
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
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">10-27x Bioavailability</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">27-Product Peptide Portfolio</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="text-sm font-semibold tracking-wider uppercase whitespace-nowrap">SNP-Targeted Nutraceuticals</span>
                                    </div>
                                </InfiniteSlider>
                                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0d1225] to-transparent" />
                                <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[#0d1225] to-transparent" />
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
