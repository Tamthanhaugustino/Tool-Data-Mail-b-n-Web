import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getScanJob } from "@/lib/scan-jobs/repository";
import { sanitizeScanJobMessage } from "@/lib/scan-jobs/sanitize";
import { serializeScanJobsStorageMeta } from "@/lib/scan-jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phien dang nhap khong hop le.");
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return jsonError(400, "invalid_input", "Job id khong hop le.");
  }

  try {
    const result = await getScanJob(session.id, id);
    if (!result.job) {
      return jsonError(404, "not_found", "Khong tim thay scan job.");
    }

    const { job, results, ...meta } = result;
    return NextResponse.json(
      { job, results, ...serializeScanJobsStorageMeta(meta) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeScanJobMessage(msg));
  }
}
