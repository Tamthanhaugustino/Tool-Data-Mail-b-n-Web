import type {
  ScanDomainSummary,
  ScanProviderName,
  ScanResultItem,
} from "@/lib/scan";

export type ScanJobStatus = "completed" | "partial" | "failed";
export type ScanJobsStorageBackend = "supabase" | "memory" | "none";
export type ScanJobsStorageReason =
  | "not_configured"
  | "table_missing"
  | "write_failed";

export type ScanJobsOperationMeta = {
  scanStorage: ScanJobsStorageBackend;
  scanStorageFallback?: boolean;
  scanStorageReason?: ScanJobsStorageReason;
};

export type CreateScanJobInput = {
  userId: string;
  provider: ScanProviderName;
  status: ScanJobStatus;
  inputDomains: string[];
  emailLimitPerDomain?: number;
  totalDomains: number;
  scannedDomains: number;
  totalEmails: number;
  durationMs?: number;
  errorMessage?: string;
  domainSummaries?: ScanDomainSummary[];
  results: ScanResultItem[];
};

export type ScanJobRecord = {
  id: string;
  userId: string;
  provider: ScanProviderName;
  status: ScanJobStatus;
  inputDomains: string[];
  emailLimitPerDomain: number | null;
  totalDomains: number;
  scannedDomains: number;
  totalEmails: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScanJobResultRecord = {
  id: string;
  jobId: string;
  userId: string;
  email: string;
  name: string;
  title: string;
  company: string;
  domain: string;
  confidence: number;
  status: ScanResultItem["status"];
  source: string;
  provider: ScanProviderName;
  createdAt: string;
};

export type PersistScanJobResult = ScanJobsOperationMeta & {
  job: ScanJobRecord | null;
};

export type ListScanJobsResult = ScanJobsOperationMeta & {
  jobs: ScanJobRecord[];
};

export type GetScanJobResult = ScanJobsOperationMeta & {
  job: ScanJobRecord | null;
  results: ScanJobResultRecord[];
};

export function serializeScanJobsStorageMeta(
  meta: ScanJobsOperationMeta,
): ScanJobsOperationMeta {
  return {
    scanStorage: meta.scanStorage,
    ...(meta.scanStorageFallback ? { scanStorageFallback: true } : {}),
    ...(meta.scanStorageReason ? { scanStorageReason: meta.scanStorageReason } : {}),
  };
}
