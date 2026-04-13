import { createClient } from '@/lib/supabase/client'
import type { HounddogAnalyticsSummary } from './types'

export async function getHounddogAnalyticsSummary(): Promise<HounddogAnalyticsSummary | null> {
  const supabase = createClient()

  const { data: rollup } = await supabase
    .from('hounddog_analytics_rollup' as 'profiles')
    .select('*')
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  if (!rollup) return null

  const r = rollup as unknown as Record<string, unknown>
  return {
    totalScripts: (r.total_scripts as number) ?? 0,
    totalPublished: (r.total_published as number) ?? 0,
    totalReach: (r.total_reach as number) ?? 0,
    avgEngRate: (r.avg_eng_rate as number) ?? 0,
    topPlatform: (r.top_platform as string) ?? 'tiktok',
    pipelineHealth: (r.pipeline_health as number) ?? 0,
    weeklyGrowth: 0,
  }
}

export async function pushScriptToPipeline(
  scriptId: string,
  platform: string,
  scheduledAt: string
) {
  const supabase = createClient()
  return supabase.from('hounddog_pipeline' as 'profiles').insert({
    script_id: scriptId,
    platform,
    scheduled_at: scheduledAt,
    status: 'queued',
  } as unknown as Record<string, unknown>)
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
  return supabase.from('hounddog_scripts' as 'profiles').insert({
    ...script,
    status: 'draft',
    created_by: user?.id,
  } as unknown as Record<string, unknown>)
}
