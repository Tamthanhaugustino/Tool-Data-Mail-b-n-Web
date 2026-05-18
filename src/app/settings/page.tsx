import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/session";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <AppShell title="Settings" breadcrumb={{ parent: "Account", current: "Settings" }} session={session}>
      <SettingsContent session={session} />
    </AppShell>
  );
}
