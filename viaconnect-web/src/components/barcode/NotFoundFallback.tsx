/**
 * Prompt 170l Phase 1c-2: not-found / error fallback (Hannah 11.5).
 *
 * Three action cards: Photograph the product (routes to existing Photo
 * pipeline), Enter macros manually (opens MacroEditPanel blank-slate),
 * Contribute to Open Food Facts (opens OFF deep-link new tab + fires the
 * barcode_off_contribution_clicked Helix event 3pt).
 *
 * Hannah's anti-failure-framing posture: gentle Package icon in Navy 60pct
 * (not Orange, not red); "We didn't find this product" not "Scan failed";
 * Card 3 "Help everyone find this product" with "Your next scan of this
 * product will be instant." for community+self framing.
 */

'use client';

import { Camera, ChevronLeft, Edit3, ExternalLink, Package, X } from 'lucide-react';

const TEAL = '#2DA5A0';
const CARD = '#1E3054';

export interface NotFoundFallbackProps {
  barcode: string;
  fallbackToPhotoEnabled: boolean;
  /** True when the user transitioned here via a network error rather than a 404. */
  isNetworkError: boolean;
  onClose: () => void;
  onBack: () => void;
  onPhotograph: () => void;
  onEnterMacros: () => void;
  onContribute: () => void;
  onRetry?: () => void;
}

function formatBarcodeDigits(barcode: string): string {
  if (barcode.length === 13) {
    // EAN-13 GS1 grouping: 1-6-6 or 1-3-3-3-3. Use 1-6-6 for readability.
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7, 13)}`;
  }
  if (barcode.length === 12) {
    return `${barcode.slice(0, 1)} ${barcode.slice(1, 6)} ${barcode.slice(6, 11)} ${barcode.slice(11)}`;
  }
  if (barcode.length === 8) {
    return `${barcode.slice(0, 4)} ${barcode.slice(4)}`;
  }
  return barcode;
}

export function NotFoundFallback({
  barcode,
  fallbackToPhotoEnabled,
  isNetworkError,
  onClose,
  onBack,
  onPhotograph,
  onEnterMacros,
  onContribute,
  onRetry,
}: NotFoundFallbackProps): JSX.Element {
  const headline = isNetworkError
    ? 'Connection trouble'
    : "We didn't find this product";
  const body = isNetworkError
    ? "We couldn't reach Open Food Facts right now. Try again, or use one of these options."
    : `The barcode ${formatBarcodeDigits(barcode)} isn't in Open Food Facts yet. Here are some ways to log it.`;

  return (
    <div
      className="min-h-[60vh] flex flex-col"
      style={{ color: '#FFFFFF' }}
    >
      <header className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <h1 className="font-medium" style={{ fontSize: 16 }}>
          {isNetworkError ? 'Connection trouble' : 'Product not found'}
        </h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          <X size={20} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-col items-center text-center mb-6">
        <Package size={64} strokeWidth={1.5} style={{ color: 'rgba(255, 255, 255, 0.6)' }} aria-hidden="true" />
        <h2
          className="mt-4 font-medium"
          style={{ fontSize: 24, lineHeight: 1.2 }}
        >
          {headline}
        </h2>
        <p
          className="mt-3 max-w-md"
          style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}
        >
          {body}
        </p>
      </div>

      {isNetworkError && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mx-auto mb-4 inline-flex items-center justify-center rounded-full px-5 py-2 underline"
          style={{ color: TEAL, fontSize: 14, fontWeight: 500 }}
        >
          Try again
        </button>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        {fallbackToPhotoEnabled ? (
          <ActionCard
            icon={<Camera size={32} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />}
            title="Photograph the product"
            subtitle="Let our scan recognize the food."
            onClick={onPhotograph}
            ariaLabel="Photograph the product. Let our scan recognize the food."
          />
        ) : null}
        <ActionCard
          icon={<Edit3 size={32} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />}
          title="Enter macros manually"
          subtitle="Type the calories and macros from the nutrition label."
          onClick={onEnterMacros}
          ariaLabel="Enter macros manually. Type the calories and macros from the nutrition label."
        />
        <ActionCard
          icon={<ExternalLink size={32} strokeWidth={1.5} aria-hidden="true" style={{ color: TEAL }} />}
          title="Help everyone find this product"
          subtitle="Add it to Open Food Facts, the free community catalog. Your next scan of this product will be instant."
          onClick={onContribute}
          ariaLabel="Help everyone find this product. Add it to Open Food Facts, the free community catalog. Opens in a new tab."
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 mx-auto block underline"
        style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}
      >
        Cancel
      </button>
    </div>
  );
}

interface ActionCardProps {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  onClick: () => void;
  ariaLabel: string;
}

function ActionCard({ icon, title, subtitle, onClick, ariaLabel }: ActionCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 md:flex-1"
      style={{
        backgroundColor: `${CARD}E6`,
        outlineColor: TEAL,
        minHeight: 96,
      }}
    >
      <div
        className="flex-none flex items-center justify-center rounded-xl"
        style={{ width: 48, height: 48, backgroundColor: 'rgba(45, 165, 160, 0.12)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium" style={{ fontSize: 14, color: '#FFFFFF' }}>
          {title}
        </div>
        <div className="mt-1" style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
