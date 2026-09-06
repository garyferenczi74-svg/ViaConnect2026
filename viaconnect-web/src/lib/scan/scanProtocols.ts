// Client-safe protocol ids. Do not import scanReadsShared from 'use client'
// components — that module pulls @/lib/supabase/server → next/headers.

/** Upload/Live FormaVision analyze rows in body_tracker_photo_scans. */
export const FORMAVISION_PHOTO_PROTOCOL = 'formavision_photo';

/** Guided live 4-pose sessions in body_photo_sessions. */
export const GUIDED_4POSE_PROTOCOL = '4pose_v1';
