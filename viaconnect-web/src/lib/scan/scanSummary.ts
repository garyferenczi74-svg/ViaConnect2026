// Client-safe scan list types. Keep this file free of server imports so
// 'use client' history UI can type the /api/scan/history payload.

import type { PoseId } from '@/lib/scan/poses';

export type ScanCaptureStatus = 'uploading' | 'ready' | 'partial' | 'delete_pending' | 'deleted';

export interface ScanSummary {
  id: string;
  date: string;
  protocol: string;
  captureStatus: ScanCaptureStatus | null;
  poses: Record<PoseId, boolean>;
}
