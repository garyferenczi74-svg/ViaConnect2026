// FormaVision Meshy visual pipeline. VISUAL ONLY.
// Never invent girths, body fat, or any measurement from the generated mesh.

import type { PoseId } from '@/lib/scan/poses';

export const MESHY_CREATE_URL = 'https://api.meshy.ai/openapi/v1/multi-image-to-3d';
export const MESHY_AI_MODEL = 'meshy-7';
export const MESHY_TEXTURE_RESOLUTION = '2k';
export const MESHY_TARGET_POLYCOUNT = 20_000;
export const MESHY_POSE_MODE = 'a-pose';
export const PHOTO_BUCKET = 'body-progress-photos';
export const PHOTO_SIGNED_TTL_SECONDS = 600;
export const GLB_SIGNED_TTL_SECONDS = 3600;
export const MESHY_GLB_OBJECT_NAME = 'meshy/visual.glb';

export const FRBL_ORDER: readonly PoseId[] = ['front', 'right', 'back', 'left'];

export type MeshyVisualStatus =
  | 'idle'
  | 'pending'
  | 'in_progress'
  | 'succeeded'
  | 'failed'
  | 'moderation_blocked'
  | 'skipped_no_key';

export type MeshyErrorCode =
  | 'no_key'
  | 'no_photos'
  | 'unauthorized'
  | 'not_found'
  | 'moderation_blocked'
  | 'payment_required'
  | 'rate_limited'
  | 'timeout'
  | 'store_failed'
  | 'meshy_failed';

export interface MeshyVisualState {
  taskId: string | null;
  status: MeshyVisualStatus;
  glbPath: string | null;
  glbBytes: number | null;
  views: PoseId[];
  errorCode: MeshyErrorCode | null;
  progress: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FrblPhoto {
  view: PoseId;
  path: string;
}

export interface MeshyCreateRequestBody {
  image_urls: string[];
  ai_model: typeof MESHY_AI_MODEL;
  should_texture: true;
  texture_resolution: typeof MESHY_TEXTURE_RESOLUTION;
  ultra_mode: false;
  enable_pbr: false;
  should_remesh: true;
  topology: 'triangle';
  target_polycount: typeof MESHY_TARGET_POLYCOUNT;
  pose_mode: typeof MESHY_POSE_MODE;
  target_formats: ['glb'];
  moderation: false;
}

export interface MeshyTaskModelUrls {
  glb?: string | null;
}

export interface MeshyTaskError {
  message?: string | null;
}

export interface MeshyTaskRecord {
  id?: string;
  status?: string;
  progress?: number;
  model_urls?: MeshyTaskModelUrls | null;
  task_error?: MeshyTaskError | null;
}

export interface CreateMeshyResult {
  ok: boolean;
  skipped: boolean;
  visual: MeshyVisualState;
  errorCode: MeshyErrorCode | null;
}

export interface PlateMeshSourceInput {
  meshyGlbUrl: string | null;
  meshyStatus: MeshyVisualStatus;
  glbLoadFailed: boolean;
}

export type PlateMeshSource = 'parametric' | 'meshy-glb';
