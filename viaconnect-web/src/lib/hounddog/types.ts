export type HounddogPlatform =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'youtube'
  | 'reddit'
  | 'aisearch'
  | 'all'

export type HounddogScriptStatus = 'draft' | 'queued' | 'published' | 'archived'

export type HounddogPipelineStatus = 'queued' | 'publishing' | 'published' | 'failed'

export interface HounddogScript {
  id: string
  title: string
  hook: string
  body: string
  cta: string
  angle: string
  platform: HounddogPlatform
  niche: string
  hook_score: number
  ai_score: number
  status: HounddogScriptStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface HounddogPipelineItem {
  id: string
  script_id: string
  platform: HounddogPlatform
  scheduled_at: string
  published_at?: string
  status: HounddogPipelineStatus
  post_url?: string
}

export interface HounddogPerformanceRow {
  id: string
  platform: string
  post_url: string | null
  pipeline_id: string | null
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  eng_rate: number | null
  recorded_at: string
}

export interface HounddogGeneratedScript {
  hook: string
  body: string
  cta: string
  angle: string
  hookScore: number
  estimatedViews: string
  bestTime: string
  hashtags: string[]
}

export interface HounddogAutoScript {
  title: string
  hook: string
  angle: string
  score: number
  duration: string
  platform: string
}

export interface HounddogCompetitorInsights {
  topHooks: Array<{ hook: string; angle: string; score: number; platform: string }>
  contentGaps: string[]
  winningFormats: string[]
  emotionalTriggers: string[]
  recommendedAngles: Array<{ angle: string; rationale: string }>
}

export interface HounddogAnalyticsSummary {
  totalScripts: number
  totalPublished: number
  totalReach: number
  avgEngRate: number
  topPlatform: string
  pipelineHealth: number
  weeklyGrowth: number
}

export interface HounddogHook {
  id: string
  hook_text: string
  angle: string | null
  platform: string | null
  score: number | null
  source: string | null
  niche: string | null
  created_at: string
}
