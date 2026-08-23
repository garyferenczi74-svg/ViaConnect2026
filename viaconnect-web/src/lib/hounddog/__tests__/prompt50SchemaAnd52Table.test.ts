import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readRepo(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8')
}

describe('Prompt #50 Hounddog command-center schema', () => {
  const sql = readRepo(
    'supabase/migrations/20260823224716_prompt_50_hounddog_command_center_schema.sql',
  )

  it('creates the five missing tables plus hounddog_is_admin', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.hounddog_scripts')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.hounddog_pipeline')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.hounddog_performance')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.hounddog_hooks')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.hounddog_analytics_rollup')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.hounddog_is_admin()')
    expect(sql).toContain("gary@farmceuticawellness.com")
  })

  it('matches persist column contracts used by analytics.ts', () => {
    for (const col of [
      'title',
      'hook',
      'body',
      'cta',
      'angle',
      'platform',
      'niche',
      'hook_score',
      'ai_score',
      'created_by',
    ]) {
      expect(sql).toContain(col)
    }
    expect(sql).toContain('script_id')
    expect(sql).toContain('scheduled_at')
    expect(sql).toContain('pipeline_id')
    expect(sql).toContain('eng_rate')
    expect(sql).toContain('hook_text')
    expect(sql).toContain('period_start')
    expect(sql).toContain('period_end')
    expect(sql).toContain('total_scripts')
    expect(sql).toContain('pipeline_health')
  })

  it('enables Gary-only RLS and does not activate content_manager', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('USING (public.hounddog_is_admin())')
    expect(sql).toContain('WITH CHECK (public.hounddog_is_admin())')
    expect(sql).toMatch(/-- CREATE POLICY "hounddog_scripts_content_manager_write"/)
    expect(sql).not.toMatch(/^\s*CREATE POLICY .*content_manager/m)
    expect(sql).not.toMatch(/CREATE POLICY .*social_manager/)
  })

  it('does not seed live scrape or performance metrics', () => {
    expect(sql).not.toMatch(/INSERT INTO public\.hounddog_performance/i)
    expect(sql).not.toMatch(/INSERT INTO public\.hounddog_analytics_rollup/i)
  })
})

describe('Prompt #50 persist helpers', () => {
  const src = readRepo('src/lib/hounddog/analytics.ts')

  it('writes scripts, pipeline, hooks, performance, and rollups', () => {
    expect(src).toContain("from('hounddog_scripts')")
    expect(src).toContain("from('hounddog_pipeline')")
    expect(src).toContain("from('hounddog_hooks')")
    expect(src).toContain("from('hounddog_performance')")
    expect(src).toContain("from('hounddog_analytics_rollup')")
    expect(src).toContain('export async function saveScript')
    expect(src).toContain('export async function pushScriptToPipeline')
    expect(src).toContain('export async function saveHook')
    expect(src).toContain('export async function recordPerformance')
    expect(src).toContain('export async function saveAnalyticsRollup')
  })
})

describe('Prompt #52 Social Performance table', () => {
  const src = readRepo('src/components/hounddog/tabs/OverviewTab.tsx')

  it('uses overflow-x scroll and the 660 / 1280 / fixed-column contract', () => {
    expect(src).toContain("const SOCIAL_PERF_COLUMNS = '160px 88px 58px 64px 64px 64px 90px 72px'")
    expect(src).toContain('const SOCIAL_PERF_MIN_WIDTH = 660')
    expect(src).toContain('const SOCIAL_PERF_MAX_WIDTH = 1280')
    expect(src).toContain("overflowX: 'auto'")
    expect(src).not.toMatch(/gridTemplateColumns:\s*'1fr /)
    expect(src).not.toMatch(/minWidth:\s*655/)
  })
})
