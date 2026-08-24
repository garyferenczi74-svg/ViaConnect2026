/**
 * Prompt 216d: load latest compiled Hannah note for the profile card.
 * Fail-open: welcome template if no row / read error; never blank invent.
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  pickWelcomeNote,
  isNoteDistinctFromReadToday,
} from '@/lib/hannah/compilation/hannahNote';

export type HannahDailyNoteState = {
  noteText: string;
  noteKind: 'compiled' | 'welcome' | 'prior';
  generatedAt: string | null;
  compileEndedAt: string | null;
  /** True when note.generated_at is older than last completed compile (wiring bug). */
  staleVsCompile: boolean;
  loading: boolean;
};

type NoteRow = {
  note_text: string;
  note_kind: string;
  generated_at: string;
  compile_ended_at: string | null;
  run_date: string;
  read_today_snapshot: string | null;
};

type CompileRow = {
  ended_at: string;
  run_date: string;
  status: string;
};

export function useHannahDailyNote(
  userId: string | null,
  displayName: string,
  /** Live "Your read today" body for client-side distinctness guard. */
  readTodaySubtext?: string,
): HannahDailyNoteState {
  const [state, setState] = useState<HannahDailyNoteState>({
    noteText: pickWelcomeNote(displayName || 'there').noteText,
    noteKind: 'welcome',
    generatedAt: null,
    compileEndedAt: null,
    staleVsCompile: false,
    loading: Boolean(userId),
  });

  useEffect(() => {
    let active = true;
    const welcome = pickWelcomeNote(displayName || 'there');

    if (!userId) {
      setState({
        noteText: welcome.noteText,
        noteKind: 'welcome',
        generatedAt: null,
        compileEndedAt: null,
        staleVsCompile: false,
        loading: false,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    (async () => {
      try {
        const supabase = createClient();

        const notePromise = (supabase as any)
          .from('hannah_daily_notes')
          .select(
            'note_text, note_kind, generated_at, compile_ended_at, run_date, read_today_snapshot',
          )
          .eq('user_id', userId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle() as Promise<{ data: NoteRow | null; error: unknown }>;

        const compilePromise = (supabase as any)
          .from('hannah_compile_runs')
          .select('ended_at, run_date, status')
          .eq('user_id', userId)
          .in('status', ['ok', 'partial'])
          .order('ended_at', { ascending: false })
          .limit(1)
          .maybeSingle() as Promise<{ data: CompileRow | null; error: unknown }>;

        const [noteRes, compileRes] = await Promise.all([
          withTimeout(notePromise, 4000, 'useHannahDailyNote.note'),
          withTimeout(compilePromise, 4000, 'useHannahDailyNote.compile').catch(() => ({
            data: null,
            error: null,
          })),
        ]);

        if (!active) return;

        const note = noteRes?.data ?? null;
        const compile = (compileRes as { data: CompileRow | null } | null)?.data ?? null;

        if (!note?.note_text) {
          // No compile row for this user yet, or note never persisted.
          if (compile) {
            safeLog.warn('useHannahDailyNote', 'compile exists but note missing; welcome fail-open', {
              userId: userId.slice(0, 8),
            });
          }
          setState({
            noteText: welcome.noteText,
            noteKind: 'welcome',
            generatedAt: null,
            compileEndedAt: compile?.ended_at ?? null,
            staleVsCompile: false,
            loading: false,
          });
          return;
        }

        let text = note.note_text;
        const snapshot = note.read_today_snapshot || '';
        const liveRead = readTodaySubtext || snapshot;

        if (liveRead && !isNoteDistinctFromReadToday(text, liveRead)) {
          safeLog.warn('useHannahDailyNote', 'note collided with read-today; using welcome fallback', {
            userId: userId.slice(0, 8),
          });
          text = welcome.noteText;
        }

        const genAt = note.generated_at;
        const compileEnded = compile?.ended_at ?? note.compile_ended_at;
        let stale = false;
        if (genAt && compileEnded) {
          const g = Date.parse(genAt);
          const c = Date.parse(compileEnded);
          if (Number.isFinite(g) && Number.isFinite(c) && g + 1000 < c) {
            stale = true;
            safeLog.warn('useHannahDailyNote', 'staleness: note older than last completed compile', {
              generatedAt: genAt,
              compileEndedAt: compileEnded,
            });
          }
        }

        setState({
          noteText: text,
          noteKind: note.note_kind === 'welcome' ? 'welcome' : 'compiled',
          generatedAt: genAt,
          compileEndedAt: compileEnded,
          staleVsCompile: stale,
          loading: false,
        });
      } catch (error) {
        safeLog.warn('useHannahDailyNote', 'read failed open to welcome', { error });
        if (!active) return;
        setState({
          noteText: welcome.noteText,
          noteKind: 'welcome',
          generatedAt: null,
          compileEndedAt: null,
          staleVsCompile: false,
          loading: false,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, displayName, readTodaySubtext]);

  return state;
}
