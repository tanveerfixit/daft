import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Applies OWASP recommended HTTP security headers to all responses.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

/**
 * Memory-bounded sliding window rate limiter for authentication and sensitive endpoints.
 */
export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  const MAX_BUCKETS = 5000;

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, Math.min(options.windowMs, 60_000));

  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientIp = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : String(rawIp)).replace(/^::ffff:/, '');
    const key = `${options.keyPrefix || 'rl'}:${clientIp}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      if (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
      bucket = { count: 1, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    } else {
      bucket.count += 1;
    }

    const remaining = Math.max(0, options.maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      res.status(429).json({
        error: options.message || 'Too many requests. Please try again later.'
      });
      return;
    }

    next();
  };
}

/**
 * Escapes HTML special characters to prevent Stored/Reflected XSS in HTML emails and print views.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes a value for CSV export, neutralizing spreadsheet formula injection (=, +, -, @, \t, \r)
 * while preserving negative numbers, and properly escaping double quotes per RFC 4180.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str) && !/^-[0-9]+(\.[0-9]+)?$/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
