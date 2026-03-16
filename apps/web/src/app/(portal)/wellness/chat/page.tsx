'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                       */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  citations?: { label: string; url: string }[];
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      "Hello! I'm your AI health assistant, grounded in your GeneX360 genomic data and FarmCeutica product catalog. How can I help you today?",
    timestamp: '10:02 AM',
  },
  {
    id: '2',
    role: 'user',
    content: 'What supplements should I take for my MTHFR variant?',
    timestamp: '10:03 AM',
  },
  {
    id: '3',
    role: 'assistant',
    content:
      'Based on your MTHFR C677T heterozygous status, I recommend:\n\n1. **Methylated B-Complex** \u2014 Contains L-methylfolate and methylcobalamin, the active forms your body needs.\n2. **Riboflavin (B2)** \u2014 Acts as a cofactor for MTHFR enzyme function.\n\nYour genetic data shows reduced MTHFR enzyme activity (~65% of normal), making methylated forms essential.',
    timestamp: '10:03 AM',
    citations: [
      { label: 'PubMed: 28597126', url: 'https://pubmed.ncbi.nlm.nih.gov/28597126/' },
      { label: 'PubMed: 31447894', url: 'https://pubmed.ncbi.nlm.nih.gov/31447894/' },
    ],
  },
  {
    id: '4',
    role: 'user',
    content: 'Should I worry about my homocysteine levels?',
    timestamp: '10:04 AM',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderMarkdown(text: string) {
  // Very lightweight bold markdown renderer
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const messageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate typing indicator
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "Thank you for your question. Based on your genomic profile, I'd recommend discussing this with your healthcare provider and reviewing your latest lab results. I can help you understand the relevant genetic factors involved.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="shrink-0 pb-4 border-b border-white/10"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">AI Health Assistant</h1>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
            Powered by Claude
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">RAG-grounded in your genomic data</p>
      </motion.div>

      {/* ---- Messages ---- */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} variants={messageVariants} initial="hidden" animate="show" className="flex gap-3">
              {/* Avatar */}
              {msg.role === 'assistant' ? (
                <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74z" />
                  </svg>
                </div>
              ) : (
                <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-cyan-500/20">
                  JD
                </div>
              )}

              {/* Bubble */}
              <div className="flex-1 max-w-[85%]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-300">{msg.role === 'assistant' ? 'AI Assistant' : 'You'}</span>
                  <span className="text-xs text-slate-500">{msg.timestamp}</span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'assistant'
                      ? 'backdrop-blur-xl bg-violet-500/10 border border-violet-500/15 text-slate-200'
                      : 'backdrop-blur-xl bg-white/5 border border-white/10 text-slate-200'
                  }`}
                >
                  {renderMarkdown(msg.content)}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                      {msg.citations.map((c) => (
                        <a
                          key={c.label}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                          {c.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74z" />
                </svg>
              </div>
              <div className="rounded-2xl px-4 py-3 backdrop-blur-xl bg-violet-500/10 border border-violet-500/15">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Input Area ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="shrink-0 pt-4 border-t border-white/10 space-y-2"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your health, supplements, or genomic data..."
            className="flex-1 px-4 py-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 backdrop-blur-xl bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/25 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-medium hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          AI responses are for informational purposes only. Consult your healthcare provider before making changes to your protocol.
        </p>
      </motion.div>
    </div>
  );
}
