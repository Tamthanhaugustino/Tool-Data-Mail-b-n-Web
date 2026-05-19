import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { ResultsContent } from "./results-content";

type ResultsPageProps = {
  searchParams: Promise<{ jobId?: string }>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const session = await requireSession();
  const { jobId } = await searchParams;
  return (
    <AppShell title="Results" breadcrumb={{ parent: "Domain Scan", current: "Results" }} session={session}>
      <ResultsContent jobId={jobId} />
    </AppShell>
  );
}
