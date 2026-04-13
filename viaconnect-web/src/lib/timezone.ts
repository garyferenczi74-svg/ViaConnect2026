import type { SupabaseClient } from '@supabase/supabase-js';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localDateString(timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date());
}

export async function syncTimezone(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const tz = detectTimezone();
  try {
    await supabase.from('profiles').update({ timezone: tz }).eq('id', userId);
  } catch { /* column may not exist yet */ }
}
