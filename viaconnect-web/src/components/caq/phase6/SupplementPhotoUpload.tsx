'use client';

// =============================================================================
// Prompt 175h + 219b: Photo AI two-image capture, private storage upload,
// confirm-panel parity, and designed failure states.
//
// 219b adds:
//   - Mobile: rear-camera capture default + explicit gallery pick
//   - Desktop: file picker + drag-and-drop
//   - Client compress ~2000px long edge before upload/vision
//   - Private bucket upload (user-supplement-label-photos) with progress,
//     timeout + fail-open retry retaining the photo client-side
//   - Permission / unreadable / upload-failure states with no dead ends
//   - Mandatory confirm; UNKNOWN dose left blank (never fabricated)
//   - Manual entry with photo retained when extraction fails
//
// Extraction still POSTs base64 to /api/ai/supplement-vision (established
// pipeline). Storage path attaches to the confirm record for persistence.
// No emojis. No em/en dashes.
// =============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import { detectWebView, type WebViewDetection } from '@/lib/device/detect-webview';
import { uploadLabelPhoto } from '@/lib/caq/supplement-photo/uploadLabelPhoto';
import {
  SupplementBarcodeConfirm,
  type BarcodeConfirmRecord,
  type SupplementConfirmInitialDraft,
} from '@/components/caq/phase6/SupplementBarcodeConfirm';

const NEUTRAL_FALLBACK_MESSAGE =
  'We could not read this label. Try a sharper photo, or enter the supplement by name.';
const UNREADABLE_MESSAGE = 'We could not read this label';
const INTERNAL_SIGNAL_PATTERNS = [
  /api[_-]?key/i,
  /\.env/i,
  /ANTHROPIC/i,
  /undefined is not/i,
  /stack trace/i,
];

function sanitizeServerErrorMessage(raw: unknown): string {
  if (typeof raw !== 'string') return NEUTRAL_FALLBACK_MESSAGE;
  const trimmed = raw.trim();
  if (!trimmed) return NEUTRAL_FALLBACK_MESSAGE;
  for (const pattern of INTERNAL_SIGNAL_PATTERNS) {
    if (pattern.test(trimmed)) return NEUTRAL_FALLBACK_MESSAGE;
  }
  return trimmed;
}

export interface IdentifiedProduct {
  brand: string | null;
  productName: string | null;
  servingSize: string | null;
  totalCount: number | null;
  ingredients: Array<{
    name: string;
    form: string | null;
    amount: number | null;
    unit: string | null;
    isPartOfBlend: boolean;
  }>;
  overallConfidence: string;
}

interface Props {
  onProductIdentified?: (product: IdentifiedProduct) => void;
  onProductAdded?: (record: BarcodeConfirmRecord) => void;
  onLowConfidence?: (suggestedName: string) => void;
}

type State =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'analyzing'
  | 'confirming'
  | 'manual'
  | 'error'
  | 'degraded'
  | 'upload_retry';

const TRY_AGAIN_DEBOUNCE_MS = 1200;
const LONG_EDGE_PX = 2000;
const JPEG_QUALITY = 0.82;

type CapturedPhoto = {
  base64: string;
  mimeType: string;
  previewUrl: string;
  blob: Blob;
};

type StoredLabelPhoto = {
  bucket: string;
  path: string;
  signedUrl: string | null;
};

export default function SupplementPhotoUpload({
  onProductIdentified,
  onProductAdded,
  onLowConfidence,
}: Props) {
  const [state, setState] = useState<State>('idle');
  const [frontPhoto, setFrontPhoto] = useState<CapturedPhoto | null>(null);
  const [ingredientsPhoto, setIngredientsPhoto] = useState<CapturedPhoto | null>(null);
  const [product, setProduct] = useState<IdentifiedProduct | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [webview, setWebview] = useState<WebViewDetection | null>(null);
  const [tryAgainDisabled, setTryAgainDisabled] = useState(false);
  const [pendingRole, setPendingRole] = useState<'front' | 'ingredients' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [storedFront, setStoredFront] = useState<StoredLabelPhoto | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const tryAgainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setWebview(detectWebView(navigator.userAgent));
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(pointer: coarse)');
      setIsCoarsePointer(mq.matches);
      const onChange = () => setIsCoarsePointer(mq.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, []);

  useEffect(() => () => {
    if (frontPhoto?.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
    if (ingredientsPhoto?.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
  }, [frontPhoto?.previewUrl, ingredientsPhoto?.previewUrl]);

  async function prepareFile(
    file: File,
    role: 'front' | 'ingredients',
  ): Promise<CapturedPhoto | null> {
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      /\.(heic|heif)$/i.test(file.name);

    // Spec ceiling ~2000px long edge for both roles (ingredients need detail).
    const targetMaxDim = role === 'ingredients' ? LONG_EDGE_PX : Math.min(LONG_EDGE_PX, 1600);
    const targetQuality = role === 'ingredients' ? 0.85 : JPEG_QUALITY;

    let processedBlob: Blob = file;
    try {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const scale = Math.min(targetMaxDim / Math.max(bitmap.width, bitmap.height), 1);
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob((b) => r(b), 'image/jpeg', targetQuality),
        );
        if (blob) processedBlob = blob;
      } catch {
        if (isHeic) {
          setState('error');
          setErrorMsg(
            'Could not process this HEIC photo. Try retaking in JPG mode via iPhone Settings, or pick a JPEG or PNG from your gallery.',
          );
          return null;
        }
        processedBlob = file;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(processedBlob);
      });

      const mimeType = processedBlob.type || 'image/jpeg';
      const previewUrl = URL.createObjectURL(processedBlob);
      return { base64, mimeType, previewUrl, blob: processedBlob };
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    }
  }

  async function ingestFile(file: File, role: 'front' | 'ingredients'): Promise<void> {
    setState('capturing');
    setErrorMsg('');
    const prepared = await prepareFile(file, role);
    if (!prepared) return;
    if (role === 'front') {
      if (frontPhoto?.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
      setFrontPhoto(prepared);
      setStoredFront(null);
    } else {
      if (ingredientsPhoto?.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
      setIngredientsPhoto(prepared);
    }
    setState('idle');
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    const role = pendingRole ?? 'front';
    setPendingRole(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (!file) {
      // User cancelled or permission denied without a file: offer gallery
      // fallback rather than a dead tap.
      setErrorMsg(
        'Camera or photo access was not available. Use Choose from gallery, or try again.',
      );
      setState('error');
      return;
    }
    await ingestFile(file, role);
  }

  function openCamera(role: 'front' | 'ingredients'): void {
    setPendingRole(role);
    setErrorMsg('');
    setTimeout(() => cameraInputRef.current?.click(), 0);
  }

  function openGallery(role: 'front' | 'ingredients'): void {
    setPendingRole(role);
    setErrorMsg('');
    setTimeout(() => galleryInputRef.current?.click(), 0);
  }

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) {
        setErrorMsg('Drop a JPEG, PNG, WebP, or HEIC product photo.');
        setState('error');
        return;
      }
      await ingestFile(file, frontPhoto ? 'ingredients' : 'front');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frontPhoto],
  );

  async function ensureFrontUploaded(): Promise<StoredLabelPhoto | null> {
    if (!frontPhoto) return null;
    if (storedFront) return storedFront;
    setState('uploading');
    setUploadProgress(15);
    // Synthetic progress: real XHR progress is unavailable with fetch FormData
    // in all browsers; advance to mid while the request runs.
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p === null || p >= 85 ? p : p + 10));
    }, 400);
    try {
      const result = await uploadLabelPhoto(frontPhoto.blob, frontPhoto.mimeType);
      clearInterval(progressTimer);
      if (!result.ok) {
        setUploadProgress(null);
        setErrorMsg(result.error);
        setState('upload_retry');
        return null;
      }
      setUploadProgress(100);
      const stored: StoredLabelPhoto = {
        bucket: result.bucket,
        path: result.path,
        signedUrl: result.signedUrl,
      };
      setStoredFront(stored);
      setUploadProgress(null);
      return stored;
    } catch {
      clearInterval(progressTimer);
      setUploadProgress(null);
      setErrorMsg('Upload failed. Your photo is still on this device. Retry when ready.');
      setState('upload_retry');
      return null;
    }
  }

  async function analyze(): Promise<void> {
    if (!frontPhoto) return;
    setErrorMsg('');
    setProduct(null);

    // Upload first (private bucket). Fail-open to retry state keeps the photo.
    // When stored is null, ensureFrontUploaded already set upload_retry.
    const stored = await ensureFrontUploaded();
    if (!stored) {
      return;
    }

    setState('analyzing');

    const images: Array<{ imageBase64: string; mimeType: string; role: string }> = [
      { imageBase64: frontPhoto.base64, mimeType: frontPhoto.mimeType, role: 'front' },
    ];
    if (ingredientsPhoto) {
      images.push({
        imageBase64: ingredientsPhoto.base64,
        mimeType: ingredientsPhoto.mimeType,
        role: 'ingredients',
      });
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 75_000);

    try {
      const response = await fetch('/api/ai/supplement-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      let data: Record<string, unknown> | null = null;
      if (rawText && contentType.includes('application/json')) {
        try {
          data = JSON.parse(rawText) as Record<string, unknown>;
        } catch {
          data = null;
        }
      }
      if (data === null) {
        setErrorMsg(
          response.status === 413
            ? 'These photos are too large for our server. Try removing one of the two and retrying with just the front label.'
            : UNREADABLE_MESSAGE,
        );
        setState('degraded');
        return;
      }

      if (!data.success) {
        if (data.degraded === true || data.status === 'degraded' || response.status === 200) {
          if (data.reason === 'no_image_received') {
            setErrorMsg('We did not receive a photo. Please try again.');
          } else {
            setErrorMsg(sanitizeServerErrorMessage(data.error) || UNREADABLE_MESSAGE);
          }
          setState('degraded');
          return;
        }
        setState('degraded');
        setErrorMsg(sanitizeServerErrorMessage(data.error) || UNREADABLE_MESSAGE);
        return;
      }

      const identified = data.data as IdentifiedProduct;
      setProduct(identified);
      onProductIdentified?.(identified);

      if (identified.overallConfidence === 'low' && onLowConfidence) {
        const suggestedName = `${identified.brand || ''} ${identified.productName || 'Supplement'}`.trim();
        onLowConfidence(suggestedName);
        // Still offer confirm/manual with blanks rather than a dead end.
      }

      // Empty product name -> unreadable path with manual entry + photo.
      const hasIdentity =
        Boolean(identified.productName?.trim()) || Boolean(identified.brand?.trim());
      if (!hasIdentity) {
        setErrorMsg(UNREADABLE_MESSAGE);
        setState('degraded');
        return;
      }

      setState('confirming');
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Label reading timed out. Enter the details manually with your photo attached.');
        setState('degraded');
        return;
      }
      setState('degraded');
      setErrorMsg(err instanceof Error ? err.message : UNREADABLE_MESSAGE);
    }
  }

  /** Analyze even if storage upload is deferred (user chose continue). */
  async function analyzeSkipStorage(): Promise<void> {
    if (!frontPhoto) return;
    setStoredFront(null);
    setState('analyzing');
    setErrorMsg('');
    setProduct(null);
    const images: Array<{ imageBase64: string; mimeType: string; role: string }> = [
      { imageBase64: frontPhoto.base64, mimeType: frontPhoto.mimeType, role: 'front' },
    ];
    if (ingredientsPhoto) {
      images.push({
        imageBase64: ingredientsPhoto.base64,
        mimeType: ingredientsPhoto.mimeType,
        role: 'ingredients',
      });
    }
    try {
      const response = await fetch('/api/ai/supplement-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      const rawText = await response.text();
      let data: Record<string, unknown> | null = null;
      try {
        data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
      } catch {
        data = null;
      }
      if (!data || data.success !== true) {
        setErrorMsg(UNREADABLE_MESSAGE);
        setState('degraded');
        return;
      }
      const identified = data.data as IdentifiedProduct;
      setProduct(identified);
      onProductIdentified?.(identified);
      const hasIdentity =
        Boolean(identified.productName?.trim()) || Boolean(identified.brand?.trim());
      if (!hasIdentity) {
        setErrorMsg(UNREADABLE_MESSAGE);
        setState('degraded');
        return;
      }
      setState('confirming');
    } catch {
      setErrorMsg(UNREADABLE_MESSAGE);
      setState('degraded');
    }
  }

  function reset(): void {
    setState('idle');
    setProduct(null);
    setErrorMsg('');
    if (frontPhoto?.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
    if (ingredientsPhoto?.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
    setFrontPhoto(null);
    setIngredientsPhoto(null);
    setPendingRole(null);
    setStoredFront(null);
    setUploadProgress(null);
  }

  function buildConfirmDraft(
    identified: IdentifiedProduct | null,
  ): SupplementConfirmInitialDraft {
    // UNKNOWN discipline: only seed dosage/unit when amount is present.
    const primary = identified?.ingredients?.[0];
    const dosage =
      primary && primary.amount !== null && primary.amount !== undefined
        ? String(primary.amount)
        : '';
    const unit =
      dosage && primary?.unit ? primary.unit : '';
    return {
      name: identified
        ? `${identified.brand || ''} ${identified.productName || ''}`.trim() ||
          identified.productName ||
          ''
        : '',
      brand: identified?.brand || '',
      dosage,
      unit,
      ingredients: (identified?.ingredients ?? []).map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        form: ing.form,
      })),
      fieldSources: {
        product_name: identified?.productName ? 'photo_ai' : 'manual',
        brand: identified?.brand ? 'photo_ai' : 'manual',
      },
      label_photo_bucket: storedFront?.bucket ?? null,
      label_photo_path: storedFront?.path ?? null,
    };
  }

  function openManualEntry(): void {
    setState('manual');
  }

  if (webview?.isWebView) {
    return (
      <div className="border-2 border-amber-400/40 rounded-xl p-6 text-center bg-amber-400/[0.04]">
        <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-3">
          <Camera size={24} strokeWidth={1.5} className="text-amber-400" />
        </div>
        <p className="text-sm font-medium text-white mb-2">
          Open in Safari or Chrome to upload a photo
        </p>
        <p className="text-xs text-white/50">
          In-app browsers cannot reach your camera or photo library. Tap the menu
          in your current app, choose Open in Browser, then return to this step.
        </p>
      </div>
    );
  }

  if ((state === 'confirming' && product) || state === 'manual') {
    const initialDraft = buildConfirmDraft(state === 'manual' ? null : product);
    if (state === 'manual' && frontPhoto && !initialDraft.name) {
      // keep blank name for user to fill
    }
    return (
      <div className="space-y-3">
        {state === 'manual' && (
          <p className="text-xs text-white/50 text-center">
            {errorMsg || UNREADABLE_MESSAGE}. Enter the details below
            {storedFront || frontPhoto ? ' with your photo attached.' : '.'}
          </p>
        )}
        <SupplementBarcodeConfirm
          barcodeValue={null}
          barcodeFormat={null}
          source="photo"
          initialDraft={initialDraft}
          onConfirm={(rec) => {
            onProductAdded?.(rec);
            reset();
          }}
          onCancel={reset}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Camera: rear-facing default (environment). Gallery: no capture attr. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        tabIndex={-1}
        data-testid="label-photo-camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        tabIndex={-1}
        data-testid="label-photo-gallery-input"
      />

      {(state === 'idle' || state === 'capturing') && !frontPhoto && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            dragOver
              ? 'border-teal-300/70 bg-teal-400/[0.08]'
              : 'border-teal-400/40 bg-teal-400/[0.03] hover:bg-teal-400/[0.06]'
          }`}
          data-testid="label-photo-dropzone"
        >
          <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center mx-auto mb-3">
            <Camera size={24} strokeWidth={1.5} className="text-teal-400" />
          </div>
          <p className="text-sm font-medium text-white mb-1">Add a photo of your product</p>
          <p className="text-xs text-white/40 mb-4">
            Tap to take a picture of the front label
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => openCamera('front')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-teal-400/40 px-4 py-2.5 text-sm font-medium text-teal-300 hover:bg-teal-400/10"
              data-testid="label-photo-take"
            >
              <Camera size={16} strokeWidth={1.5} />
              {isCoarsePointer ? 'Take photo' : 'Use camera'}
            </button>
            <button
              type="button"
              onClick={() => openGallery('front')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
              data-testid="label-photo-gallery"
            >
              <ImageIcon size={16} strokeWidth={1.5} />
              Choose from gallery
            </button>
          </div>
          {!isCoarsePointer && (
            <p className="mt-3 text-[11px] text-white/30 inline-flex items-center gap-1 justify-center">
              <Upload size={12} strokeWidth={1.5} />
              Or drag and drop a JPEG, PNG, WebP, or HEIC file
            </p>
          )}
        </div>
      )}

      {(state === 'idle' || state === 'capturing') && frontPhoto && (
        <div className="border border-teal-400/20 rounded-xl p-5 bg-teal-400/[0.03]">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Front</span>
                <button
                  type="button"
                  onClick={() => {
                    if (frontPhoto.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
                    setFrontPhoto(null);
                    setStoredFront(null);
                  }}
                  className="text-white/30 hover:text-white/60"
                  aria-label="Remove front photo"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => openGallery('front')}
                aria-label="Replace front photo"
                className="block w-full aspect-square rounded-lg overflow-hidden border border-teal-400/30 bg-cover bg-center bg-black/30"
                style={{ backgroundImage: `url(${frontPhoto.previewUrl})` }}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  Ingredients
                </span>
                {ingredientsPhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (ingredientsPhoto.previewUrl) {
                        URL.revokeObjectURL(ingredientsPhoto.previewUrl);
                      }
                      setIngredientsPhoto(null);
                    }}
                    className="text-white/30 hover:text-white/60"
                    aria-label="Remove ingredients photo"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                ) : (
                  <span className="text-[10px] text-white/25">optional</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => openGallery('ingredients')}
                aria-label={
                  ingredientsPhoto ? 'Replace ingredients photo' : 'Add ingredients photo'
                }
                className={`block w-full aspect-square rounded-lg overflow-hidden border ${
                  ingredientsPhoto
                    ? 'border-teal-400/30 bg-cover bg-center bg-black/30'
                    : 'border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center'
                }`}
                style={
                  ingredientsPhoto
                    ? { backgroundImage: `url(${ingredientsPhoto.previewUrl})` }
                    : undefined
                }
              >
                {ingredientsPhoto ? null : (
                  <Camera size={28} strokeWidth={1.5} className="text-white/25" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-4 leading-snug">
            Add the ingredients panel for richer detection. Optional but recommended for
            multi-active formulas.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2.5 text-sm text-white/50 border border-white/15 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void analyze();
              }}
              className="group relative flex-1 py-2.5 text-sm font-semibold text-white border border-teal-400/40 rounded-lg overflow-hidden transition-all hover:border-teal-300/60 hover:shadow-[0_0_16px_rgba(45,165,160,0.25)] inline-flex items-center justify-center gap-2"
              style={{
                background:
                  'linear-gradient(135deg, rgba(45,165,160,0.22) 0%, rgba(45,165,160,0.10) 100%)',
              }}
            >
              <RefreshCw
                size={16}
                strokeWidth={1.5}
                className="text-teal-300 animate-spin group-hover:[animation-duration:1s]"
                style={{ animationDuration: '2.5s' }}
                aria-hidden="true"
              />
              Analyze
            </button>
          </div>
        </div>
      )}

      {(state === 'uploading' || state === 'analyzing') && (
        <div className="border-2 border-teal-400/30 rounded-xl p-8 text-center bg-teal-400/[0.03]">
          <RefreshCw
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
            className="mx-auto mb-4 motion-safe:animate-spin motion-reduce:animate-pulse"
            style={{ color: '#2DA5A0' }}
          />
          <p className="text-sm font-medium" style={{ color: '#2DA5A0' }}>
            {state === 'uploading'
              ? 'Saving your photo securely...'
              : 'Identifying your supplement...'}
          </p>
          <p className="text-xs text-white/30 mt-1">
            {state === 'uploading'
              ? 'Private upload in progress'
              : 'This may take 10 to 15 seconds'}
          </p>
          {state === 'uploading' && uploadProgress !== null && (
            <div className="mt-4 mx-auto max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-400/70 transition-all"
                style={{ width: `${uploadProgress}%` }}
                data-testid="label-photo-upload-progress"
              />
            </div>
          )}
        </div>
      )}

      {state === 'upload_retry' && frontPhoto && (
        <div className="border border-orange-400/30 rounded-xl p-6 text-center bg-orange-400/[0.04]">
          <p className="text-sm font-medium text-white/85 mb-1">
            {errorMsg || 'Upload failed. Your photo is still on this device.'}
          </p>
          <p className="text-xs text-white/40 mb-4">
            Retry the secure upload, continue without saving the photo, or enter details
            manually.
          </p>
          <div
            className="mx-auto mb-4 w-24 h-24 rounded-lg bg-cover bg-center border border-white/10"
            style={{ backgroundImage: `url(${frontPhoto.previewUrl})` }}
            aria-hidden="true"
          />
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => {
                void analyze();
              }}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-teal-400/40 text-teal-300 text-sm"
            >
              Retry upload and analyze
            </button>
            <button
              type="button"
              onClick={() => {
                void analyzeSkipStorage();
              }}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 text-white/70 text-sm"
            >
              Analyze without saving photo
            </button>
            <button
              type="button"
              onClick={openManualEntry}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-white/15 text-white/70 text-sm"
            >
              Enter manually
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="border-2 border-white/15 rounded-xl p-6 text-center bg-white/[0.03]">
          <p className="text-sm text-white/70 font-medium mb-3">{errorMsg}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              disabled={tryAgainDisabled}
              onClick={(e) => {
                e.preventDefault();
                if (tryAgainDisabled) return;
                setTryAgainDisabled(true);
                if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
                tryAgainTimerRef.current = setTimeout(
                  () => setTryAgainDisabled(false),
                  TRY_AGAIN_DEBOUNCE_MS,
                );
                setErrorMsg('');
                setState('idle');
                setTimeout(() => openCamera('front'), 100);
              }}
              className={`text-sm underline cursor-pointer inline-flex items-center gap-1 justify-center min-h-[44px] ${
                tryAgainDisabled ? 'text-white/30' : 'text-teal-400'
              }`}
            >
              <RefreshCw size={12} strokeWidth={1.5} />
              Try camera again
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setState('idle');
                openGallery('front');
              }}
              className="text-sm text-white/60 underline min-h-[44px]"
            >
              Choose from gallery
            </button>
          </div>
        </div>
      )}

      {state === 'degraded' && (
        <div className="border border-teal-400/20 rounded-xl p-6 text-center bg-teal-400/[0.03]">
          <p className="text-sm font-medium text-white/80 mb-1">
            {errorMsg || UNREADABLE_MESSAGE}
          </p>
          <p className="text-xs text-white/40 mb-4">
            Enter the product manually with your photo attached, use search above, or try a
            different photo.
          </p>
          {frontPhoto && (
            <div
              className="mx-auto mb-4 w-20 h-20 rounded-lg bg-cover bg-center border border-white/10"
              style={{ backgroundImage: `url(${frontPhoto.previewUrl})` }}
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={openManualEntry}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-teal-400/40 text-teal-300 text-sm"
            >
              Enter manually with photo
            </button>
            <button
              type="button"
              disabled={tryAgainDisabled}
              onClick={(e) => {
                e.preventDefault();
                if (tryAgainDisabled) return;
                setTryAgainDisabled(true);
                if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
                tryAgainTimerRef.current = setTimeout(
                  () => setTryAgainDisabled(false),
                  TRY_AGAIN_DEBOUNCE_MS,
                );
                // Keep front photo for retry; re-run analyze.
                setErrorMsg('');
                setState('idle');
              }}
              className={`text-xs underline cursor-pointer inline-flex items-center gap-1 justify-center min-h-[44px] ${
                tryAgainDisabled ? 'text-white/30' : 'text-teal-400'
              }`}
            >
              <RefreshCw size={11} strokeWidth={1.5} />
              Try again with this photo
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-white/50 underline min-h-[44px]"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
