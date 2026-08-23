import { createClient } from '@/lib/supabase/client'
import type { HounddogAnalyticsSummary } from './types'

export type { HounddogAnalyticsSummary }

export async function getHounddogAnalyticsSummary(): Promise<HounddogAnalyticsSummary | null> {
  const supabase = createClient()
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => {
            single: () => Promise<{ data: Record<string, unknown> | null }>
          }
        }
      }
      insert: (row: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
  }

  const { data: rollup } = await client
    .from('hounddog_analytics_rollup')
    .select('*')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (!rollup) return null

  return {
    totalScripts: (rollup.total_scripts as number) ?? 0,
    totalPublished: (rollup.total_published as number) ?? 0,
    totalReach: (rollup.total_reach as number) ?? 0,
    avgEngRate: (rollup.avg_eng_rate as number) ?? 0,
    topPlatform: (rollup.top_platform as string) ?? 'tiktok',
    pipelineHealth: (rollup.pipeline_health as number) ?? 0,
    weeklyGrowth: 0,
  }
}

export async function pushScriptToPipeline(
  scriptId: string,
  platform: string,
  scheduledAt: string
) {
  const supabase = createClient()
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
  }
  return client.from('hounddog_pipeline').insert({
    script_id: scriptId,
    platform,
    scheduled_at: scheduledAt,
    status: 'queued',
  })
}

export async function saveScript(script: {
  title: string
  hook: string
  body: string
  cta: string
  angle: string
  platform: string
  niche: string
  hook_score: number
  ai_score: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
  }
  return client.from('hounddog_scripts').insert({
    ...script,
    status: 'draft',
    created_by: user?.id,
  })
}

function insertClient() {
  const supabase = createClient()
  return supabase as unknown as {
    from: (table: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
  }
}

export async function saveHook(hook: {
  hook_text: string
  angle?: string
  platform?: string
  score?: number
  source?: string
  niche?: string
}) {
  return insertClient().from('hounddog_hooks').insert(hook)
}

export async function recordPerformance(row: {
  platform: string
  post_url?: string | null
  pipeline_id?: string | null
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  reach?: number
  eng_rate?: number | null
}) {
  return insertClient().from('hounddog_performance').insert(row)
}

export async function saveAnalyticsRollup(row: {
  period_start: string
  period_end: string
  total_scripts?: number
  total_published?: number
  total_reach?: number
  avg_eng_rate?: number | null
  top_platform?: string
  top_hook_angle?: string
  pipeline_health?: number
}) {
  return insertClient().from('hounddog_analytics_rollup').insert(row)
}
