import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  decryptApiKey,
  encryptApiKey,
  isApiKeyEncryptionConfigured,
} from "./crypto";
import {
  API_KEY_PROVIDERS,
  type ApiKeyProvider,
  type ApiKeyStatus,
  providerLabel,
} from "./types";

const TABLE = "app_user_api_keys";

type ApiKeyRow = {
  id: string;
  user_id: string;
  provider: ApiKeyProvider;
  key_ciphertext: string;
  key_hint: string | null;
  created_at: string;
  updated_at: string;
};

export class ApiKeyConfigError extends Error {
  constructor(
    public code:
      | "api_keys_store_not_configured"
      | "api_keys_table_missing"
      | "api_key_encryption_not_configured"
      | "api_key_decrypt_failed",
  ) {
    super(code);
    this.name = "ApiKeyConfigError";
  }
}

function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (msg.includes(TABLE) &&
      (msg.includes("does not exist") ||
        msg.includes("could not find") ||
        msg.includes("schema cache")))
  );
}

function maskFromHint(hint: string | null): string | null {
  return hint ? `****${hint}` : null;
}

function getServerFallbackAvailable(provider: ApiKeyProvider): boolean {
  return provider === "hunter"
    ? Boolean(process.env.HUNTER_API_KEY)
    : Boolean(process.env.SERPAPI_API_KEY);
}

function keyHint(apiKey: string): string {
  return apiKey.trim().slice(-4);
}

function assertCanPersist() {
  if (!isApiKeyEncryptionConfigured()) {
    throw new ApiKeyConfigError("api_key_encryption_not_configured");
  }
  if (!getSupabaseAdminClient()) {
    throw new ApiKeyConfigError("api_keys_store_not_configured");
  }
}

export async function listApiKeyStatuses(userId: string): Promise<ApiKeyStatus[]> {
  const encryptionConfigured = isApiKeyEncryptionConfigured();
  const base = API_KEY_PROVIDERS.map((provider) => ({
    provider,
    label: providerLabel(provider),
    hasUserKey: false,
    keyHint: null,
    maskedKey: null,
    serverFallbackAvailable: getServerFallbackAvailable(provider),
    encryptionConfigured,
  }));

  const client = getSupabaseAdminClient();
  if (!client) return base;

  const { data, error } = await client
    .from(TABLE)
    .select("provider, key_hint")
    .eq("user_id", userId);

  if (error) {
    if (isTableMissing(error)) return base;
    throw error;
  }

  const rows = (data ?? []) as Pick<ApiKeyRow, "provider" | "key_hint">[];
  return base.map((item) => {
    const row = rows.find((r) => r.provider === item.provider);
    return row
      ? {
          ...item,
          hasUserKey: true,
          keyHint: row.key_hint,
          maskedKey: maskFromHint(row.key_hint),
        }
      : item;
  });
}

export async function saveApiKey(
  userId: string,
  provider: ApiKeyProvider,
  apiKey: string,
): Promise<ApiKeyStatus> {
  assertCanPersist();
  const client = getSupabaseAdminClient();
  if (!client) throw new ApiKeyConfigError("api_keys_store_not_configured");

  const trimmed = apiKey.trim();
  const encrypted = encryptApiKey(trimmed);
  const hint = keyHint(trimmed);

  const { error } = await client
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        provider,
        key_ciphertext: encrypted,
        key_hint: hint,
      },
      { onConflict: "user_id,provider" },
    );

  if (error) {
    if (isTableMissing(error)) throw new ApiKeyConfigError("api_keys_table_missing");
    throw error;
  }

  return {
    provider,
    label: providerLabel(provider),
    hasUserKey: true,
    keyHint: hint,
    maskedKey: maskFromHint(hint),
    serverFallbackAvailable: getServerFallbackAvailable(provider),
    encryptionConfigured: true,
  };
}

export async function deleteApiKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<boolean> {
  const client = getSupabaseAdminClient();
  if (!client) throw new ApiKeyConfigError("api_keys_store_not_configured");

  const { data, error } = await client
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider)
    .select("id");

  if (error) {
    if (isTableMissing(error)) throw new ApiKeyConfigError("api_keys_table_missing");
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function getDecryptedApiKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  if (!isApiKeyEncryptionConfigured()) return null;
  const client = getSupabaseAdminClient();
  if (!client) return null;

  const { data, error } = await client
    .from(TABLE)
    .select("key_ciphertext")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    if (isTableMissing(error)) return null;
    throw error;
  }
  if (!data) return null;

  try {
    return decryptApiKey((data as Pick<ApiKeyRow, "key_ciphertext">).key_ciphertext);
  } catch {
    throw new ApiKeyConfigError("api_key_decrypt_failed");
  }
}

export function getEnvApiKey(provider: ApiKeyProvider): string | null {
  const value =
    provider === "hunter"
      ? process.env.HUNTER_API_KEY
      : process.env.SERPAPI_API_KEY;
  return value?.trim() || null;
}

export async function resolveProviderApiKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<{ apiKey: string | null; source: "user" | "env" | "none"; userKeyError?: string }> {
  try {
    const userKey = await getDecryptedApiKey(userId, provider);
    if (userKey) return { apiKey: userKey, source: "user" };
  } catch (e) {
    const envKey = getEnvApiKey(provider);
    if (envKey) {
      return {
        apiKey: envKey,
        source: "env",
        userKeyError: e instanceof ApiKeyConfigError ? e.code : "api_key_decrypt_failed",
      };
    }
    throw e;
  }

  const envKey = getEnvApiKey(provider);
  if (envKey) return { apiKey: envKey, source: "env" };
  return { apiKey: null, source: "none" };
}
