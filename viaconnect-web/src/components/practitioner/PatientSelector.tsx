'use client';

// PatientSelector — first interaction surface for the practitioner shop.
// Practitioners must select a patient before any cart / order action is
// possible. This component handles search, recent patients, and "add new
// patient" deep-link.

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  UserPlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import {
  usePractitioner,
  type PatientProfile,
} from '@/context/PractitionerContext';

interface PatientSelectorProps {
  /** Render mode: full page (initial selector) or modal (Change Patient). */
  variant?: 'page' | 'modal';
  /** Called after a patient is selected. */
  onSelected?: (patient: PatientProfile) => void;
  /** Called when modal should close (modal variant only). */
  onClose?: () => void;
}

const STATUS_BADGE: Record<
  PatientProfile['status'],
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  active: {
    label: 'Active',
    classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.30)]',
    Icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.30)]',
    Icon: Clock,
  },
  revoked: {
    label: 'Revoked',
    classes: 'bg-[rgba(239,68,68,0.12)] text-[#F87171] border-[rgba(239,68,68,0.30)]',
    Icon: AlertCircle,
  },
};

export function PatientSelector({
  variant = 'page',
  onSelected,
  onClose,
}: PatientSelectorProps) {
  const {
    patients,
    isLoadingPatients,
    loadError,
    portalType,
    selectPatient,
    searchPatients,
  } = usePractitioner();

  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const list = query ? searchPatients(query) : patients;
    // Sort: active first, then pending, then by last order date
    return [...list].sort((a, b) => {
      if (a.status !== b.status) {
        const order = { active: 0, pending: 1, revoked: 2 } as const;
        return order[a.status] - order[b.status];
      }
      const aDate = a.lastOrderDate ?? '';
      const bDate = b.lastOrderDate ?? '';
      return bDate.localeCompare(aDate);
    });
  }, [patients, query, searchPatients]);

  const handleSelect = (patient: PatientProfile) => {
    selectPatient(patient.id);
    onSelected?.(patient);
    if (variant === 'modal') onClose?.();
  };

  const accentColor = portalType === 'naturopath' ? '#B75E18' : '#2DA5A0';

  const body = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            Ordering For
          </p>
          <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
            Select a Patient
          </h2>
          <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.45)] sm:text-sm">
            Every cart and order is patient-specific. Pick a patient before browsing the
            shop.
          </p>
        </div>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.55)] transition-all hover:border-[rgba(255,255,255,0.20)] hover:text-white"
            aria-label="Close patient selector"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(255,255,255,0.40)]"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] pl-10 pr-4 text-sm text-white placeholder:text-[rgba(255,255,255,0.30)] outline-none transition-all focus:border-[rgba(45,165,160,0.40)] focus:ring-1 focus:ring-[rgba(45,165,160,0.20)]"
        />
      </div>

      {/* Loading */}
      {isLoadingPatients && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-xs text-[rgba(255,255,255,0.45)]">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading patient roster...
        </div>
      )}

      {/* Error */}
      {loadError && !isLoadingPatients && (
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-4 py-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F87171]"
            strokeWidth={1.5}
          />
          <p className="text-xs text-[rgba(255,255,255,0.65)]">
            Couldn&apos;t load patients: {loadError}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoadingPatients && !loadError && patients.length === 0 && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center">
          <Users
            className="mx-auto h-8 w-8 text-[rgba(255,255,255,0.20)]"
            strokeWidth={1.5}
          />
          <p className="mt-2 text-sm font-medium text-[rgba(255,255,255,0.55)]">
            No patients yet
          </p>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.40)]">
            Add patients from the Patients tab to start ordering on their behalf.
          </p>
        </div>
      )}

      {/* Patient list */}
      {!isLoadingPatients && filtered.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.40)]">
            {query ? `${filtered.length} match${filtered.length !== 1 ? 'es' : ''}` : 'Recent Patients'}
          </p>
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {filtered.map((patient) => {
                const badge = STATUS_BADGE[patient.status];
                const BadgeIcon = badge.Icon;
                return (
                  <motion.li
                    key={patient.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(patient)}
                      disabled={patient.status === 'revoked'}
                      className="group flex w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-left transition-all hover:border-[rgba(45,165,160,0.40)] hover:bg-[rgba(45,165,160,0.06)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[rgba(255,255,255,0.08)] disabled:hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      {/* Avatar */}
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.10)] bg-gradient-to-br from-[#1A2744] to-[#1E3054] text-sm font-semibold text-white"
                      >
                        {patient.firstName.charAt(0) || patient.lastName.charAt(0) || '?'}
                      </div>
                      {/* Name + email */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {patient.fullName}
                        </p>
                        <p className="truncate text-[11px] text-[rgba(255,255,255,0.45)]">
                          {patient.email || '—'}
                        </p>
                      </div>
                      {/* Status */}
                      <span
                        className={`hidden flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${badge.classes}`}
                      >
                        <BadgeIcon className="h-2.5 w-2.5" strokeWidth={1.5} />
                        {badge.label}
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Add new patient CTA */}
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
        <a
          href={portalType === 'naturopath' ? '/naturopath/patients' : '/practitioner/patients'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-4 py-2.5 text-sm font-medium text-[rgba(255,255,255,0.65)] transition-all hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white sm:w-auto"
        >
          <UserPlus className="h-4 w-4" strokeWidth={1.5} />
          Add New Patient
        </a>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[#1E3054] p-5 shadow-2xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[#1E3054] p-5 sm:p-6">
      {body}
    </div>
  );
}
