import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch {
  // Ignore if .env file is not present in current working directory
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().trim().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().trim().min(1, 'DB_NAME is required'),
  DB_USER: z.string().trim().min(1, 'DB_USER is required'),
  DB_PASS: z.string({ message: 'DB_PASS must be defined in environment' }),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(15),
  DB_MAX_IDLE: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(60000),
  DB_QUEUE_LIMIT: z.coerce.number().int().nonnegative().default(0),
  JWT_SECRET: z.string().min(16).optional(),
  ENCRYPTION_KEY: z.string().min(16).optional(),
  SMTP_HOST: z.string().trim().default('smtp.hostinger.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.string().optional().default('true'),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().trim().default('PhoneLab EPOS'),
  SMTP_FROM_EMAIL: z.string().trim().optional(),
  DEV_PASS: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema> & {
  RESOLVED_JWT_SECRET: string;
  RESOLVED_ENCRYPTION_KEY: string;
};

/**
 * Validates environment variables at startup and derives cryptographic secrets safely.
 * If JWT_SECRET or ENCRYPTION_KEY are not explicitly set in .env, derives deterministic
 * environment-bound keys rather than exposing a public static fallback string.
 */
function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`[ENV VALIDATION FATAL] Invalid environment configuration: ${formatted}`);
  }

  const data = parsed.data;
  const fallbackJwtSeed = `epos:${data.DB_USER}:${data.DB_NAME}:${data.DB_PASS}:jwt_v1`;
  const derivedJwtSecret = crypto.createHash('sha256').update(fallbackJwtSeed).digest('hex');

  const resolvedJwtSecret = data.JWT_SECRET || derivedJwtSecret;
  const resolvedEncryptionKey =
    data.ENCRYPTION_KEY ||
    data.JWT_SECRET ||
    crypto.createHash('sha256').update(`epos:${data.DB_USER}:${data.DB_PASS}:aes_gcm_v1`).digest('hex');

  return {
    ...data,
    RESOLVED_JWT_SECRET: resolvedJwtSecret,
    RESOLVED_ENCRYPTION_KEY: resolvedEncryptionKey
  };
}

export const env: AppEnv = loadEnv();
