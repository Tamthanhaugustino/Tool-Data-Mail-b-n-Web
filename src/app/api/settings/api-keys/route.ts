import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  ApiKeyConfigError,
  listApiKeyStatuses,
  saveApiKey,
} from "@/lib/api-keys/repository";
import { isApiKeyProvider } from "@/lib/api-keys/types";
import { sanitizeApiMessage } from "@/lib/leads/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function messageForConfigError(e: ApiKeyConfigError): string {
  if (e.code === "api_key_encryption_not_configured") {
    return "Chưa cấu hình APP_ENCRYPTION_KEY nên không thể lưu API key cá nhân.";
  }
  if (e.code === "api_keys_store_not_configured") {
    return "Chưa cấu hình Supabase service role nên không thể lưu API key cá nhân.";
  }
  if (e.code === "api_keys_table_missing") {
    return "Chưa apply migration app_user_api_keys.";
  }
  return "Không đọc được API key đã mã hóa. Hãy xóa và lưu lại key.";
}

function isPlausibleApiKey(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 16 && trimmed.length <= 512 && !/\s/.test(trimmed);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phiên đăng nhập không hợp lệ.");
  }

  try {
    const providers = await listApiKeyStatuses(session.id);
    return NextResponse.json(
      { providers },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeApiMessage(msg));
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phiên đăng nhập không hợp lệ.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_input", "Body JSON không hợp lệ.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "invalid_input", "Body phải là object.");
  }

  const { provider, apiKey } = body as Record<string, unknown>;
  if (!isApiKeyProvider(provider)) {
    return jsonError(400, "invalid_input", "Provider phải là hunter hoặc serpapi.");
  }
  if (typeof apiKey !== "string" || !isPlausibleApiKey(apiKey)) {
    return jsonError(
      400,
      "invalid_input",
      "API key phải dài 16-512 ký tự và không chứa khoảng trắng.",
    );
  }

  try {
    const saved = await saveApiKey(session.id, provider, apiKey);
    return NextResponse.json(
      { provider: saved },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof ApiKeyConfigError) {
      return jsonError(409, e.code, messageForConfigError(e));
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeApiMessage(msg));
  }
}

export const POST = PUT;
