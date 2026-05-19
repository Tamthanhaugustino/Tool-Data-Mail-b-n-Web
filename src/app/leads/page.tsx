import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { listSavedLeads } from "@/lib/leads/store";
import { LeadsContent } from "./leads-content";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await requireSession();
  const initialLeads = listSavedLeads(session.id);
  return (
    <AppShell title="Saved Leads" session={session}>
      <LeadsContent initialLeads={initialLeads} />
    </AppShell>
  );
}
