'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight, ArrowDown } from 'lucide-react'
import { HeroPillars } from './HeroPillars'
import { HeroOverlayScrollWrapper } from './HeroOverlayScrollWrapper'
import { LandingHeroCarousel } from './LandingHeroCarousel'

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
        <div className="hero-screen flex min-h-[100svh] flex-col relative">
                <style>{`
                  /* Heading stays 1.2x the description at every height:
                     14.4/12, 1.8/1.5, and 16.8/14. Mobile and desktop share it. */
                  .pillar-title {
                    font-size: clamp(14.4px, 1.8vh, 16.8px) !important;
                    line-height: 1.25 !important;
                    margin-bottom: clamp(2px, 0.35vh, 6px) !important;
                  }
                  .pillar-body {
                    font-size: clamp(12px, 1.5vh, 14px) !important;
                    line-height: 1.28 !important;
                  }
                  .pillar-inner {
                    min-height: 0 !important;
                    padding: clamp(5px, 1.15vh, 12px) clamp(10px, 1.1vw, 16px) !important;
                  }
                  .pillar-numeral {
                    top: 8px !important;
                    right: 14px !important;
                    font-size: clamp(2.25rem, 7vh, 3.75rem) !important;
                  }
                  @media (min-width: 1000px) {
                    .hero-screen,
                    .hero-fold {
                      box-sizing: border-box !important;
                      height: 100svh;
                      height: min(100svh, 100dvh) !important;
                      min-height: 0 !important;
                      max-height: min(100svh, 100dvh) !important;
                      overflow: hidden !important;
                    }
                    .hero-headline {
                      font-size: clamp(1.75rem, min(5.5vw, 8vh), 4.5rem) !important;
                      line-height: 1.05 !important;
                      letter-spacing: -0.02em;
                    }
                    .hero-subtitle,
                    .hero-tagline {
                      line-height: 1.25 !important;
                    }
                    .hero-subtitle {
                      font-size: clamp(0.75rem, 1.78vh, 1rem) !important;
                      margin-top: clamp(12px, 4.4vh, 32px) !important;
                    }
                    /* Cards, tagline, and buttons keep the same vh gap.
                       Fixed basis so the two sides of the tagline cannot drift. */
                    [data-testid="hero-pillars-desktop-grid"] {
                      margin-top: 0 !important;
                      margin-bottom: 0 !important;
                    }
                    .hero-flex-spacer {
                      flex: 1 1 0px;
                      min-height: 0;
                    }
                    .hero-bottom-block {
                      display: contents;
                    }
                    .hero-equal-spacer {
                      flex: 0 0 clamp(28px, 5.6vh, 56px);
                      height: clamp(28px, 5.6vh, 56px);
                      min-height: clamp(28px, 5.6vh, 56px);
                    }
                    [data-testid="hero-ctas"] {
                      margin-top: 0 !important;
                    }
                    [data-testid="hero-ticker"] {
                      margin-top: clamp(16px, 3.2vh, 20px) !important;
                    }
                    [data-testid="hero-ctas"] a {
                      height: clamp(1.75rem, calc(2.6vh + 11px), 2.375rem) !important;
                      padding-left: clamp(16px, 1.6vw, 22px) !important;
                      padding-right: clamp(16px, 1.6vw, 22px) !important;
                      font-size: clamp(13px, 1.45vh, 14.5px) !important;
                    }
                    [data-testid="hero-ctas"] a:first-child {
                      padding-right: clamp(12px, 1.15vw, 16px) !important;
                    }
                    .pillar-numeral {
                      top: clamp(8px, 1vh, 12px) !important;
                      right: clamp(12px, 1.1vw, 18px) !important;
                      font-size: clamp(1.25rem, min(4.2vw, 5.4vh), 4.25rem) !important;
                    }
                  }
                  /* Desktop only. 1007px laptops, tablets, and phones stay
                     on the rules above. Scoped to the hero so Process cards
                     are not affected. */
                  @media (min-width: 1200px) {
                    .hero-screen .hero-headline {
                      font-size: clamp(2.15rem, min(6vw, 9vh), 5rem) !important;
                    }
                    .hero-screen .hero-subtitle {
                      font-size: clamp(0.95rem, 2vh, 1.2rem) !important;
                    }
                    .hero-screen .hero-tagline {
                      font-size: clamp(1rem, 2.15vh, 1.4rem) !important;
                    }
                    .hero-screen .hero-flex-spacer {
                      flex: 0.35 1 0px;
                      max-height: clamp(28px, 9vh, 120px);
                    }
                    .hero-screen [data-testid="hero-pillars-desktop-grid"] {
                      flex: 1 1 auto;
                      min-height: 0;
                      align-items: stretch;
                    }
                    .hero-screen .pillar-card,
                    .hero-screen .pillar-inner {
                      height: 100%;
                    }
                    .hero-screen .pillar-inner {
                      min-height: clamp(128px, 20vh, 240px) !important;
                      padding: clamp(14px, 1.8vh, 24px) clamp(16px, 1.3vw, 28px) !important;
                    }
                    .hero-screen .pillar-eyebrow {
                      font-size: clamp(0.72rem, 1.35vh, 0.85rem) !important;
                    }
                    .hero-screen .pillar-title {
                      font-size: clamp(16px, 2.2vh, 22px) !important;
                    }
                    .hero-screen .pillar-body {
                      font-size: clamp(13.33px, 1.833vh, 18.33px) !important;
                    }
                    .hero-screen .pillar-numeral {
                      font-size: clamp(2.75rem, min(4.6vw, 7vh), 5.25rem) !important;
                    }
                    .hero-screen .hero-equal-spacer {
                      flex-basis: clamp(28px, 4.6vh, 64px);
                      height: clamp(28px, 4.6vh, 64px);
                      min-height: clamp(28px, 4.6vh, 64px);
                    }
                    .hero-screen [data-testid="hero-ctas"] a {
                      height: clamp(2.25rem, calc(2.6vh + 16px), 3.25rem) !important;
                      padding-left: clamp(18px, 1.5vw, 28px) !important;
                      padding-right: clamp(18px, 1.5vw, 28px) !important;
                      font-size: clamp(15px, 1.7vh, 18px) !important;
                    }
                    .hero-screen [data-testid="hero-ctas"] svg {
                      width: 20px !important;
                      height: 20px !important;
                    }
                  }
                `}</style>
                <div className="fixed inset-0 bg-gradient-to-b from-[#0d1225] to-[#141c35] -z-10" />
                <div className="fixed top-0 right-0 w-[55vw] h-[55vh] bg-[radial-gradient(ellipse_at_top_right,rgba(120,60,180,0.12),transparent_65%)] pointer-events-none -z-10" />
                <section className="relative flex min-h-0 flex-1 flex-col min-[1000px]:overflow-hidden">
                    {/* Pad is the measured header plus a gap. The column is
                        exactly one screen so the ticker stays in the viewport. */}
                    <div
                        className="hero-fold relative box-border flex min-h-0 flex-1 flex-col"
                        style={{ paddingTop: 'calc(var(--landing-nav-h, 4.75rem) + clamp(8px, calc(1.8vh - 2px), 1.25rem))' }}
                    >
                        <HeroOverlayScrollWrapper>
                            <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-6 min-[1000px]:h-full min-[1000px]:min-h-0 min-[1000px]:flex-1 min-[1000px]:items-stretch min-[1000px]:gap-0 min-[1000px]:px-12">
                                <div className="w-full mx-auto max-w-lg text-center md:max-w-none min-[1000px]:contents min-[1000px]:ml-0 min-[1000px]:text-left">
                                    <div aria-hidden="true" className="hero-flex-spacer hidden min-[1000px]:block" />
                                    <h1
                                        data-testid="hero-headline"
                                        className="hero-headline w-full max-w-full shrink-0 min-[1000px]:max-w-5xl mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-balance font-bold text-white leading-[1.08]"
                                        style={{ fontSize: 'clamp(1.5rem, min(4.5vw, 5vh), 4rem)' }}
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
                                            className="hero-subtitle mt-[clamp(0.45rem,1.6vh,1rem)] w-full max-w-full shrink-0 mx-auto min-[1000px]:mx-0 min-[1000px]:mt-0 text-center min-[1000px]:text-left text-slate-400 text-balance min-[1000px]:whitespace-nowrap"
                                            style={{ fontSize: 'clamp(0.8rem, min(1.35vw, 2.1vh), 1rem)' }}
                                        >
                                            Precision health insights from your DNA, delivered through formulations engineered for your unique genome
                                        </p>
                                    )}
                                    <div aria-hidden="true" className="hero-equal-spacer hidden min-[1000px]:block" />
                                    <HeroPillars />
                                    <div className="hero-bottom-block w-full shrink-0">
                                    <div aria-hidden="true" className="hero-equal-spacer hidden min-[1000px]:block" />
                                    {variantSubheadline ? (
                                        <p
                                            className="mt-[clamp(0.4rem,1.4vh,1.25rem)] w-full max-w-full min-[1000px]:mt-0 min-[1000px]:max-w-2xl mx-auto min-[1000px]:mx-0 text-center min-[1000px]:text-left text-balance text-slate-300 leading-snug"
                                            style={{ fontSize: 'clamp(0.85rem, min(1.3vw, 2vh), 1.05rem)' }}
                                        >
                                            {variantSubheadline}
                                        </p>
                                    ) : (
                                        <p
                                            data-testid="hero-tagline"
                                            className="hero-tagline mt-[clamp(0.55rem,2vh,1rem)] w-full max-w-full shrink-0 mx-auto min-[1000px]:mx-0 min-[1000px]:mt-0 text-center min-[1000px]:text-left text-balance text-slate-300"
                                            style={{ fontSize: 'clamp(0.8rem, min(1.2vw, 1.8vh), 1rem)' }}
                                        >
                                            One Genome  One Formulation  One Life at a Time
                                        </p>
                                    )}
                                    <div aria-hidden="true" className="hero-equal-spacer hidden min-[1000px]:block" />
                                    <div data-testid="hero-ctas" className="mt-[clamp(2.25rem,3vh,2.5rem)] w-full shrink-0 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-[clamp(0.5rem,1.2vh,1rem)] min-[1000px]:justify-start">
                                        <Link
                                            href={variantCtaHref ?? "/signup"}
                                            className="inline-flex h-11 min-[1000px]:h-[clamp(1.75rem,calc(2.6vh+11px),2.375rem)] w-full sm:w-auto items-center justify-center rounded-full bg-[#b75e18]/30 backdrop-blur-xl border border-[#b75e18]/40 pl-5 pr-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#b75e18]/50 hover:border-[#b75e18]/60 hover:shadow-[0_0_30px_rgba(183,94,24,0.6)]">
                                            <span>{variantCtaLabel ?? "Your Journey Starts Here"}</span>
                                            <ChevronRight strokeWidth={1.5} className="ml-1 h-[18px] w-[18px]" />
                                        </Link>
                                        <Link
                                            href="/login"
                                            className="order-2 sm:order-1 inline-flex h-11 min-[1000px]:h-[clamp(1.75rem,calc(2.6vh+11px),2.375rem)] w-full sm:w-auto items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10">
                                            <span>Sign In</span>
                                        </Link>
                                        <Link
                                            href="/practitioners"
                                            className="order-1 sm:order-2 inline-flex h-11 min-[1000px]:h-[clamp(1.75rem,calc(2.6vh+11px),2.375rem)] w-full sm:w-auto items-center justify-center rounded-full bg-[#2DA5A0]/30 backdrop-blur-xl border border-[#2DA5A0]/40 px-5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(45,165,160,0.4)] transition-all duration-300 hover:bg-[#2DA5A0]/50 hover:border-[#2DA5A0]/60 hover:shadow-[0_0_30px_rgba(45,165,160,0.6)]">
                                            <span>I am a Practitioner or Naturopath</span>
                                        </Link>
                                    </div>
                                    <div className="mt-3 sm:hidden flex justify-center" aria-hidden="true">
                                        <ArrowDown className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </HeroOverlayScrollWrapper>
                        <LandingHeroCarousel />
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
