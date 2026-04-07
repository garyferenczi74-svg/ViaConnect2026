'use client';

// UserMenu — dropdown trigger that lives in shop / consumer page headers
// next to the Cart button. Pulls user profile (name, email, avatar) in one
// query, highlights the active /account/* route, and falls back gracefully
// when the notifications table or avatar URL isn't available.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Package,
  MapPin,
  Share2,
  Bell,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserSnapshot {
  firstName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const FALLBACK_USER: UserSnapshot = {
  firstName: 'Account',
  fullName: 'Account',
  email: '',
  avatarUrl: null,
};

export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserSnapshot>(FALLBACK_USER);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);

  // Single fetch for user profile + notification count
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser || cancelled) return;

        // Fetch profile (best effort)
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('full_name, first_name, last_name, avatar_url, email')
          .eq('id', authUser.id)
          .maybeSingle();

        if (cancelled) return;

        // Resolve display fields with multiple fallbacks
        const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
        const fullName =
          profile?.full_name ||
          (typeof meta.full_name === 'string' ? meta.full_name : '') ||
          (typeof meta.name === 'string' ? meta.name : '') ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
          authUser.email?.split('@')[0] ||
          'Account';

        const firstName =
          profile?.first_name ||
          fullName.split(' ')[0] ||
          'Account';

        const email = profile?.email || authUser.email || '';
        const avatarUrl = (profile?.avatar_url as string | null) ?? null;

        setUser({ firstName, fullName, email, avatarUrl });

        // Best-effort unread notification count
        try {
          const { count, error } = await (supabase as any)
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)
            .eq('read', false);

          if (!cancelled && !error && typeof count === 'number') {
            setUnreadCount(count);
          }
        } catch {
          /* table may not exist — ignore */
        }
      } catch {
        /* keep fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const items: MenuItem[] = [
    { label: 'My Orders', href: '/account/orders', icon: Package },
    { label: 'Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Shared Access', href: '/account/shared-access', icon: Share2 },
    {
      label: 'Notifications',
      href: '/account/notifications',
      icon: Bell,
      badge: unreadCount,
    },
    { label: 'Profile', href: '/account/profile', icon: Settings },
  ];

  const initials = user.firstName.charAt(0).toUpperCase() || 'A';
  const showAvatar = user.avatarUrl && !avatarErrored;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex min-h-[44px] items-center gap-2 rounded-xl border px-2 py-1.5 text-sm transition-all duration-200 sm:px-3 sm:py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744] ${
          open
            ? 'border-[rgba(45,165,160,0.40)] bg-[rgba(45,165,160,0.10)] text-white'
            : 'border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.75)] hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
        }`}
      >
        {/* Avatar */}
        <div className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(45,165,160,0.40)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
          {showAvatar ? (
            <Image
              src={user.avatarUrl!}
              alt={user.fullName}
              fill
              sizes="28px"
              className="object-cover"
              onError={() => setAvatarErrored(true)}
            />
          ) : (
            <span className="text-[11px] font-semibold text-white">{initials}</span>
          )}
        </div>

        {/* Name (truncated) — visible from xs+ */}
        <span className="max-w-[80px] truncate font-medium sm:max-w-[120px]">
          {user.firstName}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />

        {/* Notification dot on the trigger */}
        {unreadCount > 0 && !open && (
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B75E18] opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-[#1A2744] bg-[#B75E18]" />
          </span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[#1E3054] shadow-2xl shadow-black/40"
          >
            {/* Header — name + email + avatar */}
            <div className="border-b border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[rgba(45,165,160,0.08)] to-transparent px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(45,165,160,0.40)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
                  {showAvatar ? (
                    <Image
                      src={user.avatarUrl!}
                      alt={user.fullName}
                      fill
                      sizes="44px"
                      className="object-cover"
                      onError={() => setAvatarErrored(true)}
                    />
                  ) : (
                    <span className="text-base font-semibold text-white">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.fullName}
                  </p>
                  {user.email && (
                    <p className="truncate text-[11px] text-[rgba(255,255,255,0.50)]">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section label */}
            <p className="px-4 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.35)]">
              My Account
            </p>

            {/* Menu items */}
            <ul className="px-1.5 pb-1.5 pt-1">
              {items.map((item) => {
                const Icon = item.icon;
                const showBadge = item.badge && item.badge > 0;
                const isActive = pathname?.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className={`flex min-h-[40px] items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all ${
                        isActive
                          ? 'bg-[rgba(45,165,160,0.12)] text-white shadow-[inset_2px_0_0_#2DA5A0]'
                          : 'text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                      } focus-visible:bg-[rgba(255,255,255,0.05)] focus-visible:text-white focus-visible:outline-none`}
                    >
                      <Icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          isActive ? 'text-[#2DA5A0]' : 'text-[rgba(255,255,255,0.55)]'
                        }`}
                        strokeWidth={1.5}
                      />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#B75E18] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          {item.badge! > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Sign Out */}
            <div className="border-t border-[rgba(255,255,255,0.06)] p-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                role="menuitem"
                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[rgba(255,255,255,0.65)] transition-colors hover:bg-[rgba(239,68,68,0.10)] hover:text-[#F87171] focus-visible:bg-[rgba(239,68,68,0.10)] focus-visible:text-[#F87171] focus-visible:outline-none disabled:opacity-50"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                )}
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
