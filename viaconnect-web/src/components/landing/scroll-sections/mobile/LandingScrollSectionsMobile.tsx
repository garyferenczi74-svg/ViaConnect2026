'use client'
import { FeaturesSectionMobile } from './FeaturesSectionMobile'
import { ProcessSectionMobile } from './ProcessSectionMobile'
import { GenomicsSectionMobile } from './GenomicsSectionMobile'
import { AboutSectionMobile } from './AboutSectionMobile'
import { PricingSection } from '../PricingSection'
import { FinalCTAMobile } from './FinalCTAMobile'

export function LandingScrollSectionsMobile() {
    return (
        <div className="relative z-10">
            <FeaturesSectionMobile />
            <ProcessSectionMobile />
            <GenomicsSectionMobile />
            <AboutSectionMobile />
            <PricingSection />
            <FinalCTAMobile />
        </div>
    )
}
