// Prompt #39 §3 — Above-the-fold "How It Works" process strip.
//
// Sequencing intent: outcome → proof → mechanism. The strip sits below the H1
// and above the primary CTA so a cold visitor sees concretely what they will
// do (Answer, Upload, Receive) before being asked to start. The "12 minutes"
// anchor on Step 1 is doing critical work; without a time commitment, "answer
// questions about your health" reads as open-ended and visitors bounce.
//
// Acceptance criteria (§3.5):
//  * Stacks vertically on viewports < 640px; horizontal sm:+ upward.
//  * Each step is keyboard-focusable with an aria-label and a 44px+ tap
//    target on mobile.
//  * Lucide icons only, strokeWidth 1.5. No emojis. No dashes in copy.

import { ClipboardList, Upload, Sparkles, type LucideIcon } from "lucide-react";

interface Step {
  number: number;
  icon: LucideIcon;
  headline: string;
  subline: string;
}

const STEPS: ReadonlyArray<Step> = [
  {
    number: 1,
    icon: ClipboardList,
    headline: "Answer",
    subline: "Complete your CAQ, about 12 minutes",
  },
  {
    number: 2,
    icon: Upload,
    headline: "Upload",
    subline: "Add labs, genetics, and supplements (optional, more accurate)",
  },
  {
    number: 3,
    icon: Sparkles,
    headline: "Receive",
    subline: "Personalized protocol with the exact products, doses, and timing your body needs",
  },
];

export function HowItWorksStrip() {
  return (
    <ol
      aria-label="How ViaConnect works"
      className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto lg:mx-0"
    >
      {STEPS.map(({ number, icon: Icon, headline, subline }) => (
        <li
          key={number}
          tabIndex={0}
          aria-label={`Step ${number}: ${headline}. ${subline}`}
          className="group flex sm:flex-col items-start gap-3 rounded-xl bg-white/[0.04] border border-white/10 p-4 min-h-[44px] backdrop-blur-sm transition-colors hover:bg-white/[0.07] hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]/60 focus:ring-offset-2 focus:ring-offset-[#0d1225]"
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-[#2DA5A0]/15 border border-[#2DA5A0]/30 flex items-center justify-center">
            <Icon strokeWidth={1.5} className="w-5 h-5 text-[#2DA5A0]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-white">
              <span className="text-[#2DA5A0] mr-1.5">{number}.</span>
              {headline}
            </p>
            <p className="text-xs sm:text-[13px] text-white/65 mt-0.5 leading-snug">{subline}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
