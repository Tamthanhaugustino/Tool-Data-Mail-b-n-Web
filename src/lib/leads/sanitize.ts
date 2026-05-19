/** Làm sạch message lỗi API — không lộ secret/token/url. */
export function sanitizeApiMessage(message: string): string {
  return message
    .replace(/\s+/g, " ")
    .replace(/api_key=[^&\s"]+/gi, "api_key=[redacted]")
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]")
    .trim()
    .slice(0, 200);
}
