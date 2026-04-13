import { createClient } from '@/lib/supabase/client'

const HOUNDDOG_ADMIN_EMAIL = 'gary@farmceuticawellness.com'

export async function isHounddogAdmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === HOUNDDOG_ADMIN_EMAIL
}
