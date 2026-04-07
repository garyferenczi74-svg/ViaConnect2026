'use client';

// PractitionerContext — patient selector state for the practitioner /
// naturopath shop flow. Reads the existing practitioner_patients table
// (created by migration 20260326_three_portal_architecture.sql) which has
// granular permission flags. Stores the currently-selected patient in
// sessionStorage so it survives navigation between shop pages.
//
// This context does NOT replace CartContext. The cart still lives in
// @/context/CartContext (Prompt #52). When in practitioner/naturopath mode,
// the cart consumer reads selectedPatient from this context and includes
// patient_id + pricing_tier on every cart write.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PricingTier } from '@/utils/pricingTiers';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type PortalType = 'practitioner' | 'naturopath';

export interface PatientProfile {
  /** auth.users.id of the patient */
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  /** From practitioner_patients.status: 'pending' | 'active' | 'revoked' */
  status: 'pending' | 'active' | 'revoked';
  relationshipType: string;
  /** Granular permission flags from practitioner_patients */
  canViewSupplements: boolean;
  canViewGenetics: boolean;
  canPrescribeProtocols: boolean;
  canOrderPanels: boolean;
  consentGrantedAt: string | null;
  /** True if the patient has any completed genetic test result */
  hasGeneticResults: boolean;
  /** ISO date of the most recent shop_orders row, if any */
  lastOrderDate: string | null;
}

export interface PractitionerContextValue {
  portalType: PortalType;
  pricingTier: PricingTier;
  selectedPatient: PatientProfile | null;
  patients: PatientProfile[];
  isLoadingPatients: boolean;
  loadError: string | null;

  selectPatient: (patientId: string) => void;
  clearPatient: () => void;
  refreshPatients: () => Promise<void>;
  searchPatients: (query: string) => PatientProfile[];
}

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

const PractitionerContext = createContext<PractitionerContextValue | null>(null);

interface PractitionerProviderProps {
  portalType: PortalType;
  children: ReactNode;
}

const STORAGE_KEY = (portal: PortalType) => `${portal}_selected_patient_id`;

export function PractitionerProvider({
  portalType,
  children,
}: PractitionerProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const pricingTier: PricingTier = portalType;

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load the practitioner's patient roster from practitioner_patients
  // joined to profiles (for name + avatar).
  const refreshPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    setLoadError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadError('Not signed in');
      setIsLoadingPatients(false);
      return;
    }

    // Cast to any: practitioner_patients is in migration 20260326 but may not
    // be present in regenerated types.ts. Granular permission flags here are
    // schema-driven, not type-driven.
    const { data, error } = await (supabase as any)
      .from('practitioner_patients')
      .select(
        `
        patient_id,
        status,
        relationship_type,
        consent_granted_at,
        can_view_supplements,
        can_view_genetics,
        can_prescribe_protocols,
        can_order_panels
      `,
      )
      .eq('practitioner_id', user.id)
      .order('consent_granted_at', { ascending: false, nullsFirst: false });

    if (error) {
      setLoadError(error.message);
      setIsLoadingPatients(false);
      return;
    }

    const rows = (data ?? []) as any[];
    const patientIds = rows.map((r) => r.patient_id).filter(Boolean);

    if (patientIds.length === 0) {
      setPatients([]);
      setIsLoadingPatients(false);
      return;
    }

    // Pull profile rows for the patients
    const { data: profileRows } = await (supabase as any)
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', patientIds);

    const profileMap = new Map<string, any>(
      (profileRows ?? []).map((p: any) => [p.id, p]),
    );

    // Pull last order date per patient (best effort, ignore errors)
    const { data: orderRows } = await (supabase as any)
      .from('shop_orders')
      .select('patient_id, created_at')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });

    const lastOrderMap = new Map<string, string>();
    for (const row of orderRows ?? []) {
      if (row.patient_id && !lastOrderMap.has(row.patient_id)) {
        lastOrderMap.set(row.patient_id, row.created_at);
      }
    }

    // Pull a single genetic_profiles row per patient to determine
    // hasGeneticResults (best effort)
    let geneticIds = new Set<string>();
    try {
      const { data: gpRows } = await (supabase as any)
        .from('genetic_profiles')
        .select('user_id')
        .in('user_id', patientIds);
      geneticIds = new Set((gpRows ?? []).map((r: any) => r.user_id));
    } catch {
      /* table may not exist in the live schema, treat as no results */
    }

    const built: PatientProfile[] = rows.map((r) => {
      const profile = profileMap.get(r.patient_id) ?? {};
      const firstName: string = profile.first_name ?? '';
      const lastName: string = profile.last_name ?? '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unnamed Patient';

      return {
        id: r.patient_id,
        firstName,
        lastName,
        fullName,
        email: profile.email ?? '',
        avatarUrl: profile.avatar_url ?? null,
        status: (r.status ?? 'pending') as PatientProfile['status'],
        relationshipType: r.relationship_type ?? 'primary',
        canViewSupplements: !!r.can_view_supplements,
        canViewGenetics: !!r.can_view_genetics,
        canPrescribeProtocols: !!r.can_prescribe_protocols,
        canOrderPanels: !!r.can_order_panels,
        consentGrantedAt: r.consent_granted_at ?? null,
        hasGeneticResults: geneticIds.has(r.patient_id),
        lastOrderDate: lastOrderMap.get(r.patient_id) ?? null,
      };
    });

    setPatients(built);
    setIsLoadingPatients(false);
  }, [supabase]);

  // Load patients on mount
  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  // Restore selected patient from sessionStorage after the patient list loads
  useEffect(() => {
    if (isLoadingPatients || patients.length === 0) return;
    if (selectedPatient) return;
    if (typeof window === 'undefined') return;

    const savedId = window.sessionStorage.getItem(STORAGE_KEY(portalType));
    if (!savedId) return;

    const found = patients.find((p) => p.id === savedId);
    if (found) setSelectedPatient(found);
  }, [isLoadingPatients, patients, portalType, selectedPatient]);

  const selectPatient = useCallback(
    (patientId: string) => {
      const found = patients.find((p) => p.id === patientId) ?? null;
      setSelectedPatient(found);
      if (typeof window !== 'undefined') {
        if (found) {
          window.sessionStorage.setItem(STORAGE_KEY(portalType), found.id);
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY(portalType));
        }
      }
    },
    [patients, portalType],
  );

  const clearPatient = useCallback(() => {
    setSelectedPatient(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY(portalType));
    }
  }, [portalType]);

  const searchPatients = useCallback(
    (query: string): PatientProfile[] => {
      const q = query.trim().toLowerCase();
      if (!q) return patients;
      return patients.filter((p) => {
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q)
        );
      });
    },
    [patients],
  );

  const value: PractitionerContextValue = useMemo(
    () => ({
      portalType,
      pricingTier,
      selectedPatient,
      patients,
      isLoadingPatients,
      loadError,
      selectPatient,
      clearPatient,
      refreshPatients,
      searchPatients,
    }),
    [
      portalType,
      pricingTier,
      selectedPatient,
      patients,
      isLoadingPatients,
      loadError,
      selectPatient,
      clearPatient,
      refreshPatients,
      searchPatients,
    ],
  );

  return (
    <PractitionerContext.Provider value={value}>{children}</PractitionerContext.Provider>
  );
}

export function usePractitioner(): PractitionerContextValue {
  const ctx = useContext(PractitionerContext);
  if (!ctx) {
    throw new Error(
      'usePractitioner must be called inside a <PractitionerProvider>. ' +
        'Wrap your practitioner/naturopath shop routes in (app)/practitioner/shop/layout.tsx.',
    );
  }
  return ctx;
}

/**
 * Optional version of usePractitioner that returns null instead of throwing
 * when the provider is missing. Useful for shared components like AddToCart
 * that need to detect "am I in practitioner mode?" without crashing on the
 * consumer side.
 */
export function useOptionalPractitioner(): PractitionerContextValue | null {
  return useContext(PractitionerContext);
}
