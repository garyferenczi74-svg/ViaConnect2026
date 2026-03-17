'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface InteractionItem {
  med: string;
  status: 'safe' | 'warning';
  note: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  confidence?: string;
  references?: string[];
  interactions?: InteractionItem[];
  safetyRating?: string;
}

/* -------------------------------------------------------------------------- */
/*  Seed messages                                                             */
/* -------------------------------------------------------------------------- */

const seedMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Why was MTHFR+ recommended for me? I want to understand the science.',
  },
  {
    id: '2',
    role: 'assistant',
    content: `Your GENEX360™ results show you carry the MTHFR C677T heterozygous variant, which reduces your methylenetetrahydrofolate reductase enzyme activity by approximately 35%. This means your body has difficulty converting folic acid into its active form, L-methylfolate.\n\nMTHFR+ Methylation Support was specifically formulated for this variant and includes:\n\n• L-Methylfolate (800mcg) — Bypasses the MTHFR enzyme entirely\n• Methylcobalamin (1000mcg) — Active B12 for methionine synthase\n• Riboflavin-5-phosphate (25mg) — Cofactor for MTHFR enzyme\n• Betaine TMG (500mg) — Alternative methylation pathway support\n• Pyridoxal-5-phosphate (25mg) — Active B6 for transsulfuration\n\nYour CAQ responses also indicated elevated homocysteine concerns, which aligns with the methylation bottleneck we see in your genetic data.`,
    confidence: '94% (based on genetic + CAQ data)',
    references: ['PMID:23754956', 'PMID:30123456'],
  },
  {
    id: '3',
    role: 'user',
    content: 'Can I take this with my current medications?',
  },
  {
    id: '4',
    role: 'assistant',
    content: "I've cross-referenced MTHFR+ Methylation Support with your medication list from your health profile. Here's the interaction analysis:",
    interactions: [
      { med: 'Lisinopril 10mg', status: 'safe', note: 'No interaction' },
      { med: 'Metformin 500mg', status: 'safe', note: 'No interaction (note: Metformin may reduce B12 absorption — MTHFR+ provides methylcobalamin which helps offset this)' },
      { med: 'Omeprazole 20mg', status: 'warning', note: 'Minor interaction — take MTHFR+ at least 2 hours apart from Omeprazole for optimal folate absorption' },
    ],
    safetyRating: 'SAFE with timing adjustment',
  },
];

const suggestedPrompts = [
  "What's my biggest genetic risk?",
  'Optimize my sleep protocol',
  'Explain my CYP450 results',
  'What should I eat for my genotype?',
];

/* -------------------------------------------------------------------------- */
/*  Simple markdown bold renderer                                             */
/* -------------------------------------------------------------------------- */

function renderContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('• ')) {
      const parts = line.slice(2).split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-cyan-400 shrink-0">•</span>
          <span>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </span>
        </div>
      );
    }
    if (line === '') return <div key={i} className="h-2" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i}>
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

/* -------------------------------------------------------------------------- */
/*  Animations                                                                */
/* -------------------------------------------------------------------------- */

const messageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "Based on your GENEX360™ genomic profile, I can provide detailed insights on this topic. Your genetic data shows several relevant variants that influence this area. I'd recommend reviewing your full report and discussing specific protocol changes with your healthcare provider.",
        confidence: '87% (based on genetic data)',
        references: ['PMID:28597126', 'PMID:31447894'],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="shrink-0 pb-4 border-b border-white/10"
      >
        <h1 className="text-2xl font-[Syne] font-bold text-white">ViaConnect AI</h1>
        <p className="text-sm text-slate-400 mt-1">
          Powered by Claude · Grounded in your genetics
        </p>
      </motion.div>

      {/* ---- Messages ---- */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-6 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={messageVariants}
              initial="hidden"
              animate="show"
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI avatar */}
              {msg.role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mr-3 mt-1">
                  <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
                </div>
              )}

              <div className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#06B6D4]/20 rounded-br-sm text-slate-200'
                      : 'backdrop-blur-xl bg-white/5 border border-white/10 rounded-bl-sm text-slate-300'
                  }`}
                >
                  {renderContent(msg.content)}

                  {/* Interaction check cards */}
                  {msg.interactions && (
                    <div className="mt-4 flex flex-col gap-2">
                      {msg.interactions.map((item) => (
                        <div
                          key={item.med}
                          className={`flex items-start gap-2 p-3 rounded-lg border ${
                            item.status === 'safe'
                              ? 'bg-emerald-500/10 border-emerald-500/20'
                              : 'bg-amber-500/10 border-amber-500/20'
                          }`}
                        >
                          <span className="text-base shrink-0 mt-0.5">
                            {item.status === 'safe' ? '✅' : '⚠️'}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white">{item.med}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{item.note}</p>
                          </div>
                        </div>
                      ))}
                      {msg.safetyRating && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 w-fit">
                          <span className="text-xs font-semibold text-emerald-400">
                            Overall safety rating: ✅ {msg.safetyRating}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence */}
                  {msg.confidence && (
                    <p className="mt-3 text-xs text-slate-500">
                      Confidence: <span className="text-slate-400">{msg.confidence}</span>
                    </p>
                  )}

                  {/* References */}
                  {msg.references && msg.references.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-slate-500">References:</span>
                      {msg.references.map((ref) => (
                        <a
                          key={ref}
                          href={`https://pubmed.ncbi.nlm.nih.gov/${ref.replace('PMID:', '')}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                        >
                          {ref}
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
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-start gap-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[16px]">smart_toy</span>
              </div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10">
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

      {/* ---- Suggested Prompts ---- */}
      <div className="shrink-0 flex flex-wrap gap-2 pb-3">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* ---- Chat Input ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="shrink-0 sticky bottom-0 pb-2"
      >
        <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your health, supplements, or genomic data..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />

          {/* Mic icon */}
          <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>

          {/* Attachment icon */}
          <button className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[20px]">attach_file</span>
          </button>

          {/* Send button */}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 flex items-center justify-center text-white hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-2">
          AI responses are for informational purposes only. Consult your healthcare provider before making changes.
        </p>
      </motion.div>
    </div>
  );
}
