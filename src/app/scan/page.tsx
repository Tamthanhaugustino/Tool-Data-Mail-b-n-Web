import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DomainScanWizard } from "@/components/scan/domain-scan-wizard";
import { requireSession } from "@/lib/auth/session";

export default async function ScanPage() {
  const session = await requireSession();
  return (
    <AppShell title="Domain Scan" session={session}>
      <PageHeader
        title="Domain Scan"
        subtitle="Nhập danh sách domain để tìm email liên hệ. Hunter.io sẽ quét từng domain."
      />
      <DomainScanWizard />
    </AppShell>
  );
}
