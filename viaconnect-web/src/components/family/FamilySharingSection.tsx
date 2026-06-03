'use client';

// FamilySharingSection  (Prompt #169f, spec section 5.4)
//
// The member-controlled family-sharing toggles, shown ONLY to an ACTIVE family
// member. 169f section 5.4: a family member's data is private by default; the
// member alone may opt IN to share, with their family plan holder, (a) their Body
// Tracker trend SUMMARY (not raw data) and (b) their FormaVision scan COMPLETION
// notifications (not the scan data). The holder cannot turn these on; the member
// owns the control.
//
// The toggles persist per user via useFamilySharingPrefs
// (public.family_member_sharing_prefs; member-write only via RLS). When the
// current user is not an active family member, the hook returns isFamilyMember
// false and this component renders nothing. Styling mirrors the account-profile
// cards (rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5); Lucide icons
// at strokeWidth 1.5; copy uses commas/colons only (no dashes per standing rules).

import { Users, Activity, ScanLine, Lock } from 'lucide-react';
import { FORMAVISION_BRAND } from '@/lib/body-tracker/brand-config';
import { useFamilySharingPrefs } from '@/hooks/family/useFamilySharingPrefs';

interface SharingToggleProps {
  id: string;
  icon: typeof Activity;
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (next: boolean) => void;
}

function SharingToggle({ id, icon: Icon, label, checked, disabled, onToggle }: SharingToggleProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/15">
        <Icon className="h-4 w-4 text-[#2DA5A0]" strokeWidth={1.5} />
      </div>
      <label htmlFor={id} className="flex-1 min-w-0 text-sm text-white/85 cursor-pointer pt-1.5">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onToggle(!checked)}
        className="relative flex-none mt-1 inline-flex h-6 w-11 items-center justify-center rounded-full min-h-[44px] min-w-[44px] disabled:opacity-50"
      >
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? 'bg-[#2DA5A0]' : 'bg-white/15'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`}
          />
        </span>
      </button>
    </div>
  );
}

export function FamilySharingSection() {
  const {
    shareBodyTrackerSummary,
    shareFormavisionCompletion,
    isLoading,
    isFamilyMember,
    setShareBodyTrackerSummary,
    setShareFormavisionCompletion,
  } = useFamilySharingPrefs();

  // Member-controlled autonomy: the section exists only for an ACTIVE family
  // member. Everyone else (including the family plan holder) sees nothing here.
  if (!isFamilyMember) return null;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
      <h3 className="text-sm font-semibold text-white mb-1 inline-flex items-center gap-2">
        <Users className="w-4 h-4 text-[#2DA5A0]" strokeWidth={1.5} />
        Family sharing
      </h3>
      <p className="text-xs text-white/55 leading-relaxed">
        Your health data is private by default. You can choose to share these summaries with your
        family plan holder. You control this, and you can turn it off at any time.
      </p>

      <div className="space-y-2.5 pt-1">
        <SharingToggle
          id="share-body-tracker-summary"
          icon={Activity}
          label={`Share my ${FORMAVISION_BRAND.name} trend summary with my family plan holder`}
          checked={shareBodyTrackerSummary}
          disabled={isLoading}
          onToggle={(next) => void setShareBodyTrackerSummary(next)}
        />
        <SharingToggle
          id="share-formavision-completion"
          icon={ScanLine}
          label="Share my FormaVision scan completion notifications with my family plan holder"
          checked={shareFormavisionCompletion}
          disabled={isLoading}
          onToggle={(next) => void setShareFormavisionCompletion(next)}
        />
      </div>

      <p className="text-[11px] text-white/45 leading-relaxed inline-flex items-start gap-1.5 pt-0.5">
        <Lock className="w-3 h-3 flex-none mt-0.5 text-white/40" strokeWidth={1.5} />
        Your raw measurements and scan details are never shared, only the trend summary and a
        completion notice.
      </p>
    </section>
  );
}
