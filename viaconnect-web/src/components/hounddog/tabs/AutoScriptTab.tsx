'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight, Pencil, Send } from 'lucide-react';
import HounddogCard from '../shared/HounddogCard';
import HounddogPill from '../shared/HounddogPill';

interface BatchScript {
  id: string;
  title: string;
  hookQuote: string;
  angle: string;
  aiScore: number;
  duration: string;
}

const platforms = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'YouTube Long Form', 'Facebook', 'Reddit'];
const countOptions = [3, 5, 10, 15];

function ProgressBar({ value }: { value: number }) {
  const barColor = value > 90 ? 'bg-emerald-400' : value > 80 ? 'bg-[#2DA5A0]' : 'bg-[#B75E18]';
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function generateMockScripts(count: number): BatchScript[] {
  const titles = [
    'The peptide your doctor will not mention',
    'Why 90% of biohackers get this wrong',
    'I tracked my sleep for 60 days; here is what happened',
    'This recovery protocol is underrated',
    'Stop wasting money on the wrong peptides',
    'The science behind GHK Cu explained simply',
    'One change that fixed my HRV overnight',
    'BPC 157 vs TB 500: the real difference',
    'Three signs your stack needs an upgrade',
    'How I cut my recovery time in half',
    'The morning protocol nobody talks about',
    'My lab results after 90 days on peptides',
    'What your Oura ring is really telling you',
    'The longevity stack I recommend to everyone',
    'Why timing matters more than dosing',
  ];

  const hooks = [
    'Stop scrolling. This could change everything.',
    'Your doctor does not want you to know this.',
    'I was skeptical too, until I saw my lab results.',
    'This is the most underrated peptide on the market.',
    'If you are still doing this, you are wasting your money.',
    'Nobody is talking about this, and it is a problem.',
    'I tested this for 30 days so you do not have to.',
    'The data does not lie: look at these numbers.',
    'Three words: deep sleep optimization.',
    'This changed my morning routine forever.',
    'I was wrong about this peptide. Here is why.',
    'Save this before it gets buried in your feed.',
    'The difference between good sleep and great sleep.',
    'Your recovery is broken. Here is the fix.',
    'This is not medical advice; this is data.',
  ];

  const angles = ['Curiosity Gap', 'Contrarian', 'Data Driven', 'Personal Story', 'Myth Busting', 'Tutorial'];

  return Array.from({ length: count }, (_, i) => ({
    id: `batch-${i}`,
    title: titles[i % titles.length],
    hookQuote: hooks[i % hooks.length],
    angle: angles[i % angles.length],
    aiScore: Math.floor(Math.random() * 20) + 78,
    duration: `${Math.floor(Math.random() * 30) + 30} to ${Math.floor(Math.random() * 30) + 60}s`,
  }));
}

export default function AutoScriptTab() {
  const [niche, setNiche] = useState('Precision Wellness / Peptides');
  const [platform, setPlatform] = useState('TikTok');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<BatchScript[]>([]);

  const handleGenerate = () => {
    setLoading(true);
    setScripts([]);
    setTimeout(() => {
      setScripts(generateMockScripts(count));
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Input form */}
      <HounddogCard className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Batch Script Generator</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-white/50 text-xs block mb-1.5">Niche</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1.5">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors appearance-none"
            >
              {platforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/50 text-xs block mb-1.5">Count</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors appearance-none"
            >
              {countOptions.map((c) => (
                <option key={c} value={c}>{c} scripts</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Sparkles size={14} strokeWidth={1.5} />
          )}
          {loading ? 'Generating...' : 'Generate Batch'}
        </button>
      </HounddogCard>

      {/* Results */}
      {scripts.length > 0 && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-white font-semibold text-sm">
              {scripts.length} Scripts Generated
            </p>
            <button className="flex items-center gap-2 bg-[#B75E18] hover:bg-[#B75E18]/80 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <Send size={12} strokeWidth={1.5} />
              Push All to Pipeline
            </button>
          </div>

          {/* Script cards */}
          <div className="space-y-3">
            {scripts.map((script) => (
              <HounddogCard key={script.id} className="p-4 border-l-2 border-l-[#2DA5A0]">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold mb-1">{script.title}</p>
                    <p className="text-white/40 text-xs italic mb-2">"{script.hookQuote}"</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <HounddogPill label={script.angle} color="teal" size="sm" />
                      <HounddogPill label={`AI: ${script.aiScore}`} color={script.aiScore > 85 ? 'green' : 'orange'} size="sm" />
                      <HounddogPill label={script.duration} color="gray" size="sm" />
                    </div>
                    <div className="mt-2 w-full max-w-[200px]">
                      <ProgressBar value={script.aiScore} />
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-[#2DA5A0] bg-white/5 hover:bg-[#2DA5A0]/10 px-3 py-1.5 rounded-lg transition-colors">
                      <Pencil size={12} strokeWidth={1.5} />
                      Edit
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-[#B75E18] bg-white/5 hover:bg-[#B75E18]/10 px-3 py-1.5 rounded-lg transition-colors">
                      <ArrowRight size={12} strokeWidth={1.5} />
                      Send to Pipeline
                    </button>
                  </div>
                </div>
              </HounddogCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
