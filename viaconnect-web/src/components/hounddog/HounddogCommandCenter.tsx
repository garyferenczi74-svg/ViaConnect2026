'use client';

import React, { useState } from 'react';
import { Target } from 'lucide-react';
import AgentStatusBar from './shared/AgentStatusBar';
import HounddogPill from './shared/HounddogPill';
import PerformanceTab from './tabs/PerformanceTab';
import ContentTab from './tabs/ContentTab';
import CreateTab from './tabs/CreateTab';
import AutoScriptTab from './tabs/AutoScriptTab';
import ResearchTab from './tabs/ResearchTab';

type TabKey = 'performance' | 'content' | 'create' | 'autoscript' | 'research';

interface TabDef {
  key: TabKey;
  label: string;
  component: React.ComponentType;
  // Future: add `requiredRole` field for role-gated tab access
}

const tabs: TabDef[] = [
  { key: 'performance', label: 'Performance', component: PerformanceTab },
  { key: 'content', label: 'Content', component: ContentTab },
  { key: 'create', label: 'Create', component: CreateTab },
  { key: 'autoscript', label: 'Auto-Script', component: AutoScriptTab },
  { key: 'research', label: 'Research', component: ResearchTab },
];

export default function HounddogCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>('performance');

  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component ?? PerformanceTab;

  return (
    <div className="w-full min-h-screen bg-[#1A2744] font-[Instrument_Sans] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Target size={28} strokeWidth={1.5} className="text-[#B75E18]" />
            <div>
              <h1 className="text-white text-xl sm:text-2xl font-bold tracking-wide">HOUNDDOG</h1>
              <p className="text-white/40 text-xs tracking-widest uppercase">AI Command Center</p>
            </div>
          </div>
          <div className="sm:ml-auto">
            <HounddogPill label="5 Agents Active" color="teal" size="md" />
          </div>
        </div>

        {/* Agent Status Bar */}
        <div className="mb-6">
          <AgentStatusBar />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-px mb-6 border-b border-white/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-[#2DA5A0] font-bold'
                  : 'text-white/45 font-medium hover:text-white/70'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2DA5A0]" />
              )}
            </button>
          ))}
        </div>

        {/* Active Tab Content */}
        <ActiveComponent />
      </div>
    </div>
  );
}
