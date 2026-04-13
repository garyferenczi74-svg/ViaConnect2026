'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Pencil, Copy, Loader2 } from 'lucide-react';
import HounddogCard from '../shared/HounddogCard';
import HounddogPill from '../shared/HounddogPill';

interface GeneratedScript {
  hookScore: number;
  hook: string;
  body: string;
  cta: string;
  estimatedViews: string;
  engagementPrediction: number;
  duration: string;
  hashtags: string[];
}

const platforms = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'YouTube Long Form', 'Facebook', 'Reddit'];

export default function CreateTab() {
  const [niche, setNiche] = useState('Precision Wellness / Peptides');
  const [platform, setPlatform] = useState('TikTok');
  const [rawIdea, setRawIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedScript | null>(null);

  const handleGenerate = () => {
    if (!rawIdea.trim()) return;
    setLoading(true);
    setResult(null);

    // Mock response after 1.5s simulated delay
    setTimeout(() => {
      setResult({
        hookScore: 91,
        hook: 'Stop scrolling if you care about your sleep. This one peptide changed everything.',
        body: 'I tested BPC 157 for 30 days straight. Here is what happened to my deep sleep, recovery time, and morning energy. The data does not lie; my Oura ring tracked every night.\n\nWeek 1: Deep sleep increased by 22 minutes\nWeek 2: Recovery score jumped from 64 to 81\nWeek 3: Morning HRV consistently above 65\nWeek 4: Best sleep metrics of my entire life',
        cta: 'Save this for later. Follow for more protocols backed by real data, not hype.',
        estimatedViews: '180K to 450K',
        engagementPrediction: 87,
        duration: '45 to 60 seconds',
        hashtags: ['#peptides', '#biohacking', '#sleepoptimization', '#bpc157', '#precisionwellness', '#longevity', '#deepwork'],
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Input form */}
      <HounddogCard className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Idea to Script Generator</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Niche */}
          <div>
            <label className="text-white/50 text-xs block mb-1.5">Niche</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="text-white/50 text-xs block mb-1.5">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors appearance-none"
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Raw Idea */}
        <div className="mb-4">
          <label className="text-white/50 text-xs block mb-1.5">Raw Idea</label>
          <textarea
            value={rawIdea}
            onChange={(e) => setRawIdea(e.target.value)}
            placeholder="Describe your content idea: what angle, what message, what audience reaction you want..."
            className="w-full h-28 bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm resize-y focus:outline-none focus:border-[#2DA5A0]/40 transition-colors"
          />
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading || !rawIdea.trim()}
          className="flex items-center gap-2 bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Sparkles size={14} strokeWidth={1.5} />
          )}
          {loading ? 'Generating...' : 'Generate Script'}
        </button>
      </HounddogCard>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="flex items-center gap-3 bg-[#2DA5A0]/10 border border-[#2DA5A0]/20 rounded-xl px-4 py-3">
            <Sparkles size={16} strokeWidth={1.5} className="text-[#2DA5A0]" />
            <span className="text-[#2DA5A0] text-sm font-medium">Script generated successfully</span>
            <HounddogPill label={`Hook Score: ${result.hookScore}`} color="teal" size="md" />
          </div>

          {/* Script blocks */}
          <div className="space-y-3">
            {/* Hook */}
            <HounddogCard className="p-4 border-l-2 border-l-[#B75E18]">
              <p className="text-[#E8863A] text-[10px] font-semibold uppercase tracking-wider mb-1">Hook</p>
              <p className="text-white text-sm">{result.hook}</p>
            </HounddogCard>

            {/* Body */}
            <HounddogCard className="p-4 border-l-2 border-l-[#2DA5A0]">
              <p className="text-[#2DA5A0] text-[10px] font-semibold uppercase tracking-wider mb-1">Body</p>
              <p className="text-white text-sm whitespace-pre-line">{result.body}</p>
            </HounddogCard>

            {/* CTA */}
            <HounddogCard className="p-4 border-l-2 border-l-purple-500">
              <p className="text-purple-400 text-[10px] font-semibold uppercase tracking-wider mb-1">CTA</p>
              <p className="text-white text-sm">{result.cta}</p>
            </HounddogCard>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HounddogCard className="p-3 text-center">
              <p className="text-white/40 text-[10px]">Estimated Views</p>
              <p className="text-white font-bold text-sm">{result.estimatedViews}</p>
            </HounddogCard>
            <HounddogCard className="p-3 text-center">
              <p className="text-white/40 text-[10px]">Engagement Prediction</p>
              <p className="text-[#2DA5A0] font-bold text-sm">{result.engagementPrediction}%</p>
            </HounddogCard>
            <HounddogCard className="p-3 text-center">
              <p className="text-white/40 text-[10px]">Duration</p>
              <p className="text-white font-bold text-sm">{result.duration}</p>
            </HounddogCard>
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-2">
            {result.hashtags.map((tag) => (
              <HounddogPill key={tag} label={tag} color="teal" size="sm" />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 bg-[#B75E18] hover:bg-[#B75E18]/80 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              <ArrowRight size={14} strokeWidth={1.5} />
              Add to Pipeline
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Pencil size={14} strokeWidth={1.5} />
              Edit in Editor
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Copy size={14} strokeWidth={1.5} />
              Clone for Other Platforms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
