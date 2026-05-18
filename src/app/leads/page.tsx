import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { LeadsContent } from "./leads-content";

export default async function LeadsPage() {
  const session = await requireSession();
  return (
    <AppShell title="Saved Leads" session={session}>
      <LeadsContent />
    </AppShell>
  );
}
