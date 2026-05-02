/**
 * CollectionTileVideoLayer renders a muted, looping, autoplay video behind
 * a single bento tile per Prompt #143 §5.1. Sits absolute-positioned at
 * z-1 inside the parent <CollectionTile> so the existing static background,
 * glass overlay, and category text continue to render at z-0, z-2, z-3.
 *
 * Returns null when:
 *   - videoUrl is falsy or not a playable extension (no asset assigned)
 *
 * The budget gates (prefers-reduced-motion, slow network, saveData per
 * §4.2 and §4.3) are evaluated client-side. When any gate trips, the
 * <video> element is not rendered and the container div stays empty.
 * The container div is always rendered (when videoUrl is playable) so
 * the IntersectionObserver in useInViewport attaches reliably regardless
 * of the budget state, and the budget can flip true after mount without
 * losing the observer registration.
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
    const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const inView = useInViewport(containerRef)
    const [hasLoaded, setHasLoaded] = useState<boolean>(false)
    const [isPlaying, setIsPlaying] = useState<boolean>(false)

    const setRef = (node: HTMLDivElement | null) => {
        containerRef.current = node
        setContainerNode(node)
    }

    useEffect(() => {
        const video = videoRef.current
        if (!video || !budgetAllowed || !isPlayableVideoUrl(videoUrl)) return

        if (inView && !hasLoaded) {
            video.load()
            const onLoaded = () => {
                setHasLoaded(true)
                video.play().then(() => setIsPlaying(true)).catch(() => {
                    // Autoplay rejected; static bg remains visible
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
    }, [budgetAllowed, inView, hasLoaded, videoUrl, containerNode])

    if (!isPlayableVideoUrl(videoUrl)) return null

    const webmUrl = buildWebmUrlFromMp4(videoUrl)
    const showWebmFirst = videoUrl.toLowerCase().endsWith('.webm')
    const renderVideo = budgetAllowed

    return (
        <div
            ref={setRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[1]"
        >
            {renderVideo ? (
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
            ) : null}
        </div>
    )
}
