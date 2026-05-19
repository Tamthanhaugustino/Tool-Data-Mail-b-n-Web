const SENSITIVE_KEY_RE =
  /(api[_-]?key|token|secret|authorization|key_ciphertext|ciphertext|password)/i;

function sanitizeString(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/api_key=[^&\s"]+/gi, "api_key=[redacted]")
    .replace(/authorization:\s*bearer\s+[^\s"]+/gi, "authorization: bearer [redacted]")
    .replace(/bearer\s+[A-Za-z0-9._-]{12,}/gi, "bearer [redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]")
    .trim()
    .slice(0, 200);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object" && depth < 3) {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = sanitizeValue(item, depth + 1);
      }
    }
    return output;
  }
  return String(value).slice(0, 120);
}

export function sanitizeUsageMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (!metadata) return null;
  return sanitizeValue(metadata) as Record<string, unknown>;
}

export function sanitizeUsageMessage(message: string): string {
  return sanitizeString(message);
}
