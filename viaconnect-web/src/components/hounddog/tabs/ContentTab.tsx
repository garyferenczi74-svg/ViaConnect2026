'use client';

import React, { useState } from 'react';
import {
  Clock,
  Edit3,
  Trash2,
  Send,
  ArrowRight,
  Sparkles,
  Copy,
} from 'lucide-react';
import { C, SCHEDULED } from '@/lib/hounddog/constants';
import type { ScheduledItem } from '@/lib/hounddog/constants';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';
import PBar from '../shared/PBar';

type SubTab = 'scheduled' | 'scripts' | 'editor';

const STATUS_COLORS: Record<string, string> = {
  queued: C.teal,
  drafting: C.orange,
  writing: C.purple,
};

const SCRIPTS = [
  {
    title: 'Why Your Supplements Fail (DNA Proof)',
    summary: 'Hook: Your genetics say no ... Body: 3 SNPs that block absorption ... CTA: Get tested ... Est. 45s',
    pills: [
      { label: 'AI 94', color: C.green },
      { label: 'Authority Gap', color: C.teal },
      { label: 'Peptides', color: C.orange },
    ],
  },
  {
    title: 'Morning Routine: Gene Guided Stack',
    summary: 'Hook: I stopped guessing ... Body: Methylation pathway walkthrough ... CTA: Save this stack ... Est. 45s',
    pills: [
      { label: 'AI 94', color: C.green },
      { label: 'Authority Gap', color: C.teal },
      { label: 'Peptides', color: C.orange },
    ],
  },
  {
    title: '10 to 27x Bioavailability Explained',
    summary: 'Hook: Liposomal is not a gimmick ... Body: Absorption science simplified ... CTA: Link in bio ... Est. 45s',
    pills: [
      { label: 'AI 94', color: C.green },
      { label: 'Authority Gap', color: C.teal },
      { label: 'Peptides', color: C.orange },
    ],
  },
  {
    title: 'MTHFR: What Your Doctor Misses',
    summary: 'Hook: 40% of people have this variant ... Body: Folate vs folic acid deep dive ... CTA: Get your panel ... Est. 45s',
    pills: [
      { label: 'AI 94', color: C.green },
      { label: 'Authority Gap', color: C.teal },
      { label: 'Peptides', color: C.orange },
    ],
  },
];

const SCORE_ITEMS = [
  { label: 'Hook Strength', value: 82 },
  { label: 'CTA Score', value: 76 },
  { label: 'Engagement Pred.', value: 88 },
  { label: 'Virality Index', value: 71 },
];

export default function ContentTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('scheduled');
  const [editorText, setEditorText] = useState(
    'Your genetics determine which supplements actually work...'
  );

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'scripts', label: 'Scripts' },
    { key: 'editor', label: 'Editor' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub tab buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              style={{
                borderRadius: 7,
                background: isActive ? C.teal + '18' : 'transparent',
                border: `1px solid ${isActive ? C.teal + '40' : C.border}`,
                color: isActive ? C.teal : C.muted,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scheduled */}
      {activeSubTab === 'scheduled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCHEDULED.map((item: ScheduledItem) => {
            const statusColor = STATUS_COLORS[item.status] || C.teal;
            const barColor = item.aiScore > 90 ? C.green : item.aiScore > 80 ? C.teal : C.orange;
            return (
              <div
                key={item.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Platform circle */}
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: item.platformColor,
                      flexShrink: 0,
                    }}
                  />
                  {/* Title */}
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: 1, minWidth: 120 }}>
                    {item.title}
                  </span>
                  {/* Time */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted }}>
                    <Clock size={10} strokeWidth={1.5} />
                    {item.time}
                  </span>
                  {/* Status Pill */}
                  <Pill label={item.status.toUpperCase()} color={statusColor} />
                  {/* AI Score Pill */}
                  <Pill label={`AI ${item.aiScore}`} color={C.green} />
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="ghost" icon={Edit3} onClick={() => {}}>Edit</Btn>
                    <Btn variant="green" icon={Send} onClick={() => {}}>Send</Btn>
                    <Btn variant="danger" icon={Trash2} onClick={() => {}}>Trash</Btn>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: 8 }}>
                  <PBar value={item.aiScore} color={barColor} height={3} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Scripts */}
      {activeSubTab === 'scripts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCRIPTS.map((script, idx) => (
            <div
              key={idx}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${C.teal}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                {script.title}
              </div>
              <div style={{ fontSize: 11, color: C.muted2, lineHeight: 1.5, marginBottom: 8 }}>
                {script.summary}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {script.pills.map((p, pi) => (
                  <Pill key={pi} label={p.label} color={p.color} />
                ))}
                <div style={{ flex: 1 }} />
                <Btn variant="ghost" icon={Edit3} onClick={() => {}}>Edit</Btn>
                <Btn variant="primary" icon={ArrowRight} onClick={() => {}}>Pipeline</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {activeSubTab === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Textarea */}
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            style={{
              fontFamily: "'DM Mono', monospace",
              background: C.card2,
              border: `1px solid ${C.border}`,
              color: C.text,
              minHeight: 190,
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.teal;
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.border;
            }}
          />

          {/* Button row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="primary" icon={Sparkles} onClick={() => {}}>AI Optimize</Btn>
            <Btn variant="ghost" icon={Send} onClick={() => {}}>Send to Pipeline</Btn>
            <Btn variant="ghost" icon={Copy} onClick={() => {}}>Duplicate</Btn>
          </div>

          {/* 2x2 scoring grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {SCORE_ITEMS.map((score) => {
              const barColor = score.value > 80 ? C.green : C.teal;
              return (
                <div
                  key={score.label}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: C.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    {score.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{score.value}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>/100</span>
                  </div>
                  <PBar value={score.value} color={barColor} height={3} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
