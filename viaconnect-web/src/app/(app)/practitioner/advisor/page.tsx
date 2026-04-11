"use client";

import AdvisorChat from "@/components/advisor/AdvisorChat";
import { BrainCircuit } from "lucide-react";

export default function PractitionerAdvisorPage() {
  return (
    <AdvisorChat
      role="practitioner"
      accentColor="#3B82F6"
      title="AI Clinical Assistant"
      subtitle="Evidence-based clinical intelligence — powered by Hannah™"
      icon={<BrainCircuit className="w-5 h-5" strokeWidth={1.5} style={{ color: "#3B82F6" }} />}
      suggestedPrompts={[
        "Review my patient's protocol for gaps",
        "Check interactions for a new supplement addition",
        "Population insights for MTHFR patients",
        "Which patients need follow-up this week?",
      ]}
    />
  );
}
