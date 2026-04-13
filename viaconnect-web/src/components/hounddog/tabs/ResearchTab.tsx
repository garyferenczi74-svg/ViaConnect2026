'use client';

import React, { useState } from 'react';
import { Search, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import HounddogCard from '../shared/HounddogCard';
import HounddogPill from '../shared/HounddogPill';

interface CompetitorRow {
  name: string;
  platform: string;
  topHook: string;
  views: number;
  engagement: number;
}

interface RankedHook {
  rank: number;
  text: string;
  angle: string;
  score: number;
}

const mockCompetitors: CompetitorRow[] = [
  { name: 'PeptideKing', platform: 'TikTok', topHook: 'Nobody is talking about this peptide combo', views: 3200000, engagement: 8.4 },
  { name: 'BiohackHer', platform: 'Instagram', topHook: 'My sleep went from 4 to 8 hours with one change', views: 890000, engagement: 6.1 },
  { name: 'Dr. Stack', platform: 'YouTube', topHook: 'I tested every peptide so you do not have to', views: 1450000, engagement: 5.8 },
  { name: 'WellnessLab', platform: 'TikTok', topHook: 'Your recovery protocol is missing this', views: 2100000, engagement: 7.2 },
];

const mockHooks: RankedHook[] = [
  { rank: 1, text: 'Stop scrolling; this peptide could change your life', angle: 'Curiosity Gap', score: 96 },
  { rank: 2, text: 'Your doctor will never tell you about this recovery hack', angle: 'Contrarian', score: 93 },
  { rank: 3, text: 'I tracked my sleep for 90 days and the results are insane', angle: 'Data Driven', score: 91 },
  { rank: 4, text: 'Three peptides that actually work, backed by research', angle: 'Authority', score: 88 },
  { rank: 5, text: 'If you are over 30, you need to hear this', angle: 'Demographic', score: 85 },
  { rank: 6, text: 'The $2 recovery hack nobody talks about', angle: 'Value Prop', score: 82 },
];

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

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

export default function ResearchTab() {
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleAnalyze = () => {
    if (!competitorUrl.trim()) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    setTimeout(() => {
      setAnalysisResult(
        `Competitor Analysis: @${competitorUrl.trim()}\n\n` +
        `Content Strategy:\n` +
        `This creator primarily uses curiosity gap hooks combined with personal transformation stories. ` +
        `Their posting cadence is 2x daily on TikTok, 1x daily on Instagram Reels. ` +
        `Peak posting times: 8:00 AM and 6:30 PM EST.\n\n` +
        `Hook Patterns:\n` +
        `70% of top performing content uses a "stop scrolling" or direct address opener. ` +
        `Data driven claims appear in 45% of viral content. ` +
        `Contrarian angles generate 2.3x more engagement than standard educational content.\n\n` +
        `Engagement Analysis:\n` +
        `Average engagement rate: 6.8% (above niche average of 4.2%). ` +
        `Comment to like ratio: 1:18 (indicates high conversation quality). ` +
        `Save rate: 12% of total engagement (strong indicator of valuable content).\n\n` +
        `Recommendations:\n` +
        `1. Adopt curiosity gap hooks with data specificity\n` +
        `2. Increase posting frequency during 6:00 to 8:00 PM window\n` +
        `3. Focus on transformation content with measurable outcomes`
      );
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Competitor Analyzer */}
      <HounddogCard className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Competitor Analyzer</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="Enter competitor handle or URL..."
            className="flex-1 bg-[#141E33] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2DA5A0]/40 transition-colors"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !competitorUrl.trim()}
            className="flex items-center gap-2 bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0"
          >
            {analyzing ? (
              <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Search size={14} strokeWidth={1.5} />
            )}
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {analysisResult && (
          <div className="mt-4 bg-[#141E33] border border-white/[0.08] rounded-lg p-4">
            <p className="text-white text-sm whitespace-pre-line leading-relaxed">{analysisResult}</p>
          </div>
        )}
      </HounddogCard>

      {/* Tracked Competitors Table */}
      <HounddogCard className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Tracked Competitors</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-white/40 text-[10px] uppercase tracking-wider font-medium pb-3 pr-4">Name</th>
                <th className="text-white/40 text-[10px] uppercase tracking-wider font-medium pb-3 pr-4">Platform</th>
                <th className="text-white/40 text-[10px] uppercase tracking-wider font-medium pb-3 pr-4">Top Hook</th>
                <th className="text-white/40 text-[10px] uppercase tracking-wider font-medium pb-3 pr-4 text-right">Views</th>
                <th className="text-white/40 text-[10px] uppercase tracking-wider font-medium pb-3 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {mockCompetitors.map((comp) => (
                <tr key={comp.name} className="border-b border-white/[0.04]">
                  <td className="py-3 pr-4">
                    <span className="text-white text-sm font-medium">{comp.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-white/60 text-xs">{comp.platform}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-white/50 text-xs italic truncate max-w-[200px] block">
                      "{comp.topHook}"
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-white text-xs font-medium">{formatViews(comp.views)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <HounddogPill
                      label={`${comp.engagement}%`}
                      color={comp.engagement > 7 ? 'green' : comp.engagement > 5 ? 'teal' : 'orange'}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HounddogCard>

      {/* Top Hooks */}
      <HounddogCard className="p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Top Hooks</h3>
        <div className="space-y-3">
          {mockHooks.map((hook) => (
            <div
              key={hook.rank}
              className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#141E33] rounded-lg p-4"
            >
              {/* Rank */}
              <span className="text-white/20 text-lg font-bold w-8 flex-shrink-0">
                #{hook.rank}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm mb-2">"{hook.text}"</p>
                <div className="flex items-center gap-2 mb-2">
                  <HounddogPill label={hook.angle} color="teal" size="sm" />
                  <HounddogPill label={`Score: ${hook.score}`} color={hook.score > 90 ? 'green' : hook.score > 80 ? 'teal' : 'orange'} size="sm" />
                </div>
                <div className="w-full max-w-[200px]">
                  <ProgressBar value={hook.score} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button className="flex items-center gap-1.5 text-xs text-[#2DA5A0] hover:text-[#2DA5A0]/80 bg-[#2DA5A0]/10 px-3 py-1.5 rounded-lg transition-colors">
                  <ArrowRight size={12} strokeWidth={1.5} />
                  Use Hook
                </button>
                <button className="flex items-center gap-1.5 text-xs text-[#B75E18] hover:text-[#B75E18]/80 bg-[#B75E18]/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Sparkles size={12} strokeWidth={1.5} />
                  Generate Script
                </button>
              </div>
            </div>
          ))}
        </div>
      </HounddogCard>
    </div>
  );
}
