'use client';

import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  ArrowRight,
  Sparkles,
  Copy,
  Send,
} from 'lucide-react';
import HounddogCard from '../shared/HounddogCard';
import HounddogPill from '../shared/HounddogPill';

type SubTab = 'scheduled' | 'scripts' | 'editor';

interface ScheduledPost {
  id: string;
  platform: string;
  platformColor: string;
  title: string;
  time: string;
  status: 'queued' | 'approved' | 'draft';
  aiScore: number;
}

interface ScriptItem {
  id: string;
  title: string;
  summary: string;
  tags: string[];
}

const mockScheduled: ScheduledPost[] = [
  { id: '1', platform: 'TikTok', platformColor: '#00f2ea', title: 'Peptide stacking 101: beginner guide', time: 'Tomorrow, 9:00 AM', status: 'approved', aiScore: 92 },
  { id: '2', platform: 'Instagram', platformColor: '#E1306C', title: 'BPC 157 results carousel', time: 'Tomorrow, 12:30 PM', status: 'queued', aiScore: 85 },
  { id: '3', platform: 'YouTube', platformColor: '#FF0000', title: 'Monthly lab results breakdown', time: 'Apr 14, 3:00 PM', status: 'draft', aiScore: 71 },
  { id: '4', platform: 'TikTok', platformColor: '#00f2ea', title: 'Top 5 recovery peptides ranked', time: 'Apr 15, 10:00 AM', status: 'queued', aiScore: 88 },
];

const mockScripts: ScriptItem[] = [
  { id: 's1', title: 'The peptide nobody talks about', summary: 'Hook driven script targeting the curiosity gap; covers lesser known peptides for sleep optimization.', tags: ['TikTok', 'Hook', 'Sleep'] },
  { id: 's2', title: 'Why your stack is wrong', summary: 'Contrarian angle script challenging common peptide stacking mistakes with research citations.', tags: ['Instagram', 'Contrarian', 'Education'] },
  { id: 's3', title: '30 day transformation protocol', summary: 'Before and after narrative script showing realistic peptide journey with weekly milestones.', tags: ['YouTube', 'Transformation', 'Long Form'] },
];

const statusColorMap: Record<string, 'teal' | 'green' | 'gray'> = {
  queued: 'teal',
  approved: 'green',
  draft: 'gray',
};

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const barColor = value > 90 ? 'bg-emerald-400' : value > 80 ? 'bg-[#2DA5A0]' : 'bg-[#B75E18]';
  return (
    <div className={`w-full bg-white/10 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export default function ContentTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('scheduled');
  const [editorText, setEditorText] = useState(
    'Stop scrolling. This is the peptide protocol that changed my sleep, recovery, and energy in 30 days.\n\nHere is exactly what I used:\n\n1. BPC 157: 250mcg twice daily\n2. TB 500: 2.5mg twice per week\n3. GHK Cu: 200mcg before bed\n\nThe results? My deep sleep went from 45 minutes to 2 hours. Recovery time cut in half. Energy levels I have not felt since my 20s.\n\nSave this. Share it with someone who needs it.\n\nFollow for more precision wellness protocols.'
  );

  const [scores] = useState({
    hookStrength: 88,
    ctaScore: 76,
    engagementPrediction: 82,
    viralityIndex: 69,
  });

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'scripts', label: 'Scripts' },
    { key: 'editor', label: 'Editor' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#1A2744] rounded-lg p-1 w-fit">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === tab.key
                ? 'bg-[#1E3054] text-[#2DA5A0]'
                : 'text-white/45 hover:text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SCHEDULED */}
      {activeSubTab === 'scheduled' && (
        <div className="space-y-3">
          {mockScheduled.map((post) => (
            <HounddogCard key={post.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Platform dot + title */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: post.platformColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{post.title}</p>
                    <p className="text-white/40 text-[10px]">{post.time}</p>
                  </div>
                </div>

                {/* Status + AI Score + Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <HounddogPill label={post.status} color={statusColorMap[post.status]} />
                  <div className="flex items-center gap-2 w-28">
                    <span className="text-white/50 text-[10px]">AI</span>
                    <ProgressBar value={post.aiScore} className="flex-1" />
                    <span className="text-white/60 text-[10px] w-6 text-right">{post.aiScore}</span>
                  </div>
                  <button className="text-white/30 hover:text-[#2DA5A0] transition-colors">
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                  <button className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </HounddogCard>
          ))}
        </div>
      )}

      {/* SCRIPTS */}
      {activeSubTab === 'scripts' && (
        <div className="space-y-3">
          {mockScripts.map((script) => (
            <HounddogCard key={script.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold mb-1">{script.title}</p>
                  <p className="text-white/40 text-xs mb-2">{script.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {script.tags.map((tag) => (
                      <HounddogPill key={tag} label={tag} color="gray" size="sm" />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditorText(`# ${script.title}\n\n${script.summary}`);
                      setActiveSubTab('editor');
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#2DA5A0] hover:text-[#2DA5A0]/80 bg-[#2DA5A0]/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil size={12} strokeWidth={1.5} />
                    Edit in Editor
                  </button>
                  <button className="flex items-center gap-1.5 text-xs text-[#B75E18] hover:text-[#B75E18]/80 bg-[#B75E18]/10 px-3 py-1.5 rounded-lg transition-colors">
                    <ArrowRight size={12} strokeWidth={1.5} />
                    Push to Pipeline
                  </button>
                </div>
              </div>
            </HounddogCard>
          ))}
        </div>
      )}

      {/* EDITOR */}
      {activeSubTab === 'editor' && (
        <div className="space-y-4">
          {/* Textarea */}
          <div className="relative">
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              className="w-full h-48 sm:h-64 bg-[#141E33] border border-white/[0.08] rounded-xl p-4 text-white text-sm font-[Instrument_Sans] resize-y focus:outline-none focus:border-[#2DA5A0]/40 transition-colors"
              placeholder="Paste or write your script here..."
            />
            <span className="absolute bottom-3 right-3 text-white/20 text-[10px]">
              {editorText.length} chars
            </span>
          </div>

          {/* Scoring cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Hook Strength', value: scores.hookStrength },
              { label: 'CTA Score', value: scores.ctaScore },
              { label: 'Engagement Prediction', value: scores.engagementPrediction },
              { label: 'Virality Index', value: scores.viralityIndex },
            ].map((score) => (
              <HounddogCard key={score.label} className="p-3">
                <p className="text-white/50 text-[10px] mb-1">{score.label}</p>
                <p className="text-white font-bold text-lg mb-2">{score.value}</p>
                <ProgressBar value={score.value} />
              </HounddogCard>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 bg-[#2DA5A0] hover:bg-[#2DA5A0]/80 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              <Sparkles size={14} strokeWidth={1.5} />
              AI Optimize
            </button>
            <button className="flex items-center gap-2 bg-[#B75E18] hover:bg-[#B75E18]/80 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              <Send size={14} strokeWidth={1.5} />
              Send to Pipeline
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              <Copy size={14} strokeWidth={1.5} />
              Duplicate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
