// types/agents.ts

export interface AgentTask {
  id: string;
  description: string;
  constraints: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  createdBy: string;
  status: 'queued' | 'brainstorming' | 'planning' | 'tdd' | 'review' | 'complete' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormOutput {
  phase: import('@/lib/agents/michelangelo/brainstorm').BrainstormPhase;
  readyForPlanning: boolean;
  approachSummary: string;
}

export interface AgentMessage {
  from: string;
  to: string | 'all';
  type: 'status' | 'escalation' | 'approval' | 'feedback' | 'broadcast';
  payload: unknown;
  timestamp: string;
}

export interface AgentRegistry {
  agents: {
    id: string;
    name: string;
    role: string;
    status: 'active' | 'idle' | 'error';
    parentAgent: string | null;
    lastHeartbeat: string;
  }[];
}
