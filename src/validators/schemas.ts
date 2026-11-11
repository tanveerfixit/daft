import { z } from 'zod';

/**
 * Validation schema for legacy /api/import-products endpoint.
 */
export const importProductsItemSchema = z.object({
  product_name: z.string().trim().min(1, 'Product name is required'),
  category_name: z.string().trim().optional().nullable(),
  manufacturer_name: z.string().trim().optional().nullable(),
  product_type: z.string().trim().optional().nullable(),
  allow_overselling: z.union([z.string(), z.boolean(), z.number()]).optional().nullable(),
  sku: z.string().trim().optional().default(''),
  cost_price: z.union([z.number(), z.string()]).optional().default(0),
  selling_price: z.union([z.number(), z.string()]).optional().default(0),
  current_inventory: z.union([z.number(), z.string()]).optional().default(0)
});

export const importProductsPayloadSchema = z.object({
  products: z.array(importProductsItemSchema).min(1, 'At least one product is required')
});

export type ImportProductItem = z.infer<typeof importProductsItemSchema>;

/**
 * Validation schema for updating a product (PUT /api/products/:id).
 */
export const updateProductSchema = z.object({
  product_name: z.string().trim().optional(),
  category_id: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  manufacturer_id: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  supplier_id: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  sku_code: z.string().trim().nullable().optional(),
  barcode: z.string().trim().nullable().optional(),
  selling_price: z.union([z.number(), z.string().transform(Number)]).optional(),
  cost_price: z.union([z.number(), z.string().transform(Number)]).optional(),
  product_type: z.string().trim().optional(),
  cascade_device_price: z.boolean().optional(),
  exclude_custom_priced_devices: z.boolean().optional()
});

/**
 * Validation schema for invoice refunds (POST /api/invoices/:id/refund).
 */
export const refundInvoiceSchema = z.object({
  method: z.string().trim().optional().default('Cash'),
  restock: z.boolean().optional().default(true),
  is_full_refund: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  customer_id: z.union([z.number(), z.string().transform(Number)]).optional().nullable(),
  items: z.array(
    z.object({
      item_id: z.union([z.number(), z.string().transform(Number)]),
      quantity: z.union([z.number(), z.string().transform(Number)])
    })
  ).optional()
});

/**
 * Validation schema for sending invoice emails (POST /api/invoices/:id/send-email).
 */
export const sendInvoiceEmailSchema = z.object({
  email: z.string().trim().email('A valid email address is required'),
  subject: z.string().trim().max(255).optional(),
  message: z.string().max(5000).optional()
});

/**
 * Validation schema for admin user update (PUT /api/admin/users/:id).
 */
export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  branch_id: z.union([z.number(), z.string().transform(Number)]).nullable().optional(),
  role: z.enum(['admin', 'staff', 'superadmin', 'developer']).optional().default('staff'),
  password: z.string().optional().nullable()
});

/**
 * Validation schema for SMTP settings update (PUT /api/admin/smtp).
 */
export const smtpUpdateSchema = z.object({
  host: z.string().trim().min(1, 'SMTP host is required'),
  port: z.coerce.number().int().positive().max(65535).default(465),
  secure: z.union([z.boolean(), z.number()]).optional().default(true),
  user: z.string().trim().min(1, 'SMTP user is required'),
  pass: z.string().optional().nullable(),
  from_name: z.string().trim().optional().default('PhoneLab EPOS'),
  from_email: z.string().trim().email('Invalid sender email').optional().or(z.literal(''))
});
