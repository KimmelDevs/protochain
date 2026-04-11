import CryptoJS from 'crypto-js';

// Server-side only — never expose this key to the client
const SECRET = process.env.AES_SECRET_KEY!;

if (!SECRET && typeof window === 'undefined') {
  console.warn('[crypto] AES_SECRET_KEY is not set in environment variables.');
}

/**
 * Encrypt a string using AES-256.
 * Returns empty string if input is empty/null.
 */
export const encrypt = (text: string | null | undefined): string => {
  if (!text) return '';
  return CryptoJS.AES.encrypt(text, SECRET).toString();
};

/**
 * Decrypt an AES-256 encrypted string.
 * Returns original value if decryption fails (e.g. unencrypted legacy data).
 */
export const decrypt = (cipher: string | null | undefined): string => {
  if (!cipher) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    // If result is empty, it wasn't encrypted — return original
    return result || cipher;
  } catch {
    return cipher;
  }
};

/**
 * Encrypt an entire object's specified fields.
 * Other fields are passed through unchanged.
 */
export const encryptFields = <T extends Record<string, any>>(
  data: T,
  fields: string[]
): T => {
  const result: Record<string, any> = { ...data };
  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      result[field] = encrypt(String(result[field]));
    }
  }
  return result as T;
};

/**
 * Decrypt an entire object's specified fields.
 */
export const decryptFields = <T extends Record<string, any>>(
  data: T,
  fields: string[]
): T => {
  const result: Record<string, any> = { ...data };
  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) {
      result[field] = decrypt(String(result[field]));
    }
  }
  return result as T;
};