'use client';

// DashboardHeader — in-page header at the top of /dashboard.
// Note: AppShell already renders a global Header with NotificationBell
// across every consumer page. This in-page header gives the dashboard a
// distinct, more prominent greeting + quick-access strip per Prompt #56.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingBag, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardHeaderProps {
  /** Optional override; otherwise resolved via getDisplayName. */
  initialName?: string;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatToday = (): string =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export function DashboardHeader({ initialName }: DashboardHeaderProps) {
  const [name, setName] = useState(initialName || 'there');
  const [unread, setUnread] = useState(0);
  const [initial, setInitial] = useState('?');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve display name via the project utility
      try {
        const { getDisplayName } = await import('@/lib/user/get-display-name');
        const n = await getDisplayName();
        if (!cancelled && n) {
          setName(n);
          setInitial((n.charAt(0) || '?').toUpperCase());
        }
      } catch {
        /* keep fallback */
      }

      // Best-effort unread notification count
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { count } = await (supabase as any)
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (!cancelled && typeof count === 'number') setUnread(count);
      } catch {
        /* table may not exist — ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="flex items-start justify-between gap-3 pb-2">
      {/* Greeting + date */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
          {getGreeting()}, {name}
        </h1>
        <p className="mt-0.5 text-xs text-white/40 sm:text-sm">{formatToday()}</p>
      </div>

      {/* Quick-access strip */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Notifications */}
        <Link
          href="/account/notifications"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#1A2744] bg-[#B75E18] px-1 text-[9px] font-semibold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        {/* Cart / Shop */}
        <Link
          href="/shop"
          aria-label="Shop"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>

        {/* Avatar / Account */}
        <Link
          href="/account/profile"
          aria-label="Account"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2DA5A0]/40 bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] text-sm font-semibold text-white transition-all hover:border-[#2DA5A0]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          {initial !== '?' ? initial : <User className="h-[18px] w-[18px]" strokeWidth={1.5} />}
        </Link>
      </div>
    </header>
  );
}
