'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Bell,
  Settings,
  Monitor,
  Layers,
  PenTool,
  Mic,
  Crosshair,
  Edit3,
  Calendar,
  BarChart2,
} from 'lucide-react';
import { C, AGENTS } from '@/lib/hounddog/constants';
import LiveBadge from './shared/LiveBadge';
import PBar from './shared/PBar';
import OverviewTab from './tabs/OverviewTab';
import ContentTab from './tabs/ContentTab';
import CreateTab from './tabs/CreateTab';
import AutoScriptTab from './tabs/AutoScriptTab';
import ResearchTab from './tabs/ResearchTab';

/* ------------------------------------------------------------------ */
/*  Icon resolver                                                      */
/* ------------------------------------------------------------------ */
const ICON_MAP: Record<string, React.ElementType> = {
  PenTool,
  Edit3,
  Calendar,
  BarChart2,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type TabKey = 'overview' | 'content' | 'create' | 'autoscript' | 'research';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Overview', icon: Monitor },
  { key: 'content', label: 'Content', icon: Layers },
  { key: 'create', label: 'Create', icon: PenTool },
  { key: 'autoscript', label: 'Auto-Script', icon: Mic },
  { key: 'research', label: 'Research', icon: Crosshair },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HounddogCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [agentBarOpen, setAgentBarOpen] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2500);
    return () => clearInterval(id);
  }, []);

  const liveCount = AGENTS.filter((a) => a.status === 'live').length;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div
      style={{
        background: C.bg,
        fontFamily: "'DM Sans', sans-serif",
        color: C.text,
        minHeight: '100vh',
      }}
    >
      {/* Keyframe animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes hd-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.82)} }
        @keyframes hd-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes hd-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hd-slide { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ============================================================ */}
      {/*  STICKY HEADER                                                */}
      {/* ============================================================ */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: C.surface,
        }}
      >
        {/* --- Top Bar --- */}
        <div
          style={{
            height: 50,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 12,
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 30,
              height: 30,
              background: 'linear-gradient(135deg, #E8803A, #E8803Abb)',
              boxShadow: '0 0 10px #E8803A44',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Target size={14} strokeWidth={1.5} color="#fff" />
          </div>

          {/* Title */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.05em' }}>
              HOUNDDOG
            </div>
            <div
              style={{
                fontSize: 8,
                color: C.muted,
                letterSpacing: '0.14em',
                lineHeight: 1,
              }}
            >
              AI COMMAND CENTER
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 24,
              background: C.border,
              flexShrink: 0,
            }}
          />

          {/* Agent count pill */}
          <button
            onClick={() => setAgentBarOpen((o) => !o)}
            style={{
              background: C.green + '12',
              border: `1px solid ${C.green}30`,
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: C.green,
                animation: 'hd-pulse 1.8s infinite',
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.green,
              }}
            >
              {liveCount} AGENTS RUNNING
            </span>
          </button>

          {/* Right side */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* Bell with badge */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={16} strokeWidth={1.5} color={C.muted2} />
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: C.orange,
                }}
              />
            </div>

            {/* Email */}
            <span
              style={{
                fontSize: 10,
                color: C.muted,
              }}
              className="hidden md:inline"
            >
              gary@farmceuticawellness.com
            </span>

            {/* Settings */}
            <Settings
              size={16}
              strokeWidth={1.5}
              color={C.muted2}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* --- Agent Status Bar (collapsible) --- */}
        {agentBarOpen && (
          <div
            style={{
              animation: 'hd-slide 0.3s ease',
              overflowX: 'auto',
              display: 'flex',
              gap: 8,
              padding: '8px 16px',
            }}
          >
            {AGENTS.map((agent) => {
              const Icon = ICON_MAP[agent.icon];
              const prog =
                agent.status === 'live'
                  ? Math.min(100, agent.progress + (tick % 10) * 3)
                  : agent.progress;

              return (
                <div
                  key={agent.name}
                  style={{
                    background: C.card,
                    border: `1px solid ${agent.status === 'live' ? agent.color + '30' : C.border}`,
                    borderRadius: 8,
                    padding: '6px 11px',
                    minWidth: 210,
                    flexShrink: 0,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: agent.color + '2E',
                      borderRadius: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {Icon && <Icon size={12} strokeWidth={1.5} color={agent.color} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700 }}>
                        {agent.name}
                      </span>
                      <LiveBadge active={agent.status === 'live'} />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: C.muted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 5,
                      }}
                    >
                      {agent.task}
                    </div>
                    <PBar value={prog} color={agent.color} height={2} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Tab Navigation --- */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #E8803A' : '2px solid transparent',
                  color: isActive ? '#E8803A' : C.muted,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 11,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <TabIcon size={12} strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CONTENT AREA                                                 */}
      {/* ============================================================ */}
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '20px 16px',
        }}
      >
        {activeTab === 'overview' && <OverviewTab tick={tick} />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'create' && <CreateTab />}
        {activeTab === 'autoscript' && <AutoScriptTab />}
        {activeTab === 'research' && <ResearchTab />}
      </div>
    </div>
  );
}
