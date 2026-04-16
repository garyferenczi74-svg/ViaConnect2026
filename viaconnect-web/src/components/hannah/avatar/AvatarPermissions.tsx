'use client';

import { useState, useEffect } from 'react';
import { Camera, Mic, AlertTriangle } from 'lucide-react';

interface AvatarPermissionsProps {
  onGranted: () => void;
}

type PermissionState = 'checking' | 'granted' | 'denied' | 'prompt';

export function AvatarPermissions({ onGranted }: AvatarPermissionsProps) {
  const [cameraState, setCameraState] = useState<PermissionState>('checking');
  const [micState, setMicState] = useState<PermissionState>('checking');

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (cameraState === 'granted' && micState === 'granted') {
      onGranted();
    }
  }, [cameraState, micState, onGranted]);

  async function checkPermissions() {
    try {
      const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraState(camPerm.state === 'granted' ? 'granted' : camPerm.state === 'denied' ? 'denied' : 'prompt');

      const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicState(micPerm.state === 'granted' ? 'granted' : micPerm.state === 'denied' ? 'denied' : 'prompt');
    } catch {
      setCameraState('prompt');
      setMicState('prompt');
    }
  }

  async function requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraState('granted');
      setMicState('granted');
    } catch {
      setCameraState('denied');
      setMicState('denied');
    }
  }

  const needsPrompt = cameraState === 'prompt' || micState === 'prompt';
  const denied = cameraState === 'denied' || micState === 'denied';

  if (cameraState === 'checking') return null;
  if (cameraState === 'granted' && micState === 'granted') return null;

  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="flex gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            cameraState === 'granted'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/10 bg-white/[0.04]'
          }`}
        >
          <Camera
            className={`h-5 w-5 ${cameraState === 'granted' ? 'text-emerald-400' : 'text-white/50'}`}
            strokeWidth={1.5}
          />
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            micState === 'granted'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/10 bg-white/[0.04]'
          }`}
        >
          <Mic
            className={`h-5 w-5 ${micState === 'granted' ? 'text-emerald-400' : 'text-white/50'}`}
            strokeWidth={1.5}
          />
        </div>
      </div>

      {needsPrompt && (
        <>
          <p className="text-sm text-white/70 max-w-xs">
            Hannah needs access to your camera and microphone for the video conversation.
          </p>
          <button
            onClick={requestPermissions}
            className="min-h-[44px] px-5 py-2.5 bg-[#2DA5A0] hover:bg-[#2DA5A0]/90 text-white rounded-lg font-medium transition text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
          >
            Allow Camera &amp; Microphone
          </button>
        </>
      )}

      {denied && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 max-w-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-amber-300/80 text-left">
            Camera or microphone access was denied. Please enable them in your browser
            settings to use the avatar conversation.
          </p>
        </div>
      )}
    </div>
  );
}
