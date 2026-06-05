/**
 * Prompt 175j (2026-06-05): BarcodeScanner shared component.
 *
 * Rebuilt on the new useBarcodeScan hook (zxing-wasm backend) so the
 * three existing call sites
 *   src/app/(app)/(consumer)/supplements/page.tsx
 *   src/app/(app)/practitioner/protocols/builder/page.tsx
 *   src/app/(app)/naturopath/protocols/page.tsx
 * keep working without an import-site change. Public props are
 * preserved (onBarcodeDetected + onClose). The internal implementation
 * is fully replaced; html5-qrcode is no longer referenced anywhere in
 * the repo.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  useBarcodeScan,
  BARCODE_SCANNER_ELEMENT_ID,
  SUPPLEMENT_BARCODE_FORMATS,
} from '@/components/barcode/hooks/useBarcodeScan';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onBarcodeDetected, onClose }: BarcodeScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string>('');

  const scan = useBarcodeScan({
    onDetect: (decoded) => {
      onBarcodeDetected(decoded.value);
    },
    config: {
      cameraConstraints: { facingMode: 'environment' },
      formatsToSupport: SUPPLEMENT_BARCODE_FORMATS,
    },
  });

  // Open the scanner as soon as the component mounts and tear it down
  // on unmount. The parent decides when to render the scanner.
  useEffect(() => {
    void scan.start();
    return () => {
      void scan.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Surface scan errors to the user.
  useEffect(() => {
    if (scan.state === 'permission_denied') {
      setErrorMsg('Camera access is off. Enable it in Settings to scan barcodes.');
    } else if (scan.state === 'error' && scan.error === 'no_camera_hardware') {
      setErrorMsg('This device does not have a camera available.');
    } else if (scan.state === 'error') {
      setErrorMsg('Scanner did not start. Try again, or enter the barcode by hand.');
    } else {
      setErrorMsg('');
    }
  }, [scan.state, scan.error]);

  const handleClose = useCallback(() => {
    void scan.stop();
    onClose();
  }, [onClose, scan]);

  return (
    <div className="fixed inset-0 z-[120] bg-black" style={{ height: '100dvh' }}>
      <div
        id={BARCODE_SCANNER_ELEMENT_ID}
        aria-hidden="true"
        className="absolute inset-0 bg-black"
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />

      <div
        className="absolute top-0 left-0 right-0 flex justify-end items-center px-4 z-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close scanner"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: '#FFFFFF' }}
        >
          <X size={24} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl p-4"
          style={{ backgroundColor: '#1E3054', color: '#FFFFFF' }}
        >
          <p style={{ fontSize: 14, fontWeight: 500 }}>{errorMsg}</p>
        </div>
      ) : null}
    </div>
  );
}
