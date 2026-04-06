"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dna, Heart, ClipboardList, Sparkles } from "lucide-react";

// ─── DNA Helix ──────────────────────────────────────────────────────────────

function DnaHelix() {
  // Generate 20 circle pairs arranged in a double-helix pattern
  const pairs = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * Math.PI * 4; // two full turns
    const y = 8 + (i / 20) * 84; // vertical spread across SVG
    const xOffset = Math.sin(angle) * 30;
    const depthA = Math.cos(angle); // +1 = front, -1 = back
    const depthB = -depthA;
    return { y, xA: 50 + xOffset, xB: 50 - xOffset, depthA, depthB, i };
  });

  return (
    <div className="relative w-24 h-32 mx-auto mb-6" aria-hidden="true">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ animation: "helix-rotate 20s linear infinite" }}
      >
        {pairs.map((p) => (
          <g key={p.i}>
            {/* Strand A circle */}
            <circle
              cx={p.xA}
              cy={p.y}
              r={2.2}
              fill={p.depthA > 0 ? "#2DA5A0" : "rgba(45,165,160,0.35)"}
            />
            {/* Strand B circle */}
            <circle
              cx={p.xB}
              cy={p.y}
              r={2.2}
              fill={p.depthB > 0 ? "#B75E18" : "rgba(183,94,24,0.35)"}
            />
            {/* Connecting rung (faded) */}
            <line
              x1={p.xA}
              y1={p.y}
              x2={p.xB}
              y2={p.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.8}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Steps Data ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: Dna,
    title: "Quick Profile",
    description: "Name, age, basic details",
    accent: "teal" as const,
  },
  {
    icon: Heart,
    title: "Health Goals",
    description: "What you want to optimize",
    accent: "teal" as const,
  },
  {
    icon: ClipboardList,
    title: "Clinical Assessment",
    description: "Symptoms, lifestyle, medications",
    accent: "teal" as const,
  },
  {
    icon: Sparkles,
    title: "Your Precision Plan",
    description: "AI-generated health recommendations",
    accent: "orange" as const,
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OnboardingWelcomePage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Inline keyframes for helix + stagger animations */}
      <style jsx global>{`
        @keyframes helix-rotate {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{
          background: "var(--gradient-hero)",
          opacity: visible ? 1 : 0,
          transition: "opacity 500ms ease-out",
        }}
      >
        {/* DNA Helix Decoration */}
        <DnaHelix />

        {/* Headline */}
        <h1 className="text-heading-1 text-center">
          Your genome has a message.
        </h1>
        <h1 className="text-heading-1 text-center mt-1">
          Let&rsquo;s decode it.
        </h1>

        {/* Spacer */}
        <div className="h-6" />

        {/* Subtitle */}
        <p
          className="text-body-lg text-center max-w-lg"
          style={{ color: "var(--text-secondary)" }}
        >
          In the next 5 minutes, we&rsquo;ll build your personalized precision
          health profile based on your genetics, lifestyle, and health goals.
        </p>

        {/* Spacer */}
        <div className="h-10" />

        {/* What We'll Cover */}
        <div className="w-full max-w-md flex flex-col gap-3">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isTeal = step.accent === "teal";
            const accentColor = isTeal ? "#2DA5A0" : "#B75E18";
            const bgColor = isTeal
              ? "rgba(45, 165, 160, 0.12)"
              : "rgba(183, 94, 24, 0.12)";

            return (
              <div
                key={step.title}
                className="glass-v2 p-3 flex items-center gap-4"
                style={{
                  borderRadius: "12px",
                  animation: visible
                    ? `slide-up 400ms ease-out ${idx * 100}ms both`
                    : "none",
                }}
              >
                {/* Icon container */}
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: bgColor,
                  }}
                >
                  <Icon size={20} color={accentColor} strokeWidth={2} />
                </div>

                {/* Text */}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {step.title}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="h-10" />

        {/* Progress Indicator */}
        <div className="w-full max-w-md flex flex-col items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Step 0 of 5
          </span>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: "0%", background: "#2DA5A0" }}
            />
          </div>
        </div>

        {/* Spacer */}
        <div className="h-8" />

        {/* CTA Button */}
        <Link href="/onboarding/1">
          <button
            className="rounded-xl px-8 py-4 text-lg font-semibold text-white cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #B75E18 0%, #D4721F 100%)",
              boxShadow: "0 4px 24px rgba(183, 94, 24, 0.35)",
            }}
          >
            Get Started
          </button>
        </Link>

        {/* Spacer */}
        <div className="h-4" />

        {/* Fine print */}
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>Takes about 5 minutes</span>
          <span>&middot;</span>
          <span>Your data is encrypted</span>
          <span>&middot;</span>
          <span>Skip anytime</span>
        </div>

        {/* Spacer */}
        <div className="h-10" />

        {/* Footer */}
        <div
          className="flex flex-col items-center gap-1 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span className="font-semibold tracking-wide">ViaConnect</span>
          <span>ViaConnect Wellness</span>
        </div>
      </div>
    </>
  );
}
