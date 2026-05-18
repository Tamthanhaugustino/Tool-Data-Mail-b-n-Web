import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DomainScanWizard } from "@/components/scan/domain-scan-wizard";
import { requireSession } from "@/lib/auth/session";
import { parseDomainsQueryParam } from "@/lib/discovery/scan-transfer";

type ScanPageProps = {
  searchParams: Promise<{ domains?: string }>;
};

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const session = await requireSession();
  const { domains: domainsParam } = await searchParams;
  const initialDomains = parseDomainsQueryParam(domainsParam);

  return (
    <AppShell title="Domain Scan" session={session}>
      <PageHeader
        title="Domain Scan"
        subtitle="Nhập danh sách domain để tìm email liên hệ. Hunter.io sẽ quét từng domain."
      />
      <DomainScanWizard initialDomains={initialDomains} fromDiscovery={Boolean(initialDomains)} />
    </AppShell>
  );
}
