'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Microscope, ShieldCheck, CircleCheckBig } from 'lucide-react';
import { GlassCard } from '@/components/helix/GlassCard';
import { HelixIcon } from '@/components/helix/HelixIcon';
import { ResearchToggle } from '@/components/helix/ResearchToggle';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const RESEARCH_TOGGLES = [
  { id: 'supplement', label: 'Supplement Adherence Data', description: 'Share your daily supplement completion and timing data', defaultOn: true },
  { id: 'biomarker',  label: 'Biomarker Trends',         description: 'Share bloodwork and biomarker changes over time', defaultOn: true },
  { id: 'lifestyle',  label: 'Lifestyle Metrics',        description: 'Share steps, sleep quality, and activity patterns', defaultOn: false },
  { id: 'genomic',    label: 'Genomic Outcome Correlation', description: 'Share anonymized genetic health outcome correlations', defaultOn: false },
];

const HOW_IT_HELPS = [
  { num: '01', text: 'Identifies which supplement protocols produce the best biomarker improvements' },
  { num: '02', text: 'Helps researchers understand lifestyle factors that accelerate health outcomes' },
  { num: '03', text: 'Enables personalized recommendations based on aggregate population data' },
  { num: '04', text: 'Contributes to peer-reviewed studies advancing precision wellness science' },
];

const PRIVACY_ITEMS = [
  'All data is HIPAA-compliant and encrypted end-to-end',
  'Your identity is never attached to shared data — fully anonymized',
  'You can withdraw consent at any time with complete data deletion',
  'Data is never sold to third parties or used for advertising',
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchPage() {
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    RESEARCH_TOGGLES.forEach((t) => { initial[t.id] = t.defaultOn; });
    return initial;
  });

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card — Research Consent */}
        <GlassCard glow>
          {/* Security badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2DA5A0]/10 border border-[#2DA5A0]/20 mb-5">
            <ShieldCheck size={12} strokeWidth={1.5} className="text-[#2DA5A0]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DA5A0]">
              100% Anonymous & Encrypted
            </span>
          </div>

          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-[#B75E18] mb-2">
            <Microscope size={20} strokeWidth={1.5} className="text-[#B75E18]" />
            Share for Science
          </h2>
          <p className="text-[13px] text-white/40 leading-relaxed mb-6">
            Opt in to share anonymized health data with researchers. Your contributions
            help advance precision wellness science while earning you monthly Helix rewards.
          </p>

          {/* Toggle switches */}
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {RESEARCH_TOGGLES.map((toggle) => (
              <ResearchToggle
                key={toggle.id}
                label={toggle.label}
                description={toggle.description}
                enabled={toggles[toggle.id]}
                onToggle={() => handleToggle(toggle.id)}
              />
            ))}
          </div>

          {/* Enrollment CTA */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelixIcon size={18} />
              <span className="text-[18px] font-extrabold text-[#2DA5A0]">+200 Helix/month</span>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2DA5A0] to-[#35bdb7] text-white text-sm font-bold hover:opacity-90 transition-opacity">
              Enroll Now
            </button>
          </div>
        </GlassCard>

        {/* Right Column — Two stacked cards */}
        <div className="flex flex-col gap-6">
          {/* How Your Data Helps */}
          <GlassCard>
            <h3 className="text-[16px] font-extrabold text-white mb-5">How Your Data Helps</h3>
            <div className="flex flex-col gap-4">
              {HOW_IT_HELPS.map((item, i) => (
                <motion.div
                  key={item.num}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex gap-3"
                >
                  <span className="text-[14px] font-extrabold text-[#B75E18] flex-shrink-0 w-6">
                    {item.num}
                  </span>
                  <p className="text-[13px] text-white/50 leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Privacy Guarantee */}
          <GlassCard>
            <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-white mb-4">
              <ShieldCheck size={20} strokeWidth={1.5} className="text-white" />
              Privacy Guarantee
            </h3>
            <div className="flex flex-col gap-3">
              {PRIVACY_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <CircleCheckBig size={14} strokeWidth={1.5} className="text-[#2DA5A0] flex-shrink-0 mt-0.5" />
                  <p className="text-[13px] text-white/50 leading-relaxed">{item}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
