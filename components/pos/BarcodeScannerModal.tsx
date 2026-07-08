'use client';

import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const scannerRef = useRef<any>(null);
  const containerId = 'barcode-scanner-region';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        // Import secara dinamis di sisi client saja, supaya tidak pernah
        // dievaluasi saat build/SSR dan tidak bisa menyebabkan crash render.
        const { Html5Qrcode } = await import('html5-qrcode');

        if (cancelled) return;

        const el = document.getElementById(containerId);
        if (!el) {
          setError('Gagal menyiapkan area kamera. Coba tutup dan buka lagi.');
          setLoading(false);
          return;
        }

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            onDetected(decodedText);
            stopAndClose();
          },
          () => {
            // abaikan error per-frame "kode tidak ditemukan", itu normal
          }
        );

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setLoading(false);
        const message = err?.message || String(err);
        if (message.toLowerCase().includes('permission') || message.toLowerCase().includes('notallowed')) {
          setError('Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser.');
        } else if (message.toLowerCase().includes('notfound') || message.toLowerCase().includes('no camera')) {
          setError('Kamera tidak ditemukan di perangkat ini.');
        } else {
          setError('Tidak bisa membuka kamera: ' + message);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
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
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Scan Barcode</h2>
          <button onClick={stopAndClose} className="text-xs text-slate-500">
            Tutup
          </button>
        </div>

        {error ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-slate-500">
              Kamu tetap bisa input barcode manual lewat kotak pencarian di halaman POS.
            </p>
          </div>
        ) : (
          <>
            <div id={containerId} className="rounded-lg overflow-hidden min-h-[200px] bg-slate-100 dark:bg-slate-800" />
            <p className="text-xs text-slate-500 mt-3 text-center">
              {loading ? 'Membuka kamera...' : 'Arahkan kamera ke barcode produk.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
