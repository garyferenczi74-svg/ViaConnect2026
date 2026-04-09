"use client";

import AdvisorChat from "@/components/advisor/AdvisorChat";
import { Leaf } from "lucide-react";

export default function NaturopathAdvisorPage() {
  return (
    <AdvisorChat
      role="naturopath"
      accentColor="#10B981"
      title="AI Holistic Advisor"
      subtitle="Integrative protocol intelligence — powered by Jeffery™"
      icon={<Leaf className="w-5 h-5" strokeWidth={1.5} style={{ color: "#10B981" }} />}
      suggestedPrompts={[
        "Build a botanical protocol for hypothyroid pattern",
        "Full interaction matrix for this patient's stack",
        "Bridge Ashwagandha research with COMT genomics",
        "90-day stepped adrenal recovery protocol",
      ]}
    />
  );
}
