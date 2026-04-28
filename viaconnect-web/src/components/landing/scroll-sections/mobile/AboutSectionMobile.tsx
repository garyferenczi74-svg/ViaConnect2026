'use client'
import { motion } from 'framer-motion'
import { MapPin, BadgeCheck, Building, Hammer } from 'lucide-react'
import { SectionAnchor } from '../shared/SectionAnchor'
import { SECTION_IDS, TAGLINES } from '../shared/sectionConstants'

const TEAM = [
    {
        name: 'Dr. Fadi Dagher',
        role: 'Medical Director',
        bio: "Clinical oversight, regulatory pathway, practitioner education. Brings decades of medical and institutional relationships to FarmCeutica's clinical strategy.",
    },
    {
        name: 'Thomas Rosengren',
        role: 'CTO',
        bio: 'Architects the unified data ecosystem connecting the assessment, genomics, labs, and analytics layers. Drives the engineering roadmap.',
    },
]

const TRUST_ITEMS = [
    { icon: MapPin, label: 'Buffalo, NY' },
    { icon: BadgeCheck, label: 'GMP Compliant' },
    { icon: Building, label: 'Cedarland Facility Owned' },
    { icon: Hammer, label: '30+ Years Construction and GMP' },
]

export function AboutSectionMobile() {
    return (
        <SectionAnchor
            id={SECTION_IDS.about}
            ariaLabel="About ViaConnect"
            className="min-h-screen py-20 px-5"
        >
            <div className="max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="mb-10"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-xs mb-3 font-medium">
                        Who Is Behind This
                    </p>
                    <h2 className="text-white text-3xl font-light leading-tight mb-6">
                        Built by clinicians, engineers, and operators who refused to settle for generic.
                    </h2>
                    <p className="text-white/80 text-base leading-relaxed">
                        FarmCeutica Wellness LLC was founded by Gary Ferenczi, an entrepreneur with 30+ years of experience in construction and GMP facility development. After seeing his own family struggle with generic supplement protocols that ignored individual biology, Gary built ViaConnect to put precision biology into everyday wellness.
                    </p>
                </motion.div>

                <div className="space-y-4 mb-10">
                    {TEAM.map((member, i) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.4, delay: i * 0.08 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-6"
                        >
                            <h3 className="text-white text-lg font-medium mb-1">{member.name}</h3>
                            <p className="text-[#2DA5A0] text-xs uppercase tracking-wider mb-3">{member.role}</p>
                            <p className="text-white/70 text-sm leading-relaxed">{member.bio}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-10">
                    <p className="text-white/70 text-sm leading-relaxed">
                        Beyond our named scientific leadership, ViaConnect is supported by a broader leadership group spanning compliance and regulatory oversight, financial stewardship, and day-to-day operations. Each function is led by senior practitioners with multi-decade track records in their respective fields, working alongside the science team to keep the platform HIPAA-aware, financially disciplined, and operationally accountable to the people we serve.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    {TRUST_ITEMS.map((item) => {
                        const Icon = item.icon
                        return (
                            <div key={item.label} className="flex items-start gap-2">
                                <Icon strokeWidth={1.5} className="w-5 h-5 text-[#2DA5A0] flex-shrink-0 mt-0.5" />
                                <p className="text-white/80 text-xs font-medium leading-snug">{item.label}</p>
                            </div>
                        )
                    })}
                </div>

                <blockquote className="border-l-2 border-[#B75E18] pl-5">
                    <p className="text-white/90 text-lg font-light leading-relaxed italic mb-2">
                        &ldquo;{TAGLINES.philosophy}&rdquo;
                    </p>
                    <p className="text-white/50 text-xs uppercase tracking-wider">FarmCeutica Wellness LLC</p>
                </blockquote>
            </div>
        </SectionAnchor>
    )
}
