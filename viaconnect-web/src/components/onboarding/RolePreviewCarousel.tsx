"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Pill, TrendingUp, LayoutDashboard, Settings2, ShieldAlert, Leaf, Sun, GitMerge } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Slide {
  title: string;
  description: string;
  preview?: string;
  icon: LucideIcon;
}

const SLIDES: Record<string, Slide[]> = {
  consumer: [
    {
      title: "Your Master Patterns",
      description: "Ultrathink identifies the 1\u20133 root causes driving your symptoms \, not just a list, a blueprint.",
      preview: 'Sample: "Adrenal Battery Depletion" \, fatigue + brain fog + sleep issues traced to one source',
      icon: BrainCircuit,
    },
    {
      title: "Personalized Protocol",
      description: "SNP-targeted supplements + peptides matched to YOUR genetic profile and symptom patterns.",
      preview: "Morning: EnergyCore\u2122 + Liposomal B Complex | Evening: MitoPeptide\u2122 + Magnesium",
      icon: Pill,
    },
    {
      title: "Track & Optimize",
      description: "Your Bio Optimization score evolves as you follow your protocol and reassess.",
      preview: "Day 1: 58/100 \u2192 Day 30: 74/100 \, patterns shifting",
      icon: TrendingUp,
    },
  ],
  practitioner: [
    { title: "Patient Dashboard", description: "Full Ultrathink profiles for every patient with AI-powered insights.", icon: LayoutDashboard },
    { title: "Protocol Override", description: "Adjust AI recommendations with your clinical expertise and override where needed.", icon: Settings2 },
    { title: "Interaction Engine", description: "Real-time medication-supplement-allergy checking across your patient panel.", icon: ShieldAlert },
  ],
  naturopath: [
    { title: "Herbal Integration", description: "TCM + Ayurvedic lens integrated into every patient profile.", icon: Leaf },
    { title: "Eastern Patterns", description: "Liver Qi Stagnation, Kidney Yang Deficiency mapped to supplement protocols.", icon: Sun },
    { title: "Holistic Planning", description: "Combine Western nutraceuticals with herbal protocols seamlessly.", icon: GitMerge },
  ],
};

interface RolePreviewCarouselProps {
  role: "consumer" | "practitioner" | "naturopath";
}

export function RolePreviewCarousel({ role }: RolePreviewCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const roleSlides = SLIDES[role] || SLIDES.consumer;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % roleSlides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [roleSlides.length]);

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 md:p-8 mt-6">
      <p className="text-xs text-white/25 uppercase tracking-wider font-semibold mb-4">
        Here&apos;s what your experience looks like
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
                {(() => { const Icon = roleSlides[activeSlide].icon; return <Icon className="w-5 h-5 text-teal-400" strokeWidth={1.5} />; })()}
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{roleSlides[activeSlide].title}</h3>
              <p className="text-sm text-white/40 mt-1">{roleSlides[activeSlide].description}</p>
              {roleSlides[activeSlide].preview && (
                <p className="text-xs text-teal-400/50 mt-2 italic">{roleSlides[activeSlide].preview}</p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-5">
        {roleSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`h-2 rounded-full transition-all ${i === activeSlide ? "bg-teal-400 w-4" : "bg-white/15 w-2"}`}
          />
        ))}
      </div>
    </div>
  );
}
