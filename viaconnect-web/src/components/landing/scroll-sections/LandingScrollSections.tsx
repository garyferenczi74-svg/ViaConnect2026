'use client'
import { LandingScrollSectionsDesktop } from './desktop/LandingScrollSectionsDesktop'

// Brief 45: one compose tree so page source has one of each major block.
// Desktop sections are responsive (mobile + desktop) — do not mount a
// second hidden mobile tree. Standing rule: both viewports still work.
export function LandingScrollSections() {
    if (process.env.NODE_ENV === 'development') {
        if (typeof window !== 'undefined') {
            console.log('[LandingScrollSections] single compose tree')
        }
    }
    return <LandingScrollSectionsDesktop />
}
