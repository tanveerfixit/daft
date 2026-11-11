import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit nonce for AES-GCM
const PREFIX = 'enc_v1:';
const LEGACY_DEFAULT_KEY = 'epos_secure_system_key_2026_default';

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

function getPrimaryKey(): Buffer {
  return deriveKey(env.RESOLVED_ENCRYPTION_KEY);
}

function decryptWithKey(key: Buffer, iv: Buffer, authTag: Buffer, encryptedHex: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: enc_v1:<iv_hex>:<authTag_hex>:<cipher_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.trim() === '') return '';
  if (plainText.startsWith(PREFIX)) return plainText; // already encrypted

  const key = getPrimaryKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Supports seamless backward-compatible decryption for legacy records encrypted prior to key rotation.
 * If not encrypted (legacy plaintext), returns as is.
 */
export function decryptSecret(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith(PREFIX)) {
    return cipherText || '';
  }

  const parts = cipherText.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return cipherText;

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  try {
    return decryptWithKey(getPrimaryKey(), iv, authTag, encryptedHex);
  } catch {
    try {
      return decryptWithKey(deriveKey(LEGACY_DEFAULT_KEY), iv, authTag, encryptedHex);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Crypto] Decryption error:', msg);
      return '';
    }
  }
}
