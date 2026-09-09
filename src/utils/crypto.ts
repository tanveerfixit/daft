import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const PREFIX = 'enc_v1:';

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'epos_secure_system_key_2026_default';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: enc_v1:<iv_hex>:<authTag_hex>:<cipher_hex>
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.trim() === '') return '';
  if (plainText.startsWith(PREFIX)) return plainText; // already encrypted

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * If not encrypted (legacy plaintext), returns as is.
 */
export function decryptSecret(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith(PREFIX)) {
    return cipherText || '';
  }

  try {
    const parts = cipherText.slice(PREFIX.length).split(':');
    if (parts.length !== 3) return cipherText;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e: any) {
    console.error('[Crypto] Decryption error:', e.message);
    return '';
  }
}
