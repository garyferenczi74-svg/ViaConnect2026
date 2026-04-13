'use client'

import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { getHounddogAnalyticsSummary } from '@/lib/hounddog/analytics'
import type { HounddogAnalyticsSummary } from '@/lib/hounddog/types'

interface StatItem {
  label: string
  value: string
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function HounddogAnalyticsCard() {
  const [summary, setSummary] = useState<HounddogAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHounddogAnalyticsSummary()
      .then((data) => setSummary(data))
      .finally(() => setLoading(false))
  }, [])

  const stats: StatItem[] = summary
    ? [
        { label: 'Scripts in Pipeline', value: formatNumber(summary.totalScripts) },
        { label: 'Published Posts', value: formatNumber(summary.totalPublished) },
        { label: 'Total Reach', value: formatNumber(summary.totalReach) },
        {
          label: 'Avg Engagement',
          value: `${(summary.avgEngRate * 100).toFixed(1)}%`,
        },
      ]
    : [
        { label: 'Scripts in Pipeline', value: '--' },
        { label: 'Published Posts', value: '--' },
        { label: 'Total Reach', value: '--' },
        { label: 'Avg Engagement', value: '--' },
      ]

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: '#1E3054',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgba(183,94,24,0.15)' }}
        >
          <Target
            className="w-4 h-4"
            strokeWidth={1.5}
            style={{ color: '#B75E18' }}
          />
        </div>
        <h3 className="text-sm font-semibold text-white">
          Hounddog Content Intelligence
        </h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-3"
            style={{ backgroundColor: '#1A2744' }}
          >
            <p className="text-[11px] text-gray-400 mb-1">{stat.label}</p>
            <p
              className={`text-lg font-bold ${
                loading ? 'animate-pulse text-gray-500' : 'text-white'
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
