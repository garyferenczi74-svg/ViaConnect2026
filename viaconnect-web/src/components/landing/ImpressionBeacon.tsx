'use client';

import { useEffect, useRef } from 'react';

/**
 * Prompt #138a §6.2: client-side impression beacon. Fires a single
 * POST /api/marketing/impressions on mount with the rendered variant's
 * slot_id, the current viewport, and the visitor's returning status. The
 * referrer category is derived server-side from the Referer header by the
 * route handler.
 *
 * Renders nothing visible. Strict-mode double-mount is guarded by a ref
 * so the beacon only fires once per render. Failures are best-effort and
 * silent on the client; the route handler's retry logic captures transient
 * Supabase errors.
 */
export interface ImpressionBeaconProps {
  visitorId: string;
  slotId: string;
}

export function ImpressionBeacon({ visitorId, slotId }: ImpressionBeaconProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const isReturning = (() => {
      try {
        const key = 'vc_returning_v1';
        const seen = window.localStorage.getItem(key);
        if (!seen) {
          window.localStorage.setItem(key, '1');
          return false;
        }
        return true;
      } catch {
        return false;
      }
    })();

    const viewport = (() => {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    })();

    const payload = {
      visitor_id: visitorId,
      slot_id: slotId,
      viewport,
      viewport_width_px: window.innerWidth,
      is_returning_visitor: isReturning,
    };

    void fetch('/api/marketing/impressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Best-effort. Server-side retry handles transient errors.
    });
  }, [visitorId, slotId]);

  return null;
}
