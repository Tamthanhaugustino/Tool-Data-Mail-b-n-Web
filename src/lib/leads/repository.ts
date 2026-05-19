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

async function shouldUseSupabase(): Promise<boolean> {
  if (!isSupabaseLeadsConfigured()) return false;
  return probeSupabaseLeadsTable();
}

export async function listSavedLeads(
  userId: string,
): Promise<SavedLeadsOperationMeta & { leads: SavedLeadRecord[] }> {
  if (await shouldUseSupabase()) {
    try {
      const leads = await listSavedLeadsSupabase(userId);
      return { leads, storage: "supabase" };
    } catch (e) {
      if (e instanceof Error && e.message === "supabase_table_missing") {
        return {
          leads: listSavedLeadsMemory(userId),
          storage: "memory",
          storageFallback: true,
        };
      }
      throw e;
    }
  }
  return { leads: listSavedLeadsMemory(userId), storage: "memory" };
}

export async function saveLeads(
  userId: string,
  inputs: SaveLeadInput[],
): Promise<SaveLeadsResult & SavedLeadsOperationMeta> {
  if (await shouldUseSupabase()) {
    try {
      const result = await saveLeadsSupabase(userId, inputs);
      return { ...result, storage: "supabase" };
    } catch (e) {
      if (e instanceof Error && e.message === "supabase_table_missing") {
        const result = saveLeadsMemory(userId, inputs);
        return { ...result, storage: "memory", storageFallback: true };
      }
      throw e;
    }
  }
  const result = saveLeadsMemory(userId, inputs);
  return { ...result, storage: "memory" };
}

export async function deleteSavedLead(
  userId: string,
  leadId: string,
): Promise<{ deleted: boolean } & SavedLeadsOperationMeta> {
  if (await shouldUseSupabase()) {
    try {
      const deleted = await deleteSavedLeadSupabase(userId, leadId);
      return { deleted, storage: "supabase" };
    } catch (e) {
      if (e instanceof Error && e.message === "supabase_table_missing") {
        return {
          deleted: deleteSavedLeadMemory(userId, leadId),
          storage: "memory",
          storageFallback: true,
        };
      }
      throw e;
    }
  }
  return { deleted: deleteSavedLeadMemory(userId, leadId), storage: "memory" };
}
