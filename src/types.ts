export interface Product {
  id: number; // This is the SKU ID in the new schema
  product_id: number;
  category_id: number | null;
  manufacturer_id: number | null;
  name: string;
  product_name: string;
  sku_code: string | null;
  barcode: string | null;
  selling_price: number;
  cost_price: number;
  product_type: 'stock' | 'serialized' | 'service' | 'bundle';
  category_name?: string;
  manufacturer_name?: string;
  total_stock?: number;
  allow_overselling?: boolean | number;
  device_id?: number;
  min_stock_level?: number;
  min_sales_price?: number;
  is_taxable?: boolean | number;
  require_note?: boolean | number;
  additional_description?: string;
  alert_message?: string;
}

export interface Branch {
  id: number;
  name: string;
  address?: string;
}

export interface Supplier {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  secondary_phone?: string;
  fax?: string;
  email: string;
  offers_email?: boolean | number;
  company?: string;
  customer_type?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  alert_message?: string;
  address?: string;
  wallet_balance?: number;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  sku_id: number;
  device_id?: number;
  imei?: string;
  product_name?: string;
  sku_code?: string;
  quantity: number;
  price: number;
  cost?: number;
  discount?: number;
  discount_type?: string;
  total: number;
  product_type?: string;
  allow_overselling?: number;
  max_stock?: number;
  notes?: string;
}

export interface InvoiceActivity {
  id: number;
  invoice_id: number;
  user_id: number | null;
  user_name?: string;
  activity: string;
  details: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name?: string;
  products_summary?: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  paid_amount: number;
  due_amount: number;
  payment_method?: string;
  status: string;
  created_at: string;
  items?: InvoiceItem[];
  activities?: InvoiceActivity[];
  payments?: Payment[];
}

export interface Payment {
  id: number;
  customer_id?: number | null;
  invoice_id?: number | null;
  type: 'deposit' | 'sale_payment' | 'wallet_use';
  method: string;
  amount: number;
  paid_at: string;
  user_name?: string;
  invoice_number?: string;
  customer_name?: string;
  products_summary?: string;
}

export interface ClosingReport {
  id?: number;
  branch_id: number;
  user_id: number;
  report_date: string;
  starting_balance: number;
  cash_counted: number;
  calculated_cash: number;
  difference: number;
  total_sales: number;
  total_deposits: number;
  total_cash_in_drawer: number;
  comments: string;
  created_at?: string;
  user_name?: string;
  payment_summaries?: ClosingReportPayment[];
}

export interface ClosingReportPayment {
  id?: number;
  report_id?: number;
  payment_type: string;
  calculated: number;
  counted: number;
  difference: number;
}

export interface Repair {
  id: number;
  customer_id: number | null;
  customer_name?: string;
  phone?: string;
  device_model: string;
  issue: string;
  status: 'new' | 'diagnosed' | 'repairing' | 'completed' | 'collected';
  total_quote?: number;
  deposit_paid?: number;
  remaining_balance?: number;
  payment_method?: string;
  notes?: string;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Manufacturer {
  id: number;
  name: string;
}

export interface ProductActivity {
  id: number;
  sku_id: number;
  user_id: number | null;
  user_name?: string;
  activity: string;
  details: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  lot_ref_no?: string;
  supplier_id: number | null;
  supplier_name?: string;
  sales_tax: number;
  shipping_cost: number;
  total: number;
  expected_at: string;
  status: string;
  created_at: string;
}
