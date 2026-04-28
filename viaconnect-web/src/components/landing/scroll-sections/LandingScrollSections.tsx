'use client'
import { LandingScrollSectionsDesktop } from './desktop/LandingScrollSectionsDesktop'
import { LandingScrollSectionsMobile } from './mobile/LandingScrollSectionsMobile'

// CSS-class viewport branching (Path X). Both trees ship in bundle; SSR
// renders both, the unused tree is hidden via Tailwind responsive utilities.
// Performance budget per Jeffery Pass 2: 45 KB gzipped for this subtree;
// switch to next/dynamic ssr:false (Path Y) if exceeded. Gary's one-time
// override of the desktop/mobile-synchronism rule applies here only.
export function LandingScrollSections() {
    if (process.env.NODE_ENV === 'development') {
        if (typeof window !== 'undefined') {
            console.log('[LandingScrollSections] CSS-class viewport branching active')
        }
    }
    return (
        <>
            <div className="hidden lg:block">
                <LandingScrollSectionsDesktop />
            </div>
            <div className="block lg:hidden">
                <LandingScrollSectionsMobile />
            </div>
        </>
    )
}
