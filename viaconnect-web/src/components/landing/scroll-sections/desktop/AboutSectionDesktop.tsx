'use client'
import { motion } from 'framer-motion'
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

export function AboutSectionDesktop() {
    return (
        <SectionAnchor
            id={SECTION_IDS.about}
            ariaLabel="About ViaConnect"
            className="min-h-screen py-32 px-12"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-16"
                >
                    <p className="text-[#2DA5A0] uppercase tracking-[0.2em] text-sm mb-4 font-medium">
                        Who Is Behind This
                    </p>
                    <h2 className="text-white text-5xl font-light leading-tight mb-8 max-w-4xl">
                        Built by clinicians, engineers, and operators who refused to settle for generic.
                    </h2>
                    <p className="text-white/80 text-lg leading-relaxed max-w-4xl">
                        FarmCeutica Wellness LLC was founded by Gary Ferenczi, an entrepreneur with 30+ years of experience in construction and GMP facility development. After seeing his own family struggle with generic supplement protocols that ignored individual biology, Gary built ViaConnect to put precision biology into everyday wellness.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-5xl">
                    {TEAM.map((member, i) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-8"
                        >
                            <h3 className="text-white text-xl font-medium mb-1">{member.name}</h3>
                            <p className="text-[#2DA5A0] text-sm uppercase tracking-wider mb-4">{member.role}</p>
                            <p className="text-white/70 text-sm leading-relaxed">{member.bio}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-16 max-w-5xl"
                >
                    <p className="text-white/70 text-sm leading-relaxed">
                        Beyond our named scientific leadership, ViaConnect is supported by a broader leadership group spanning compliance and regulatory oversight, financial stewardship, and day-to-day operations. Each function is led by senior practitioners with multi-decade track records in their respective fields, working alongside the science team to keep the platform HIPAA-aware, financially disciplined, and operationally accountable to the people we serve.
                    </p>
                </motion.div>

                <motion.blockquote
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8 }}
                    className="border-l-2 border-[#B75E18] pl-8 max-w-4xl"
                >
                    <p className="text-white/90 text-2xl font-light leading-relaxed italic mb-3">
                        &ldquo;{TAGLINES.philosophy}&rdquo;
                    </p>
                    <p className="text-white/50 text-sm uppercase tracking-wider">FarmCeutica Wellness LLC</p>
                </motion.blockquote>
            </div>
        </SectionAnchor>
    )
}
