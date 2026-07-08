'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import type { Product } from '@/lib/types';

interface BarcodeLabelModalProps {
  product: Product;
  onClose: () => void;
}

export default function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const [copies, setCopies] = useState(1);
  const svgRefs = useRef<(SVGSVGElement | null)[]>([]);

  useEffect(() => {
    svgRefs.current.forEach((svg) => {
      if (!svg) return;
      JsBarcode(svg, product.barcode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        fontSize: 14,
        margin: 5,
      });
    });
  }, [copies, product.barcode]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-semibold text-sm mb-4 print:hidden">Cetak Label Barcode</h2>

        <div id="barcode-label-print" className="flex flex-col items-center gap-3">
          {Array.from({ length: copies }).map((_, idx) => (
            <div
              key={idx}
              className="text-center border border-dashed border-slate-300 p-3 rounded-lg w-full"
            >
              <p className="text-xs font-medium truncate">{product.name}</p>
              <svg
                ref={(el) => {
                  svgRefs.current[idx] = el;
                }}
                className="mx-auto"
              />
              <p className="text-xs text-slate-500">
                Rp {product.selling_price.toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 print:hidden">
          <label className="text-xs text-slate-500">Jumlah label:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={copies}
            onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1 text-sm"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2"
          >
            Cetak
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium py-2"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

