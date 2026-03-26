'use client'
import React from 'react'
import { cn } from '@/lib/utils'

interface ProgressiveBlurProps {
    className?: string
    direction?: 'left' | 'right' | 'top' | 'bottom'
    blurFrom?: number
    blurTo?: number
}

export function ProgressiveBlur({
    className,
    direction = 'right',
    blurFrom = 0,
    blurTo = 12,
}: ProgressiveBlurProps) {
    const gradientDirection = {
        left: 'to left',
        right: 'to right',
        top: 'to top',
        bottom: 'to bottom',
    }[direction]

    return (
        <div
            className={cn('pointer-events-none', className)}
            style={{
                maskImage: `linear-gradient(${gradientDirection}, transparent, black)`,
                WebkitMaskImage: `linear-gradient(${gradientDirection}, transparent, black)`,
                backdropFilter: `blur(${blurTo}px)`,
                WebkitBackdropFilter: `blur(${blurTo}px)`,
            }}
        />
    )
}
