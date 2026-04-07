'use client';

// PatientBanner — sticky banner that displays the currently-selected patient
// across all practitioner / naturopath shop pages. Always visible, always
// editable. When no patient is selected, it shows the PatientSelector modal
// instead so practitioners can't sneak past it.

import { useState } from 'react';
import { User, Edit3, Users } from 'lucide-react';
import {
  usePractitioner,
  type PortalType,
} from '@/context/PractitionerContext';
import { PatientSelector } from './PatientSelector';

export function PatientBanner() {
  const { selectedPatient, portalType } = usePractitioner();
  const [showSelector, setShowSelector] = useState(false);

  const accent: Record<PortalType, { bg: string; border: string; text: string }> = {
    practitioner: {
      bg: 'rgba(45,165,160,0.10)',
      border: 'rgba(45,165,160,0.30)',
      text: '#2DA5A0',
    },
    naturopath: {
      bg: 'rgba(183,94,24,0.10)',
      border: 'rgba(183,94,24,0.30)',
      text: '#B75E18',
    },
  };
  const a = accent[portalType];

  // No patient selected — banner becomes a prompt to select
  if (!selectedPatient) {
    return (
      <>
        <div
          className="sticky top-0 z-30 -mx-3 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4 md:-mx-8 md:px-8"
          style={{
            backgroundColor: a.bg,
            borderBottom: `1px solid ${a.border}`,
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Users
              className="h-4 w-4 flex-shrink-0"
              strokeWidth={1.5}
              style={{ color: a.text }}
            />
            <p
              className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm"
              style={{ color: a.text }}
            >
              Select a patient before browsing the shop.
            </p>
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white/[0.05]"
              style={{
                borderColor: a.border,
                color: a.text,
              }}
            >
              Select Patient
            </button>
          </div>
        </div>
        {showSelector && (
          <PatientSelector
            variant="modal"
            onClose={() => setShowSelector(false)}
          />
        )}
      </>
    );
  }

  // Patient selected — show their info + Change link
  return (
    <>
      <div
        className="sticky top-0 z-30 -mx-3 px-3 py-2.5 backdrop-blur-md sm:-mx-4 sm:px-4 md:-mx-8 md:px-8"
        style={{
          backgroundColor: a.bg,
          borderBottom: `1px solid ${a.border}`,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-white"
            style={{
              borderColor: a.border,
              background: `linear-gradient(135deg, #1A2744, ${a.text}33)`,
            }}
          >
            {selectedPatient.firstName.charAt(0) ||
              selectedPatient.lastName.charAt(0) ||
              '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: a.text }}
            >
              Ordering for
            </p>
            <p className="truncate text-sm font-medium text-white">
              {selectedPatient.fullName}
              <span className="ml-2 hidden text-xs text-[rgba(255,255,255,0.55)] sm:inline">
                {selectedPatient.email}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-white/[0.05]"
            style={{
              borderColor: a.border,
              color: a.text,
            }}
            aria-label="Change selected patient"
          >
            <Edit3 className="h-3 w-3" strokeWidth={1.5} />
            <span className="hidden sm:inline">Change</span>
          </button>
        </div>
      </div>
      {showSelector && (
        <PatientSelector variant="modal" onClose={() => setShowSelector(false)} />
      )}
    </>
  );
}
