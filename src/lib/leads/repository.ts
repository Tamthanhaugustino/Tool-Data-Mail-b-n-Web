import "server-only";

import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  deleteSavedLeadMemory,
  listSavedLeadsMemory,
  saveLeadsMemory,
} from "./memory-store";
import {
  deleteSavedLeadSupabase,
  listSavedLeadsSupabase,
  probeSupabaseLeadsTable,
  saveLeadsSupabase,
} from "./supabase-store";
import type {
  LeadsStorageBackend,
  SaveLeadInput,
  SaveLeadsResult,
  SavedLeadRecord,
  SavedLeadsOperationMeta,
} from "./types";

export function isSupabaseLeadsConfigured(): boolean {
  return hasSupabaseServiceRoleEnv();
}

/** Backend dự kiến từ env (không probe DB). */
export function getConfiguredLeadsStorageBackend(): LeadsStorageBackend {
  return isSupabaseLeadsConfigured() ? "supabase" : "memory";
}

type ResolvedLeadsStorage = {
  useSupabase: boolean;
} & SavedLeadsOperationMeta;

async function resolveLeadsStorage(): Promise<ResolvedLeadsStorage> {
  if (!isSupabaseLeadsConfigured()) {
    return {
      useSupabase: false,
      storage: "memory",
      storageReason: "not_configured",
    };
  }

  const tableOk = await probeSupabaseLeadsTable();
  if (tableOk) {
    return { useSupabase: true, storage: "supabase" };
  }

  return {
    useSupabase: false,
    storage: "memory",
    storageFallback: true,
    storageReason: "table_missing",
  };
}

function tableMissingFallbackMeta(): SavedLeadsOperationMeta {
  return {
    storage: "memory",
    storageFallback: true,
    storageReason: "table_missing",
  };
}

function isTableMissingError(e: unknown): boolean {
  return e instanceof Error && e.message === "supabase_table_missing";
}

export async function listSavedLeads(
  userId: string,
): Promise<SavedLeadsOperationMeta & { leads: SavedLeadRecord[] }> {
  const resolved = await resolveLeadsStorage();

  if (resolved.useSupabase) {
    try {
      const leads = await listSavedLeadsSupabase(userId);
      return { leads, storage: "supabase" };
    } catch (e) {
      if (isTableMissingError(e)) {
        return {
          leads: listSavedLeadsMemory(userId),
          ...tableMissingFallbackMeta(),
        };
      }
      throw e;
    }
  }

  return {
    leads: listSavedLeadsMemory(userId),
    storage: resolved.storage,
    ...(resolved.storageFallback ? { storageFallback: true } : {}),
    ...(resolved.storageReason ? { storageReason: resolved.storageReason } : {}),
  };
}

export async function saveLeads(
  userId: string,
  inputs: SaveLeadInput[],
): Promise<SaveLeadsResult & SavedLeadsOperationMeta> {
  const resolved = await resolveLeadsStorage();

  if (resolved.useSupabase) {
    try {
      const result = await saveLeadsSupabase(userId, inputs);
      return { ...result, storage: "supabase" };
    } catch (e) {
      if (isTableMissingError(e)) {
        const result = saveLeadsMemory(userId, inputs);
        return { ...result, ...tableMissingFallbackMeta() };
      }
      throw e;
    }
  }

  const result = saveLeadsMemory(userId, inputs);
  return {
    ...result,
    storage: resolved.storage,
    ...(resolved.storageFallback ? { storageFallback: true } : {}),
    ...(resolved.storageReason ? { storageReason: resolved.storageReason } : {}),
  };
}

export async function deleteSavedLead(
  userId: string,
  leadId: string,
): Promise<{ deleted: boolean } & SavedLeadsOperationMeta> {
  const resolved = await resolveLeadsStorage();

  if (resolved.useSupabase) {
    try {
      const deleted = await deleteSavedLeadSupabase(userId, leadId);
      return { deleted, storage: "supabase" };
    } catch (e) {
      if (isTableMissingError(e)) {
        return {
          deleted: deleteSavedLeadMemory(userId, leadId),
          ...tableMissingFallbackMeta(),
        };
      }
      throw e;
    }
  }

  return {
    deleted: deleteSavedLeadMemory(userId, leadId),
    storage: resolved.storage,
    ...(resolved.storageFallback ? { storageFallback: true } : {}),
    ...(resolved.storageReason ? { storageReason: resolved.storageReason } : {}),
  };
}
