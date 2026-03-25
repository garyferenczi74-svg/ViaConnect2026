"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, Button } from "@/components/ui";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  Send,
  Bot,
  User,
  Brain,
  Zap,
  FileSearch,
  Layers,
  Pill,
  Heart,
  ChevronRight,
} from "lucide-react";

const supabase = createClient();

// ─── Types ───────────────────────────────────────────────────────────────────

type AIModel = "claude" | "grok" | "gpt4o" | "consensus";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: AIModel;
  timestamp: Date;
  consensusData?: {
    claude: string;
    grok: string;
    gpt4o: string;
    agreement: number;
    synthesis: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL_META: Record<
  AIModel,
  { label: string; subtitle: string; icon: React.ElementType }
> = {
  claude: { label: "Claude", subtitle: "(Wellness Coach)", icon: Brain },
  grok: { label: "Grok", subtitle: "(Latest Research)", icon: Zap },
  gpt4o: { label: "GPT-4o", subtitle: "(Summary)", icon: FileSearch },
  consensus: { label: "Consensus", subtitle: "(All 3 Models)", icon: Layers },
};

const PROMPT_TEMPLATES = [
  "Why was this supplement recommended for me?",
  "What should I take in the morning vs evening?",
  "How do my genetics affect my supplement needs?",
  "Are there any interactions in my current protocol?",
  "What lifestyle changes support my vitality score?",
  "Explain my MTHFR status in simple terms",
];

const MOCK_RESPONSES: Record<string, string> = {
  claude:
    "Based on your assessment, your Vitality Score reflects your current lifestyle and symptom profile. Your top recommendations — RISE+ for energy and MTHFR+ for methylation — were selected because your symptoms indicated fatigue and brain fog, and these formulations use 10-27x more bioavailable ingredients than standard supplements. Taking RISE+ in the morning supports mitochondrial energy production throughout the day, while RELAX+ in the evening optimizes your sleep quality.",
  grok: "Current research shows that personalized supplementation based on symptom profiling improves outcomes by 40% compared to generic multivitamins (Chen et al., 2026, Nutrients). Your protocol targets the specific pathways indicated by your assessment. For example, if you reported high stress, adaptogenic formulas like CALM+ with KSM-66 Ashwagandha reduce cortisol by 30% in clinical trials.",
  gpt4o:
    "Your Personalized Protocol Summary:\n- RISE+ (Morning): Energy & mitochondrial support\n- MTHFR+ (Morning): Methylation & B-vitamin optimization\n- RELAX+ (Evening): Sleep & relaxation support\n\nKey Insights:\n- Your fatigue symptoms align with mitochondrial support needs\n- Stress level indicates adaptogenic support would be beneficial\n- Sleep quality can be improved with evening magnesium supplementation\n\nAll supplements in your protocol are interaction-safe.",
};

function getMockResponse(model: AIModel, __userMessage: string): ChatMessage { // eslint-disable-line @typescript-eslint/no-unused-vars
  if (model === "consensus") {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      model: "consensus",
      timestamp: new Date(),
      consensusData: {
        claude: MOCK_RESPONSES.claude,
        grok: MOCK_RESPONSES.grok,
        gpt4o: MOCK_RESPONSES.gpt4o,
        agreement: 93,
        synthesis:
          "All three models agree that your personalized protocol is well-targeted based on your assessment data. The morning/evening dosing schedule is optimized for circadian biology. Key recommendation: maintain consistency with your protocol for at least 30 days before expecting measurable changes in your Vitality Score. Track your daily supplement intake using the dashboard checklist to earn ViaTokens.",
      },
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      MOCK_RESPONSES[model] ||
      "I've reviewed your wellness profile. Based on your assessment and current protocol, I can help you understand your recommendations better. What would you like to know?",
    model,
    timestamp: new Date(),
  };
}

// ─── Loading Dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ConsumerAIAdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>("claude");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [displayName, setDisplayName] = useState("there");
  const [vitalityScore, setVitalityScore] = useState(0);
  const [recsCount, setRecsCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user data + initial welcome
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setDisplayName(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there");

      const { data: profile } = await supabase
        .from("profiles")
        .select("vitality_score")
        .eq("id", user.id)
        .single();
      if (profile?.vitality_score) setVitalityScore(profile.vitality_score);

      const { count } = await supabase
        .from("recommendations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["recommended", "accepted"]);
      if (count) setRecsCount(count);

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi ${user.user_metadata?.full_name?.split(" ")[0] || "there"}! I'm your personal wellness AI advisor. I can help you understand your supplement recommendations, explain how your assessment results led to your protocol, and answer any health and wellness questions. What would you like to know?`,
          model: "claude",
          timestamp: new Date(),
        },
      ]);
    }
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = useCallback(
    (text?: string) => {
      const messageText = text || input.trim();
      if (!messageText || isThinking) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: messageText,
        model: selectedModel,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsThinking(true);

      setTimeout(() => {
        const aiResponse = getMockResponse(selectedModel, messageText);
        setMessages((prev) => [...prev, aiResponse]);
        setIsThinking(false);
      }, 1000);
    },
    [input, selectedModel, isThinking],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const scoreColor =
    vitalityScore >= 80 ? "#4ADE80" : vitalityScore >= 60 ? "#22D3EE" : vitalityScore >= 40 ? "#FBBF24" : "#F87171";

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <StaggerChild>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Wellness AI Advisor
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Your personal guide to understanding your supplements, genetics, and wellness journey
            </p>
          </div>
        </StaggerChild>

        {/* Layout */}
        <StaggerChild className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left Panel — Chat ── */}
          <div className="w-full lg:w-[65%] flex flex-col glass rounded-2xl overflow-hidden">
            {/* Model selector bar */}
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-white/[0.06] overflow-x-auto">
              {(Object.keys(MODEL_META) as AIModel[]).map((key) => {
                const meta = MODEL_META[key];
                const Icon = meta.icon;
                const active = selectedModel === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedModel(key)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      active
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{meta.label}</span>
                    <span className="text-xs opacity-70 hidden sm:inline">{meta.subtitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 min-h-[400px] sm:min-h-[500px] max-h-[600px]">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3">
                          <p className="text-gray-200 text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-gray-600 text-right">{formatTime(msg.timestamp)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-copper/20 flex items-center justify-center text-copper ml-3 flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  );
                }

                if (msg.consensusData) {
                  const cd = msg.consensusData;
                  return (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="max-w-[90%] sm:max-w-[85%] space-y-3">
                        <div className="grid gap-2">
                          {([
                            ["Claude", cd.claude, "border-purple-500/30"],
                            ["Grok", cd.grok, "border-cyan/30"],
                            ["GPT-4o", cd.gpt4o, "border-copper/30"],
                          ] as const).map(([label, text, border]) => (
                            <div key={label} className={`glass rounded-lg p-3 border ${border}`}>
                              <p className="text-xs font-semibold text-gray-400 mb-1">{label}:</p>
                              <p className="text-gray-300 text-xs leading-relaxed">{text}</p>
                            </div>
                          ))}
                        </div>
                        <Badge variant="active">{cd.agreement}% Consensus</Badge>
                        <div className="glass rounded-xl px-4 py-3 border border-cyan-500/20">
                          <p className="text-xs font-semibold text-cyan-400 mb-1">Combined Answer</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{cd.synthesis}</p>
                        </div>
                        <p className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[85%] sm:max-w-[75%] space-y-1">
                      <div className="glass rounded-xl px-4 py-3">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <p className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
              {isThinking && <ThinkingDots />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-white/[0.06] px-4 sm:px-5 py-4 flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about your supplements, vitality score, genetics..."
                className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="!bg-gradient-to-r !from-cyan-500 !to-blue-600 hover:!opacity-90 !shadow-none font-semibold"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Right Panel — Your Wellness ── */}
          <div className="w-full lg:w-[35%] space-y-5">
            {/* Vitality Score Card */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Your Vitality Score
              </h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center" style={{ borderColor: scoreColor }}>
                  <span className="text-xl font-bold" style={{ color: scoreColor }}>{vitalityScore}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{displayName}</p>
                  <p className="text-gray-500 text-xs">{recsCount} supplements in protocol</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {[
                  { href: "/dashboard", label: "View Dashboard", icon: Heart },
                  { href: "/supplements", label: "Browse Supplements", icon: Pill },
                  { href: "/profile/assessment", label: "View Assessment Results", icon: Brain },
                ].map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors text-sm text-gray-300"
                  >
                    <action.icon className="w-4 h-4 text-cyan-400" />
                    {action.label}
                  </a>
                ))}
              </div>
            </Card>

            {/* Prompt Templates */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Ask Me About
              </h3>
              <div className="space-y-1.5">
                {PROMPT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => handleSend(tmpl)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 transition-all group"
                  >
                    <span>{tmpl}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </StaggerChild>
      </div>
    </PageTransition>
  );
}
