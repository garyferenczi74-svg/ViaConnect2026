'use client';

import React from 'react';
import {
  PenTool,
  Edit3,
  Calendar,
  BarChart2,
} from 'lucide-react';
import type { IconType } from '@/types/icon';
import { C } from '@/lib/hounddog/constants';
import {
  hasLiveSocialLastSync,
  liveAgentJobs,
  loadHounddogLiveAccounts,
  loadHounddogLiveJobs,
  type HounddogLiveJobRow,
} from '@/lib/hounddog/honesty';
import EmptyState from '../shared/EmptyState';
import SecHead from '../shared/SecHead';
import LiveBadge from '../shared/LiveBadge';

const AGENT_ICONS: Record<string, IconType> = {
  Scriptwriter: PenTool,
  Editor: Edit3,
  Scheduler: Calendar,
  Analyzer: BarChart2,
};

// Prompt #52: fixed tracks total 660px so Platform cannot collapse under
// overflow:hidden. Scroll the inner wrapper instead of clipping the name.
const SOCIAL_PERF_COLUMNS = '160px 88px 58px 64px 64px 64px 90px 72px';
const SOCIAL_PERF_MIN_WIDTH = 660;
const SOCIAL_PERF_MAX_WIDTH = 1280;

export default function OverviewTab() {
  const accounts = loadHounddogLiveAccounts();
  const jobs = loadHounddogLiveJobs();
  const liveJobs = liveAgentJobs(jobs);
  const showSocial = hasLiveSocialLastSync(accounts);
  const showEmpty = liveJobs.length === 0 && !showSocial;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {showEmpty ? <EmptyState /> : null}

      {showSocial ? (
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
            </div>
          </div>
        </div>
      ) : null}

      {jobs.length > 0 ? (
        <div>
          <SecHead label="AI Agents" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}
            className="hd-agent-grid"
          >
            {jobs.map((job: HounddogLiveJobRow) => {
              const isLive = job.status === 'live';
              const IconComp = AGENT_ICONS[job.agentName] || BarChart2;
              return (
                <div
                  key={job.id}
                  style={{
                    background: C.card,
                    border: `1px solid ${isLive ? C.teal + '33' : C.border}`,
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: C.teal + '2E',
                        border: `1px solid ${C.teal}4D`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComp size={14} strokeWidth={1.5} style={{ color: C.teal }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{job.agentName}</div>
                    </div>
                    <LiveBadge active={isLive} />
                  </div>
                  {job.task.length > 0 ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: C.muted2,
                        lineHeight: 1.55,
                      }}
                    >
                      {job.task}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 768px) {
          .hd-agent-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
