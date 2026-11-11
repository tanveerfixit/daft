import { Request, Response, NextFunction } from 'express';
import { importProductsPayloadSchema } from '../validators/schemas.js';
import { importProductsBatch } from '../services/productImportService.js';

/**
 * Controller for POST /api/import-products.
 * Validates the incoming product batch using Zod and delegates to the service layer.
 */
export async function handleImportProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { products } = importProductsPayloadSchema.parse(req.body);
    await importProductsBatch(req.user.business_id, req.user.branch_id, products);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
