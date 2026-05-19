// GET /api/leads — danh sách saved leads (Supabase hoặc in-memory fallback)
// POST /api/leads — lưu batch từ scan results, dedupe email+domain

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listSavedLeads, saveLeads } from "@/lib/leads/repository";
import { sanitizeApiMessage } from "@/lib/leads/sanitize";
import { serializeLeadsStorageMeta } from "@/lib/leads/types";
import { parseSaveLeadInput } from "@/lib/leads/validate";
import { recordUsageEvent } from "@/lib/usage/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 100;

function jsonError(status: number, error: string, message?: string) {
  return NextResponse.json(
    { error, ...(message ? { message } : {}) },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "unauthorized", "Phiên đăng nhập không hợp lệ.");
  }

  try {
    const result = await listSavedLeads(session.id);
    const { leads, ...meta } = result;
    return NextResponse.json(
      { leads, ...serializeLeadsStorageMeta(meta) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeApiMessage(msg));
  }
}

export async function POST(req: Request) {
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

  const rawLeads =
    body && typeof body === "object" && Array.isArray((body as { leads?: unknown }).leads)
      ? (body as { leads: unknown[] }).leads
      : null;

  if (!rawLeads || rawLeads.length === 0) {
    return jsonError(400, "invalid_input", "Cần mảng leads không rỗng.");
  }

  if (rawLeads.length > MAX_BATCH) {
    return jsonError(
      400,
      "invalid_input",
      `Tối đa ${MAX_BATCH} lead mỗi lần lưu.`,
    );
  }

  const parsed = [];
  for (const item of rawLeads) {
    const lead = parseSaveLeadInput(item);
    if (!lead) {
      return jsonError(
        400,
        "invalid_input",
        "Mỗi lead cần email, domain, confidence (0–100) và status hợp lệ.",
      );
    }
    parsed.push(lead);
  }

  try {
    const result = await saveLeads(session.id, parsed);
    const { saved, duplicates, ...meta } = result;
    if (saved.length > 0) {
      await recordUsageEvent({
        userId: session.id,
        eventType: "saved_lead",
        quantity: saved.length,
        metadata: {
          savedCount: saved.length,
          duplicateCount: duplicates.length,
          source: "api_leads_batch",
        },
      });
    }
    return NextResponse.json(
      {
        savedCount: saved.length,
        duplicateCount: duplicates.length,
        saved,
        duplicates,
        ...serializeLeadsStorageMeta(meta),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonError(500, "internal", sanitizeApiMessage(msg));
  }
}
