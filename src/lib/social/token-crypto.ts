/**
 * Server-only token encryption (AES-256-GCM).
 * Key: SOCIAL_TOKEN_KEY env (64 hex chars = 32 bytes). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Pure functions (key passed in) so they are unit-testable without env.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

export function parseTokenKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const hex = raw.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Buffer.from(hex, "hex");
}

export function getTokenKey(): Buffer {
  const key = parseTokenKey(process.env.SOCIAL_TOKEN_KEY);
  if (!key) {
    throw new Error("SOCIAL_TOKEN_KEY is not set (64 hex chars required) — social publishing is NOT CONFIGURED");
  }
  return key;
}

/** Format: base64(iv) + "." + base64(ciphertext+tag). */
export function encryptToken(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return `${iv.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptToken(payload: string, key: Buffer): string {
  const [ivB64, dataB64] = payload.split(".");
  if (!ivB64 || !dataB64) throw new Error("malformed token payload");
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  if (iv.length !== IV_LEN || data.length < 17) throw new Error("malformed token payload");
  const tag = data.subarray(data.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]).toString("utf8");
}
