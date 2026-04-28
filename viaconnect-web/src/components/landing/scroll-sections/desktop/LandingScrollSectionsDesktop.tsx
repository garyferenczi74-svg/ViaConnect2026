'use client'
import { FeaturesSectionDesktop } from './FeaturesSectionDesktop'
import { ProcessSectionDesktop } from './ProcessSectionDesktop'
import { GenomicsSectionDesktop } from './GenomicsSectionDesktop'
import { AboutSectionDesktop } from './AboutSectionDesktop'
import { FinalCTADesktop } from './FinalCTADesktop'

export function LandingScrollSectionsDesktop() {
    return (
        <div className="relative z-10">
            <FeaturesSectionDesktop />
            <ProcessSectionDesktop />
            <GenomicsSectionDesktop />
            <AboutSectionDesktop />
            <FinalCTADesktop />
        </div>
    )
}
