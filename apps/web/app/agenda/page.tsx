import { instantToZonedDateISO } from "@blademidia/core";
import { getBarbershop, listAppointments, listBarbers, listClients, listServices } from "@blademidia/db";
import { requireSessionPage } from "@/lib/auth";
import { AgendaBoard } from "@/components/agenda-board";
import type { AppointmentSummary } from "@/components/appointment-block";
import type { AppointmentDetail } from "@/components/appointment-detail-panel";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const session = await requireSessionPage();
  const { date: dateParam } = await searchParams;

  const [shop, barbers, services, clients] = await Promise.all([
    getBarbershop(session.barbershopId),
    listBarbers(session.barbershopId, { onlyActive: true }),
    listServices(session.barbershopId, { onlyActive: true }),
    listClients(session.barbershopId),
  ]);

  const timezone = shop?.timezone ?? "America/Sao_Paulo";
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : instantToZonedDateISO(new Date(), timezone);

  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 48 * 60 * 60 * 1000); // janela larga; filtramos por dia local abaixo via string
  const appointments = await listAppointments(session.barbershopId, { from, to });

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const barberById = new Map(barbers.map((b) => [b.id, b]));

  const detailsById: Record<string, AppointmentDetail> = {};
  const barberColumns: { id: string; name: string; appointments: AppointmentSummary[] }[] = barbers.map(
    (barber) => ({ id: barber.id, name: barber.name, appointments: [] }),
  );
  const columnByBarberId = new Map(barberColumns.map((c) => [c.id, c]));

  for (const appt of appointments) {
    // filtra pelo dia local exato (a janela de 48h acima cobre a borda de fuso)
    const localDate = instantToZonedDateISO(appt.startsAt, timezone);
    if (localDate !== date) continue;

    const client = clientById.get(appt.clientId);
    const service = serviceById.get(appt.serviceId);
    const barber = barberById.get(appt.barberId);
    const summary = {
      id: appt.id,
      clientName: client?.name ?? "(sem nome)",
      serviceName: service?.name ?? "(serviço removido)",
      barberId: appt.barberId,
      startsAt: appt.startsAt.toISOString(),
      endsAt: appt.endsAt.toISOString(),
      status: appt.status,
    };
    detailsById[appt.id] = {
      ...summary,
      serviceId: appt.serviceId,
      barberName: barber?.name ?? "(barbeiro removido)",
    };
    columnByBarberId.get(appt.barberId)?.appointments.push(summary);
  }

  for (const col of barberColumns) {
    col.appointments.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Agenda</h1>
      <AgendaBoard
        date={date}
        barberColumns={barberColumns}
        clients={clients}
        services={services}
        barbers={barbers}
        detailsById={detailsById}
      />
    </div>
  );
}
