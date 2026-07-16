import { requireOwnerSessionPage } from "@/lib/auth";
import { RelatoriosView } from "@/components/relatorios-view";

export default async function RelatoriosPage() {
  await requireOwnerSessionPage();
  return <RelatoriosView />;
}
