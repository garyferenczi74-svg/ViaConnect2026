"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RefreshCw } from "lucide-react";

interface QuickReassessmentCardProps {
  daysElapsed: number;
}

export function QuickReassessmentCard({ daysElapsed }: QuickReassessmentCardProps) {
  const [open, setOpen] = useState(false);

  const isReady = daysElapsed >= 30;

  return (
    <div className="overflow-hidden rounded-xl bg-teal-400/[0.03] border border-teal-400/10">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 md:p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="relative flex-shrink-0">
          <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
            <RefreshCw className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">
            {isReady ? "Quick Daily Check: 30 day check-in ready" : `Quick Daily Check: ${30 - daysElapsed} days until check-in`}
          </h4>
          <p className="text-xs text-white/30 mt-0.5">
            {isReady
              ? "Quick 2 min reassessment; see how your patterns are shifting"
              : "Your next assessment will track pattern changes"}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {!open && (
            <span className="text-[10px] font-medium text-[#2DA5A0]/70">Tap to expand</span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-white/45 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            strokeWidth={1.5}
          />
        </div>
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              {isReady ? (
                <a
                  href="/onboarding/i-caq-intro"
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-medium hover:bg-teal-400/20 transition-colors px-4 py-2.5"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                  Start Check-In
                </a>
              ) : (
                <p className="text-xs text-white/40 leading-relaxed">
                  Complete your daily check-in when the timer reaches 30 days to track how your
                  supplement protocol, lifestyle changes, and wellness patterns are evolving.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
