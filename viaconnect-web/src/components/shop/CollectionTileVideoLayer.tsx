/**
 * CollectionTileVideoLayer renders a muted, looping, autoplay video behind
 * a single bento tile per Prompt #143 §5.1. Sits absolute-positioned at
 * z-1 inside the parent <CollectionTile> so the existing static background,
 * glass overlay, and category text continue to render at z-0, z-2, z-3.
 *
 * Returns null when:
 *   - videoUrl is falsy (no asset assigned; tile renders static-only)
 *   - prefers-reduced-motion: reduce is set (a11y opt-out per §4.3)
 *   - effective network type is 2g/3g/slow-2g (§4.2)
 *   - saveData is true (§4.2)
 *
 * Lazy loads via IntersectionObserver per §4.1: the <source> elements
 * are NOT rendered until the tile enters the viewport with a 200px
 * leading rootMargin. On exit (with 400px trailing rootMargin to absorb
 * brief scroll-by) the video pauses but keeps its source so re-entry is
 * instant. The 500ms opacity fade prevents pop-in.
 *
 * No audio toggle button by design (§5.3). No hover-trigger behavior;
 * playback is purely viewport-driven (§5.4).
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useInViewport, useVideoBudget } from '@/lib/shop/useVideoBudget'
import { buildWebmUrlFromMp4, isPlayableVideoUrl } from '@/lib/shop/videoUrlHelpers'

interface CollectionTileVideoLayerProps {
    videoUrl: string | null | undefined
    posterUrl?: string | null
}

export function CollectionTileVideoLayer({
    videoUrl,
    posterUrl,
}: CollectionTileVideoLayerProps) {
    const budgetAllowed = useVideoBudget()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const inView = useInViewport(containerRef)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)
    const [isPlaying, setIsPlaying] = useState<boolean>(false)

    useEffect(() => {
        const video = videoRef.current
        if (!video || !budgetAllowed || !isPlayableVideoUrl(videoUrl)) return

        if (inView && !hasLoaded) {
            video.load()
            const onLoaded = () => {
                setHasLoaded(true)
                video.play().then(() => setIsPlaying(true)).catch(() => {
                    // Autoplay rejected; keep static fallback. Static bg remains visible
                })
            }
            video.addEventListener('loadeddata', onLoaded, { once: true })
            return () => video.removeEventListener('loadeddata', onLoaded)
        }

        if (inView && hasLoaded) {
            video.play().then(() => setIsPlaying(true)).catch(() => undefined)
        } else if (!inView && hasLoaded) {
            video.pause()
            setIsPlaying(false)
        }
    }, [budgetAllowed, inView, hasLoaded, videoUrl])

    if (!isPlayableVideoUrl(videoUrl)) return null
    if (!budgetAllowed) return null

    const webmUrl = buildWebmUrlFromMp4(videoUrl)
    const showWebmFirst = videoUrl.toLowerCase().endsWith('.webm')

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
        >
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                poster={posterUrl ?? undefined}
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                    isPlaying ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {inView ? (
                    showWebmFirst ? (
                        <>
                            <source src={videoUrl} type="video/webm" />
                            <source src={buildWebmUrlFromMp4(videoUrl)} type="video/mp4" />
                        </>
                    ) : (
                        <>
                            <source src={webmUrl} type="video/webm" />
                            <source src={videoUrl} type="video/mp4" />
                        </>
                    )
                ) : null}
            </video>
        </div>
    )
}
