import { Router } from 'express';
import { query, queryOne, execute } from '../mysql.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'EPOS_SUPER_SECRET_FALLBACK_KEY_2026';

function getUserIdFromReq(req: any): number | null {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

// GET /api/public/business/:slug
router.get('/business/:slug', async (req: any, res, next) => {
  const { slug } = req.params;
  try {
    const business = await queryOne(`
      SELECT id, name, email, phone, address, city, state, zip_code, country, status
      FROM businesses 
      WHERE slug = ? AND status = 'active' AND deleted_at IS NULL
    `, [slug]) as any;

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get branches for this business
    const branches = await queryOne('SELECT id, name, address, phone FROM branches WHERE business_id = ? AND deleted_at IS NULL', [business.id]);
    
    res.json({
      ...business,
      branches: Array.isArray(branches) ? branches : [branches].filter(Boolean)
    });
  } catch (e: any) {
    next(e);
  }
});

// GET /api/public/announcements
router.get('/announcements', async (_req, res, next) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src', 'data', 'announcements.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      try {
        return res.json(JSON.parse(data));
      } catch {
        return res.json([]);
      }
    }
    res.json([]);
  } catch (e: any) {
    next(e);
  }
});

// GET /api/public/announcements/read-ids
router.get('/announcements/read-ids', async (req: any, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.json({ readIds: [] });
    }
    const rows = await query('SELECT announcement_id FROM user_read_announcements WHERE user_id = ?', [userId]) as any[];
    const readIds = (rows || []).map(r => String(r.announcement_id));
    res.json({ readIds });
  } catch (e: any) {
    res.json({ readIds: [] });
  }
});

// POST /api/public/announcements/mark-read
router.post('/announcements/mark-read', async (req: any, res, next) => {
  try {
    const userId = getUserIdFromReq(req);
    const { ids, id } = req.body;
    const targetIds = Array.isArray(ids) ? ids.map(String) : (id ? [String(id)] : []);
    
    if (userId && targetIds.length > 0) {
      for (const annId of targetIds) {
        if (annId) {
          await execute('INSERT IGNORE INTO user_read_announcements (user_id, announcement_id) VALUES (?, ?)', [userId, annId]);
        }
      }
    }
    res.json({ success: true, markedIds: targetIds });
  } catch (e: any) {
    next(e);
  }
});

// POST /api/public/announcements/mark-all-read
router.post('/announcements/mark-all-read', async (req: any, res, next) => {
  try {
    const userId = getUserIdFromReq(req);
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src', 'data', 'announcements.json');
    let targetIds: string[] = [];
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(data)) {
          targetIds = data.map(a => String(a.id));
        }
      } catch {}
    }
    if (userId && targetIds.length > 0) {
      for (const annId of targetIds) {
        await execute('INSERT IGNORE INTO user_read_announcements (user_id, announcement_id) VALUES (?, ?)', [userId, annId]);
      }
    }
    res.json({ success: true, markedIds: targetIds });
  } catch (e: any) {
    next(e);
  }
});

export default router;
