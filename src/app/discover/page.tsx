import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { DiscoverContent } from "./discover-content";

export default async function DiscoverPage() {
  const session = await requireSession();
  return (
    <AppShell title="Keyword Discovery" session={session}>
      <DiscoverContent />
    </AppShell>
  );
}
