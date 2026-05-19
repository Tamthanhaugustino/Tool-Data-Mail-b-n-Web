// DELETE /api/leads/[id] — xóa một saved lead (in-memory, per user)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteSavedLead } from "@/lib/leads/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", message: "Phiên đăng nhập không hợp lệ." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "invalid_input", message: "Thiếu id lead." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const deleted = deleteSavedLead(session.id, id);
  if (!deleted) {
    return NextResponse.json(
      { error: "not_found", message: "Không tìm thấy lead hoặc đã bị xóa." },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "cache-control": "no-store" } },
  );
}
