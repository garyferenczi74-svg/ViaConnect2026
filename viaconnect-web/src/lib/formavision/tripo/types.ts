// FormaVision Tripo visual pipeline (Path 2 — retained FRBL).
// VISUAL ONLY. Never invent girths, body fat, or muscle lbs from the mesh.

import type { PoseId } from '@/lib/scan/poses';
import type { MeshyErrorCode, MeshyVisualState, MeshyVisualStatus } from '@/lib/formavision/meshy/types';

export const TRIPO_CREATE_URL = 'https://openapi.tripo3d.ai/v3/generation/multiview-to-model';
export const TRIPO_TASK_URL_PREFIX = 'https://openapi.tripo3d.ai/v3/tasks';
export const TRIPO_GLB_OBJECT_NAME = 'tripo/visual.glb';

/** Latest required id from Tripo v3 multiview-to-model docs (2026-09). */
export const TRIPO_MULTIVIEW_MODEL = 'v3.1-20260211' as const;
export type TripoMultiviewModelId = typeof TRIPO_MULTIVIEW_MODEL;

/** Tripo docs: named front / left / back / right. Server canonicalizes order. */
export const TRIPO_VIEW_ORDER = ['front', 'left', 'back', 'right'] as const;
export type TripoViewId = (typeof TRIPO_VIEW_ORDER)[number];

export type TripoVisualStatus = MeshyVisualStatus;
export type TripoErrorCode = MeshyErrorCode | 'tripo_failed';
export type TripoVisualState = MeshyVisualState;

export interface TripoViewInput {
  view: TripoViewId;
  url: string;
}

export interface TripoCreateRequestBody {
  model: TripoMultiviewModelId;
  inputs: Array<Partial<Record<TripoViewId, string>>>;
  texture: true;
}

export interface TripoTaskOutput {
  model_url?: string | null;
}

export interface TripoTaskData {
  task_id?: string;
  status?: string;
  progress?: number;
  output?: TripoTaskOutput | null;
}

export interface TripoApiEnvelope {
  code?: number;
  data?: TripoTaskData | null;
}

export interface CreateTripoResult {
  ok: boolean;
  skipped: boolean;
  visual: TripoVisualState;
  errorCode: TripoErrorCode | null;
}

export function tripoTaskUrl(taskId: string): string {
  return `${TRIPO_TASK_URL_PREFIX}/${encodeURIComponent(taskId)}`;
}

export function isTripoViewId(value: string): value is TripoViewId {
  return (TRIPO_VIEW_ORDER as readonly string[]).includes(value);
}

export type { PoseId };
