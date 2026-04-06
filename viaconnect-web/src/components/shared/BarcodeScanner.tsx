'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ScanLine } from 'lucide-react';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onBarcodeDetected, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState('');
  const scannerRef = useRef<any>(null);
  const containerId = 'barcode-scanner-container';
  const stableOnDetected = useRef(onBarcodeDetected);
  stableOnDetected.current = onBarcodeDetected;

  const handleClose = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      // Dynamic import to avoid SSR issues with html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled) return;

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            scanner.stop().then(() => {
              stableOnDetected.current(decodedText);
            }).catch(console.error);
          },
          () => {} // Ignore per-frame scan misses
        );
      } catch (err: any) {
        if (!cancelled) {
          setError('Camera access denied. Please allow camera access to scan barcodes.');
          console.error('[barcode-scanner] Start error:', err);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); handleClose(); }}
        style={{
          position: 'absolute', top: '16px', right: '16px', zIndex: 10000,
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', color: 'white', fontSize: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={20} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ScanLine size={20} color="white" />
        <p style={{ color: 'white', fontWeight: 600, fontSize: '16px', margin: 0 }}>
          Point camera at barcode
        </p>
      </div>

      <div
        id={containerId}
        style={{ width: '320px', maxWidth: '90vw', borderRadius: '12px', overflow: 'hidden' }}
      />

      {error && (
        <p style={{ color: '#FF6B6B', marginTop: '16px', textAlign: 'center', padding: '0 20px' }}>
          {error}
        </p>
      )}

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '16px' }}>
        Align the barcode within the frame
      </p>
    </div>
  );
}
