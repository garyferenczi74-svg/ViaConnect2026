// Prompt 231: pure, testable helper for the finalize route frame-row
// build. Behavior preserving extraction of the strict field whitelist that
// used to live inline in src/app/api/scan/finalize/route.ts - the route
// still owns session_id (added by the caller) and the persistLandmarks env
// read; this module only knows how to shape one frame into its DB row. The
// landmarks key must be OMITTED entirely (not set to null/undefined) when
// persistLandmarks is false, even if the input frame carries landmarks.

export interface FrameRowQa {
  pass: boolean;
  code: string;
  message: string;
  mode: 'landmarker' | 'weak';
}

export interface FrameRowInput {
  view: string;
  qa: FrameRowQa;
  capturedWidth: number;
  capturedHeight: number;
  skipped: boolean;
  retryCount: number;
  capturedAt: string;
  landmarks?: unknown[];
}

export interface FrameRow {
  view: string;
  qa: FrameRowQa;
  qa_mode: string;
  captured_width: number;
  captured_height: number;
  skipped: boolean;
  retry_count: number;
  captured_at: string;
  landmarks?: unknown[];
}

/**
 * Builds the strict-whitelist row for one captured frame. landmarks is
 * ONLY present on the returned object when persistLandmarks is true AND
 * the frame actually carries a landmarks array - never a null/undefined
 * placeholder key.
 */
export function buildFrameRow(frame: FrameRowInput, persistLandmarks: boolean): FrameRow {
  const row: FrameRow = {
    view: frame.view,
    qa: frame.qa,
    qa_mode: frame.qa.mode,
    captured_width: frame.capturedWidth,
    captured_height: frame.capturedHeight,
    skipped: frame.skipped,
    retry_count: frame.retryCount,
    captured_at: frame.capturedAt,
  };
  if (persistLandmarks && frame.landmarks) {
    row.landmarks = frame.landmarks;
  }
  return row;
}
