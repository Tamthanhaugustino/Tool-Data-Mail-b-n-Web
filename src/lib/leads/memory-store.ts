import type { SaveLeadInput, SaveLeadsResult, SavedLeadRecord } from "./types";

const STORE_KEY = Symbol.for("tool-data-mail.savedLeads");

type StoreMap = Map<string, SavedLeadRecord[]>;

function getStore(): StoreMap {
  const g = globalThis as typeof globalThis & { [key: symbol]: StoreMap | undefined };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY]!;
}

export function leadDedupeKey(email: string, domain: string): string {
  return `${email.trim().toLowerCase()}|${domain.trim().toLowerCase()}`;
}

export function listSavedLeadsMemory(userId: string): SavedLeadRecord[] {
  const list = getStore().get(userId) ?? [];
  return [...list].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function saveLeadsMemory(userId: string, inputs: SaveLeadInput[]): SaveLeadsResult {
  const store = getStore();
  const list = store.get(userId) ?? [];
  const existing = new Set(list.map((l) => leadDedupeKey(l.email, l.domain)));

  const saved: SavedLeadRecord[] = [];
  const duplicates: Array<{ email: string; domain: string }> = [];

  for (const input of inputs) {
    const key = leadDedupeKey(input.email, input.domain);
    if (existing.has(key)) {
      duplicates.push({ email: input.email.trim(), domain: input.domain.trim() });
      continue;
    }
    const record: SavedLeadRecord = {
      id: crypto.randomUUID(),
      userId,
      email: input.email.trim(),
      name: input.name.trim() || "—",
      title: input.title.trim() || "—",
      company: input.company.trim() || "—",
      domain: input.domain.trim().toLowerCase(),
      confidence: input.confidence,
      status: input.status,
      source: (input.source ?? "unknown").trim() || "unknown",
      savedAt: new Date().toISOString(),
    };
    list.push(record);
    existing.add(key);
    saved.push(record);
  }

  store.set(userId, list);
  return { saved, duplicates };
}

export function deleteSavedLeadMemory(userId: string, leadId: string): boolean {
  const store = getStore();
  const list = store.get(userId);
  if (!list) return false;
  const idx = list.findIndex((l) => l.id === leadId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  store.set(userId, list);
  return true;
}
