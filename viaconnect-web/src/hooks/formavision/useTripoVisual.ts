'use client';

import { useEffect, useRef, useState } from 'react';
import type { MeshyErrorCode, MeshyVisualState, MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import { emptyMeshyVisual, isTerminalMeshyStatus } from '@/lib/formavision/meshy/meshyVisualState';
import {
  MESHY_READY_WAIT_MS,
  meshyErrorAfterWaitExpired,
  meshyStatusAfterWaitExpired,
  shouldMarkMeshyCreateAttempted,
  visualFromMeshyPollBody,
} from '@/lib/formavision/viewer/meshyReadyWait';

const POLL_MS = 8000;
const FETCH_TIMEOUT_MS = 20_000;

export interface TripoVisualClient {
  status: MeshyVisualStatus;
  glbUrl: string | null;
  glbPath: string | null;
  glbBytes: number | null;
  errorCode: MeshyErrorCode | null;
  progress: number | null;
}

interface VisualPayload {
  taskId?: string | null;
  status?: MeshyVisualStatus;
  glbPath?: string | null;
  glbBytes?: number | null;
  errorCode?: MeshyErrorCode | null;
  progress?: number | null;
}

function asVisual(raw: VisualPayload | undefined): MeshyVisualState {
  const base = emptyMeshyVisual();
  if (!raw) return base;
  return {
    ...base,
    taskId: typeof raw.taskId === 'string' ? raw.taskId : null,
    status: raw.status ?? 'idle',
    glbPath: typeof raw.glbPath === 'string' ? raw.glbPath : null,
    glbBytes: typeof raw.glbBytes === 'number' ? raw.glbBytes : null,
    errorCode: raw.errorCode ?? null,
    progress: typeof raw.progress === 'number' ? raw.progress : null,
  };
}

export interface UseTripoVisualOptions {
  historyResolved?: boolean;
}

export function shouldKickTripoCreate(
  sessionId: string | null,
  createdFor: string | null,
): boolean {
  return typeof sessionId === 'string' && sessionId.length > 0 && createdFor !== sessionId;
}

export function noSessionTripoVisual(now: string = new Date().toISOString()): MeshyVisualState {
  return {
    ...emptyMeshyVisual(now),
    status: 'failed',
    errorCode: 'no_photos',
  };
}

export function timedOutTripoVisual(
  current: MeshyVisualState,
  now: string = new Date().toISOString(),
): MeshyVisualState {
  return {
    ...current,
    status: meshyStatusAfterWaitExpired(current.status),
    errorCode: meshyErrorAfterWaitExpired(current.errorCode),
    updatedAt: now,
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function useTripoVisual(
  sessionId: string | null,
  options: UseTripoVisualOptions = {},
): TripoVisualClient {
  const historyResolved = options.historyResolved === true;
  const [visual, setVisual] = useState<MeshyVisualState>(() => emptyMeshyVisual());
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const createdForRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVisual(historyResolved ? noSessionTripoVisual() : emptyMeshyVisual());
      setGlbUrl(null);
      createdForRef.current = null;
      startedAtRef.current = null;
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    startedAtRef.current = Date.now();

    const loadGlb = async (path: string | null): Promise<string | null> => {
      if (!path) return null;
      const body = await fetchJson(`/api/formavision/tripo/glb?sessionId=${encodeURIComponent(sessionId)}`);
      if (cancelled) return null;
      return typeof body?.signedUrl === 'string' ? body.signedUrl : null;
    };

    const waitExpired = (): boolean => {
      const started = startedAtRef.current;
      return started !== null && Date.now() - started >= MESHY_READY_WAIT_MS;
    };

    const tick = async (): Promise<void> => {
      if (shouldKickTripoCreate(sessionId, createdForRef.current)) {
        const created = await fetchJson('/api/formavision/tripo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (shouldMarkMeshyCreateAttempted(created)) {
          createdForRef.current = sessionId;
        }
      }
      const body = await fetchJson(`/api/formavision/tripo?sessionId=${encodeURIComponent(sessionId)}`);
      if (cancelled) return;
      const parsed = visualFromMeshyPollBody(body);
      let next = parsed.terminalWithoutVisual
        ? {
            ...emptyMeshyVisual(),
            status: parsed.status ?? 'failed',
            errorCode: parsed.errorCode,
          }
        : asVisual(body?.visual as VisualPayload | undefined);
      const pollSigned = parsed.signedUrl;
      let signed: string | null = null;
      if (next.status === 'succeeded' && (pollSigned || next.glbPath)) {
        signed = pollSigned ?? (await loadGlb(next.glbPath));
        if (cancelled) return;
        if (signed) {
          setVisual(next);
          setGlbUrl(signed);
          return;
        }
      }
      if (waitExpired() && !(next.status === 'succeeded' && signed)) {
        next = timedOutTripoVisual({
          ...next,
          errorCode: next.status === 'succeeded' ? 'store_failed' : next.errorCode,
        });
      }
      setVisual(next);
      const keepPolling =
        !isTerminalMeshyStatus(next.status) ||
        (next.status === 'succeeded' && !signed && !waitExpired());
      if (keepPolling) {
        timer = setTimeout(() => {
          void tick();
        }, POLL_MS);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [historyResolved, sessionId]);

  return {
    status: visual.status,
    glbUrl,
    glbPath: visual.glbPath,
    glbBytes: visual.glbBytes,
    errorCode: visual.errorCode,
    progress: visual.progress,
  };
}
