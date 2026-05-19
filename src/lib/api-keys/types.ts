export const API_KEY_PROVIDERS = ["hunter", "serpapi"] as const;

export type ApiKeyProvider = (typeof API_KEY_PROVIDERS)[number];

export type ApiKeyStatus = {
  provider: ApiKeyProvider;
  label: string;
  hasUserKey: boolean;
  keyHint: string | null;
  maskedKey: string | null;
  serverFallbackAvailable: boolean;
  encryptionConfigured: boolean;
};

export function isApiKeyProvider(value: unknown): value is ApiKeyProvider {
  return (
    typeof value === "string" &&
    (API_KEY_PROVIDERS as readonly string[]).includes(value)
  );
}

export function providerLabel(provider: ApiKeyProvider): string {
  return provider === "hunter" ? "Hunter.io" : "SerpAPI";
}
