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
