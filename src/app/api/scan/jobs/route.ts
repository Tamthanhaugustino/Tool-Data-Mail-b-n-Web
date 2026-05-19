import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listScanJobs } from "@/lib/scan-jobs/repository";
import { sanitizeScanJobMessage } from "@/lib/scan-jobs/sanitize";
import { serializeScanJobsStorageMeta } from "@/lib/scan-jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function parseLimit(url: string): number | undefined {
  const raw = new URL(url).searchParams.get("limit");
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phien dang nhap khong hop le.");
  }

  try {
    const result = await listScanJobs(session.id, parseLimit(req.url));
    const { jobs, ...meta } = result;
    return NextResponse.json(
      { jobs, ...serializeScanJobsStorageMeta(meta) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeScanJobMessage(msg));
  }
}
