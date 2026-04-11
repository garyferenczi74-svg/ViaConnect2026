"use client";

import AdvisorChat from "@/components/advisor/AdvisorChat";
import { MessageCircleHeart } from "lucide-react";

export default function ConsumerAdvisorPage() {
  return (
    <AdvisorChat
      role="consumer"
      accentColor="#2DA5A0"
      title="Hannah our AI Wellness Assistant"
      subtitle="Your personal wellness assistant from FarmCeutica Wellness"
      icon={<MessageCircleHeart className="w-5 h-5" strokeWidth={1.5} style={{ color: "#2DA5A0" }} />}
      suggestedPrompts={[
        "How can I improve my Bio Optimization Score?",
        "Should I take my supplements with food?",
        "What does my MTHFR result mean?",
        "Which genetic test should I take next?",
      ]}
    />
  );
}
