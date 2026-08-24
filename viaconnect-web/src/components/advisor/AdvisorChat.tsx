"use client";

/**
 * AdvisorChat (Prompt #60b — main shared chat surface; Prompt 219F)
 *
 * Streams responses from /api/advisor/chat. Fail-open UX: preserves the
 * user's message in the input on error, shows an honest error bubble with
 * Retry. Loads persisted history on mount. Chips send real messages.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import MessageBubble from "./MessageBubble";
import SuggestedPrompts from "./SuggestedPrompts";
import RatingButtons from "./RatingButtons";
import { extractMsgIdMarker } from "@/lib/jeffery/advisor-msg-marker";

type AdvisorRole = "consumer" | "practitioner" | "naturopath";

interface AdvisorChatProps {
  role: AdvisorRole;
  patientId?: string;
  accentColor: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  suggestedPrompts: string[];
  initialPrompt?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: string | null;
  isError?: boolean;
  /** When set, Retry re-sends this user text. */
  retryText?: string;
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
  const [historyLoading, setHistoryLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didAutoSendRef = useRef(false);
  const historyLoadedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load persisted history once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/advisor/history?role=${encodeURIComponent(role)}&limit=40`, {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages?: Array<{ id: string; role: string; content: string }>;
        };
        if (cancelled || !data.messages?.length) return;
        setMessages(
          data.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              id: m.id,
            }))
        );
      } catch {
        /* fail-open empty */
      } finally {
        if (!cancelled) {
          historyLoadedRef.current = true;
          setHistoryLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const sendMessage = useCallback(
    async (override?: string) => {
      const userMsg = (override ?? input).trim();
      if (!userMsg || isStreaming) return;

      // Clear input only after we accept the send
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
      setIsStreaming(true);

      try {
        const res = await fetch("/api/advisor/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ message: userMsg, role, patientId }),
        });

        if (!res.ok) {
          const errPayload = await res.json().catch(() => ({ error: null as string | null }));
          const errText =
            (errPayload && typeof errPayload.error === "string" && errPayload.error) ||
            (res.status === 429
              ? "You are sending messages a bit quickly. Please wait a moment and try again."
              : res.status === 401
                ? "Please sign in again to chat with Hannah."
                : "Something went wrong sending your message. Your text is ready to retry.");

          // Preserve user text in input for retry
          setInput(userMsg);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: errText,
              isError: true,
              retryText: userMsg,
            },
          ]);
          setIsStreaming(false);
          // Focus input so keyboard stays usable on mobile
          requestAnimationFrame(() => inputRef.current?.focus());
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMsg = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantMsg += chunk;
          const { clean, messageId } = extractMsgIdMarker(assistantMsg);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: clean,
              id: messageId ?? updated[updated.length - 1]?.id,
            };
            return updated;
          });
        }

        // Final strip of marker if it arrived in last chunk
        const final = extractMsgIdMarker(assistantMsg);
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: final.clean,
              id: final.messageId ?? updated[updated.length - 1].id,
            };
          }
          return updated;
        });
      } catch {
        setInput(userMsg);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I could not reach the server. Your message is ready to retry.",
            isError: true,
            retryText: userMsg,
          },
        ]);
        requestAnimationFrame(() => inputRef.current?.focus());
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, role, patientId]
  );

  useEffect(() => {
    if (!initialPrompt || didAutoSendRef.current || historyLoading) return;
    didAutoSendRef.current = true;
    void sendMessage(initialPrompt);
  }, [initialPrompt, historyLoading, sendMessage]);

  const handleRetry = (text: string) => {
    // Remove the error bubble and the preceding user bubble so we do not duplicate
    setMessages((prev) => {
      const next = [...prev];
      // Drop trailing error assistant + matching user if present
      if (next.length && next[next.length - 1]?.isError) next.pop();
      if (next.length && next[next.length - 1]?.role === "user" && next[next.length - 1].content === text) {
        next.pop();
      }
      return next;
    });
    void sendMessage(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] bg-[#1A2744] max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-white/[0.08] min-w-0">
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 space-y-4">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-6 px-1"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}33` }}
            >
              <Sparkles className="w-8 h-8" style={{ color: accentColor }} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-white/80 text-base md:text-lg font-medium">How can I help today?</p>
              <p className="text-white/40 text-xs md:text-sm mt-1">Powered by Hannah</p>
            </div>
            <SuggestedPrompts
              prompts={suggestedPrompts}
              onPick={(p) => sendMessage(p)}
              accentColor={accentColor}
            />
          </motion.div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={m.id ?? `m-${i}`} className="min-w-0">
                <MessageBubble role={m.role} content={m.content} accentColor={accentColor} />
                {m.isError && m.retryText && !isStreaming && (
                  <div className="flex justify-start mt-2 ml-1">
                    <button
                      type="button"
                      onClick={() => handleRetry(m.retryText!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/80 border border-white/15 hover:bg-white/10 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Retry
                    </button>
                  </div>
                )}
                {m.role === "assistant" &&
                  !m.isError &&
                  i === messages.length - 1 &&
                  !isStreaming &&
                  m.content && (
                    <div className="flex justify-start mt-1 ml-1">
                      <RatingButtons conversationId={m.id ?? null} />
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
            {!isStreaming && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.isError && (
              <div className="pt-2">
                <SuggestedPrompts
                  prompts={suggestedPrompts}
                  onPick={(p) => sendMessage(p)}
                  accentColor={accentColor}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer — sticky; safe-area for mobile keyboard */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-t border-white/[0.08] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 bg-[#1E3054] rounded-xl border border-white/[0.08] focus-within:border-white/20 transition-colors px-3 py-2 md:px-4 md:py-3 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask your advisor..."
            disabled={isStreaming}
            enterKeyHint="send"
            className="flex-1 min-w-0 bg-transparent text-white text-sm placeholder:text-white/30 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg transition-all disabled:opacity-30 flex-shrink-0"
            style={{
              background: input.trim() && !isStreaming ? `${accentColor}33` : "transparent",
            }}
            aria-label="Send"
          >
            <Send className="w-4 h-4" style={{ color: accentColor }} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
