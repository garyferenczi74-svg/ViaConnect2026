"use client";

import AdvisorChat from "@/components/advisor/AdvisorChat";
import { MessageCircleHeart } from "lucide-react";
import { useEffect, useState } from "react";

interface PendingReport {
  topic: string;
  greeting?: string;
  analysis?: string;
  recommendation?: string;
  focusArea?: string;
  estimatedImpact?: number;
}

function buildReportPrompt(report: PendingReport): string {
  if (report.topic === "bio-optimization") {
    const parts: string[] = [
      "Please give me a full personalized Bio Optimization report.",
    ];
    if (report.analysis) parts.push(`My recent analysis: ${report.analysis}`);
    if (report.focusArea) parts.push(`Current focus: ${report.focusArea}.`);
    if (report.recommendation) parts.push(`Prior recommendation: ${report.recommendation}`);
    if (typeof report.estimatedImpact === "number")
      parts.push(`Estimated lift from the recommendation: +${report.estimatedImpact} points.`);
    parts.push(
      "Write the full report with these sections: Summary, Strengths, Risks/Gaps, Protocol Adjustments, 7-Day Action Plan, and Expected Outcomes. Use my data; be specific and actionable.",
    );
    return parts.join(" ");
  }
  return `Generate a full personalized ${report.topic} report.`;
}

export default function ConsumerAdvisorPage() {
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const topic = url.searchParams.get("report");
      if (!topic) return;
      const raw = sessionStorage.getItem("hannah-pending-report");
      const parsed: PendingReport = raw ? { ...JSON.parse(raw), topic } : { topic };
      setInitialPrompt(buildReportPrompt(parsed));
      sessionStorage.removeItem("hannah-pending-report");
      url.searchParams.delete("report");
      window.history.replaceState({}, "", url.toString());
    } catch { /* no-op */ }
  }, []);

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
      initialPrompt={initialPrompt}
    />
  );
}
