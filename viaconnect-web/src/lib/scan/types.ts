import type { PoseId } from './poses';
export type QaMode = 'landmarker' | 'weak';
export type QaCode =
  | 'PASS' | 'NO_BODY' | 'FEET_CUT' | 'HEAD_CUT'
  | 'OFF_MARK' | 'ARMS_IN' | 'SQUARE_UP' | 'TURN_MORE' | 'BLURRY';
export type QaResult = { pass: boolean; code: QaCode; message: string; mode: QaMode };
export type Landmark = { x: number; y: number; z: number; visibility: number; presence: number };
export type ScanFrame = {
  pose: PoseId; blob: Blob; objectUrl: string; capturedAt: string;
  qa: QaResult; skipped?: boolean; retryCount: number;
  capturedWidth: number; capturedHeight: number; landmarks?: Landmark[];
};
