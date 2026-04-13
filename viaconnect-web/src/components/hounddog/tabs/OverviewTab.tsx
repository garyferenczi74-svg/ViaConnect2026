'use client';

import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  X,
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
import {
  C,
  ALERTS,
  AGENTS,
  PLATFORMS,
  TOP_POSTS,
} from '@/lib/hounddog/constants';
import type { AlertDef, AgentDef, PlatformDef } from '@/lib/hounddog/constants';
import Btn from '../shared/Btn';
import Pill from '../shared/Pill';
import SecHead from '../shared/SecHead';
import KPI from '../shared/KPI';
import PBar from '../shared/PBar';
import LiveBadge from '../shared/LiveBadge';
import Spark from '../shared/Spark';

const AGENT_ICONS: Record<string, React.ElementType> = {
  PenTool,
  Edit3,
  Calendar,
  BarChart2,
};

interface OverviewTabProps {
  tick: number;
}

export default function OverviewTab({ tick }: OverviewTabProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const visibleAlerts = ALERTS.filter((a: AlertDef) => !dismissed.includes(a.id));
  const liveCount = AGENTS.filter((a: AgentDef) => a.status === 'live').length;
  const livePlatforms = PLATFORMS.filter((p: PlatformDef) => p.live).length;
  const offlinePlatforms = PLATFORMS.filter((p: PlatformDef) => !p.live).length;

  const selectedPlatData = PLATFORMS.find((p: PlatformDef) => p.name === selectedPlatform);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Alert Banners */}
      {visibleAlerts.map((alert: AlertDef) => {
        const isHot = alert.type === 'hot';
        return (
          <div
            key={alert.id}
            style={{
              background: isHot ? C.orange + '12' : C.red + '12',
              border: `1px solid ${isHot ? C.orange + '30' : C.red + '30'}`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {isHot ? (
              <Flame size={14} strokeWidth={1.5} style={{ color: C.orange, flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={14} strokeWidth={1.5} style={{ color: C.red, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{alert.text}</div>
              <div style={{ fontSize: 10, color: C.muted2, marginTop: 2 }}>{alert.detail}</div>
            </div>
            <Pill label={alert.platform} color={isHot ? C.orange : C.red} />
            <Btn variant="ghost" onClick={() => {}}>Repurpose</Btn>
            <button
              onClick={() => setDismissed((prev) => [...prev, alert.id])}
              style={{
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        );
      })}

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr) auto',
          gap: 10,
        }}
        className="hd-kpi-grid"
      >
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="AI Tasks Completed" value={847} change="+12K today" positive />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="Posts in Queue" value={62} change="+4 vs last month" positive />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <KPI label="Avg Engagement" value="6.8%" change="+1.2% this week" positive />
        </div>
        <div>
          <button
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
            }}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>EXPORT</span>
            <span style={{ fontSize: 9, opacity: 0.65 }}>REPORT</span>
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div>
        <SecHead label="AI Agents">
          <Pill label={`${liveCount} ACTIVE`} color={C.green} />
        </SecHead>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}
          className="hd-agent-grid"
        >
          {AGENTS.map((agent: AgentDef) => {
            const isLive = agent.status === 'live';
            const IconComp = AGENT_ICONS[agent.icon] || BarChart2;
            const animatedProg = Math.min(100, agent.progress + ((tick % 20) * 0.3));
            return (
              <div
                key={agent.name}
                style={{
                  background: C.card,
                  border: `1px solid ${isLive ? agent.color + '33' : C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Glow */}
                <div
                  style={{
                    position: 'absolute',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: agent.color + '0A',
                    filter: 'blur(18px)',
                    top: -10,
                    right: -10,
                    pointerEvents: 'none',
                  }}
                />
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: agent.color + '2E',
                      border: `1px solid ${agent.color}4D`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComp size={14} strokeWidth={1.5} style={{ color: agent.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{agent.name}</div>
                    {agent.name === 'Editor' && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.red }}>3 EDITS FLAGGED</div>
                    )}
                  </div>
                  <LiveBadge active={isLive} />
                </div>
                {/* Task */}
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted2,
                    lineHeight: 1.55,
                    minHeight: 30,
                    marginBottom: 8,
                  }}
                >
                  {agent.task}
                </div>
                {/* Progress Bar */}
                <PBar value={animatedProg} color={agent.color} height={3} />
                {/* Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                  }}
                >
                  <span style={{ fontSize: 10, color: C.muted2 }}>{Math.round(animatedProg)}%</span>
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

      {/* Social Performance Table */}
      <div>
        <SecHead label="Social Performance">
          <div style={{ display: 'flex', gap: 6 }}>
            <Pill label={`${livePlatforms} LIVE`} color={C.green} />
            <Pill label={`${offlinePlatforms} OFFLINE`} color={C.muted} />
          </div>
        </SecHead>
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              {/* Header Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 90px 60px 65px 65px 65px 80px 80px',
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
              {/* Data Rows */}
              {PLATFORMS.map((plat: PlatformDef, idx: number) => (
                <div
                  key={plat.name}
                  onClick={() => setSelectedPlatform(plat.name)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 60px 65px 65px 65px 80px 80px',
                    padding: '10px 14px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: idx < PLATFORMS.length - 1 ? `1px solid ${C.border}` : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = plat.color + '07';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {/* Platform */}
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{plat.name}</span>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: plat.live ? C.green : C.muted,
                        animation: plat.live ? 'hd-pulse 1.8s infinite' : 'none',
                      }}
                    />
                  </div>
                  {/* Spark */}
                  <div>
                    <Spark data={plat.sparkData} color={plat.color} w={70} h={22} />
                  </div>
                  {/* Posts */}
                  <span style={{ fontSize: 12, color: C.text }}>{plat.posts}</span>
                  {/* Eng% */}
                  <span style={{ fontSize: 12, color: C.green }}>{plat.eng}%</span>
                  {/* Reach */}
                  <span style={{ fontSize: 12, color: C.text }}>{plat.reach}</span>
                  {/* Saves */}
                  <span style={{ fontSize: 12, color: C.text }}>{plat.saves}</span>
                  {/* Growth */}
                  <Pill label={plat.growth} color={C.green} />
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="ghost" icon={RefreshCw} onClick={() => {}}>Repurpose</Btn>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.muted,
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
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

      {/* Top Performing Posts */}
      <div>
        <SecHead label="Top Performing Posts">
          {selectedPlatData ? (
            <Pill label={selectedPlatData.name} color={selectedPlatData.color} />
          ) : (
            <Pill label="All Platforms" color={C.teal} />
          )}
        </SecHead>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
          className="hd-top-posts-grid"
        >
          {TOP_POSTS.map((post, idx) => (
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
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                {post.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <Eye size={10} strokeWidth={1.5} /> {post.views}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <TrendingUp size={10} strokeWidth={1.5} /> {post.eng}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: C.muted2 }}>
                  <Star size={10} strokeWidth={1.5} /> {post.saves}
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

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .hd-kpi-grid {
            grid-template-columns: 1fr 1fr !important;
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
