'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, ArrowDown } from 'lucide-react'
import { HeroPillars } from './HeroPillars'
import { HeroOverlayScrollWrapper } from './HeroOverlayScrollWrapper'

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
                    {/* Padding is a floor under the fixed bar. safe center only
                        uses leftover space, so a short viewport cannot pull the
                        headline up through the logo. The bottom pad clears the ticker. */}
                    <div className="relative flex-1 flex flex-col justify-start pt-[102px] pb-16 md:pt-[88px] md:pb-8 min-[1000px]:pt-[5.5rem] min-[1000px]:pb-[clamp(3.5rem,10vh,6rem)] min-[1000px]:[justify-content:safe_center]">
                        <HeroOverlayScrollWrapper>
                            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 min-[1000px]:items-stretch min-[1000px]:block min-[1000px]:px-12">
                                <div className="w-full mx-auto max-w-lg text-center md:max-w-none min-[1000px]:ml-0 min-[1000px]:text-left">
                                    <h1
                                        className="w-full max-w-full min-[1000px]:max-w-5xl mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-balance font-bold text-white leading-[1.08]"
                                        style={{ fontSize: 'clamp(1.75rem, min(5.5vw, 6.2vh), 4.5rem)' }}
                                    >
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
                                        <p
                                            className="mt-[clamp(0.45rem,1.6vh,1rem)] w-full max-w-full mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-slate-400 leading-relaxed text-balance min-[1000px]:whitespace-nowrap"
                                            style={{ fontSize: 'clamp(0.8rem, min(1.35vw, 2.1vh), 1rem)' }}
                                        >
                                            Precision health insights from your DNA, delivered through formulations engineered for your unique genome
                                        </p>
                                    )}
                                    <HeroPillars />
                                    {variantSubheadline ? (
                                        <p
                                            className="mt-[clamp(0.55rem,2vh,2.5rem)] w-full max-w-full min-[1000px]:max-w-2xl mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-balance text-slate-300 leading-snug"
                                            style={{ fontSize: 'clamp(0.9rem, min(1.5vw, 2.4vh), 1.125rem)' }}
                                        >
                                            {variantSubheadline}
                                        </p>
                                    ) : (
                                        <p
                                            className="mt-[clamp(0.55rem,2vh,2.5rem)] w-full max-w-full min-[1000px]:max-w-2xl mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-balance text-slate-300 leading-snug"
                                            style={{ fontSize: 'clamp(0.9rem, min(1.5vw, 2.4vh), 1.125rem)' }}
                                        >
                                            One Genome  One Formulation  One Life at a Time
                                        </p>
                                    )}
                                    <div className="mt-[clamp(0.55rem,2vh,2.5rem)] w-full flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-[clamp(0.5rem,1.5vh,1rem)] min-[1000px]:justify-start">
                                        <Link
                                            href={variantCtaHref ?? "/signup"}
                                            className="inline-flex h-14 sm:h-12 min-[1000px]:h-[clamp(2.4rem,6vh,3rem)] w-full sm:w-auto items-center justify-center rounded-full bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 pl-6 pr-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60 hover:shadow-[0_0_30px_rgba(183,94,24,0.6)]">
                                            <span>{variantCtaLabel ?? "Your Journey Starts Here"}</span>
                                            <ChevronRight strokeWidth={1.5} className="ml-1" />
                                        </Link>
                                        <Link
                                            href="/login"
                                            className="order-2 sm:order-1 inline-flex h-14 sm:h-12 min-[1000px]:h-[clamp(2.4rem,6vh,3rem)] w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-6 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                            <span>Sign In</span>
                                        </Link>
                                        <Link
                                            href="/practitioners"
                                            className="order-1 sm:order-2 inline-flex h-14 sm:h-12 min-[1000px]:h-[clamp(2.4rem,6vh,3rem)] w-full sm:w-auto items-center justify-center rounded-full bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 px-6 text-base font-semibold text-white shadow-[0_0_20px_rgba(45,165,160,0.4)] transition-all duration-300 hover:bg-[#2DA5A0]/50 hover:border-[#2DA5A0]/60 hover:shadow-[0_0_30px_rgba(45,165,160,0.6)]">
                                            <span>I am a Practitioner or Naturopath</span>
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
                                className="size-full object-cover opacity-30 min-[1000px]:opacity-50"
                                src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Assets/DNA%20HD.mp4"
                            />
                        </div>
                    </div>
                </section>
            </div>
    )
}
