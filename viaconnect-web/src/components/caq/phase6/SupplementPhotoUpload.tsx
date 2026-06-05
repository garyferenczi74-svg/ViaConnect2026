'use client';

// =============================================================================
// Prompt 175h Section 2.1 + 2.3 (2026-06-05): Photo AI two-image capture +
// confirm-panel parity.
//
// Before this prompt, Photo AI was a single-photo flow that showed an
// inline "Identified" card with a hardcoded Add button. The Add button
// committed the supplement directly with stub frequency / dosage / form
// values because there was no editing surface. Barcode tier already had
// SupplementBarcodeConfirm with full editing.
//
// 175h Section 2.3 fixes that asymmetry. SupplementPhotoUpload now:
//   1. Captures a front photo (required) and an optional ingredients
//      photo, each persisted as a previewable thumbnail in local state.
//   2. POSTs the multi-image payload {images: [{role, imageBase64,
//      mimeType}]} to /api/ai/supplement-vision (Section 2.1).
//   3. On success, mounts SupplementBarcodeConfirm with initialDraft
//      pre-filled from the AI extraction (Section 2.3). The user edits
//      the same fields as the barcode tier, accepts or adjusts Hannah's
//      timing recommendation (Section 2.5), and confirms.
//   4. onProductAdded fires with the full BarcodeConfirmRecord so the
//      parent's commitSupplement no longer needs to fabricate dosage,
//      frequency, or delivery method.
//
// Backward compat: callers that only need the IdentifiedProduct still
// receive it via onProductIdentified before the confirm panel mounts.
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { detectWebView, type WebViewDetection } from '@/lib/device/detect-webview';
import {
  SupplementBarcodeConfirm,
  type BarcodeConfirmRecord,
  type SupplementConfirmInitialDraft,
} from '@/components/caq/phase6/SupplementBarcodeConfirm';

const NEUTRAL_FALLBACK_MESSAGE =
  'We could not read this label. Try a sharper photo, or enter the supplement by name.';
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
  /**
   * Prompt 175h Section 2.3 (2026-06-05): fires when the user confirms
   * the supplement record via the confirm panel. The record carries the
   * user-edited fields including Hannah's accepted (or adjusted) timing
   * recommendation AND the full structured ingredient list (primary +
   * extras the user added via the + button).
   */
  onProductAdded?: (record: BarcodeConfirmRecord) => void;
  /**
   * Invoked when Vision returns `overallConfidence === 'low'`. Parent
   * should route to the manual entry form pre-filled with the suggested
   * name.
   */
  onLowConfidence?: (suggestedName: string) => void;
}

type State =
  | 'idle'
  | 'capturing'
  | 'analyzing'
  | 'confirming'
  | 'error'
  | 'degraded';

const TRY_AGAIN_DEBOUNCE_MS = 1200;
type CapturedPhoto = { base64: string; mimeType: string; previewUrl: string };

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
  const inputRef = useRef<HTMLInputElement>(null);
  const tryAgainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setWebview(detectWebView(navigator.userAgent));
    }
  }, []);

  useEffect(() => () => {
    if (frontPhoto?.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
    if (ingredientsPhoto?.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
  }, [frontPhoto?.previewUrl, ingredientsPhoto?.previewUrl]);

  async function prepareFile(
    file: File,
    role: 'front' | 'ingredients',
  ): Promise<{ base64: string; mimeType: string; previewUrl: string } | null> {
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      /\.(heic|heif)$/i.test(file.name);

    // Prompt 175h hotfix (2026-06-05): role-aware compression.
    //
    // The front label is large product-name text that survives
    // aggressive compression with no loss to OCR. The ingredients panel
    // is fine print where the vision model needs every pixel; a 1400 px
    // long edge plus quality 0.7 was destroying the text and the model
    // returned no items, so the confirm panel fell back to whatever the
    // front photo extracted (just the product name, no ingredient list).
    //
    // Front: 1400 px, q=0.7 -> ~250 to 500 KB.
    // Ingredients: 2000 px, q=0.85 -> ~700 KB to 1.3 MB.
    // Combined base64 stays well under Vercel's 4.5 MB cap.
    const targetMaxDim = role === 'ingredients' ? 2000 : 1400;
    const targetQuality = role === 'ingredients' ? 0.85 : 0.7;

    let processedFile = file;
    try {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const scale = Math.min(targetMaxDim / Math.max(bitmap.width, bitmap.height), 1);
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((r) =>
          canvas.toBlob((b) => r(b!), 'image/jpeg', targetQuality),
        );
        processedFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      } catch (convertErr) {
        if (isHeic) {
          setState('error');
          setErrorMsg('Could not process this HEIC photo. Try retaking in JPG mode via iPhone Settings, or upload a different photo.');
          return null;
        }
        // Non-HEIC + createImageBitmap unavailable. Fall back to the
        // raw file; the upstream byte-floor will catch anything truly
        // unreadable.
        processedFile = file;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(processedFile);
      });

      // eslint-disable-next-line no-console
      console.info('[caq.photo-upload] prepared', {
        role,
        targetMaxDim,
        targetQuality,
        originalBytes: file.size,
        compressedBytes: processedFile.size,
        base64Length: base64.length,
        approxPayloadBytes: Math.floor((base64.length / 4) * 3),
      });

      const previewUrl = URL.createObjectURL(processedFile);
      const mimeType = processedFile.type || 'image/jpeg';
      return { base64, mimeType, previewUrl };
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    const role = pendingRole;
    setPendingRole(null);
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !role) return;
    setState('capturing');
    setErrorMsg('');
    const prepared = await prepareFile(file, role);
    if (!prepared) return;
    if (role === 'front') {
      if (frontPhoto?.previewUrl) URL.revokeObjectURL(frontPhoto.previewUrl);
      setFrontPhoto(prepared);
    } else {
      if (ingredientsPhoto?.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
      setIngredientsPhoto(prepared);
    }
    setState('idle');
  }

  function openPicker(role: 'front' | 'ingredients'): void {
    setPendingRole(role);
    setTimeout(() => inputRef.current?.click(), 0);
  }

  async function analyze(): Promise<void> {
    if (!frontPhoto) return;
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
      // Prompt 175h hotfix (2026-06-05): a Vercel function timeout or
      // 413 returns an HTML body, which crashes response.json() with
      // "the string did not match the expected pattern" on iOS Safari.
      // Read as text first, parse defensively, fall through to degraded
      // on any non-JSON or empty body.
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
            : 'We could not read this label automatically.',
        );
        setState('degraded');
        return;
      }

      if (!data.success) {
        if (data.degraded === true || data.status === 'degraded' || response.status === 200) {
          if (data.reason === 'no_image_received') {
            setErrorMsg('We did not receive a photo. Please try again.');
          } else {
            setErrorMsg(sanitizeServerErrorMessage(data.error));
          }
          setState('degraded');
          return;
        }
        setState('error');
        setErrorMsg(sanitizeServerErrorMessage(data.error));
        return;
      }

      const identified = data.data as IdentifiedProduct;
      setProduct(identified);
      onProductIdentified?.(identified);

      // Prompt 175h Section 2.3: low-confidence still routes to the
      // manual entry path so the user is not stuck reviewing nonsense.
      if (identified.overallConfidence === 'low' && onLowConfidence) {
        const suggestedName = `${identified.brand || ''} ${identified.productName || 'Supplement'}`.trim();
        onLowConfidence(suggestedName);
        reset();
        return;
      }

      setState('confirming');
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
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
  }

  if (webview?.isWebView) {
    return (
      <div className="border-2 border-amber-400/40 rounded-xl p-6 text-center bg-amber-400/[0.04]">
        <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-3">
          <Camera size={24} strokeWidth={1.5} className="text-amber-400" />
        </div>
        <p className="text-sm font-medium text-white mb-2">Open in Safari or Chrome to upload a photo</p>
        <p className="text-xs text-white/50">In-app browsers cannot reach your camera or photo library. Tap the menu in your current app, choose Open in Browser, then return to this step.</p>
      </div>
    );
  }

  // Prompt 175h Section 2.3: once the AI returns a draft, mount the
  // shared confirm panel. The panel handles all field editing, Hannah's
  // timing recommendation, and the final Add to My Supplements action.
  if (state === 'confirming' && product) {
    const initialDraft: SupplementConfirmInitialDraft = {
      name: `${product.brand || ''} ${product.productName || ''}`.trim() || product.productName || '',
      brand: product.brand || '',
      ingredients: product.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        form: ing.form,
      })),
      fieldSources: {
        product_name: 'photo_ai',
        brand: 'photo_ai',
      },
    };
    return (
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
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        tabIndex={-1}
      />

      {(state === 'idle' || state === 'capturing') && !frontPhoto && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPicker('front'); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') openPicker('front'); }}
          className="border-2 border-dashed border-teal-400/40 rounded-xl p-6 text-center cursor-pointer bg-teal-400/[0.03] hover:bg-teal-400/[0.06] transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center mx-auto mb-3">
            <Camera size={24} strokeWidth={1.5} className="text-teal-400" />
          </div>
          <p className="text-sm font-medium text-white mb-1">Add a photo of your product</p>
          <p className="text-xs text-white/40">Tap to take a picture of the front label</p>
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
                  }}
                  className="text-white/30 hover:text-white/60"
                  aria-label="Remove front photo"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); openPicker('front'); }}
                className="block w-full aspect-square rounded-lg overflow-hidden border border-teal-400/30 bg-black/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frontPhoto.previewUrl} alt="Front label" className="w-full h-full object-cover" />
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Ingredients</span>
                {ingredientsPhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (ingredientsPhoto.previewUrl) URL.revokeObjectURL(ingredientsPhoto.previewUrl);
                      setIngredientsPhoto(null);
                    }}
                    className="text-white/30 hover:text-white/60"
                    aria-label="Remove ingredients photo"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                ) : <span className="text-[10px] text-white/25">optional</span>}
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); openPicker('ingredients'); }}
                className={`block w-full aspect-square rounded-lg overflow-hidden border ${ingredientsPhoto ? 'border-teal-400/30 bg-black/30' : 'border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center'}`}
              >
                {ingredientsPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ingredientsPhoto.previewUrl} alt="Ingredients label" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={28} strokeWidth={1.5} className="text-white/25" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-4 leading-snug">
            Add the ingredients panel for richer detection. Optional but recommended for multi-active formulas.
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
              onClick={analyze}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-teal-400/20 border border-teal-400/30 rounded-lg hover:bg-teal-400/30 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Sparkles size={14} strokeWidth={1.5} />
              Analyze
            </button>
          </div>
        </div>
      )}

      {state === 'analyzing' && (
        <div className="border-2 border-teal-400/30 rounded-xl p-8 text-center bg-teal-400/[0.03]">
          {frontPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frontPhoto.previewUrl} alt="Upload" className="w-20 h-20 object-cover rounded-lg mx-auto mb-4 border border-white/10" />
          )}
          <div className="w-10 h-10 mx-auto mb-3 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-teal-400">Identifying your supplement...</p>
          <p className="text-xs text-white/30 mt-1">This may take 10 to 15 seconds</p>
        </div>
      )}

      {state === 'error' && (
        <div className="border-2 border-white/15 rounded-xl p-6 text-center bg-white/[0.03]">
          <p className="text-sm text-white/70 font-medium mb-3">{errorMsg}</p>
          <button
            type="button"
            disabled={tryAgainDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (tryAgainDisabled) return;
              setTryAgainDisabled(true);
              if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
              tryAgainTimerRef.current = setTimeout(() => setTryAgainDisabled(false), TRY_AGAIN_DEBOUNCE_MS);
              reset();
              setTimeout(() => openPicker('front'), 100);
            }}
            className={`text-sm underline cursor-pointer inline-flex items-center gap-1 ${tryAgainDisabled ? 'text-white/30' : 'text-teal-400'}`}
          >
            <RefreshCw size={12} strokeWidth={1.5} />
            Try again
          </button>
        </div>
      )}

      {state === 'degraded' && (
        <div className="border border-teal-400/20 rounded-xl p-6 text-center bg-teal-400/[0.03]">
          <p className="text-sm font-medium text-white/80 mb-1">
            {errorMsg || 'We could not read this label automatically.'}
          </p>
          <p className="text-xs text-white/40 mb-4">
            Use the search above or the barcode scanner to add this supplement by name.
          </p>
          <button
            type="button"
            disabled={tryAgainDisabled}
            onClick={(e) => {
              e.preventDefault();
              if (tryAgainDisabled) return;
              setTryAgainDisabled(true);
              if (tryAgainTimerRef.current) clearTimeout(tryAgainTimerRef.current);
              tryAgainTimerRef.current = setTimeout(() => setTryAgainDisabled(false), TRY_AGAIN_DEBOUNCE_MS);
              reset();
              setTimeout(() => openPicker('front'), 100);
            }}
            className={`text-xs underline cursor-pointer inline-flex items-center gap-1 ${tryAgainDisabled ? 'text-white/30' : 'text-teal-400'}`}
          >
            <RefreshCw size={11} strokeWidth={1.5} />
            Try a different photo
          </button>
        </div>
      )}
    </div>
  );
}
