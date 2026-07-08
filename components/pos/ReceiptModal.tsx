'use client';

import jsPDF from 'jspdf';

interface ReceiptModalProps {
  sale: {
    invoice_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    subtotal: number;
    discount: number;
    tax: number;
    grand_total: number;
    payment_method: string;
    cash_received: number | null;
    change_amount: number | null;
    created_at: string;
    items: { product_name: string; qty: number; price: number }[];
  };
  onClose: () => void;
}

export default function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  function downloadPDF() {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150 + sale.items.length * 6] });
    let y = 10;
    doc.setFontSize(11);
    doc.text('Smart POS Pro', 40, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.text(sale.invoice_number, 40, y, { align: 'center' });
    y += 4;
    doc.text(new Date(sale.created_at).toLocaleString('id-ID'), 40, y, { align: 'center' });
    y += 5;
    doc.line(5, y, 75, y);
    y += 5;

    sale.items.forEach((item) => {
      doc.text(`${item.product_name} x${item.qty}`, 5, y);
      doc.text(rupiah(item.price * item.qty), 75, y, { align: 'right' });
      y += 5;
    });

    doc.line(5, y, 75, y);
    y += 5;
    doc.text('Subtotal', 5, y);
    doc.text(rupiah(sale.subtotal), 75, y, { align: 'right' });
    y += 4;
    doc.text('Diskon', 5, y);
    doc.text(rupiah(sale.discount), 75, y, { align: 'right' });
    y += 4;
    doc.text('Pajak', 5, y);
    doc.text(rupiah(sale.tax), 75, y, { align: 'right' });
    y += 5;
    doc.setFontSize(10);
    doc.text('Total', 5, y);
    doc.text(rupiah(sale.grand_total), 75, y, { align: 'right' });
    y += 6;
    doc.setFontSize(8);
    doc.text('Terima kasih telah berbelanja!', 40, y, { align: 'center' });

    doc.save(`${sale.invoice_number}.pdf`);
  }

  function buildWhatsAppMessage() {
    const lines = [
      `*Smart POS Pro*`,
      `Invoice: ${sale.invoice_number}`,
      `Tanggal: ${new Date(sale.created_at).toLocaleString('id-ID')}`,
      ``,
      ...sale.items.map(
        (i) => `${i.product_name} x${i.qty} - ${rupiah(i.price * i.qty)}`
      ),
      ``,
      `Subtotal: ${rupiah(sale.subtotal)}`,
      `Diskon: ${rupiah(sale.discount)}`,
      `Pajak: ${rupiah(sale.tax)}`,
      `*Total: ${rupiah(sale.grand_total)}*`,
      `Metode: ${sale.payment_method.toUpperCase()}`,
      ``,
      `Terima kasih telah berbelanja!`,
    ];
    return encodeURIComponent(lines.join('\n'));
  }

  function sendToWhatsApp() {
    const phone = sale.customer_phone?.replace(/\D/g, '');
    if (!phone) return;
    const normalizedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    window.open(
      `https://wa.me/${normalizedPhone}?text=${buildWhatsAppMessage()}`,
      '_blank'
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div id="receipt-print" className="p-6 font-mono text-sm">
          <div className="text-center mb-4">
            <p className="font-bold text-base">Smart POS Pro</p>
            <p className="text-xs text-slate-500">{sale.invoice_number}</p>
            <p className="text-xs text-slate-500">
              {new Date(sale.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {sale.items.map((item, idx) => (
            <div key={idx} className="flex justify-between mb-1">
              <span>
                {item.product_name} x{item.qty}
              </span>
              <span>{rupiah(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{rupiah(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>{rupiah(sale.discount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pajak</span>
            <span>{rupiah(sale.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-slate-300 mt-1 pt-1">
            <span>Total</span>
            <span>{rupiah(sale.grand_total)}</span>
          </div>
          {sale.payment_method === 'cash' && (
            <>
              <div className="flex justify-between mt-1">
                <span>Tunai</span>
                <span>{rupiah(sale.cash_received || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kembali</span>
                <span>{rupiah(sale.change_amount || 0)}</span>
              </div>
            </>
          )}
          <p className="text-center text-xs mt-4">Terima kasih telah berbelanja!</p>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 py-2 text-xs font-medium"
          >
            Cetak
          </button>
          <button
            onClick={downloadPDF}
            className="rounded-lg bg-blue-600 text-white py-2 text-xs font-medium"
          >
            PDF
          </button>
          <button
            onClick={sendToWhatsApp}
            disabled={!sale.customer_phone}
            className="rounded-lg bg-emerald-600 disabled:opacity-40 text-white py-2 text-xs font-medium"
          >
            Kirim WA
          </button>
          <button
            onClick={onClose}
            className="col-span-3 rounded-lg border border-slate-300 dark:border-slate-700 py-2 text-sm font-medium"
          >
            Tutup & Transaksi Baru
          </button>
        </div>
      </div>
    </div>
  );
}
