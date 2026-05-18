// Provider dispatch for Keyword Discovery.
//
// Phase 07 ships only the mock provider. When the SerpAPI provider lands
// in Phase 08+, this is the single place that decides which provider to
// use — based on env vars / feature flags / user setting. The API route
// and the /discover page consume `getDiscoveryProvider()` and never
// import a concrete provider directly.

import { mockDiscoveryProvider } from "./mock-provider";
import type { DiscoveryProvider } from "./types";

export function getDiscoveryProvider(): DiscoveryProvider {
  return mockDiscoveryProvider;
}

export type {
  DiscoveryProvider,
  DiscoveryProviderName,
  DiscoveryRequest,
  DiscoveryResponse,
  DiscoveryResultItem,
  DiscoveryResultStatus,
  DiscoveryRunStatus,
  DiscoveryRunSummary,
} from "./types";
