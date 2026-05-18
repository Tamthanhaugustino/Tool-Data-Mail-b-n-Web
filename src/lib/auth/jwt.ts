import type { Session } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-insecure-secret-please-set-AUTH_SECRET";
  }
  throw new Error(
    "AUTH_SECRET must be set to at least 16 characters in production.",
  );
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toBuffer(encoder.encode(getSecret())),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(session: Session): Promise<string> {
  const payloadBytes = encoder.encode(JSON.stringify(session));
  const payload = b64urlEncode(payloadBytes);
  const key = await getKey();
  const sigBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, toBuffer(encoder.encode(payload))),
  );
  return `${payload}.${b64urlEncode(sigBytes)}`;
}

export async function verifySession(token: string): Promise<Session | null> {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await getKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      toBuffer(b64urlDecode(sig)),
      toBuffer(encoder.encode(payload)),
    );
    if (!ok) return null;
    return JSON.parse(decoder.decode(b64urlDecode(payload))) as Session;
  } catch {
    return null;
  }
}
