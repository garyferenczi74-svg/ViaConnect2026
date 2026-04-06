"use client";

import { useState } from "react";
import { ChevronDown, ShoppingBag, BookOpen } from "lucide-react";

const FAQS = [
  {
    question: "How do peptides work with your GENEX360\u2122 SNPs?",
    answer: "Your genetic variants (MTHFR, COMT, CYP450, etc.) determine how your body processes and responds to specific peptides. Ultrathink cross-references your CAQ symptom patterns with known SNP-peptide interactions to recommend the most effective products for YOUR biology.",
  },
  {
    question: "Why oral delivery instead of injectable?",
    answer: "ViaConnect uses proprietary dual liposomal-micellar delivery technology that achieves 10\u201327x enhanced bioavailability compared to standard oral formulations. This means you get clinical-level absorption without needles \, convenient, safe, and accessible as a wellness product.",
  },
  {
    question: "What is the science behind these recommendations?",
    answer: "Recommendations are informed by clinical research from leading authorities including Dr. Vladimir Khavinson (700+ bioregulator publications), Dr. William Seeds (International Peptide Society founder), and Phase 2/3 trial data for compounds like SS-31/Elamipretide. Evidence levels are noted on each recommendation card.",
  },
  {
    question: "Are these products FDA-approved?",
    answer: "ViaConnect peptide products are precision wellness nutraceuticals \, they are NOT FDA-approved drugs. They are manufactured in GMP-certified facilities with third-party testing. These statements have not been evaluated by the FDA. Always consult your healthcare provider.",
  },
  {
    question: "What is the 30-day loading cycle?",
    answer: "Many peptide bioregulators work best with an initial 30-day \u201Cloading\u201D phase at the recommended dose, followed by a maintenance phase. This mirrors the protocols used in the clinical research. Your practitioner can help optimize the cycle for your specific patterns.",
  },
];

function CollapsibleFAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[44px]"
      >
        <span className="text-sm text-white/60 font-medium pr-4">{question}</span>
        <ChevronDown className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-xs text-white/35 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export function PeptideFAQSection() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Learn More</h3>
      </div>

      {FAQS.map((faq, i) => (
        <CollapsibleFAQ key={i} question={faq.question} answer={faq.answer} />
      ))}

      {/* Links */}
      <div className="p-5 border-t border-white/5 flex flex-col sm:flex-row gap-3">
        <a href="/shop?category=peptides" className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-medium hover:text-white/50 transition-all flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
          View Full 27-Product Catalog
        </a>
        <a href="/science" className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-medium hover:text-white/50 transition-all flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
          Science & Authorities
        </a>
      </div>
    </div>
  );
}
