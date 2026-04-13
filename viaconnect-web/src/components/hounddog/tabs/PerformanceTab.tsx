'use client';

import React, { useState } from 'react';
import { X, TrendingUp, Eye, Bookmark } from 'lucide-react';
import HounddogCard from '../shared/HounddogCard';
import HounddogPill from '../shared/HounddogPill';

interface TopPost {
  title: string;
  views: number;
  engPercent: number;
  saves: number;
}

interface PlatformData {
  name: string;
  color: string;
  followers: number;
  engagement: number;
  growth30d: number;
  status: 'live' | 'offline';
  sparkline: number[];
  topPosts: TopPost[];
}

const mockPlatforms: PlatformData[] = [
  {
    name: 'Instagram',
    color: '#E1306C',
    followers: 48200,
    engagement: 4.8,
    growth30d: 12.3,
    status: 'live',
    sparkline: [20, 25, 22, 30, 35, 28, 40, 38, 45, 42, 50, 48, 55, 52, 60, 58, 62, 65, 60, 68, 72, 70, 75, 78, 80, 76, 82, 85, 88, 90],
    topPosts: [
      { title: 'Peptide stacking for recovery', views: 128000, engPercent: 6.2, saves: 4200 },
      { title: 'Morning protocol breakdown', views: 95000, engPercent: 5.1, saves: 3100 },
      { title: 'BPC 157 results after 30 days', views: 87000, engPercent: 4.9, saves: 2800 },
    ],
  },
  {
    name: 'TikTok',
    color: '#00f2ea',
    followers: 112400,
    engagement: 7.2,
    growth30d: 28.5,
    status: 'live',
    sparkline: [15, 20, 18, 25, 30, 28, 35, 40, 38, 45, 50, 55, 52, 60, 65, 62, 70, 75, 72, 80, 85, 82, 88, 90, 92, 95, 93, 96, 98, 100],
    topPosts: [
      { title: 'This peptide changed everything', views: 2100000, engPercent: 9.1, saves: 45000 },
      { title: 'Doctor reacts to my stack', views: 1400000, engPercent: 7.8, saves: 32000 },
      { title: '5 signs you need GH support', views: 890000, engPercent: 6.5, saves: 18000 },
    ],
  },
  {
    name: 'Facebook',
    color: '#1877F2',
    followers: 22100,
    engagement: 2.1,
    growth30d: 3.4,
    status: 'live',
    sparkline: [40, 42, 41, 43, 44, 43, 45, 44, 46, 45, 47, 46, 48, 47, 49, 48, 50, 49, 51, 50, 52, 51, 53, 52, 54, 53, 55, 54, 56, 55],
    topPosts: [
      { title: 'Community Q&A on longevity', views: 34000, engPercent: 3.2, saves: 890 },
      { title: 'New research on NAD+', views: 28000, engPercent: 2.8, saves: 720 },
      { title: 'Live event recap', views: 21000, engPercent: 2.4, saves: 510 },
    ],
  },
  {
    name: 'YouTube',
    color: '#FF0000',
    followers: 8900,
    engagement: 5.6,
    growth30d: 18.7,
    status: 'live',
    sparkline: [10, 12, 15, 14, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80],
    topPosts: [
      { title: 'Full peptide protocol explained', views: 240000, engPercent: 7.3, saves: 12000 },
      { title: 'Lab results month 3', views: 185000, engPercent: 6.1, saves: 8900 },
      { title: 'Beginner wellness stack guide', views: 142000, engPercent: 5.5, saves: 7200 },
    ],
  },
  {
    name: 'Reddit',
    color: '#FF4500',
    followers: 5600,
    engagement: 8.9,
    growth30d: 22.1,
    status: 'offline',
    sparkline: [30, 32, 28, 35, 40, 38, 42, 45, 48, 50, 46, 52, 55, 58, 54, 60, 62, 65, 68, 70, 66, 72, 75, 78, 80, 76, 82, 85, 88, 90],
    topPosts: [
      { title: 'r/peptides AMA recap', views: 67000, engPercent: 11.2, saves: 3400 },
      { title: 'Dosing protocol thread', views: 52000, engPercent: 9.8, saves: 2800 },
      { title: 'Stack comparison post', views: 41000, engPercent: 8.4, saves: 2100 },
    ],
  },
  {
    name: 'AI Search',
    color: '#2DA5A0',
    followers: 0,
    engagement: 0,
    growth30d: 45.2,
    status: 'live',
    sparkline: [5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30, 35, 38, 40, 42, 45, 50, 55, 58, 60, 65, 68, 70, 75, 78, 80, 85, 88, 92, 95],
    topPosts: [
      { title: 'Brand mentions in ChatGPT results', views: 14000, engPercent: 0, saves: 0 },
      { title: 'Perplexity citation tracking', views: 9200, engPercent: 0, saves: 0 },
      { title: 'Claude search references', views: 6800, engPercent: 0, saves: 0 },
    ],
  },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 200;
  const height = 50;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const gradientId = `sparkGrad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PerformanceTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const selectedPlatform = mockPlatforms.find((p) => p.name === expanded);

  return (
    <div className="space-y-4">
      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPlatforms.map((platform) => (
          <HounddogCard
            key={platform.name}
            clickable
            onClick={() => setExpanded(expanded === platform.name ? null : platform.name)}
            className={`p-4 ${expanded === platform.name ? 'border-[#2DA5A0]/40' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="text-white text-sm font-semibold">{platform.name}</span>
              </div>
              {platform.status === 'live' ? (
                <span className="w-[7px] h-[7px] rounded-full bg-[#2DA5A0] shadow-[0_0_6px_#2DA5A0] animate-pulse" />
              ) : (
                <span className="w-[7px] h-[7px] rounded-full bg-gray-500" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-white text-sm font-bold">{formatNumber(platform.followers)}</p>
                <p className="text-white/40 text-[10px]">Followers</p>
              </div>
              <div>
                <p className="text-white text-sm font-bold">{platform.engagement}%</p>
                <p className="text-white/40 text-[10px]">Engagement</p>
              </div>
              <div>
                <p className="text-emerald-400 text-sm font-bold">+{platform.growth30d}%</p>
                <p className="text-white/40 text-[10px]">30 Day Growth</p>
              </div>
            </div>
          </HounddogCard>
        ))}
      </div>

      {/* Detail panel */}
      {selectedPlatform && (
        <HounddogCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedPlatform.color }}
              />
              <h3 className="text-white font-bold text-base">{selectedPlatform.name} Detail</h3>
            </div>
            <button
              onClick={() => setExpanded(null)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div className="bg-[#1A2744] rounded-lg p-3 text-center">
              <p className="text-white font-bold text-lg">{formatNumber(selectedPlatform.followers)}</p>
              <p className="text-white/40 text-xs">Followers</p>
            </div>
            <div className="bg-[#1A2744] rounded-lg p-3 text-center">
              <p className="text-white font-bold text-lg">{selectedPlatform.engagement}%</p>
              <p className="text-white/40 text-xs">Engagement</p>
            </div>
            <div className="bg-[#1A2744] rounded-lg p-3 text-center">
              <p className="text-emerald-400 font-bold text-lg">+{selectedPlatform.growth30d}%</p>
              <p className="text-white/40 text-xs">30 Day Growth</p>
            </div>
            <div className="bg-[#1A2744] rounded-lg p-3 text-center">
              <p className="text-white font-bold text-lg">
                {selectedPlatform.status === 'live' ? 'Live' : 'Offline'}
              </p>
              <p className="text-white/40 text-xs">Status</p>
            </div>
          </div>

          {/* Sparkline */}
          <div className="mb-5 bg-[#1A2744] rounded-lg p-4">
            <p className="text-white/50 text-xs mb-2">30 Day Trend</p>
            <Sparkline data={selectedPlatform.sparkline} color={selectedPlatform.color} />
          </div>

          {/* Top posts */}
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
              Top 3 Posts
            </p>
            <div className="space-y-2">
              {selectedPlatform.topPosts.map((post, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#1A2744] rounded-lg px-4 py-3 gap-2"
                >
                  <p className="text-white text-sm font-medium">{post.title}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-white/50">
                      <Eye size={12} strokeWidth={1.5} />
                      {formatNumber(post.views)}
                    </span>
                    <span className="flex items-center gap-1 text-[#2DA5A0]">
                      <TrendingUp size={12} strokeWidth={1.5} />
                      {post.engPercent}%
                    </span>
                    <span className="flex items-center gap-1 text-white/50">
                      <Bookmark size={12} strokeWidth={1.5} />
                      {formatNumber(post.saves)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HounddogCard>
      )}
    </div>
  );
}
