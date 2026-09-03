'use client';

import { useEffect, useRef, useState } from 'react';
import type { MeshyErrorCode, MeshyVisualState, MeshyVisualStatus } from '@/lib/formavision/meshy/types';
import { emptyMeshyVisual } from '@/lib/formavision/meshy/meshyVisualState';
import { isTerminalMeshyStatus } from '@/lib/formavision/meshy/meshyVisualState';

const POLL_MS = 8000;
const FETCH_TIMEOUT_MS = 20_000;

export interface MeshyVisualClient {
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

export function useMeshyVisual(sessionId: string | null): MeshyVisualClient {
  const [visual, setVisual] = useState<MeshyVisualState>(() => emptyMeshyVisual());
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const createdForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setVisual(emptyMeshyVisual());
      setGlbUrl(null);
      createdForRef.current = null;
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadGlb = async (path: string | null): Promise<void> => {
      if (!path) return;
      const body = await fetchJson(`/api/formavision/meshy/glb?sessionId=${encodeURIComponent(sessionId)}`);
      if (cancelled) return;
      const signed = typeof body?.signedUrl === 'string' ? body.signedUrl : null;
      setGlbUrl(signed);
    };

    const tick = async (): Promise<void> => {
      if (!createdForRef.current) {
        createdForRef.current = sessionId;
        await fetchJson('/api/formavision/meshy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
      }
      const body = await fetchJson(`/api/formavision/meshy?sessionId=${encodeURIComponent(sessionId)}`);
      if (cancelled) return;
      const next = asVisual(body?.visual as VisualPayload | undefined);
      setVisual(next);
      if (next.status === 'succeeded' && next.glbPath) {
        await loadGlb(next.glbPath);
        return;
      }
      if (!isTerminalMeshyStatus(next.status)) {
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
  }, [sessionId]);

  return {
    status: visual.status,
    glbUrl,
    glbPath: visual.glbPath,
    glbBytes: visual.glbBytes,
    errorCode: visual.errorCode,
    progress: visual.progress,
  };
}
