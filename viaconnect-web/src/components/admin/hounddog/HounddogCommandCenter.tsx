'use client'

import HounddogCommandCenterImpl from '@/components/hounddog/HounddogCommandCenter'
import type { HounddogResearchFinding } from '@/lib/hounddog/researchFindings'

export function HounddogCommandCenter({
  researchFindings,
}: {
  researchFindings?: readonly HounddogResearchFinding[];
} = {}) {
  return <HounddogCommandCenterImpl researchFindings={researchFindings} />
}
