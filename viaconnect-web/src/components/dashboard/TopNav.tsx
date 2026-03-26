'use client';

import React, { useState, useEffect, useRef } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function useTypewriter(lines: string[], charDelay = 45, lineDelay = 600) {
  const [display, setDisplay] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (lineIndex >= lines.length) {
      setDone(true);
      return;
    }

    const currentLine = lines[lineIndex];

    if (charIndex <= currentLine.length) {
      timerRef.current = setTimeout(() => {
        // Build full display: all previous lines + current partial line
        const prev = lines.slice(0, lineIndex).join('\n');
        const partial = currentLine.slice(0, charIndex);
        setDisplay(prev ? prev + '\n' + partial : partial);
        setCharIndex((c) => c + 1);
      }, charDelay);
    } else {
      // Line finished — pause then move to next
      timerRef.current = setTimeout(() => {
        setLineIndex((l) => l + 1);
        setCharIndex(0);
      }, lineDelay);
    }

    return () => clearTimeout(timerRef.current);
  }, [lineIndex, charIndex, lines, charDelay, lineDelay]);

  return { display, done };
}

const portalTabs = [
  { label: 'ADMIN', isAdmin: true },
  { label: 'Consumer', isActive: true },
  { label: 'Practitioner' },
  { label: 'Naturopath' },
];

export default function TopNav() {
  const message = `${getGreeting()}, Gary.`;

  const { display, done } = useTypewriter([message], 40, 500);

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(13, 18, 37, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Greeting Bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-4">
        {/* Left — Typewriter Greeting */}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            {display}
            {!done && (
              <span
                className="inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom animate-pulse"
                style={{ background: '#b75e18' }}
              />
            )}
          </p>
        </div>

        {/* Right — Bell + Avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notification Bell */}
          <button
            className="relative flex items-center justify-center w-10 h-10 rounded-full glass-hover transition-colors"
            style={{
              background: 'rgba(18, 27, 55, 0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', color: '#94a3b8' }}
            >
              notifications
            </span>
            {/* Amber dot indicator */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: '#b75e18' }}
            />
          </button>

          {/* User Avatar */}
          <div
            className="w-10 h-10 rounded-full overflow-hidden"
            style={{ border: '2px solid #b75e18' }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: '#1a2444' }}
            >
              GF
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
