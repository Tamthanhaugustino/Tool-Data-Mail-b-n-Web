import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUsageSummary } from "@/lib/usage/repository";
import { sanitizeUsageMessage } from "@/lib/usage/sanitize";
import { serializeUsageStorageMeta } from "@/lib/usage/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function parseDays(url: string): number | undefined {
  const raw = new URL(url).searchParams.get("days");
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
    const result = await getUsageSummary(session.id, parseDays(req.url));
    const { totals, days, ...meta } = result;
    return NextResponse.json(
      { days, totals, ...serializeUsageStorageMeta(meta) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeUsageMessage(msg));
  }
}
