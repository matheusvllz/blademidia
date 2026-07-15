import { listServices } from "@blademidia/db";
import { requireSessionPage } from "@/lib/auth";
import { ServicesBoard } from "@/components/services-board";

export default async function ServicosPage() {
  const session = await requireSessionPage();
  const services = await listServices(session.barbershopId);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Serviços</h1>
      <ServicesBoard initialServices={services} />
    </div>
  );
}
