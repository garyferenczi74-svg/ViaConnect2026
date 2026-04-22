'use client';

import { Stethoscope, Leaf, ArrowRight, FlaskConical } from 'lucide-react';

export function PeptidePractitionerAccess() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Stethoscope className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-white">Find a Certified Provider</span>
      </div>

      <p className="text-sm text-[rgba(255,255,255,0.45)] leading-relaxed">
        Tier 2 and Tier 3 peptides require a licensed prescribing practitioner or naturopath.
        Your Ultrathink™ protocol summary is pre-filled. Share it directly with your provider.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Practitioner card */}
        <div className="group rounded-2xl border border-[rgba(45,165,160,0.20)] bg-[#1E3054]/45 backdrop-blur-md p-5 hover:border-[rgba(45,165,160,0.40)] hover:shadow-lg hover:shadow-[rgba(45,165,160,0.10)] transition-all duration-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Find a Practitioner</p>
              <p className="text-xs text-[#2DA5A0]">MD / DO / NP / PA. Prescribing authority</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {[
              'Review and co-sign your Ultrathink™ protocol',
              'Verify medication interactions and contraindications',
              'Order baseline and follow-up labs',
              'Monitor progress and adjust dosing',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[rgba(255,255,255,0.60)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2DA5A0] mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2DA5A0] text-white text-sm font-semibold hover:bg-[#1A8A85] group-hover:gap-3 transition-all duration-200 shadow-lg shadow-[rgba(45,165,160,0.20)]">
            Browse Practitioners
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Naturopath card */}
        <div className="group rounded-2xl border border-[rgba(5,150,105,0.25)] bg-[#1E3054]/45 backdrop-blur-md p-5 hover:border-[rgba(5,150,105,0.45)] hover:shadow-lg hover:shadow-[rgba(5,150,105,0.10)] transition-all duration-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#065F46] to-[#059669] flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Find a Naturopath</p>
              <p className="text-xs text-emerald-400">ND. Holistic + functional medicine</p>
            </div>
          </div>
          <ul className="space-y-2 mb-5">
            {[
              'Integrate peptides with herbal and nutritional protocols',
              'TCM, Ayurvedic, and functional medicine context',
              'Functional lab panels and microbiome assessment',
              'Holistic planning aligned with your GeneX360™ data',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[rgba(255,255,255,0.60)]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#059669] text-white text-sm font-semibold hover:bg-[#047857] group-hover:gap-3 transition-all duration-200 shadow-lg shadow-[rgba(5,150,105,0.20)]">
            Browse Naturopaths
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-[#1E3054]/45 backdrop-blur-md border border-[rgba(255,255,255,0.08)] p-3">
        <FlaskConical className="w-4 h-4 text-[rgba(255,255,255,0.25)] mt-0.5 shrink-0" strokeWidth={1.5} />
        <p className="text-xs text-[rgba(255,255,255,0.40)] leading-relaxed">
          Your Ultrathink™ peptide protocol summary, including detected CAQ patterns, recommended stack, and cycling schedule, is automatically pre-filled when you connect with a provider through ViaConnect™.
        </p>
      </div>
    </div>
  );
}
