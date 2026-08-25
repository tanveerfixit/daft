import { Router } from 'express';
import { pool, query, queryOne, execute } from '../mysql.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendAccountPending, sendAccountApproved, sendAccountRejected, sendAccountDeactivated, sendOtpCode, sendGeneratedPassword, sendTestEmail, invalidateMailTransporter } from '../services/mailer.js';

import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'EPOS_SUPER_SECRET_FALLBACK_KEY_2026';

// ─── Token Blacklist Management ────────────────────────────────────────────────
// For explicit logouts
export const revokedTokens = new Set<string>();
// For global invalidation (e.g., password reset), maps userId -> timestamp (seconds)
export const userPasswordResets = new Map<number, number>();

// Purge expired tokens from the blacklist every hour to prevent memory leaks
const _cleanup = setInterval(() => {
  revokedTokens.clear(); // Safe to clear entirely if TTL is 1 hour
}, 60 * 60 * 1000);
if (typeof _cleanup.unref === 'function') _cleanup.unref();

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function verifyToken(token: string | undefined): any {
  if (!token) return null;
  if (revokedTokens.has(token)) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const resetTime = userPasswordResets.get(decoded.userId);
    if (resetTime && decoded.iat < resetTime) return null;
    return decoded;
  } catch {
    return null;
  }
}

interface CachedUser {
  user: any;
  expiresAt: number;
}

const authUserCache = new Map<number, CachedUser>();

export function invalidateUserAuthCache(userId?: number) {
  if (userId) {
    authUserCache.delete(userId);
  } else {
    authUserCache.clear();
  }
}

export function requireAuth(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  req._sessionToken = token;
  req.userId = decoded.userId;
  next();
}

export async function requireAuthAsync(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const cached = authUserCache.get(decoded.userId);
    let user: any;
    if (cached && Date.now() < cached.expiresAt) {
      user = cached.user;
    } else {
      user = await queryOne('SELECT * FROM users WHERE id=?', [decoded.userId]);
      if (!user) return res.status(401).json({ error: 'User not found' });
      authUserCache.set(decoded.userId, { user, expiresAt: Date.now() + 45000 });
    }

    req._sessionToken = token;
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (e: any) { 
    console.error('[Auth] requireAuthAsync error:', e.message);
    res.status(401).json({ error: 'Invalid or expired token' }); 
  }
}

export async function requireAdminAsync(req: any, res: any, next: any) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const user = req.user || (await queryOne('SELECT * FROM users WHERE id=?', [decoded.userId]) as any);
    if (!user || user.role === 'staff' || !['tanveerfixit@gmail.com', 'support@techinbox.ie'].includes(user.email)) {
      return res.status(403).json({ error: 'Admin access required. Only Super Admin has access.' });
    }
    req._sessionToken = token;
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (e: any) { next(e); }
}

// ─── Public Auth Router ───────────────────────────────────────────────────────

const router = Router();

function slugify(text: string) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

const signupSchema = z.object({
  name: z.string().min(2, "Business Name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(2, "Address is required"),
  contact: z.string().min(3, "Contact number is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

// POST /api/auth/signup
router.post('/signup', async (req: any, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const { name, email, address, contact, password } = data;
    
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const existing = await queryOne('SELECT id FROM users WHERE email=?', [email]);
      if (existing) {
        conn.release();
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      
      const password_hash = await bcrypt.hash(password, 10);

      // Generate unique business slug
      let slug = slugify(name);
      const [existingSlug] = await conn.execute('SELECT id FROM businesses WHERE slug = ?', [slug]);
      if ((existingSlug as any[]).length > 0) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Create new isolated business
      const [biz] = await conn.execute(
        'INSERT INTO businesses (name, slug, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name, slug, email, contact, address, 'active']
      );
      const businessId = (biz as any).insertId;

      // Create primary branch
      const [br] = await conn.execute(
        'INSERT INTO branches (business_id, name, phone, address, status) VALUES (?, ?, ?, ?, ?)',
        [businessId, name, contact, address, 'active']
      );
      const branchId = (br as any).insertId;

      // Create staff user for this business (no admin/superadmin access)
      const [userResult] = await conn.execute(
        "INSERT INTO users (business_id, branch_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'staff', 'active')",
        [businessId, branchId, `${name} User`, email, password_hash]
      );
      const userId = (userResult as any).insertId;

      // Initialize default settings & payment methods
      await conn.execute('INSERT INTO settings (business_id) VALUES (?)', [businessId]);
      const methods = ['Cash', 'Card', 'Other'];
      for (let i = 0; i < methods.length; i++) {
        await conn.execute('INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)', [businessId, methods[i], i + 1]);
      }

      await conn.commit();
      conn.release();

      // Issue JWT token
      const token = jwt.sign(
        { id: userId, email, role: 'staff', business_id: businessId, branch_id: branchId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ 
        success: true, 
        message: 'Business registered successfully!',
        token,
        user: {
          id: userId,
          name: `${name} User`,
          email,
          role: 'staff',
          business_id: businessId,
          business_name: name,
          branch_id: branchId,
          branch_name: name,
          branch_slug: slug
        }
      });
    } catch (e: any) {
      await conn.rollback();
      conn.release();
      throw e;
    }
  } catch (e: any) {
    next(e);
  }
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

// POST /api/auth/login
router.post('/login', async (req: any, res, next) => {
  const data = loginSchema.parse(req.body);
  const { email, password } = data;
  try {
    const user = await queryOne('SELECT * FROM users WHERE email=? AND deleted_at IS NULL', [email]) as any;
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // 'developer' role bypasses business-status check (FINDING-002)
    if (user.role !== 'developer') {
      const business = await queryOne('SELECT status FROM businesses WHERE id=?', [user.business_id]) as any;
      if (business && business.status !== 'active') {
        return res.status(403).json({ error: 'Your business account is pending developer approval or has been deactivated.' });
      }
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        const settings = await queryOne('SELECT allow_signin FROM settings WHERE business_id=?', [user.business_id]) as any;
        if (settings && settings.allow_signin === 0) {
          return res.status(403).json({ error: 'Sign-in is currently disabled. Contact your administrator.' });
        }
      }
    }

    if (user.status === 'pending') return res.status(403).json({ error: 'Your account is pending admin approval.' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Your account registration was rejected.' });
    if (user.status === 'inactive') return res.status(403).json({ error: 'Your account has been deactivated.' });

    let valid = false;
    if (user.password_hash) {
      valid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy plaintext fallback — migrate to hash on successful login (FINDING-007)
      valid = user.password === password;
      if (valid) {
        const hash = await bcrypt.hash(password, 10);
        await execute("UPDATE users SET password_hash=?, password='' WHERE id=?", [hash, user.id]);
      }
    }
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    // JWT Generation
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '2h' });
    await execute('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);
    const branch = await queryOne('SELECT * FROM branches WHERE id=?', [user.branch_id]) as any;
    const business = await queryOne('SELECT name FROM businesses WHERE id=?', [user.business_id]) as any;
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status,
        branch_id: user.branch_id, branch_name: branch?.name, business_id: user.business_id, business_name: business?.name }
    });
  } catch (e: any) { next(e); }
});

// GET /api/auth/branches-lookup?email=...
router.get('/branches-lookup', async (req: any, res, next) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Business email required' });
  try {
    const business = await queryOne('SELECT id FROM businesses WHERE email=?', [email]) as any;
    if (!business) return res.status(404).json({ error: 'No business found with this email' });
    const branches = await query('SELECT id, name FROM branches WHERE business_id=? AND deleted_at IS NULL', [business.id]);
    res.json(branches);
  } catch (e: any) { next(e); }
});

// POST /api/auth/logout
router.post('/logout', (req: any, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) revokedTokens.add(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuthAsync, async (req: any, res, next) => {
  try {
    const user = await queryOne(`
      SELECT u.*, b.name as branch_name, biz.name as business_name 
      FROM users u LEFT JOIN branches b ON u.branch_id=b.id 
      LEFT JOIN businesses biz ON u.business_id=biz.id WHERE u.id=?
    `, [req.userId]) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, password_hash, reset_token, otp_code, ...safeUser } = user;
    res.json(safeUser);
  } catch (e: any) { next(e); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: any, res, next) => {
  res.json({ success: true, message: 'If this email exists, an OTP code has been sent.' });
  try {
    const user = await queryOne('SELECT * FROM users WHERE email=?', [req.body.email]) as any;
    if (!user) return;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 2 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await execute('UPDATE users SET otp_code=?,otp_expires=? WHERE id=?', [otp, expires, user.id]);
    try { await sendOtpCode({ name: user.name, email: user.email }, otp); } catch {}
  } catch {}
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: any, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
  try {
    const user = await queryOne('SELECT * FROM users WHERE email=? AND otp_code=?', [email, String(otp)]) as any;
    if (!user) return res.status(400).json({ error: 'Invalid OTP code' });
    
    const expiry = new Date(user.otp_expires).getTime();
    if (isNaN(expiry) || expiry < Date.now()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    const reset_token = crypto.randomUUID();
    const tokenExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await execute('UPDATE users SET otp_code=NULL,otp_expires=NULL,reset_token=?,reset_token_expires=? WHERE id=?',
      [reset_token, tokenExpires, user.id]);
    res.json({ success: true, reset_token });
  } catch (e: any) { next(e); }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: any, res, next) => {
  const data = resetPasswordSchema.parse(req.body);
  const { token, password } = data;
  try {
    const user = await queryOne('SELECT * FROM users WHERE reset_token=?', [token]) as any;
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });
    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    // Invalidate all tokens for this user on password reset by recording the timestamp
    userPasswordResets.set(user.id, Date.now() / 1000);
    // No plaintext password stored (FINDING-007)
    await execute("UPDATE users SET password_hash=?,password='',reset_token=NULL,reset_token_expires=NULL WHERE id=?",
      [password_hash, user.id]);
    res.json({ success: true, message: 'Password updated. You can now log in.' });
  } catch (e: any) { next(e); }
});

// ─── Admin Router (mounted at /api/admin) ────────────────────────────────────

const adminRouter = Router();

// GET /api/admin/users
adminRouter.get('/users', requireAdminAsync, async (req: any, res, next) => {
  try {
    const isMaster = ['developer', 'superadmin'].includes(req.user.role);
    const sql = isMaster 
      ? `SELECT u.id,u.name,u.email,u.role,u.status,u.last_login,u.created_at,u.business_id,b.name as branch_name,b.id as branch_id
         FROM users u LEFT JOIN branches b ON u.branch_id=b.id
         WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC`
      : `SELECT u.id,u.name,u.email,u.role,u.status,u.last_login,u.created_at,u.business_id,b.name as branch_name,b.id as branch_id
         FROM users u LEFT JOIN branches b ON u.branch_id=b.id
         WHERE u.business_id=? AND u.deleted_at IS NULL ORDER BY u.created_at DESC`;
    const params = isMaster ? [] : [req.user.business_id];
    res.json(await query(sql, params));
  } catch (e: any) { next(e); }
});

// PUT /api/admin/users/:id/status
adminRouter.put('/users/:id/status', requireAdminAsync, async (req: any, res, next) => {
  const { status } = req.body;
  if (!['approved','rejected','inactive','pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const isMaster = ['developer', 'superadmin'].includes(req.user.role);
    const user = isMaster
      ? await queryOne('SELECT * FROM users WHERE id=? AND deleted_at IS NULL', [req.params.id])
      : await queryOne('SELECT * FROM users WHERE id=? AND business_id=? AND deleted_at IS NULL', [req.params.id, req.user.business_id]);
    if (!user) return res.status(404).json({ error: 'User not found or access denied' });
    
    // Prevent deactivating master accounts
    if (['support@techinbox.ie', 'tanveerfixit@gmail.com'].includes(user.email) && status !== 'approved') {
      return res.status(400).json({ error: 'Master admin accounts cannot be deactivated' });
    }

    await execute('UPDATE users SET status=? WHERE id=?', [status, req.params.id]);
    try {
      if (status === 'approved') await sendAccountApproved({ name: user.name, email: user.email });
      else if (status === 'rejected') await sendAccountRejected({ name: user.name, email: user.email });
      else if (status === 'inactive') await sendAccountDeactivated({ name: user.name, email: user.email });
    } catch {}
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// PUT /api/admin/users/:id
adminRouter.put('/users/:id', requireAdminAsync, async (req: any, res, next) => {
  const { name, email, branch_id, role, password } = req.body;
  try {
    const isMaster = ['developer', 'superadmin'].includes(req.user.role);
    const existing = isMaster
      ? await queryOne('SELECT id, email FROM users WHERE id=? AND deleted_at IS NULL', [req.params.id])
      : await queryOne('SELECT id, email FROM users WHERE id=? AND business_id=? AND deleted_at IS NULL', [req.params.id, req.user.business_id]);
    if (!existing) return res.status(404).json({ error: 'User not found or access denied' });

    if (email && email.trim() !== '' && email.trim() !== existing.email) {
      const emailCheck = await queryOne('SELECT id FROM users WHERE email=? AND id!=? AND deleted_at IS NULL', [email.trim(), req.params.id]);
      if (emailCheck) {
        return res.status(400).json({ error: 'This email address is already in use by another account' });
      }
    }

    const updatedEmail = email && email.trim() !== '' ? email.trim() : existing.email;

    if (password && password.trim() !== '') {
      const password_hash = await bcrypt.hash(password.trim(), 10);
      await execute("UPDATE users SET name=?,email=?,branch_id=?,role=?,password='',password_hash=? WHERE id=?",
        [name, updatedEmail, branch_id, role, password_hash, req.params.id]);
    } else {
      await execute('UPDATE users SET name=?,email=?,branch_id=?,role=? WHERE id=?',
        [name, updatedEmail, branch_id, role, req.params.id]);
    }
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', requireAdminAsync, async (req: any, res, next) => {
  try {
    const isMaster = ['developer', 'superadmin'].includes(req.user.role);
    const sql = isMaster
      ? 'UPDATE users SET deleted_at=NOW() WHERE id=?'
      : 'UPDATE users SET deleted_at=NOW() WHERE id=? AND business_id=?';
    const params = isMaster ? [req.params.id] : [req.params.id, req.user.business_id];
    const r = await execute(sql, params);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'User not found or access denied' });
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// POST /api/admin/users/:id/reset-password
adminRouter.post('/users/:id/reset-password', requireAdminAsync, async (req: any, res, next) => {
  try {
    // Scope to same business (FINDING-004)
    const user = await queryOne('SELECT * FROM users WHERE id=? AND business_id=?',
      [req.params.id, req.user.business_id]) as any;
    if (!user) return res.status(404).json({ error: 'User not found or access denied' });
    const newPass = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) + '!';
    const hash = await bcrypt.hash(newPass, 10);
    // Store hash only, keep last_generated_password for resend feature (FINDING-007)
    await execute("UPDATE users SET password='',password_hash=?,last_generated_password=? WHERE id=?",
      [hash, newPass, user.id]);
    try { await sendGeneratedPassword({ name: user.name, email: user.email }, newPass); } catch {}
    res.json({ success: true, message: `Password reset and emailed to ${user.email}` });
  } catch (e: any) { next(e); }
});

// POST /api/admin/users/:id/resend-password
adminRouter.post('/users/:id/resend-password', requireAdminAsync, async (req: any, res, next) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id=? AND business_id=?',
      [req.params.id, req.user.business_id]) as any;
    if (!user) return res.status(404).json({ error: 'User not found or access denied' });
    if (!user.last_generated_password) {
      return res.status(400).json({ error: 'No generated password on record. Use Reset Password instead.' });
    }
    try { await sendGeneratedPassword({ name: user.name, email: user.email }, user.last_generated_password); } catch {}
    res.json({ success: true, message: `Password resent to ${user.email}` });
  } catch (e: any) { next(e); }
});

// GET /api/admin/branches
adminRouter.get('/branches', requireAdminAsync, async (req: any, res, next) => {
  try {
    if (['superadmin', 'developer'].includes(req.user.role)) {
      res.json(await query(`
        SELECT b.*, biz.name as business_name 
        FROM branches b 
        JOIN businesses biz ON b.business_id = biz.id 
        WHERE b.deleted_at IS NULL
        ORDER BY biz.name, b.name
      `));
    } else {
      res.json(await query('SELECT * FROM branches WHERE business_id=? AND deleted_at IS NULL', [req.user.business_id]));
    }
  } catch (e: any) { next(e); }
});

// POST /api/admin/branches
adminRouter.post('/branches', requireAdminAsync, async (req: any, res, next) => {
  const { name, address, phone, business_id } = req.body;
  const targetBusinessId = business_id || req.user.business_id;
  try {
    const r = await execute('INSERT INTO branches (business_id,name,address,phone,status) VALUES (?,?,?,?,?)',
      [targetBusinessId, name, address, phone, 'active']);
    res.json({ id: r.insertId, business_id: targetBusinessId, name, address, phone, status: 'active' });
  } catch (e: any) { next(e); }
});

// PUT /api/admin/branches/:id
adminRouter.put('/branches/:id', requireAdminAsync, async (req: any, res, next) => {
  const { name, address, phone, status, business_id } = req.body;
  try {
    if (business_id) {
      await execute('UPDATE branches SET name=?, address=?, phone=?, status=?, business_id=? WHERE id=?',
        [name, address, phone, status || 'active', business_id, req.params.id]);
    } else {
      await execute('UPDATE branches SET name=?, address=?, phone=?, status=? WHERE id=?',
        [name, address, phone, status || 'active', req.params.id]);
    }
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// DELETE /api/admin/branches/:id
adminRouter.delete('/branches/:id', requireAdminAsync, async (req: any, res, next) => {
  try {
    await execute('UPDATE branches SET deleted_at=CURRENT_TIMESTAMP, status="inactive" WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// GET /api/admin/smtp
adminRouter.get('/smtp', requireAdminAsync, async (req: any, res, next) => {
  try {
    const settings = await queryOne('SELECT * FROM smtp_settings WHERE business_id = 1') as any;
    if (settings) {
      res.json({
        ...settings,
        pass: settings.pass ? '••••••••' : ''
      });
    } else {
      res.json({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: 1,
        user: process.env.SMTP_USER || 'noreply@clarelab.com',
        pass: '••••••••',
        from_name: process.env.SMTP_FROM_NAME || 'PhoneLab EPOS',
        from_email: process.env.SMTP_USER || 'noreply@clarelab.com'
      });
    }
  } catch (e: any) { next(e); }
});

// PUT /api/admin/smtp
adminRouter.put('/smtp', requireAdminAsync, async (req: any, res, next) => {
  const { host, port, secure, user, pass, from_name, from_email } = req.body;
  try {
    const existing = await queryOne('SELECT * FROM smtp_settings WHERE business_id = 1') as any;
    const updatedPass = (pass && pass !== '••••••••' && pass !== '********') 
      ? pass 
      : (existing?.pass || process.env.SMTP_PASS || 'Tani!!8877');

    if (existing) {
      await execute('UPDATE smtp_settings SET host=?, port=?, secure=?, user=?, pass=?, from_name=?, from_email=? WHERE business_id = 1',
        [host, port, secure ? 1 : 0, user, updatedPass, from_name, from_email]);
    } else {
      await execute('INSERT INTO smtp_settings (business_id, host, port, secure, user, pass, from_name, from_email) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
        [host, port, secure ? 1 : 0, user, updatedPass, from_name, from_email]);
    }
    invalidateMailTransporter();
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// POST /api/admin/smtp/test
adminRouter.post('/smtp/test', requireAdminAsync, async (req: any, res, next) => {
  try {
    const userEmail = req.user?.email || 'noreply@clarelab.com';
    await sendTestEmail(userEmail);
    res.json({ success: true, message: `Test email sent to ${userEmail}` });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─── Superadmin / Developer Business Control Routes ─────────────────────────

// GET /api/admin/system/businesses
adminRouter.get('/system/businesses', requireAdminAsync, async (req: any, res, next) => {
  try {
    res.json(await query('SELECT * FROM businesses WHERE deleted_at IS NULL ORDER BY name ASC'));
  } catch (e: any) { next(e); }
});

// POST /api/admin/system/businesses
adminRouter.post('/system/businesses', requireAdminAsync, async (req: any, res, next) => {
  const { name, email, phone, address, city, state, zip_code, country } = req.body;
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Business name is required' });
    }
    let slug = slugify(name);
    const [existingSlug] = await pool.execute('SELECT id FROM businesses WHERE slug = ?', [slug]);
    if ((existingSlug as any[]).length > 0) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const [bizResult] = await pool.execute(
      'INSERT INTO businesses (name, slug, email, phone, address, city, state, zip_code, country, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), slug, email || null, phone || null, address || null, city || null, state || null, zip_code || null, country || null, 'active']
    );
    const businessId = (bizResult as any).insertId;

    // Create default primary branch
    const [brResult] = await pool.execute(
      'INSERT INTO branches (business_id, name, phone, address, status) VALUES (?, ?, ?, ?, ?)',
      [businessId, name.trim(), phone || null, address || null, 'active']
    );
    const branchId = (brResult as any).insertId;

    // Create default settings & payment methods
    await pool.execute('INSERT INTO settings (business_id) VALUES (?)', [businessId]);
    const methods = ['Cash', 'Card', 'Other'];
    for (let i = 0; i < methods.length; i++) {
      await pool.execute('INSERT INTO payment_methods (business_id, name, display_order) VALUES (?, ?, ?)', [businessId, methods[i], i + 1]);
    }

    res.json({ id: businessId, branch_id: branchId, name, slug, email, phone, address, status: 'active' });
  } catch (e: any) { next(e); }
});

// PUT /api/admin/system/businesses/:id
adminRouter.put('/system/businesses/:id', requireAdminAsync, async (req: any, res, next) => {
  const { name, slug, email, phone, address, city, state, zip_code, country, status } = req.body;
  try {
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = slugify(name);
      const [existingSlug] = await pool.execute('SELECT id FROM businesses WHERE slug = ? AND id != ?', [finalSlug, req.params.id]);
      if ((existingSlug as any[]).length > 0) {
        finalSlug = `${finalSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }
    await execute('UPDATE businesses SET name=?,slug=?,email=?,phone=?,address=?,city=?,state=?,zip_code=?,country=?,status=? WHERE id=?',
      [name, finalSlug, email, phone, address, city, state, zip_code, country, status || 'active', req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

// PUT /api/admin/system/businesses/:id/status
adminRouter.put('/system/businesses/:id/status', requireAdminAsync, async (req: any, res, next) => {
  const { status } = req.body;
  try {
    await execute('UPDATE businesses SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch (e: any) { next(e); }
});

export { adminRouter };
export default router;
