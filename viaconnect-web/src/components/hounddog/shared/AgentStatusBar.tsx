'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AgentStatus {
  name: string;
  task: string;
  status: 'live' | 'idle';
}

const mockAgents: AgentStatus[] = [
  { name: 'ScrapeBot', task: 'Crawling competitor profiles on Instagram', status: 'live' },
  { name: 'HookFinder', task: 'Analyzing top hooks from TikTok trends', status: 'live' },
  { name: 'ScriptWriter', task: 'Waiting for next job', status: 'idle' },
  { name: 'PostScheduler', task: 'Queuing 3 posts for tomorrow morning', status: 'live' },
  { name: 'EngagementTracker', task: 'Waiting for next job', status: 'idle' },
];

export default function AgentStatusBar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="w-full">
      {/* Toggle */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex items-center gap-2 text-white/50 hover:text-white/80 text-xs font-medium mb-2 transition-colors"
      >
        <span>Active Agents</span>
        <span className="text-[#2DA5A0] font-semibold">
          {mockAgents.filter((a) => a.status === 'live').length} live
        </span>
        {collapsed ? (
          <ChevronDown size={14} strokeWidth={1.5} />
        ) : (
          <ChevronUp size={14} strokeWidth={1.5} />
        )}
      </button>

      {/* Agent cards */}
      {!collapsed && (
        <div className="flex gap-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-x-visible scrollbar-thin scrollbar-thumb-white/10">
          {mockAgents.map((agent) => (
            <div
              key={agent.name}
              className="flex-shrink-0 flex items-center gap-3 bg-[#1E3054] border border-white/[0.08] rounded-lg px-4 py-2.5 min-w-[220px] sm:min-w-[240px]"
            >
              {/* Status dot */}
              <div className="flex-shrink-0">
                {agent.status === 'live' ? (
                  <span
                    className="block w-[7px] h-[7px] rounded-full bg-[#2DA5A0] shadow-[0_0_6px_#2DA5A0] animate-pulse"
                  />
                ) : (
                  <span className="block w-[7px] h-[7px] rounded-full bg-gray-500" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold leading-tight">{agent.name}</p>
                <p className="text-white/40 text-[10px] leading-tight truncate max-w-[180px]">
                  {agent.task}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
