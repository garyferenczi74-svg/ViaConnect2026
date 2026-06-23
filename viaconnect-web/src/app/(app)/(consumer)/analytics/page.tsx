"use client";

/**
 * /analytics - the "Your Journey" page (Prompt 208d).
 *
 * This page now renders the single-scrolling Your Journey composition
 * (YourJourneyPage). It supersedes the earlier multi-panel analytics layout
 * and the additive 208c spine mount (the spine now lives inside
 * YourJourneyPage). Per 208d section 3 + 4 the four excluded panels and the
 * genetic risk panel are intentionally not on this page; their shared
 * component source is unchanged and remains in the repo.
 *
 * Auth: the authed userId resolves from the browser Supabase client (same
 * resolution as before) and is passed down. A null userId renders the page
 * in its honest empty state; the page never throws.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileHeroBackground } from "@/components/ui/MobileHeroBackground";
import { YourJourneyPage } from "@/components/journey/YourJourneyPage";

const supabase = createClient();

export default function AnalyticsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  return (
    <>
      <MobileHeroBackground
        src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%2020%20Desktop.png"
        mobileSrc="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2020%20Mobile.png"
        overlayOpacity={0.55}
        objectPosition="center center"
        priority
      />
      <YourJourneyPage userId={userId} />
    </>
  );
}
