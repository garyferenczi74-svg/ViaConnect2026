"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Leaf,
  Pill,
  ChevronRight,
} from "lucide-react";

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
  claude: { label: "Claude", subtitle: "(Clinical Reasoning)", icon: Brain },
  grok: { label: "Grok", subtitle: "(Real-Time Research)", icon: Zap },
  gpt4o: { label: "GPT-4o", subtitle: "(Extraction)", icon: FileSearch },
  consensus: { label: "Consensus", subtitle: "(All 3 Models)", icon: Layers },
};

const PROMPT_TEMPLATES = [
  "Analyze constitutional type from assessment data",
  "Recommend botanical formula for this constitution",
  "Check herb-drug interactions for current protocol",
  "Evidence for adaptogenic herbs in stress management",
  "Optimize dosing schedule for herbal protocol",
  "Review Ayurvedic approach for Vata imbalance",
];

const MOCK_RESPONSES: Record<string, string> = {
  claude:
    "Based on the patient's constitutional assessment showing predominant Vata imbalance with secondary Pitta aggravation, I recommend a grounding botanical protocol. Ashwagandha (KSM-66, 600mg) addresses the Vata anxiety pattern while supporting adrenal function. Tulsi (Holy Basil) provides adaptogenic support without overstimulating Pitta. The combination of these adaptogens with Triphala for digestive regulation aligns with both traditional Ayurvedic principles and current clinical evidence.",
  grok: "Recent research (Sharma et al., 2026, J Ethnopharmacology) demonstrates that KSM-66 Ashwagandha reduces cortisol by 30% in chronically stressed populations. A 2025 meta-analysis in Phytomedicine confirms synergistic effects of Ashwagandha + Holy Basil combinations. For the Vata constitution specifically, current naturopathic literature supports mineral-rich formulations — Magnesium Bisglycinate shows 10-28x bioavailability in the ViaConnect RELAX+ formulation.",
  gpt4o:
    "Constitutional Analysis Summary:\n- Primary: Vata (Air) — 78% expression\n- Secondary: Pitta (Fire) — 45% expression\n- Kapha (Earth) — 22% expression\n\nRecommended Botanical Protocol:\n- Ashwagandha KSM-66: 600mg (morning)\n- Holy Basil: 500mg (morning + evening)\n- Triphala: 1000mg (bedtime)\n- Brahmi: 300mg (morning)\n\nNo contraindicated interactions with current supplement stack.",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getWelcomeMessage(_model: AIModel): string {
  return "Welcome. I'm your naturopathic AI advisor, ready to assist with constitutional analysis, botanical formulations, herb-drug interactions, and evidence-based natural medicine protocols. How can I help today?";
}

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
        agreement: 91,
        synthesis:
          "All three models agree on Ashwagandha KSM-66 as the primary adaptogen for Vata constitution with stress presentation. Strong consensus on the Holy Basil combination. The botanical protocol is well-supported by both traditional naturopathic principles and modern clinical evidence. Key recommendation: implement grounding herbs first, assess response at 4 weeks, then add cognitive support with Brahmi if needed.",
      },
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      MOCK_RESPONSES[model] ||
      "I've analyzed the constitutional profile and botanical considerations. Would you like me to elaborate on any specific aspect of the naturopathic protocol?",
    model,
    timestamp: new Date(),
  };
}

// ─── Initial messages ────────────────────────────────────────────────────────

function getInitialMessages(): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "assistant",
      content: getWelcomeMessage("claude"),
      model: "claude",
      timestamp: new Date(Date.now() - 120000),
    },
  ];
}

// ─── Loading Dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sage flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sage/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-sage/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-sage/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NaturopathAIAdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [selectedModel, setSelectedModel] = useState<AIModel>("claude");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <PageTransition className="min-h-screen bg-dark-bg p-4 sm:p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <StaggerChild>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Naturopathic AI Advisor
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Constitutional analysis, botanical formulations, and evidence-based natural medicine
            </p>
          </div>
        </StaggerChild>

        {/* Two-column layout */}
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
                        ? "bg-sage/20 text-sage border border-sage/30"
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
                        <div className="bg-sage/10 border border-sage/20 rounded-xl px-4 py-3">
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
                      <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sage flex-shrink-0">
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
                        <div className="flex items-center gap-2">
                          <Badge variant="active">{cd.agreement}% Consensus</Badge>
                        </div>
                        <div className="glass rounded-xl px-4 py-3 border border-sage/20">
                          <p className="text-xs font-semibold text-sage mb-1">Synthesized Consensus</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{cd.synthesis}</p>
                        </div>
                        <p className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sage flex-shrink-0">
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
                placeholder="Ask about constitutional types, botanical formulas, herb interactions..."
                className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-sage/50 focus:ring-1 focus:ring-sage/20 transition-colors"
              />
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="!bg-sage hover:!bg-sage/80 !shadow-none !text-dark-bg font-semibold"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Right Panel — Context ── */}
          <div className="w-full lg:w-[35%] space-y-5">
            {/* Constitutional Profile */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Constitutional Profile
              </h3>
              <div className="space-y-3">
                {[
                  { type: "Vata (Air)", pct: 78, color: "bg-purple-500" },
                  { type: "Pitta (Fire)", pct: 45, color: "bg-copper" },
                  { type: "Kapha (Earth)", pct: 22, color: "bg-sage" },
                ].map((c) => (
                  <div key={c.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300">{c.type}</span>
                      <span className="text-xs text-gray-500">{c.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Current Botanical Protocol */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Botanical Protocol
                </h3>
                <Badge variant="active">Active</Badge>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Ashwagandha KSM-66", dose: "600mg morning", icon: Leaf },
                  { name: "Holy Basil (Tulsi)", dose: "500mg morning + evening", icon: Leaf },
                  { name: "Triphala", dose: "1000mg bedtime", icon: Pill },
                  { name: "Brahmi", dose: "300mg morning", icon: Leaf },
                ].map((herb) => (
                  <div key={herb.name} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]">
                    <div className="w-7 h-7 rounded-md bg-sage/10 flex items-center justify-center">
                      <herb.icon className="w-3.5 h-3.5 text-sage" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{herb.name}</p>
                      <p className="text-gray-500 text-[10px]">{herb.dose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Prompt Templates */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Prompt Templates
              </h3>
              <div className="space-y-1.5">
                {PROMPT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => handleSend(tmpl)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs text-gray-400 hover:text-sage hover:bg-sage/5 border border-transparent hover:border-sage/20 transition-all group"
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
