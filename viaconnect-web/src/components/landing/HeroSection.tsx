'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, ArrowDown } from 'lucide-react'
import { HeroOverlayScrollWrapper } from './HeroOverlayScrollWrapper'

// Brief 45: first screen is one consumer job + CAQ start, not a feature grid.
// Practitioner / Naturopath stays on the existing clinician waitlist
// path below the fold (Final CTA), never in the hero.
export const HOME_CONSUMER_JOB = 'CAQ → protocol → Bio Optimization Score'
export const HOME_CAQ_CTA_LABEL = 'Start the CAQ'
export const HOME_CAQ_CTA_HREF = '/signup'

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
    // iOS Safari pauses background videos in several scenarios that the
    // bare <video autoPlay loop muted playsInline> attributes don't cover:
    // Low Power Mode, scrolled-out-of-viewport, tab backgrounding, system
    // overlays, ringtone interruption. Listen for the pause event and
    // visibility change and re-issue play() so the hero DNA loop never
    // stalls. play() returns a Promise that may reject if the browser
    // refuses (Low Power Mode); swallow that case silently and let the
    // next visibility change try again.
    const videoRef = useRef<HTMLVideoElement>(null)
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

        function tryPlay() {
            if (!video) return
            // Honor prefers-reduced-motion: skip play attempts when set, so the
            // iOS pause/visibility/focus retry chain never re-starts the video.
            if (mql.matches) return
            const promise = video.play()
            if (promise !== undefined) {
                promise.catch(() => { /* iOS may refuse; retry on next event */ })
            }
        }

        function handlePause() { tryPlay() }
        function handleVisibility() {
            if (document.visibilityState === 'visible') tryPlay()
        }
        function handleFocus() { tryPlay() }
        function handleReducedMotionChange() {
            if (!video) return
            if (mql.matches) {
                video.pause()
            } else {
                tryPlay()
            }
        }

        if (mql.matches) {
            video.pause()
        } else {
            tryPlay()
        }
        video.addEventListener('pause', handlePause)
        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('focus', handleFocus)
        mql.addEventListener('change', handleReducedMotionChange)
        return () => {
            video.removeEventListener('pause', handlePause)
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('focus', handleFocus)
            mql.removeEventListener('change', handleReducedMotionChange)
        }
    }, [])

    return (
        <div className="flex min-h-[100svh] flex-col relative">
                <div className="fixed inset-0 bg-gradient-to-b from-[#0d1225] to-[#141c35] -z-10" />
                <div className="fixed top-0 right-0 w-[55vw] h-[55vh] bg-[radial-gradient(ellipse_at_top_right,rgba(120,60,180,0.12),transparent_65%)] pointer-events-none -z-10" />
                <section className="relative flex-1 flex flex-col">
                    <div className="relative flex-1 pt-[102px] pb-[80px] md:pt-0 md:pb-0 md:flex md:flex-col md:justify-center">
                        <HeroOverlayScrollWrapper>
                            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 lg:items-stretch lg:block lg:px-12">
                                <div className="w-full mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                                    <h1
                                        data-testid="home-hero-job"
                                        className="w-full max-w-full lg:max-w-5xl mx-auto lg:mx-0 text-center lg:text-left text-balance text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1]"
                                    >
                                        {variantHeadline ? (
                                            <span className="block">{variantHeadline}</span>
                                        ) : (
                                            <span className="block">
                                                {HOME_CONSUMER_JOB}
                                            </span>
                                        )}
                                    </h1>
                                    <p className="mt-6 sm:mt-10 w-full max-w-full lg:max-w-2xl mx-auto lg:mx-0 text-center lg:text-left text-balance text-base sm:text-lg text-slate-300 leading-relaxed">
                                        {variantSubheadline ?? 'Start the Clinical Assessment Questionnaire to receive your protocol and Bio Optimization Score.'}
                                    </p>
                                    <div className="mt-6 sm:mt-10 w-full flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row lg:justify-start">
                                        <Link
                                            href={variantCtaHref ?? HOME_CAQ_CTA_HREF}
                                            data-testid="home-hero-caq-cta"
                                            className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center rounded-full bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 pl-6 pr-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60 hover:shadow-[0_0_30px_rgba(183,94,24,0.6)]">
                                            <span>{variantCtaLabel ?? HOME_CAQ_CTA_LABEL}</span>
                                            <ChevronRight strokeWidth={1.5} className="ml-1" />
                                        </Link>
                                        <Link
                                            href="/login"
                                            className="inline-flex h-14 sm:h-12 w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-6 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                            <span>Sign In</span>
                                        </Link>
                                    </div>
                                    <div className="mt-3 sm:hidden flex justify-center" aria-hidden="true">
                                        <ArrowDown className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>
                        </HeroOverlayScrollWrapper>
                        <div className="absolute inset-0 overflow-hidden border border-white/5">
                            {/* TODO: a poster gives an instant first frame while the 15MB hero
                                buffers, but only wire poster="/images/hero-poster.jpg" AFTER the
                                asset exists in public/images/ (an absent poster makes the browser
                                request a 404). Generate it once via ffmpeg:
                                ffmpeg -i "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA HD.mp4" -ss 00:00:01 -frames:v 1 -q:v 2 public/images/hero-poster.jpg */}
                            <video
                                ref={videoRef}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                disablePictureInPicture
                                className="size-full object-cover opacity-30 lg:opacity-50"
                                src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4"
                            />
                        </div>
                    </div>
                </section>
            </div>
    )
}
