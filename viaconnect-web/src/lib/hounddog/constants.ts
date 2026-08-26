export const C = {
  bg: '#0B1520',
  surface: '#0F1C2D',
  card: '#132336',
  card2: '#172840',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.13)',
  teal: '#2DA5A0',
  orange: '#E8803A',
  red: '#E84545',
  green: '#27C97A',
  blue: '#4B9EFF',
  purple: '#9B6DFF',
  text: '#EDF2FF',
  muted: 'rgba(255,255,255,0.38)',
  muted2: 'rgba(255,255,255,0.58)',
} as const

export interface AgentDef {
  name: string
  icon: string
  color: string
  status: 'live' | 'idle'
  task: string
  progress: number
}

/** Empty until a real job row exists. Not live command-center data. */
export const AGENTS: AgentDef[] = []

export interface PlatformDef {
  name: string
  color: string
  posts: number
  eng: number
  reach: string
  saves: string
  growth: string
  live: boolean
  sparkData: number[]
}

/** Empty until a real account last-sync exists. Not live command-center data. */
export const PLATFORMS: PlatformDef[] = []

export interface ScheduledItem {
  id: string
  title: string
  platform: string
  platformColor: string
  time: string
  status: 'queued' | 'drafting' | 'writing'
  aiScore: number
}

/** Empty until a real pipeline row exists. Not live command-center data. */
export const SCHEDULED: ScheduledItem[] = []

export interface TopHook {
  hook: string
  score: number
  angle: string
  uses: number
}

/** Empty until a real hook row exists. Not live command-center data. */
export const TOP_HOOKS: TopHook[] = []

export interface CompetitorDef {
  name: string
  platform: string
  hook: string
  views: string
  eng: string
}

/** Empty until a real competitor last-sync exists. Not live command-center data. */
export const COMPETITORS: CompetitorDef[] = []

export interface AlertDef {
  id: string
  type: 'hot' | 'warning'
  text: string
  detail: string
  platform: string
}

/** Empty until a real alert row exists. Not live command-center data. */
export const ALERTS: AlertDef[] = []

export interface TopPostDef {
  title: string
  views: string
  eng: string
  saves: string
}

/** Empty until a real account last-sync exists. Not live command-center data. */
export const TOP_POSTS: TopPostDef[] = []
