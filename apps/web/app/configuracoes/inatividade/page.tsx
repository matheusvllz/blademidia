import { requireOwnerSessionPage } from "@/lib/auth";
import { InactivityConfigForm } from "@/components/inactivity-config-form";

export default async function InatividadePage() {
  await requireOwnerSessionPage();
  return <InactivityConfigForm />;
}
