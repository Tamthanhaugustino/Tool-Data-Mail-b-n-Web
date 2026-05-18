import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { ResultsContent } from "./results-content";

export default async function ResultsPage() {
  const session = await requireSession();
  return (
    <AppShell title="Results" breadcrumb={{ parent: "Domain Scan", current: "Results" }} session={session}>
      <ResultsContent />
    </AppShell>
  );
}
