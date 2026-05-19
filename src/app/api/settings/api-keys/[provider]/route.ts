import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  ApiKeyConfigError,
  deleteApiKey,
} from "@/lib/api-keys/repository";
import { isApiKeyProvider } from "@/lib/api-keys/types";
import { sanitizeApiMessage } from "@/lib/leads/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ provider: string }> };

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phiên đăng nhập không hợp lệ.");
  }

  const { provider } = await context.params;
  if (!isApiKeyProvider(provider)) {
    return jsonError(400, "invalid_input", "Provider phải là hunter hoặc serpapi.");
  }

  try {
    const deleted = await deleteApiKey(session.id, provider);
    if (!deleted) {
      return jsonError(404, "not_found", "Không tìm thấy API key cần xóa.");
    }
    return NextResponse.json(
      { ok: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof ApiKeyConfigError) {
      return jsonError(409, e.code, "API key store chưa sẵn sàng.");
    }
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeApiMessage(msg));
  }
}
