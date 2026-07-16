import { requireOwnerSessionPage } from "@/lib/auth";
import { AgendaConfigForm } from "@/components/agenda-config-form";

export default async function AgendaConfigPage() {
  await requireOwnerSessionPage();
  return <AgendaConfigForm />;
}
