'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ManualInputModal } from '@/components/body-tracker/manual-input/ManualInputModal';
import { PoseGuide } from './PoseGuide';
import { PHOTO_POSES } from './poseConstants';
import type { PoseId } from '@/lib/arnold/types';

interface PhotoSessionCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (sessionId: string) => void;
}

interface PoseUploadState {
  fullPath: string | null;
  thumbPath: string | null;
  previewUrl: string | null;
}

const BUCKET = 'body-progress-photos';

export function PhotoSessionCapture({ open, onOpenChange, onCompleted }: PhotoSessionCaptureProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<PoseId, PoseUploadState>>({
    front: { fullPath: null, thumbPath: null, previewUrl: null },
    back:  { fullPath: null, thumbPath: null, previewUrl: null },
    left:  { fullPath: null, thumbPath: null, previewUrl: null },
    right: { fullPath: null, thumbPath: null, previewUrl: null },
  });
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Sign in first to start a photo session.'); return; }
      setUserId(user.id);
      const { data, error: insErr } = await supabase
        .from('body_photo_sessions')
        .insert({ user_id: user.id } as never)
        .select('id')
        .single();
      if (insErr || !data) { setError(insErr?.message ?? 'Failed to start session'); return; }
      setSessionId((data as { id: string }).id);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setStepIdx(0);
      setUserId(null);
      setSessionId(null);
      setUploads({
        front: { fullPath: null, thumbPath: null, previewUrl: null },
        back:  { fullPath: null, thumbPath: null, previewUrl: null },
        left:  { fullPath: null, thumbPath: null, previewUrl: null },
        right: { fullPath: null, thumbPath: null, previewUrl: null },
      });
      setError(null);
      setFinishing(false);
    }
  }, [open]);

  const pose = PHOTO_POSES[stepIdx];
  const completedCount = Object.values(uploads).filter((u) => u.fullPath !== null).length;

  async function handleCaptured(full: Blob, thumb: Blob) {
    if (!userId || !sessionId) throw new Error('Session not ready');
    const supabase = createClient();
    const ts = Date.now();
    const fullPath  = `${userId}/${sessionId}/${pose.id}_full_${ts}.jpg`;
    const thumbPath = `${userId}/${sessionId}/${pose.id}_thumb_${ts}.jpg`;

    const [up1, up2] = await Promise.all([
      supabase.storage.from(BUCKET).upload(fullPath, full,  { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' }),
      supabase.storage.from(BUCKET).upload(thumbPath, thumb, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' }),
    ]);
    if (up1.error) throw new Error(`Upload failed: ${up1.error.message}`);
    if (up2.error) throw new Error(`Upload failed: ${up2.error.message}`);

    const patch: Record<string, unknown> = {
      [`${pose.id}_full_path`]:  fullPath,
      [`${pose.id}_thumb_path`]: thumbPath,
    };
    const currentCompleted = Object.entries(uploads)
      .filter(([, v]) => v.fullPath !== null)
      .map(([k]) => k);
    const newCompleted = Array.from(new Set([...currentCompleted, pose.id]));
    patch.poses_completed = newCompleted;

    const { error: updErr } = await supabase
      .from('body_photo_sessions')
      .update(patch as never)
      .eq('id', sessionId);
    if (updErr) throw new Error(`Session update failed: ${updErr.message}`);

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(fullPath, 3600);
    setUploads((prev) => ({
      ...prev,
      [pose.id]: { fullPath, thumbPath, previewUrl: signed?.signedUrl ?? null },
    }));
  }

  function handleRetake() {
    // Keep the uploaded path for now; user re-captures, which will overwrite the record via new path on next success
    setUploads((prev) => ({ ...prev, [pose.id]: { fullPath: null, thumbPath: null, previewUrl: null } }));
  }

  function handleSkip() {
    if (stepIdx < PHOTO_POSES.length - 1) setStepIdx(stepIdx + 1);
  }

  function next() {
    if (stepIdx < PHOTO_POSES.length - 1) setStepIdx(stepIdx + 1);
  }

  function prev() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  async function finish() {
    if (!sessionId) return;
    setFinishing(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data: { session: authSession } } = await supabase.auth.getSession();
      const accessToken = authSession?.access_token;

      const functionsUrl =
        (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhkcufyqjojdbvdrpky.supabase.co') +
        '/functions/v1/arnold-vision-analyze';

      // Fire and forget — Edge Function takes 10-30s; client polls session status
      void fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      }).catch(() => { /* swallow; status polling surfaces failure */ });

      // Mark status queued so the UI polls
      await supabase
        .from('body_photo_sessions')
        .update({ arnold_status: 'queued' } as never)
        .eq('id', sessionId);

      onCompleted?.(sessionId);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Finish failed');
    } finally {
      setFinishing(false);
    }
  }

  const isLastPose = stepIdx === PHOTO_POSES.length - 1;
  const currentUpload = uploads[pose.id];

  return (
    <ManualInputModal
      open={open}
      onOpenChange={onOpenChange}
      title="Body photo session"
      description={`Step ${stepIdx + 1} of ${PHOTO_POSES.length}, ${completedCount} captured`}
      footer={
        <div className="space-y-2">
          {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={stepIdx === 0 || finishing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.06] min-h-[44px] disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              Back
            </button>
            <div className="flex-1 flex items-center justify-center gap-1.5">
              {PHOTO_POSES.map((p, i) => (
                <span
                  key={p.id}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    uploads[p.id].fullPath ? 'bg-[#2DA5A0]' : i === stepIdx ? 'bg-white/60' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            {!isLastPose ? (
              <button
                type="button"
                onClick={next}
                disabled={finishing}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px]"
              >
                Next
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={finishing || completedCount === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-4 py-2.5 text-sm font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50"
              >
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
                {finishing ? 'Finishing' : 'Finish and analyze'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {!sessionId && !error && (
        <div className="py-12 flex items-center justify-center text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
        </div>
      )}

      {sessionId && (
        <PoseGuide
          pose={pose}
          stepLabel={`Step ${stepIdx + 1} of ${PHOTO_POSES.length}`}
          existingPreviewUrl={currentUpload.previewUrl}
          onCaptured={handleCaptured}
          onSkip={handleSkip}
          onRetake={handleRetake}
        />
      )}
    </ManualInputModal>
  );
}
