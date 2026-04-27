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
  Dna,
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
  "Review this protocol for interactions",
  "Check interactions for current supplements",
  "Evidence for MTHFR supplementation",
  "Optimize protocol for this patient",
  "Explain genetic variants to patient",
];

const MOCK_RESPONSES: Record<string, string> = {
  claude:
    "Based on Sarah Mitchell's heterozygous MTHFR C677T variant, I recommend continuing the current methylfolate supplementation at 1,000 mcg daily. Given her homozygous COMT V158M status, we should monitor catecholamine metabolism closely. The combination of MTHFR+ and COMT+ in her current protocol addresses both methylation and catecholamine pathways effectively. Her 78% adherence rate is adequate but could benefit from protocol simplification.",
  grok: "Recent literature (Zhang et al., 2026, J Nutrigenomics) confirms that heterozygous MTHFR C677T carriers show 35% reduced enzyme activity. Current research supports methylfolate over folic acid, with a 10-27x bioavailability advantage in the ViaConnect formulation. The APOE E3/E4 finding warrants cardiovascular monitoring per latest AHA guidelines published this month.",
  gpt4o:
    "Extracted protocol summary for Sarah Mitchell:\n- MTHFR+ (Methylfolate 1,000 mcg) - Active\n- COMT+ (SAMe 200 mg + Magnesium 400 mg) - Active\n- NAD+ (NMN 250 mg) - Active\n\nGenetic risk matrix: MTHFR moderate, COMT high, CYP1A2 normal, APOE elevated. No contraindicated interactions detected in current supplement stack.",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getWelcomeMessage(_model: AIModel): string {
  return "Hello Dr. Chen. I'm ready to assist with clinical analysis, protocol reviews, and genetic interpretations. How can I help?";
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
        agreement: 87,
        synthesis:
          "All three models agree on continuing methylfolate supplementation for MTHFR C677T heterozygous status. There is strong consensus on the COMT V158M monitoring recommendation. The protocol appears well-optimized with no interaction concerns. Key recommendation: maintain current stack, improve adherence through simplified dosing schedule, and add cardiovascular monitoring given APOE E3/E4 status.",
      },
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      MOCK_RESPONSES[model] ||
      "I've analyzed the request. Based on the patient's genetic profile and current protocol, I can provide detailed recommendations. Would you like me to elaborate on any specific aspect?",
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
    {
      id: "user-1",
      role: "user",
      content:
        "Can you review Sarah Mitchell's current MTHFR protocol and check for any interactions with her COMT supplementation?",
      model: "claude",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "ai-1",
      role: "assistant",
      content: MOCK_RESPONSES.claude,
      model: "claude",
      timestamp: new Date(Date.now() - 30000),
    },
  ];
}

// ─── Loading Dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="glass rounded-xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-portal-green/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-portal-green/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-portal-green/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [selectedModel, setSelectedModel] = useState<AIModel>("claude");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
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
    <PageTransition className="min-h-screen bg-dark-bg p-6 md:p-10">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <StaggerChild>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Multi-LLM Clinical Advisor
            </h1>
            <p className="text-gray-400 mt-1">
              AI-powered clinical reasoning with three specialized models
            </p>
          </div>
        </StaggerChild>

        {/* Two-column layout */}
        <StaggerChild className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left Panel (65%) — Chat ── */}
          <div className="w-full lg:w-[65%] flex flex-col glass rounded-2xl overflow-hidden">
            {/* Model selector bar */}
            <div className="flex items-center gap-2 px-3 md:px-5 py-3 border-b border-white/[0.06] overflow-x-auto">
              {(Object.keys(MODEL_META) as AIModel[]).map((key) => {
                const meta = MODEL_META[key];
                const Icon = meta.icon;
                const active = selectedModel === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedModel(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      active
                        ? "bg-portal-green/20 text-portal-green border border-portal-green/30"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{meta.label}</span>
                    <span className="text-xs opacity-70">{meta.subtitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 min-h-[400px] md:min-h-[500px] max-h-[600px]">
              {messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[75%] space-y-1">
                        <div className="bg-portal-green/10 border border-portal-green/20 rounded-xl px-4 py-3">
                          <p className="text-gray-200 text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-600 text-right">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-copper/20 flex items-center justify-center text-copper ml-3 flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    </div>
                  );
                }

                // Consensus response
                if (msg.consensusData) {
                  const cd = msg.consensusData;
                  return (
                    <div key={msg.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green flex-shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="max-w-[85%] space-y-3">
                        {/* Sub-responses */}
                        <div className="grid gap-2">
                          {(
                            [
                              ["Claude", cd.claude, "border-purple-500/30"],
                              ["Grok", cd.grok, "border-cyan/30"],
                              ["GPT-4o", cd.gpt4o, "border-copper/30"],
                            ] as const
                          ).map(([label, text, border]) => (
                            <div
                              key={label}
                              className={`glass rounded-lg p-3 border ${border}`}
                            >
                              <p className="text-xs font-semibold text-gray-400 mb-1">
                                {label}:
                              </p>
                              <p className="text-gray-300 text-xs leading-relaxed">
                                {text}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Agreement badge */}
                        <div className="flex items-center gap-2">
                          <Badge variant="active">
                            {cd.agreement}% Consensus
                          </Badge>
                        </div>

                        {/* Synthesized response */}
                        <div className="glass rounded-xl px-4 py-3 border border-portal-green/20">
                          <p className="text-xs font-semibold text-portal-green mb-1">
                            Synthesized Consensus
                          </p>
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {cd.synthesis}
                          </p>
                        </div>
                        <p className="text-[10px] text-gray-600">
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                }

                // Normal AI response
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-portal-green/20 flex items-center justify-center text-portal-green flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[75%] space-y-1">
                      <div className="glass rounded-xl px-4 py-3">
                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      <p className="text-[10px] text-gray-600">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {isThinking && <ThinkingDots />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-white/[0.06] px-3 md:px-5 py-4 flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about protocols, interactions, genetic analysis..."
                className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-base text-white placeholder:text-gray-600 outline-none focus:border-copper/50 focus:ring-1 focus:ring-copper/20 transition-colors"
              />
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="!bg-portal-green hover:!bg-portal-green/80 !shadow-none !text-dark-bg font-semibold"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Right Panel (35%) — Context ── */}
          <div className="w-full lg:w-[35%] space-y-5">
            {/* Current Patient Summary */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Current Patient
                </h3>
                <button className="text-xs text-portal-green hover:underline">
                  Change Patient
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-portal-pink/20 flex items-center justify-center text-portal-pink font-bold text-sm">
                  SM
                </div>
                <div>
                  <p className="text-white font-medium">Sarah Mitchell</p>
                  <p className="text-gray-500 text-xs">Patient ID: #VIA-2847</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-white font-semibold text-sm">34</p>
                  <p className="text-gray-500 text-[10px]">Age</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <Badge variant="warning">Moderate</Badge>
                  <p className="text-gray-500 text-[10px] mt-1">Risk</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-white font-semibold text-sm">78%</p>
                  <p className="text-gray-500 text-[10px]">Adherence</p>
                </div>
              </div>
            </Card>

            {/* Active Protocol */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Active Protocol
                </h3>
                <Badge variant="active">Active</Badge>
              </div>
              <p className="text-white font-medium text-sm">
                MTHFR Optimization Protocol
              </p>
              <div className="space-y-2">
                {[
                  { name: "MTHFR+", dose: "Methylfolate 1,000 mcg", icon: Pill },
                  { name: "COMT+", dose: "SAMe 200 mg + Magnesium 400 mg", icon: Pill },
                  { name: "NAD+", dose: "NMN 250 mg", icon: Pill },
                ].map((supp) => (
                  <div
                    key={supp.name}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03]"
                  >
                    <div className="w-7 h-7 rounded-md bg-portal-green/10 flex items-center justify-center">
                      <supp.icon className="w-3.5 h-3.5 text-portal-green" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">
                        {supp.name}
                      </p>
                      <p className="text-gray-500 text-[10px]">{supp.dose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Genetic Highlights */}
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Genetic Highlights
              </h3>
              <div className="space-y-2">
                {[
                  {
                    variant: "MTHFR C677T",
                    result: "Heterozygous",
                    risk: "warning" as const,
                    riskLabel: "Moderate",
                  },
                  {
                    variant: "COMT V158M",
                    result: "Homozygous",
                    risk: "danger" as const,
                    riskLabel: "High",
                  },
                  {
                    variant: "CYP1A2",
                    result: "Normal",
                    risk: "active" as const,
                    riskLabel: "Normal",
                  },
                  {
                    variant: "APOE",
                    result: "E3/E4",
                    risk: "pending" as const,
                    riskLabel: "Elevated",
                  },
                ].map((g) => (
                  <div
                    key={g.variant}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2">
                      <Dna className="w-3.5 h-3.5 text-portal-purple" />
                      <div>
                        <p className="text-white text-xs font-medium">
                          {g.variant}
                        </p>
                        <p className="text-gray-500 text-[10px]">{g.result}</p>
                      </div>
                    </div>
                    <Badge variant={g.risk}>{g.riskLabel}</Badge>
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
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs text-gray-400 hover:text-portal-green hover:bg-portal-green/5 border border-transparent hover:border-portal-green/20 transition-all group"
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
