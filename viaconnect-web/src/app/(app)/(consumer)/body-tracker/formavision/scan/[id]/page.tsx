// Live 4-pose capture now shares the 209/210l composition spine.
// Land on FormaVision (existing 3D avatar) — no second viewer.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FORMAVISION_PATH } from '@/lib/body-tracker/compositionNav';

export default async function ScanResultPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  redirect(FORMAVISION_PATH);
}
