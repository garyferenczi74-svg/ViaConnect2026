'use client';

// AlertBell — research-hub-specific alert indicator with unread count.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUnreadAlertCount } from '@/lib/research-hub/service';

interface AlertBellProps {
  href?: string;
}

export function AlertBell({ href = '/media-sources' }: AlertBellProps) {
  const [count, setCount] = useState(0);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const c = await getUnreadAlertCount(user.id);
        if (!cancelled) {
          setCount(c);
          if (c > 0) {
            setShake(true);
            setTimeout(() => setShake(false), 600);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href={href}
      aria-label={`Research alerts${count > 0 ? ` (${count} new)` : ''}`}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
    >
      <motion.div animate={shake ? { rotate: [0, -12, 12, -8, 8, 0] } : {}} transition={{ duration: 0.5 }}>
        <Bell className="h-4 w-4" strokeWidth={1.5} />
      </motion.div>
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#1A2744] bg-[#B75E18] px-1 text-[9px] font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
