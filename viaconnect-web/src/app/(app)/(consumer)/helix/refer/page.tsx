'use client';

import { useState } from 'react';
import { Copy, Share2 } from 'lucide-react';

const GLASS =
  'bg-[rgba(26,39,68,0.55)] backdrop-blur-[24px] border border-white/[0.08] rounded-2xl';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#B75E18] mb-3">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReferPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('https://viaconnect.com/ref/GARY-VIA-2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <Overline>Refer Friends, Earn Helix$</Overline>

      {/* Referral code */}
      <div
        className={`${GLASS} p-6 text-center border border-dashed border-white/20 cursor-pointer`}
        onClick={handleCopy}
      >
        <p className="font-mono text-xl text-[#2DA5A0] font-bold">GARY-VIA-2026</p>
        <p className="text-xs text-tertiary mt-1">{copied ? 'Copied!' : 'Tap to copy'}</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2DA5A0] text-white text-sm font-bold hover:bg-[#2DA5A0]/80 transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white text-sm font-bold hover:bg-white/5 transition-colors">
          <Share2 className="w-4 h-4" />
          Share via Text
        </button>
      </div>

      {/* Stats */}
      <div className={`${GLASS} p-4 text-center`}>
        <p className="text-sm text-white">
          <span className="font-bold">3</span> Invited &middot;{' '}
          <span className="font-bold">2</span> Joined &middot;{' '}
          <span className="font-bold text-[#2DA5A0]">1,500 Helix$</span> Earned
        </p>
      </div>

      {/* Tier info */}
      <div className={`${GLASS} p-4`}>
        <p className="text-xs text-tertiary leading-relaxed">
          <span className="text-white font-bold">You: +500</span> &middot;{' '}
          <span className="text-white font-bold">Friend: +250</span> &middot;{' '}
          Friend subscribes: <span className="text-[#2DA5A0] font-bold">+1,000 more to you</span>
        </p>
      </div>
    </div>
  );
}
