import { Product, Customer } from '../../types';

export interface CartItem extends Product {
  quantity: number;
  device_id?: number;
  imei?: string;
  customPrice?: number;
  is_deposit?: boolean;
  is_repair_payment?: boolean;
  repair_job_id?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  notes?: string;
}

export interface PaymentEntry {
  method: string;
  amount: number;
}

export interface Activity {
  id: string;
  time: string;
  action: string;
  details: string;
  type: 'sale' | 'customer' | 'stock' | 'system';
}
