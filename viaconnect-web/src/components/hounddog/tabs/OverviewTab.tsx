'use client';

import type { IconType } from '@/types/icon';
import React from 'react';
import {
  Flame,
  AlertTriangle,
  Download,
  PenTool,
  Edit3,
  Calendar,
  BarChart2,
  Eye,
  TrendingUp,
  Star,
  ExternalLink,
  RefreshCw,
  Pause,
  Copy,
} from 'lucide-react';
import { C } from '@/lib/hounddog/constants';
import {
  HOUNDDOG_EMPTY_METRIC,
  HOUNDDOG_NO_SCRAPE_COPY,
  liveAgentJobs,
  loadHounddogLiveJobs,
} from '@/lib/hounddog/honesty';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';
import SecHead from '../shared/SecHead';
import KPI from '../shared/KPI';
import LiveBadge from '../shared/LiveBadge';

// Prompt #52: fixed tracks total 660px so Platform cannot collapse under
// overflow:hidden. Scroll the inner wrapper instead of clipping the name.
const SOCIAL_PERF_COLUMNS = '160px 88px 58px 64px 64px 64px 90px 72px';
const SOCIAL_PERF_MIN_WIDTH = 660;
const SOCIAL_PERF_MAX_WIDTH = 1280;

const AGENT_ICONS: Record<string, IconType> = {
  PenTool,
  Edit3,
  Calendar,
  BarChart2,
};

/** Original studio agent slots. Status/task only from real live job rows. */
const AGENT_SLOTS = [
  { name: 'Scriptwriter', icon: 'PenTool', color: C.teal },
  { name: 'Editor', icon: 'Edit3', color: C.blue },
  { name: 'Scheduler', icon: 'Calendar', color: C.purple },
  { name: 'Analyzer', icon: 'BarChart2', color: C.orange },
] as const;

/** Original social-table row chrome. Not a connected-account list. */
const PLATFORM_SLOTS = [
  { name: 'TikTok', color: '#00f2ea' },
  { name: 'Instagram', color: '#E1306C' },
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'Reddit', color: '#FF4500' },
  { name: 'AI Search', color: C.teal },
] as const;

const INSIGHT_SLOTS = [
  { key: 'hot', tone: 'hot' as const },
  { key: 'warning', tone: 'warning' as const },
] as const;

const TOP_POST_SLOTS = [0, 1, 2] as const;

const mutedCell: React.CSSProperties = {
  fontSize: 12,
  color: C.muted2,
};

export default function OverviewTab() {
  const jobs = loadHounddogLiveJobs();
  const liveJobs = liveAgentJobs(jobs);
  const liveCount = liveJobs.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {INSIGHT_SLOTS.map((slot) => {
        const isHot = slot.tone === 'hot';
        return (
          <div
            key={slot.key}
            style={{
              background: isHot ? C.orange + '12' : C.red + '12',
              border: `1px solid ${isHot ? C.orange + '30' : C.red + '30'}`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {isHot ? (
              <Flame size={14} strokeWidth={1.5} style={{ color: C.orange, flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={14} strokeWidth={1.5} style={{ color: C.red, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted2 }}>
                {HOUNDDOG_NO_SCRAPE_COPY}
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr) auto',
          gap: 10,
        }}
        className="hd-kpi-grid"
      >
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="AI Tasks Completed" value={HOUNDDOG_EMPTY_METRIC} hint={HOUNDDOG_NO_SCRAPE_COPY} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="Posts in Queue" value={HOUNDDOG_EMPTY_METRIC} hint={HOUNDDOG_NO_SCRAPE_COPY} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="Avg Engagement" value={HOUNDDOG_EMPTY_METRIC} hint={HOUNDDOG_NO_SCRAPE_COPY} />
        </div>
        <div>
          <button
            type="button"
            onClick={() => {}}
            style={{
              background: C.orange,
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '12px 16px',
              cursor: 'pointer',
              height: '100%',
              minHeight: 44,
              minWidth: 88,
            }}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>EXPORT</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>REPORT</span>
          </button>
        </div>
      </div>

      <div>
        <SecHead label="AI Agents">
          {liveCount > 0 ? (
            <Pill label={`${liveCount} ACTIVE`} color={C.green} />
          ) : (
            <Pill label={HOUNDDOG_NO_SCRAPE_COPY} color={C.muted} />
          )}
        </SecHead>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
          className="hd-agent-grid"
        >
          {AGENT_SLOTS.map((slot) => {
            const job = liveJobs.find((row) => row.agentName === slot.name);
            const isLive = Boolean(job);
            const IconComp = AGENT_ICONS[slot.icon] || BarChart2;
            return (
              <div
                key={slot.name}
                style={{
                  background: C.card,
                  border: `1px solid ${isLive ? slot.color + '33' : C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: slot.color + '0A',
                    filter: 'blur(18px)',
                    top: -10,
                    right: -10,
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: slot.color + '2E',
                      border: `1px solid ${slot.color}4D`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={14} strokeWidth={1.5} style={{ color: slot.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{slot.name}</div>
                  </div>
                  <LiveBadge active={isLive} />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted2,
                    lineHeight: 1.55,
                    minHeight: 30,
                    marginBottom: 8,
                  }}
                >
                  {job && job.task.length > 0 ? job.task : HOUNDDOG_NO_SCRAPE_COPY}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                  }}
                >
                  <span style={{ fontSize: 10, color: C.muted2 }}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="ghost" onClick={() => {}}>View</Btn>
                    {isLive && (
                      <Btn variant="ghost" icon={Pause} onClick={() => {}}>Pause</Btn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SecHead label="Social Performance">
          <Pill label={HOUNDDOG_NO_SCRAPE_COPY} color={C.muted} />
        </SecHead>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
            maxWidth: SOCIAL_PERF_MAX_WIDTH,
          }}
        >
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: SOCIAL_PERF_MIN_WIDTH + 28 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: SOCIAL_PERF_COLUMNS,
                  padding: '8px 14px',
                  fontSize: 8,
                  textTransform: 'uppercase',
                  color: C.muted,
                  letterSpacing: '0.09em',
                  fontWeight: 600,
                }}
              >
                <span>Platform</span>
                <span>30 Day</span>
                <span>Posts</span>
                <span>Eng%</span>
                <span>Reach</span>
                <span>Saves</span>
                <span>Growth</span>
                <span>Actions</span>
              </div>
              {PLATFORM_SLOTS.map((plat, idx) => (
                <div
                  key={plat.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: SOCIAL_PERF_COLUMNS,
                    padding: '10px 14px',
                    alignItems: 'center',
                    borderBottom: idx < PLATFORM_SLOTS.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 13,
                        height: 13,
                        borderRadius: '50%',
                        background: plat.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>
                      {plat.name}
                    </span>
                  </div>
                  <span style={mutedCell}>{HOUNDDOG_NO_SCRAPE_COPY}</span>
                  <span style={mutedCell}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <span style={mutedCell}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <span style={mutedCell}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <span style={mutedCell}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <span style={mutedCell}>{HOUNDDOG_EMPTY_METRIC}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="ghost" icon={RefreshCw} onClick={() => {}}>Repurpose</Btn>
                    <button
                      type="button"
                      onClick={() => {}}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.muted,
                        cursor: 'pointer',
                        padding: 4,
                        minHeight: 44,
                        minWidth: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ExternalLink size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <SecHead label="Top Performing Posts">
          <Pill label="All Platforms" color={C.teal} />
        </SecHead>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
          className="hd-top-posts-grid"
        >
          {TOP_POST_SLOTS.map((idx) => (
            <div
              key={idx}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
              }}
              className="hd-top-post-card"
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: C.muted2, marginBottom: 8 }}>
                {HOUNDDOG_NO_SCRAPE_COPY}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <Eye size={10} strokeWidth={1.5} /> {HOUNDDOG_EMPTY_METRIC}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <TrendingUp size={10} strokeWidth={1.5} /> {HOUNDDOG_EMPTY_METRIC}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <Star size={10} strokeWidth={1.5} /> {HOUNDDOG_EMPTY_METRIC}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} className="hd-top-post-actions">
                <Btn variant="ghost" icon={RefreshCw} onClick={() => {}}>Repurpose</Btn>
                <Btn variant="ghost" icon={Copy} onClick={() => {}}>Clone Angle</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hd-kpi-grid {
            grid-template-columns: 1fr !important;
          }
          .hd-agent-grid {
            grid-template-columns: 1fr !important;
          }
          .hd-top-posts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
