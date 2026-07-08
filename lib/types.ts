// lib/types.ts

export type UserRole = 'admin' | 'cashier';
export type PaymentMethodType = 'cash' | 'qris' | 'transfer' | 'split';
export type PaymentStatusType = 'paid' | 'pending' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Product {
  id: string;
  barcode: string;
  product_code: string;
  name: string;
  category_id: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  photo_url: string | null;
  status: 'active' | 'inactive';
}

export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
  available_stock: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  cashier_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_method: PaymentMethodType;
  payment_status: PaymentStatusType;
  cash_received: number | null;
  change_amount: number | null;
  created_at: string;
}

export type PpobCategory = 'pulsa' | 'token_listrik' | 'paket_data' | 'e_wallet' | 'lainnya';
export type PpobStatus = 'pending' | 'diproses' | 'selesai' | 'gagal';

export interface PpobProduct {
  id: string;
  category: PpobCategory;
  name: string;
  denomination: number;
  selling_price: number;
  cost_price: number;
  is_active: boolean;
}

export interface PpobTransaction {
  id: string;
  transaction_number: string;
  ppob_product_id: string;
  customer_number: string;
  selling_price: number;
  cost_price: number;
  status: PpobStatus;
  serial_code: string | null;
  cashier_id: string;
  created_at: string;
  completed_at: string | null;
}
