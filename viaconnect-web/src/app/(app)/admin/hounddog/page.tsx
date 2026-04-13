import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HounddogCommandCenter } from '@/components/admin/hounddog/HounddogCommandCenter'

// FUTURE: Content team access
// const isContentManager = user?.user_metadata?.role === 'content_manager'
// if (!isAdmin && !isContentManager) redirect('/dashboard')

export default async function HounddogPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isAdmin = user.email === 'gary@farmceuticawellness.com'
  if (!isAdmin) redirect('/dashboard')

  return <HounddogCommandCenter />
}
