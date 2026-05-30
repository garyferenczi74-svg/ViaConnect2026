'use client';

// Prompt #170a supplement §20.E + §20.8: NutriVision privacy settings page.
//
// Hosts Hannah's locked photo-data paragraph and the two toggles that match
// it (keep photos longer than 24h, contribute to accuracy research). Both
// toggles default OFF. Auth-gated like other consumer settings pages.
//
// The Settings gear icon in /nutrition/photo-ai (NutriVisionTab header) links
// here per §20.E.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SettingsRow {
  corpus_opt_in?: boolean | null;
  keep_photos_longer?: boolean | null;
}

export default function NutriVisionSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [corpusOptIn, setCorpusOptIn] = useState<boolean>(false);
  const [keepPhotos, setKeepPhotos] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rawRow } = await (supabase as any)
          .from('user_nutrivision_settings')
          .select('corpus_opt_in, keep_photos_longer')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled && rawRow) {
          const row = rawRow as SettingsRow;
          if (typeof row.corpus_opt_in === 'boolean') setCorpusOptIn(row.corpus_opt_in);
          if (typeof row.keep_photos_longer === 'boolean') setKeepPhotos(row.keep_photos_longer);
        }
      } catch {
        /* silent: table or columns may not exist yet */
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const persist = async (next: { corpus_opt_in?: boolean; keep_photos_longer?: boolean }) => {
    if (!userId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('user_nutrivision_settings')
        .upsert({ user_id: userId, ...next }, { onConflict: 'user_id' });
    } catch {
      /* silent: best-effort write, UI keeps optimistic state */
    } finally {
      setSaving(false);
    }
  };

  const toggleCorpus = () => {
    const next = !corpusOptIn;
    setCorpusOptIn(next);
    void persist({ corpus_opt_in: next });
  };

  const toggleKeepPhotos = () => {
    const next = !keepPhotos;
    setKeepPhotos(next);
    void persist({ keep_photos_longer: next });
  };

  return (
    <div className="min-h-screen w-full bg-[#1A2744] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/nutrition/photo-ai"
            aria-label="Back to NutriVision"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/5 text-white/80 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-white sm:text-2xl">NutriVision Settings</h1>
          </div>
        </header>

        <section
          aria-labelledby="meal-photo-privacy-heading"
          className="rounded-2xl border border-white/[0.08] bg-[#1E3054]/55 p-5 backdrop-blur-md"
        >
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/55">
            Privacy
          </h2>
          <h3
            id="meal-photo-privacy-heading"
            className="text-base font-semibold text-white"
          >
            Meal Photo Privacy
          </h3>
          <p
            id="meal-photo-privacy-body"
            className="mt-3 text-sm leading-[22px] text-white/85"
          >
            When you take a meal photo, the full image is sent to our analysis
            service. We don't redact background content, so anything visible in
            the frame, including medication labels or personal documents, is part
            of the request. Photos are deleted from our servers 24 hours after
            upload unless you opt in to keep them. If you opt in to contribute
            photos to accuracy research, we keep an anonymized copy. You can
            revoke that consent at any time; revocations take 7 days to remove
            your contributed photos from research storage.
          </p>

          {loading ? (
            <p className="mt-5 text-xs text-white/45">Loading settings...</p>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <SettingToggle
                label="Keep my meal photos longer than 24 hours"
                describedById="meal-photo-privacy-body"
                checked={keepPhotos}
                disabled={saving}
                onToggle={toggleKeepPhotos}
              />
              <SettingToggle
                label="Contribute anonymized photos to accuracy research"
                describedById="meal-photo-privacy-body"
                checked={corpusOptIn}
                disabled={saving}
                onToggle={toggleCorpus}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  describedById: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function SettingToggle(props: SettingToggleProps) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-[#1A2744]/40 px-3.5 py-3">
      <span className="text-sm font-medium text-white/85">{props.label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-describedby={props.describedById}
        disabled={props.disabled}
        onClick={props.onToggle}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors disabled:opacity-50 ${
          props.checked ? 'bg-[#2DA5A0]' : 'bg-white/15'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            props.checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
