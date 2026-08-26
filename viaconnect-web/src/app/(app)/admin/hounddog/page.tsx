import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClientOrNull } from '@/lib/supabase/admin'
import { HounddogCommandCenter } from '@/components/admin/hounddog/HounddogCommandCenter'
import { queryHounddogResearchFindings } from '@/lib/hounddog/researchFindings'

// FUTURE: Content team access
// const isContentManager = user?.user_metadata?.role === 'content_manager'
// if (!isAdmin && !isContentManager) redirect('/dashboard')

export default async function HounddogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === 'gary@farmceuticawellness.com'
  if (!isAdmin) redirect('/dashboard')

  const admin = createAdminClientOrNull()
  const researchFindings = admin
    ? await queryHounddogResearchFindings(admin)
    : []

  return <HounddogCommandCenter researchFindings={researchFindings} />
}
