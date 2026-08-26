'use client';

import React, { useState } from 'react';
import {
  Clock,
  Edit3,
  Trash2,
  Send,
  Copy,
} from 'lucide-react';
import { C, SCHEDULED } from '@/lib/hounddog/constants';
import type { ScheduledItem } from '@/lib/hounddog/constants';
import { HOUNDDOG_CONTENT_EMPTY_COPY } from '@/lib/hounddog/honesty';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';

type SubTab = 'scheduled' | 'scripts' | 'editor';

const STATUS_COLORS: Record<string, string> = {
  queued: C.teal,
  drafting: C.orange,
  writing: C.purple,
};

function ContentEmptyList() {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.55,
          color: C.muted2,
        }}
      >
        {HOUNDDOG_CONTENT_EMPTY_COPY}
      </p>
    </div>
  );
}

export default function ContentTab({
  initialSubTab = 'scheduled',
}: {
  initialSubTab?: SubTab;
} = {}) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);
  const [editorText, setEditorText] = useState('');

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'scripts', label: 'Scripts' },
    { key: 'editor', label: 'Editor' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                padding: '10px 14px',
                minHeight: 44,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'scheduled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCHEDULED.length === 0 ? (
            <ContentEmptyList />
          ) : (
            SCHEDULED.map((item: ScheduledItem) => {
              const statusColor = STATUS_COLORS[item.status] || C.teal;
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
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: item.platformColor,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: 1, minWidth: 120 }}>
                      {item.title}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted }}>
                      <Clock size={10} strokeWidth={1.5} />
                      {item.time}
                    </span>
                    <Pill label={item.status.toUpperCase()} color={statusColor} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Btn variant="ghost" icon={Edit3} onClick={() => {}}>Edit</Btn>
                      <Btn variant="green" icon={Send} onClick={() => {}}>Send</Btn>
                      <Btn variant="danger" icon={Trash2} onClick={() => {}}>Trash</Btn>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSubTab === 'scripts' && <ContentEmptyList />}

      {activeSubTab === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            placeholder="Write a script."
            style={{
              fontFamily: "'DM Mono', monospace",
              background: C.card2,
              border: `1px solid ${C.border}`,
              color: C.text,
              minHeight: 190,
              padding: 12,
              borderRadius: 8,
              fontSize: 16,
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              width: '100%',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.teal;
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLTextAreaElement).style.borderColor = C.border;
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="ghost" icon={Send} onClick={() => {}} className="min-h-[44px]">Send to Pipeline</Btn>
            <Btn variant="ghost" icon={Copy} onClick={() => {}} className="min-h-[44px]">Duplicate</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
