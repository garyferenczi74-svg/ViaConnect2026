"use client";

/**
 * AdvisorChat (Prompt #60b — main shared chat surface)
 *
 * Shared component used by all 3 portals (consumer / practitioner / naturopath).
 * Each portal wraps it with role-specific accentColor / icon / suggested prompts.
 *
 * Mobile: full-width, sticky composer at bottom, 12px gutters.
 * Desktop: max-w-3xl centered, accent-colored send button.
 *
 * Streams responses from /api/advisor/chat as plain UTF-8 chunks (not SSE
 * events) — the API route uses ReadableStream and we read it the same way.
 */

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import SuggestedPrompts from "./SuggestedPrompts";
import RatingButtons from "./RatingButtons";

type AdvisorRole = "consumer" | "practitioner" | "naturopath";

interface AdvisorChatProps {
  role: AdvisorRole;
  patientId?: string;
  accentColor: string;        // Teal / Blue / Green
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  suggestedPrompts: string[];
  /**
   * Optional message to auto-send once on mount. Used by entry points like
   * "View Full Report with Hannah" to pre-populate a personalized report.
   */
  initialPrompt?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AdvisorChat({
  role,
  patientId,
  accentColor,
  title,
  subtitle,
  icon,
  suggestedPrompts,
  initialPrompt,
}: AdvisorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didAutoSendRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!initialPrompt || didAutoSendRef.current) return;
    didAutoSendRef.current = true;
    void sendMessage(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const sendMessage = async (override?: string) => {
    const userMsg = (override ?? input).trim();
    if (!userMsg || isStreaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, role, patientId }),
      });

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages(prev => [...prev, { role: "assistant", content: errPayload.error ?? "Something went wrong." }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      // Add an empty assistant bubble we'll progressively fill
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantMsg += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
          return updated;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I encountered an issue. Please try again or contact support." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-[#1A2744]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-white/[0.08]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}33` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold text-white truncate">{title}</h1>
          <p className="text-xs text-white/50 truncate">{subtitle}</p>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-6"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33` }}
            >
              <Sparkles className="w-8 h-8" style={{ color: accentColor }} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-white/80 text-base md:text-lg font-medium">How can I help today?</p>
              <p className="text-white/40 text-xs md:text-sm mt-1">Powered by Hannah™</p>
            </div>
            <SuggestedPrompts prompts={suggestedPrompts} onPick={(p) => sendMessage(p)} accentColor={accentColor} />
          </motion.div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i}>
                <MessageBubble role={m.role} content={m.content} accentColor={accentColor} />
                {m.role === "assistant" && i === messages.length - 1 && !isStreaming && m.content && (
                  <div className="flex justify-start mt-1 ml-1">
                    <RatingButtons conversationId={null} />
                  </div>
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                <span>Thinking...</span>
              </div>
            )}
            {!isStreaming && messages[messages.length - 1]?.role === "assistant" && (
              <div className="pt-2">
                <SuggestedPrompts prompts={suggestedPrompts} onPick={(p) => sendMessage(p)} accentColor={accentColor} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-white/[0.08]">
        <div
          className="flex items-center gap-2 bg-[#1E3054] rounded-xl border border-white/[0.08] focus-within:border-white/20 transition-colors px-3 py-2 md:px-4 md:py-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask your advisor..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg transition-all disabled:opacity-30"
            style={{ background: input.trim() && !isStreaming ? `${accentColor}33` : "transparent" }}
            aria-label="Send"
          >
            <Send className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
