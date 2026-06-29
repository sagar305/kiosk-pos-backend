import crypto from 'crypto';

// Encrypts business-supplied secrets (e.g. a business's own Anthropic API
// key) at rest, so a DB dump alone doesn't expose them. Key is derived from
// AI_KEY_ENCRYPTION_SECRET (falls back to JWT_SECRET so this works without
// extra setup, though a dedicated secret is recommended in production).
const secret = process.env.AI_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'dev_only_insecure_secret';
const key = crypto.createHash('sha256').update(secret).digest();

export function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString('base64')).join(':');
}

export function decrypt(payload) {
  const [ivB64, authTagB64, encryptedB64] = payload.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
