/**
 * @deprecated Import from `@/lib/leads/repository` — giữ re-export tương thích.
 */
export { leadDedupeKey } from "./memory-store";
export {
  deleteSavedLead,
  getConfiguredLeadsStorageBackend,
  isSupabaseLeadsConfigured,
  listSavedLeads,
  saveLeads,
} from "./repository";
