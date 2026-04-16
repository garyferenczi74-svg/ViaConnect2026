'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export type ScanPhotoCategory =
  | 'inbody_printout'
  | 'dexa_report'
  | 'scale_reading'
  | 'bp_reading'
  | 'lab_results'
  | 'progress_photo'
  | 'other';

interface ScanPhotoUploadProps {
  userId: string | null;
  category: ScanPhotoCategory;
  value: string | null;
  onChange: (storagePath: string | null) => void;
  label?: string;
}

const BUCKET = 'body-tracker-scans';
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

export function ScanPhotoUpload({
  userId,
  category,
  value,
  onChange,
  label = 'Upload scan photo (optional)',
}: ScanPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!userId) {
        setError('Sign in first to upload scans.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('File is larger than 10 MB.');
        return;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const stamp = Date.now();
        const path = `${userId}/${stamp}_${category}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (upErr) throw upErr;

        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
        setPreviewUrl(signed?.signedUrl ?? null);
        onChange(path);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed.';
        setError(msg);
      } finally {
        setUploading(false);
      }
    },
    [userId, category, onChange],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onChange]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-white/60">{label}</label>
      {value ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex items-center gap-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Scan preview" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <Camera className="h-6 w-6 text-white/40" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Scan attached</p>
            <p className="text-[11px] text-white/50 truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove scan photo"
            className="flex items-center justify-center rounded-lg text-white/55 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors min-h-[44px] min-w-[44px]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] py-6 text-sm text-white/60 hover:bg-white/[0.04] hover:border-white/[0.25] transition-colors min-h-[88px]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              Uploading
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
              Drop file or tap to upload
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
    </div>
  );
}
