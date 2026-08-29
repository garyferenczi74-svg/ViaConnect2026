// Prompt 231 (condition 26): the scan viewer is out of scope for this
// build. Honest stub only, no fabricated analysis, mesh, or body-fat
// numbers. Reserved for a later prompt.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ScanResultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center gap-2 px-4 py-6 text-center md:px-6 md:py-8">
      <h1 className="text-lg font-semibold text-white">Scan saved</h1>
      <p className="text-sm text-white/60">Analysis coming soon.</p>
    </div>
  );
}
