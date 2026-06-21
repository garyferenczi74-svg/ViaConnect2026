'use client';

import Link from 'next/link';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { BeginnerQA } from '@/components/hannah/BeginnerQA';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConsumerAICopilotPage() {
  return (
    <div className="flex flex-col h-screen" style={{ background: '#0B1120' }}>
      {/* ── Fixed Header ── */}
      <header
        className="flex items-center gap-3 px-3 md:px-4 py-3 backdrop-blur-xl z-20 flex-shrink-0"
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
          <ArrowLeft className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
        </Link>

        <div className="flex-1 min-w-0">
          <h1
            className="text-sm md:text-base font-bold leading-tight"
            style={{ color: '#B75E18' }}
          >
            ViaConnect AI
          </h1>
          <p className="text-xs text-gray-400">Your Precision Copilot</p>
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
        </button>
      </header>

      {/* ── Beginner Q&A Surface ── */}
      <div className="flex-1 flex flex-col min-h-0">
        <BeginnerQA />
      </div>
    </div>
  );
}
