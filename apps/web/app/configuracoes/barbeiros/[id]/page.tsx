import {
  getBarber,
  getBarberServiceIds,
  listExceptionsForBarber,
  listServices,
  listWorkSchedules,
} from "@blademidia/db";
import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth";
import { BarberDetail } from "@/components/barber-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function BarberDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSessionPage();

  const barber = await getBarber(session.barbershopId, id);
  if (!barber) notFound();

  const [schedule, services, serviceIds, exceptions] = await Promise.all([
    listWorkSchedules(session.barbershopId, id),
    listServices(session.barbershopId, { onlyActive: true }),
    getBarberServiceIds(session.barbershopId, id),
    listExceptionsForBarber(session.barbershopId, id, todayISO(), addDaysISO(90)),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">{barber.name}</h1>
      <BarberDetail
        barberId={id}
        initialSchedule={schedule}
        services={services}
        initialServiceIds={serviceIds}
        initialExceptions={exceptions}
      />
    </div>
  );
}
