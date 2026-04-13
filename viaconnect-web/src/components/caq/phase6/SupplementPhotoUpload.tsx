'use client';

import { useState, useRef } from 'react';

interface IdentifiedProduct {
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
  onProductAdded?: (product: IdentifiedProduct) => void;
}

type State = 'idle' | 'compressing' | 'analyzing' | 'complete' | 'error';

export default function SupplementPhotoUpload({ onProductIdentified, onProductAdded }: Props) {
  const [state, setState] = useState<State>('idle');
  const [product, setProduct] = useState<IdentifiedProduct | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processImage(file: File) {
    setState('compressing');
    setErrorMsg('');
    setProduct(null);

    try {
      setPreviewUrl(URL.createObjectURL(file));

      let processedFile = file;
      if (file.size > 3 * 1024 * 1024) {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const scale = Math.min(1800 / Math.max(bitmap.width, bitmap.height), 1);
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.75));
        processedFile = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(processedFile);
      });

      setState('analyzing');

      const response = await fetch('/api/ai/supplement-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: processedFile.type || 'image/jpeg' }),
      });

      const data = await response.json();

      if (!data.success) {
        setState('error');
        setErrorMsg(data.error || 'Could not read label. Try the Supplement Facts panel.');
        return;
      }

      setProduct(data.data);
      setState('complete');
      onProductIdentified?.(data.data);
    } catch (err: unknown) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) processImage(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  function reset() {
    setState('idle');
    setProduct(null);
    setErrorMsg('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} tabIndex={-1} />

      {state === 'idle' && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
          className="border-2 border-dashed border-teal-400/40 rounded-xl p-6 text-center cursor-pointer bg-teal-400/[0.03] hover:bg-teal-400/[0.06] transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-teal-400/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <p className="text-sm font-medium text-white mb-1">Add a photo of your product</p>
          <p className="text-xs text-white/40">Tap to take a picture or upload from your files</p>
        </div>
      )}

      {(state === 'compressing' || state === 'analyzing') && (
        <div className="border-2 border-teal-400/30 rounded-xl p-8 text-center bg-teal-400/[0.03]">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Upload" className="w-20 h-20 object-cover rounded-lg mx-auto mb-4 border border-white/10" />
          )}
          <div className="w-10 h-10 mx-auto mb-3 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-teal-400">
            {state === 'compressing' ? 'Processing image...' : 'Reading your supplement label...'}
          </p>
          <p className="text-xs text-white/30 mt-1">This may take 10-15 seconds</p>
        </div>
      )}

      {state === 'error' && (
        <div className="border-2 border-red-400/30 rounded-xl p-6 text-center bg-red-400/[0.03]">
          <p className="text-sm text-red-400 font-medium mb-3">{errorMsg}</p>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); reset(); setTimeout(() => inputRef.current?.click(), 100); }}
            className="text-sm text-teal-400 underline cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'complete' && product && (
        <div className="border-2 border-teal-400/30 rounded-xl p-5 bg-teal-400/[0.03]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span className="font-bold text-teal-400">Product Identified</span>
          </div>

          {product.brand && <p className="text-[10px] text-white/30 uppercase tracking-wider">{product.brand}</p>}
          <p className="text-lg font-bold text-white mb-1">{product.productName || 'Supplement'}</p>
          {product.servingSize && (
            <p className="text-xs text-white/40 mb-4">
              {product.totalCount ? `${product.totalCount} count, ` : ''}{product.servingSize}
            </p>
          )}

          {product.ingredients?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">
                Ingredients ({product.ingredients.length})
              </p>
              {product.ingredients.map((ing, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white/80">{ing.name}</span>
                    {ing.form && <span className="text-xs text-white/30 ml-1">({ing.form})</span>}
                    {ing.isPartOfBlend && (
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/70">Blend</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white/90 ml-2">
                    {ing.amount != null ? `${ing.amount} ${ing.unit || ''}` : '\u2014'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {product.overallConfidence === 'low' && (
            <p className="text-xs text-amber-400/70 mb-3">
              Low confidence. Try photographing the Supplement Facts panel for better accuracy.
            </p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={(e) => { e.preventDefault(); reset(); }}
              className="flex-1 py-2.5 text-sm text-white/50 border border-white/15 rounded-lg hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={(e) => { e.preventDefault(); if (product && onProductAdded) onProductAdded(product); reset(); }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-teal-400/20 border border-teal-400/30 rounded-lg hover:bg-teal-400/30 transition-colors">
              Add to My Supplements
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
