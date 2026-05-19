import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const CIPHER_VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64");
}

export function isApiKeyEncryptionConfigured(): boolean {
  const raw = process.env.APP_ENCRYPTION_KEY;
  return Boolean(raw && raw.trim().length >= 32);
}

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 32) {
    throw new Error("api_key_encryption_not_configured");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    CIPHER_VERSION,
    b64urlEncode(iv),
    b64urlEncode(tag),
    b64urlEncode(ciphertext),
  ].join(":");
}

export function decryptApiKey(ciphertext: string): string {
  const [version, ivRaw, tagRaw, payloadRaw] = ciphertext.split(":");
  if (version !== CIPHER_VERSION || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("api_key_ciphertext_invalid");
  }
  const decipher = createDecipheriv(ALGO, getEncryptionKey(), b64urlDecode(ivRaw));
  decipher.setAuthTag(b64urlDecode(tagRaw));
  return Buffer.concat([
    decipher.update(b64urlDecode(payloadRaw)),
    decipher.final(),
  ]).toString("utf8");
}
