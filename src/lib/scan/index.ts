// Public surface for Domain Scan (Phase 08C).
//
// Re-exports the client-safe pieces (types, domain normalization, mock
// provider, scan-transfer helpers consumed by /discover). The Hunter
// provider (Phase 09) will live in a separate file with `import
// "server-only"` and will be dynamically imported from the API route.

import { mockScanProvider } from "./mock-provider";
import type { ScanProvider } from "./types";

/** Default provider — Phase 08C ships mock only. */
export function getScanProvider(): ScanProvider {
  return mockScanProvider;
}

export { normalizeDomains, normalizeDomain } from "./domain-utils";
export type { NormalizeOutcome } from "./domain-utils";

export type {
  ScanDomainSummary,
  ScanProvider,
  ScanProviderName,
  ScanRequest,
  ScanResponse,
  ScanResultItem,
  ScanResultStatus,
  ScanRunStatus,
  ScanRunSummary,
} from "./types";
