import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { HistoryContent } from "./history-content";

export default async function HistoryPage() {
  const session = await requireSession();
  return (
    <AppShell title="Scan History" session={session}>
      <HistoryContent />
    </AppShell>
  );
}
