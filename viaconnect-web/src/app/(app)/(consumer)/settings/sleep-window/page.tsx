/**
 * Prompt 171b Phase 3: sleep window settings page.
 *
 * Settings sub-page where users set their actual bedtime + wake time so the
 * Bio Optimization Score caffeine timing reasoning aligns with their real
 * sleep schedule. Without this, the 171b Phase 1 caffeine-timing-source.ts
 * source slice falls back to a default 23:00-07:00 window.
 *
 * Persists via PUT /api/profile/sleep-window which writes profiles.sleep_start
 * and profiles.sleep_wake (TIME columns from 20260601000010 migration).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_SLEEP_START = '23:00';
const DEFAULT_SLEEP_WAKE = '07:00';

interface SleepWindowResponse {
  sleep_start: string | null;
  sleep_wake: string | null;
  source: 'user_saved' | 'default';
  default_sleep_start: string;
  default_sleep_wake: string;
}

export default function SleepWindowSettingsPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSource, setSavedSource] = useState<'user_saved' | 'default'>('default');
  const [sleepStart, setSleepStart] = useState(DEFAULT_SLEEP_START);
  const [sleepWake, setSleepWake] = useState(DEFAULT_SLEEP_WAKE);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/profile/sleep-window');
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const body = (await res.json()) as SleepWindowResponse;
        if (cancelled) return;
        setSavedSource(body.source);
        if (body.sleep_start !== null) setSleepStart(body.sleep_start);
        if (body.sleep_wake !== null) setSleepWake(body.sleep_wake);
      } catch {
        // best effort; keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/profile/sleep-window', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sleep_start: sleepStart, sleep_wake: sleepWake }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? 'Could not save your sleep window');
        return;
      }
      setSavedSource('user_saved');
      toast.success('Sleep window updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }, [sleepStart, sleepWake]);

  const handleReset = useCallback(() => {
    setSleepStart(DEFAULT_SLEEP_START);
    setSleepWake(DEFAULT_SLEEP_WAKE);
    setError(null);
  }, []);

  const isUsingDefault =
    savedSource === 'default'
    || (sleepStart === DEFAULT_SLEEP_START && sleepWake === DEFAULT_SLEEP_WAKE);

  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/settings"
            aria-label="Back to settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Sleep window
            </h1>
          </div>
        </header>

        <section
          aria-labelledby="sleep-window-heading"
          className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md"
        >
          <h2 id="sleep-window-heading" className="text-base font-semibold text-white">
            Your typical bedtime and wake time
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-white/85">
            We use these times to consider how your caffeine and other timing sensitive habits affect your sleep and Bio Optimization Score. Your data, your insights; you can change these anytime.
          </p>

          {isUsingDefault ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/60">
              <Clock className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
              Using default sleep window
            </p>
          ) : null}

          {loading ? (
            <p className="mt-5 text-xs text-white/45">Loading your sleep window...</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-white/65">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Bedtime
                </span>
                <input
                  type="time"
                  value={sleepStart}
                  onChange={(e) => { setSleepStart(e.target.value); setError(null); }}
                  required
                  aria-label="Bedtime in 24 hour format"
                  className="rounded-xl border border-white/[0.08] bg-[#1A2744]/55 px-3 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-white/65">
                  <Sun className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  Wake time
                </span>
                <input
                  type="time"
                  value={sleepWake}
                  onChange={(e) => { setSleepWake(e.target.value); setError(null); }}
                  required
                  aria-label="Wake time in 24 hour format"
                  className="rounded-xl border border-white/[0.08] bg-[#1A2744]/55 px-3 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-[#2DA5A0]"
                />
              </label>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-4 text-sm" style={{ color: '#FCA5A5' }}>
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="rounded-xl bg-[#2DA5A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <Link
              href="/settings"
              className="text-sm text-white/65 underline hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving}
              className="ml-auto text-xs text-white/55 underline hover:text-white/80"
            >
              Use the default times (23:00 to 07:00)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
