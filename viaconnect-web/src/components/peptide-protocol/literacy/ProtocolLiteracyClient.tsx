'use client';

/**
 * Prompt 226 Module C: Protocol Literacy reader.
 * Principles only. No dose entry fields.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import {
  PROTOCOL_LITERACY_INTRO,
  PROTOCOL_LITERACY_LESSONS,
} from '@/lib/peptides/protocolLiteracy';

export function ProtocolLiteracyClient() {
  const [openId, setOpenId] = useState<string | null>(
    PROTOCOL_LITERACY_LESSONS[0]?.id ?? null,
  );

  const lessons = useMemo(() => PROTOCOL_LITERACY_LESSONS, []);

  return (
    <div className="space-y-4" data-testid="protocol-literacy">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-white">Protocol Literacy</h2>
        </div>
        <p className="text-xs text-white/55 leading-relaxed">{PROTOCOL_LITERACY_INTRO}</p>
        <p className="text-[11px] text-white/40 leading-relaxed rounded-xl border border-white/10 bg-black/20 p-3">
          Lessons 10 and 12 are the ones that stop guessing: the absence of an established dose
          is information, and a licensed clinician owns any real regimen.
        </p>
      </header>

      <ol className="space-y-2">
        {lessons.map((lesson) => {
          const open = openId === lesson.id;
          return (
            <li
              key={lesson.id}
              className="rounded-2xl border border-white/10 bg-[#1E3054]/70 overflow-hidden"
              data-testid={`literacy-lesson-${lesson.number}`}
            >
              <button
                type="button"
                className="w-full flex items-start gap-3 px-4 py-3 text-left"
                onClick={() => setOpenId(open ? null : lesson.id)}
                aria-expanded={open}
              >
                <span className="text-[11px] font-mono text-[#2DA5A0] mt-0.5 shrink-0">
                  {String(lesson.number).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white">
                    {lesson.title}
                  </span>
                  <span className="block text-[11px] text-white/45 mt-0.5 leading-relaxed">
                    {lesson.summary}
                  </span>
                </span>
                {open ? (
                  <ChevronUp className="w-4 h-4 text-white/40 shrink-0" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40 shrink-0" strokeWidth={1.5} />
                )}
              </button>
              {open ? (
                <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                  {lesson.body.map((para, i) => (
                    <p
                      key={i}
                      className="text-sm text-white/70 leading-relaxed"
                    >
                      {para}
                    </p>
                  ))}
                  {lesson.converterIllustration ? (
                    <Link
                      href="/peptide-protocol/converter"
                      className="inline-flex items-center gap-1.5 text-xs text-[#2DA5A0] underline"
                    >
                      Open converter history for your own numbers
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="text-[11px] text-white/40 leading-relaxed">
        Educational information only. Not medical advice. ViaConnect does not recommend doses
        and does not teach injection technique.
      </p>
    </div>
  );
}
