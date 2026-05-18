import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DomainScanWizard } from "@/components/scan/domain-scan-wizard";

export default function ScanPage() {
  return (
    <AppShell title="Domain Scan">
      <PageHeader
        title="Domain Scan"
        subtitle="Nhập danh sách domain để tìm email liên hệ. Hunter.io sẽ quét từng domain."
      />
      <DomainScanWizard />
    </AppShell>
  );
}
