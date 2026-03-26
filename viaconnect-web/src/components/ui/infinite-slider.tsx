'use client'
import React, { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface InfiniteSliderProps {
    children: React.ReactNode
    speed?: number
    speedOnHover?: number
    gap?: number
    className?: string
    direction?: 'horizontal' | 'vertical'
    reverse?: boolean
}

export function InfiniteSlider({
    children,
    speed = 40,
    speedOnHover,
    gap = 48,
    className,
    direction = 'horizontal',
    reverse = false,
}: InfiniteSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const scrollerRef = useRef<HTMLDivElement>(null)
    const [start, setStart] = useState(false)

    const addAnimation = useCallback(() => {
        if (containerRef.current && scrollerRef.current) {
            const scrollerContent = Array.from(scrollerRef.current.children)
            scrollerContent.forEach((item) => {
                const duplicatedItem = item.cloneNode(true)
                if (scrollerRef.current) {
                    scrollerRef.current.appendChild(duplicatedItem)
                }
            })
            setStart(true)
        }
    }, [])

    useEffect(() => {
        addAnimation()
    }, [addAnimation])

    const isHorizontal = direction === 'horizontal'
    const duration = `${speed}s`

    return (
        <div
            ref={containerRef}
            className={cn(
                'overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]',
                className
            )}
            style={{
                ...(speedOnHover
                    ? { ['--speed-on-hover' as string]: `${speedOnHover}s` }
                    : {}),
            }}
        >
            <div
                ref={scrollerRef}
                className={cn(
                    'flex w-max',
                    isHorizontal ? 'flex-row' : 'flex-col',
                    start && 'animate-infinite-scroll',
                    speedOnHover && 'hover:[animation-duration:var(--speed-on-hover)]'
                )}
                style={{
                    gap: `${gap}px`,
                    animationDuration: duration,
                    animationDirection: reverse ? 'reverse' : 'normal',
                }}
            >
                {children}
            </div>
            <style jsx>{`
                @keyframes infinite-scroll {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }
                .animate-infinite-scroll {
                    animation: infinite-scroll linear infinite;
                }
            `}</style>
        </div>
    )
}
