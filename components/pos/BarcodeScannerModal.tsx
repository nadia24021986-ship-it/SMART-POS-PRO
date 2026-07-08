'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-region';

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' }, // rear camera on mobile
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onDetected(decodedText);
          stopAndClose();
        },
        () => {
          // ignore per-frame "not found" errors, they fire constantly while scanning
        }
      )
      .catch(() => {
        // Camera permission denied or unavailable
      });

    return () => {
      stopAndClose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAndClose() {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Scan Barcode</h2>
          <button
            onClick={() => {
              stopAndClose();
              onClose();
            }}
            className="text-xs text-slate-500"
          >
            Tutup
          </button>
        </div>
        <div id={containerId} className="rounded-lg overflow-hidden" />
        <p className="text-xs text-slate-500 mt-3 text-center">
          Arahkan kamera ke barcode produk. Butuh izin akses kamera.
        </p>
      </div>
    </div>
  );
}

