'use client'
import { FeaturesSectionMobile } from './FeaturesSectionMobile'
import { ProcessSectionMobile } from './ProcessSectionMobile'
import { GenomicsSectionMobile } from './GenomicsSectionMobile'
import { AboutSectionMobile } from './AboutSectionMobile'
import { FinalCTAMobile } from './FinalCTAMobile'

export function LandingScrollSectionsMobile() {
    return (
        <div className="relative z-10">
            <FeaturesSectionMobile />
            <ProcessSectionMobile />
            <GenomicsSectionMobile />
            <AboutSectionMobile />
            <FinalCTAMobile />
        </div>
    )
}
