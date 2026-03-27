'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MoreHorizontal,
  SendHorizonal,
  Paperclip,
  Mic,
} from 'lucide-react';
import { VCButton } from '@/components/ui/VCButton';

// ── Types ────────────────────────────────────────────────────────────────────

interface ActionButton {
  label: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
  geneticBadges?: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Wrap rs numbers in styled code spans */
function renderContent(text: string) {
  const parts = text.split(/(rs\d+)/g);
  return parts.map((part, i) =>
    /^rs\d+$/.test(part) ? (
      <code
        key={i}
        className="font-mono"
        style={{ color: '#5ED8D3' }}
      >
        {part}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ── Thinking Dots ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-start max-w-[85%]">
      <div className="glass-v2 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: 'rgba(45,165,160,0.6)' }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: 'rgba(45,165,160,0.6)' }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: 'rgba(45,165,160,0.6)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Gene Badge ───────────────────────────────────────────────────────────────

function GeneBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono"
      style={{ background: 'rgba(45,165,160,0.1)', color: '#2DA5A0' }}
    >
      {name}
    </span>
  );
}

// ── Quick Prompt Pill ────────────────────────────────────────────────────────

function QuickPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-v2 flex-shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors hover:brightness-110"
      style={{ color: '#2DA5A0' }}
    >
      {label}
    </button>
  );
}

// ── Initial Conversation ─────────────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'ai-1',
    role: 'assistant',
    content:
      "Good morning, Gary! Based on your Oura data from last night (6.2hrs, 45min deep sleep, HRV 38ms \u2014 12% below your baseline), I\u2019ve adjusted today\u2019s plan:\n\n\u2022 Moved NAD+ to 8am (your COMT AG variant metabolizes faster in morning)\n\u2022 Added extra RELAX+ tonight\n\u2022 Reduced activity target to moderate (recovery: 52/100)\n\nYour IL-6 GG variant means your body responds more aggressively to sleep debt. Prioritize 7.5+ hours tonight.",
    timestamp: new Date(Date.now() - 600000),
    actions: [{ label: 'Apply Adjusted Plan' }],
    geneticBadges: ['COMT Val158Met', 'IL-6'],
  },
  {
    id: 'user-1',
    role: 'user',
    content: 'Why did you move NAD+ to morning?',
    timestamp: new Date(Date.now() - 540000),
  },
  {
    id: 'ai-2',
    role: 'assistant',
    content:
      "Great question. Your COMT Val158Met variant (rs4680, AG genotype) puts you in the intermediate metabolizer category...\n\n1. You break down catecholamines at a moderate rate\n2. NAD+ boosts mitochondrial energy via NADH/NAD+ ratio\n3. With reduced deep sleep, your mitochondria need earlier support\n4. Taking it AM gives your COMT pathway a full day to process\n\n\ud83d\udcca View Your COMT Report\n\ud83d\udc8a Learn About NAD+",
    timestamp: new Date(Date.now() - 480000),
    geneticBadges: ['COMT Val158Met'],
  },
];

const QUICK_PROMPTS = [
  'Why this supplement?',
  'Adjust my plan',
  'Explain my genetics',
  'What should I eat today?',
  'Show my interactions',
];

const MOCK_AI_RESPONSE =
  "I\u2019m analyzing your genetic profile and biometric data to give you the most personalized answer. The full AI engine is being connected \u2014 stay tuned for real-time genomic intelligence!";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConsumerAICopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const addUserMessageAndRespond = useCallback(
    (text: string) => {
      if (!text.trim() || isThinking) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsThinking(true);

      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: MOCK_AI_RESPONSE,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsThinking(false);
      }, 1500);
    },
    [isThinking]
  );

  const handleSend = () => {
    addUserMessageAndRespond(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#0B1120' }}>
      {/* ── Fixed Header ── */}
      <header
        className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl z-20"
        style={{
          background: 'rgba(13, 23, 48, 0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          href="/dashboard"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ArrowLeft className="w-4 h-4 text-gray-300" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-bold leading-tight"
            style={{ color: '#B75E18' }}
          >
            ViaConnect AI
          </h1>
          <p className="text-xs text-gray-400">Your Precision Copilot</p>
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </header>

      {/* ── Scrollable Messages ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 space-y-4"
      >
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex flex-col items-end">
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(30, 58, 95, 0.9)' }}
                >
                  <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                <span className="text-xs mt-1 mr-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          }

          // AI message
          return (
            <div key={msg.id} className="flex flex-col items-start max-w-[85%]">
              <div className="glass-v2 rounded-2xl px-4 py-3 w-full">
                <span
                  className="text-xs font-bold block mb-1"
                  style={{ color: '#2DA5A0' }}
                >
                  AI
                </span>
                <p className="text-body-sm text-primary whitespace-pre-wrap leading-relaxed">
                  {renderContent(msg.content)}
                </p>

                {/* Action buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.actions.map((action, i) => (
                      <VCButton key={i} variant="primary" size="sm">
                        {action.label}
                      </VCButton>
                    ))}
                  </div>
                )}
              </div>

              {/* Genetic badges */}
              {msg.geneticBadges && msg.geneticBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
                  {msg.geneticBadges.map((badge) => (
                    <GeneBadge key={badge} name={badge} />
                  ))}
                </div>
              )}

              <span
                className="text-xs mt-1 ml-1"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}

        {isThinking && <ThinkingDots />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Fixed Bottom Input Area ── */}
      <div
        className="glass-v2 px-4 pt-3 pb-2 z-20"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-200 transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ViaConnect AI..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none py-2"
          />

          <button className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-200 transition-colors">
            <Mic className="w-4 h-4" />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 flex items-center justify-center rounded-full transition-all disabled:opacity-40"
            style={{
              width: 36,
              height: 36,
              background: 'linear-gradient(135deg, #2DA5A0, #1F8A85)',
            }}
          >
            <SendHorizonal className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Quick prompt pills */}
        <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide">
          {QUICK_PROMPTS.map((prompt) => (
            <QuickPill
              key={prompt}
              label={prompt}
              onClick={() => addUserMessageAndRespond(prompt)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
