import { FRBL_ORDER, type MeshyErrorCode, type MeshyVisualState, type MeshyVisualStatus } from './types';
import type { PoseId } from '@/lib/scan/poses';

const STATUSES: readonly MeshyVisualStatus[] = [
  'idle',
  'pending',
  'in_progress',
  'succeeded',
  'failed',
  'moderation_blocked',
  'skipped_no_key',
];

const ERROR_CODES: readonly MeshyErrorCode[] = [
  'no_key',
  'no_photos',
  'unauthorized',
  'not_found',
  'moderation_blocked',
  'payment_required',
  'rate_limited',
  'timeout',
  'store_failed',
  'meshy_failed',
];

const FORBIDDEN_MEASUREMENT_KEYS = [
  'girth',
  'girths',
  'bodyFat',
  'body_fat',
  'bodyFatPct',
  'measurements',
  'waist',
  'chest',
  'hip',
  'neck',
  'bicep',
  'thigh',
  'calf',
] as const;

function isStatus(value: unknown): value is MeshyVisualStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

function isErrorCode(value: unknown): value is MeshyErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

function isPoseId(value: unknown): value is PoseId {
  return typeof value === 'string' && (FRBL_ORDER as readonly string[]).includes(value);
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function emptyMeshyVisual(now: string = new Date().toISOString()): MeshyVisualState {
  return {
    taskId: null,
    status: 'idle',
    glbPath: null,
    glbBytes: null,
    views: [],
    errorCode: null,
    progress: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Keep only visual fields. Drop any measurement-shaped keys a caller might have stuffed in. */
export function sanitizeMeshyVisual(raw: unknown, now: string = new Date().toISOString()): MeshyVisualState {
  const base = emptyMeshyVisual(now);
  if (typeof raw !== 'object' || raw === null) return base;
  const rec = raw as Record<string, unknown>;
  const views = Array.isArray(rec.views) ? rec.views.filter(isPoseId) : [];
  return {
    taskId: strOrNull(rec.taskId),
    status: isStatus(rec.status) ? rec.status : 'idle',
    glbPath: strOrNull(rec.glbPath),
    glbBytes: finiteOrNull(rec.glbBytes),
    views,
    errorCode: isErrorCode(rec.errorCode) ? rec.errorCode : null,
    progress: finiteOrNull(rec.progress),
    createdAt: strOrNull(rec.createdAt) ?? now,
    updatedAt: strOrNull(rec.updatedAt) ?? now,
  };
}

export function meshyVisualHasForbiddenMeasurementKeys(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  return FORBIDDEN_MEASUREMENT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(raw, key));
}

export function toPersistedMeshyVisual(state: MeshyVisualState): MeshyVisualState {
  return {
    taskId: state.taskId,
    status: state.status,
    glbPath: state.glbPath,
    glbBytes: state.glbBytes,
    views: state.views,
    errorCode: state.errorCode,
    progress: state.progress,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

export function mapMeshyHttpError(status: number, bodyText: string): MeshyErrorCode {
  const lower = bodyText.toLowerCase();
  if (status === 402) return 'payment_required';
  if (status === 429) return 'rate_limited';
  if (status === 401) return 'unauthorized';
  if (lower.includes('moderation')) return 'moderation_blocked';
  return 'meshy_failed';
}

export function mapMeshyTaskStatus(
  meshyStatus: string | undefined,
  taskErrorMessage: string | null | undefined,
): { status: MeshyVisualStatus; errorCode: MeshyErrorCode | null } {
  const upper = (meshyStatus ?? '').toUpperCase();
  if (upper === 'SUCCEEDED') return { status: 'succeeded', errorCode: null };
  if (upper === 'PENDING') return { status: 'pending', errorCode: null };
  if (upper === 'IN_PROGRESS') return { status: 'in_progress', errorCode: null };
  const message = (taskErrorMessage ?? '').toLowerCase();
  if (message.includes('moderation') || upper === 'MODERATION_BLOCKED') {
    return { status: 'moderation_blocked', errorCode: 'moderation_blocked' };
  }
  if (upper === 'FAILED' || upper === 'CANCELED' || upper === 'CANCELLED') {
    return { status: 'failed', errorCode: 'meshy_failed' };
  }
  return { status: 'in_progress', errorCode: null };
}

export function isTerminalMeshyStatus(status: MeshyVisualStatus): boolean {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'moderation_blocked' ||
    status === 'skipped_no_key'
  );
}
