import { listBarbers } from "@blademidia/db";
import { requireOwnerSessionPage } from "@/lib/auth";
import { BarbersBoard } from "@/components/barbers-board";

export default async function BarbeirosPage() {
  const session = await requireOwnerSessionPage();
  const barbers = await listBarbers(session.barbershopId);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">
        Barbeiros & Horários
      </h1>
      <BarbersBoard initialBarbers={barbers} />
    </div>
  );
}
