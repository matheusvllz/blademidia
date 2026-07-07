import { listClients } from "@blademidia/db";
import { requireSessionPage } from "@/lib/auth";
import { ClientsBoard } from "@/components/clients-board";

export default async function ClientesPage() {
  const session = await requireSessionPage();
  const clients = await listClients(session.barbershopId);

  const serializable = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Clientes</h1>
      <ClientsBoard initialClients={serializable} />
    </div>
  );
}
