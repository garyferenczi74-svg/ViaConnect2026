'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSubmittedToday } from '@/lib/checkinReset';

interface UseCheckinCardOptions {
  userId: string;
  timezone: string;
  checkInDate: string;
  submitFlagColumn: string;
  initialSubmittedAt?: string | null;
  buildPayload: () => Record<string, unknown>;
  onSaved?: () => void;
}

interface UseCheckinCardReturn {
  isSubmitted: boolean;
  isLoading: boolean;
  handleSubmit: () => Promise<void>;
}

export function useCheckinCard({
  userId,
  timezone,
  checkInDate,
  submitFlagColumn,
  initialSubmittedAt,
  buildPayload,
  onSaved,
}: UseCheckinCardOptions): UseCheckinCardReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(initialSubmittedAt ?? null);

  const isSubmitted = isSubmittedToday(submittedAt, timezone);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || isLoading) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const now = new Date().toISOString();

      await (supabase as any).from('daily_checkins').upsert(
        {
          user_id: userId,
          check_in_date: checkInDate,
          ...buildPayload(),
          [submitFlagColumn]: now,
          updated_at: now,
        },
        { onConflict: 'user_id,check_in_date' },
      );

      setSubmittedAt(now);
      onSaved?.();
    } catch (err) {
      console.error(`[CheckinCard:${submitFlagColumn}]`, err);
    } finally {
      setIsLoading(false);
    }
  }, [isSubmitted, isLoading, userId, checkInDate, submitFlagColumn, buildPayload, onSaved]);

  return { isSubmitted, isLoading, handleSubmit };
}
