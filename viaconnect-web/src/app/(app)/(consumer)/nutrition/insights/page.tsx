// Prompt 192 Task 4: the Nutrition Insights page. Server shell: resolves the
// user (redirect to /login when absent), renders the back link and the header
// in the advisor's voice (name via getDisplayName, never hardcoded), and
// mounts the client container that owns the filter chips, the manual Refresh
// button, and the insight cards. The consumer layout paints the plain Deep
// Navy page behind this; every read and write goes through the Task 3 routes
// from the client container.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDisplayName } from '@/lib/getDisplayName';
import { BackToNutritionLink } from '@/components/nutrition/hub/BackToNutritionLink';
import { InsightsPageClient } from '@/components/nutrition/insights/InsightsPageClient';

export default async function NutritionInsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <BackToNutritionLink />

      <header className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight text-white md:text-[26px]">
          Nutrition Insights
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-white/[0.62] md:text-[14px]">
          {getDisplayName('gordon')} reads your week and flags what matters
        </p>
      </header>

      <div className="mt-6">
        <InsightsPageClient />
      </div>
    </div>
  );
}
