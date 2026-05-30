/**
 * Prompt 170l Phase 1c-2: manual barcode entry modal (Hannah 11.6).
 *
 * Triggered from the scanner overlay 11.2 manual-entry link OR (future) from
 * NutriVisionTab directly. Numeric keypad on mobile via inputmode + pattern.
 * Inline checksum feedback at typing time, not at submit. Look up CTA gated
 * by 8 to 14 digits AND valid checksum.
 *
 * On Look up: calls useOffLookup like the auto-scan path; parent handles the
 * resulting LookupResult (advances to 11.4 confirmation or 11.5 fallback).
 */

'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { validateBarcode } from '@/lib/nutrition/barcode/checksum';
import { useOffLookup, type LookupResult } from './hooks/useOffLookup';

const TEAL = '#2DA5A0';
const ORANGE = '#B75E18';
const CARD = '#1E3054';

export interface ManualBarcodeEntryProps {
  open: boolean;
  onClose: () => void;
  onLookupResult: (barcode: string, lookup: LookupResult) => void;
}

type FeedbackState = 'idle' | 'valid' | 'invalid';

export function ManualBarcodeEntry({
  open,
  onClose,
  onLookupResult,
}: ManualBarcodeEntryProps): JSX.Element | null {
  const titleId = useId();
  const [value, setValue] = useState('');
  const [hintsOpen, setHintsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { lookup } = useOffLookup();

  useEffect(() => {
    if (open) {
      setValue('');
      setHintsOpen(false);
      setNetworkError(null);
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const onChange = useCallback((next: string) => {
    const digitsOnly = next.replace(/\D+/g, '').slice(0, 14);
    setValue(digitsOnly);
    setNetworkError(null);
  }, []);

  const feedback: FeedbackState = (() => {
    if (value.length < 8) return 'idle';
    if (value.length === 9 || value.length === 10 || value.length === 11) return 'idle';
    const result = validateBarcode(value);
    return result.valid ? 'valid' : 'invalid';
  })();

  const canSubmit = feedback === 'valid' && !submitting;

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setNetworkError(null);
    try {
      const result = await lookup(value);
      if (result.outcome === 'network_error') {
        setNetworkError('Connection trouble. Check your network and try again.');
        return;
      }
      onLookupResult(value, result);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, lookup, value, onLookupResult]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[140] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: CARD, color: '#FFFFFF' }}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
          >
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <h2 id={titleId} className="font-medium" style={{ fontSize: 16 }}>
            Enter barcode
          </h2>
          <div className="w-11" aria-hidden="true" />
        </div>

        <p className="mb-6 text-center" style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' }}>
          Type the digits below the barcode on the package.
        </p>

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) {
              e.preventDefault();
              void onSubmit();
            }
          }}
          placeholder="Enter 8 to 14 digits"
          aria-label="Enter barcode digits, 8 to 14 numbers"
          className="w-full rounded-xl px-4 font-mono text-center"
          style={{
            backgroundColor: 'rgba(26, 39, 68, 0.7)',
            color: '#FFFFFF',
            height: 56,
            fontSize: 24,
            letterSpacing: 2,
          }}
        />

        <div
          aria-live="polite"
          className="mt-3 text-center"
          style={{
            fontSize: 12,
            color:
              feedback === 'valid'
                ? TEAL
                : feedback === 'invalid'
                  ? ORANGE
                  : 'transparent',
            minHeight: 16,
          }}
        >
          {feedback === 'valid' && 'Looks like a valid barcode'}
          {feedback === 'invalid' && 'Check the digits, the last digit does not match'}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          className="mt-8 w-full rounded-xl font-semibold transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: TEAL,
            color: '#FFFFFF',
            height: 48,
            fontSize: 14,
          }}
        >
          {submitting ? 'Looking up...' : 'Look up'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 block w-full text-center underline"
          style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 }}
        >
          Cancel
        </button>

        {networkError !== null ? (
          <p
            role="alert"
            className="mt-3 text-center"
            style={{ color: ORANGE, fontSize: 13 }}
          >
            {networkError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setHintsOpen((s) => !s)}
          aria-expanded={hintsOpen}
          className="mt-6 block w-full text-left"
          style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}
        >
          Where is the barcode?
        </button>
        {hintsOpen ? (
          <p
            className="mt-2"
            style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}
          >
            Look for the rectangle of black bars on the back or side of the
            package. The digits below the bars are what you will type here.
            Common formats are 8, 12, 13, or 14 digits.
          </p>
        ) : null}
      </div>
    </div>
  );
}
