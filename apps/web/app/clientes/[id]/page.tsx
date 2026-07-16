import {
  getBarber,
  getClient,
  getInactivityThreshold,
  getLoyaltyStatus,
  getService,
  isClientInactive,
  listUpcomingForClient,
  listVisitsForClient,
} from "@blademidia/db";
import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth";
import { ClientProfileActions } from "@/components/client-profile-actions";
import { LoyaltyCard } from "@/components/loyalty-card";
import { NextAppointmentCard, type NextAppointmentInfo } from "@/components/next-appointment-card";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? `***${digits}` : `***${digits.slice(-4)}`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSessionPage();

  const client = await getClient(session.barbershopId, id);
  if (!client) {
    notFound();
  }

  const [visits, threshold, upcoming, loyaltyStatus] = await Promise.all([
    listVisitsForClient(session.barbershopId, id),
    getInactivityThreshold(session.barbershopId),
    listUpcomingForClient(session.barbershopId, id, new Date()),
    getLoyaltyStatus(session.barbershopId, id),
  ]);

  const lastVisit = visits[0] ?? null;
  const inactive = isClientInactive(lastVisit?.occurredAt ?? null, threshold);

  const nextAppointmentRow = upcoming[0] ?? null;
  let nextAppointment: NextAppointmentInfo | null = null;
  if (nextAppointmentRow) {
    const [service, barber] = await Promise.all([
      getService(session.barbershopId, nextAppointmentRow.serviceId),
      getBarber(session.barbershopId, nextAppointmentRow.barberId),
    ]);
    nextAppointment = {
      serviceName: service?.name ?? "(serviço removido)",
      barberName: barber?.name ?? "(barbeiro removido)",
      startsAt: nextAppointmentRow.startsAt,
    };
  }

  // "Evolução do cliente" (premissa do design — validar layout com Vítor):
  // frequência média entre visitas, a partir do histórico existente.
  let averageIntervalDays: number | null = null;
  if (visits.length >= 2) {
    const sorted = [...visits].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    const first = sorted[0]!.occurredAt.getTime();
    const last = sorted[sorted.length - 1]!.occurredAt.getTime();
    averageIntervalDays = Math.round((last - first) / (1000 * 60 * 60 * 24) / (sorted.length - 1));
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-black uppercase text-ink">
            {client.name ?? "(cliente sem nome)"}
          </h1>
          <p className="font-mono text-sm text-wire">{maskPhone(client.phone)}</p>
        </div>
        <span className={inactive ? "badge-inativo" : "badge-ativo"}>
          {inactive ? "Inativo" : "Ativo"}
        </span>
      </div>

      {client.notes && (
        <p className="card-blade mb-6 text-sm text-steel">{client.notes}</p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card-blade">
          <p className="label-blade mb-1">Total de atendimentos</p>
          <p className="font-display text-3xl font-black text-ink">{visits.length}</p>
        </div>
        <div className="card-blade">
          <p className="label-blade mb-1">Última visita</p>
          <p className="font-display text-xl font-bold text-ink">
            {lastVisit ? formatDate(lastVisit.occurredAt) : "nunca veio"}
          </p>
        </div>
        <div className="card-blade">
          <p className="label-blade mb-1">Frequência média</p>
          <p className="font-display text-xl font-bold text-ink">
            {averageIntervalDays != null ? `a cada ${averageIntervalDays} dias` : "—"}
          </p>
        </div>
        <NextAppointmentCard appointment={nextAppointment} />
        <LoyaltyCard clientId={client.id} status={loyaltyStatus} />
      </div>

      <ClientProfileActions clientId={client.id} />

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">
          Histórico de atendimentos
        </h2>
        {visits.length === 0 ? (
          <p className="text-steel">Nenhum atendimento registrado ainda para este cliente.</p>
        ) : (
          <ul className="space-y-2">
            {visits.map((visit) => (
              <li key={visit.id} className="card-blade flex items-center justify-between">
                <div>
                  <p className="font-body font-medium text-ink">{visit.serviceLabel}</p>
                  {visit.staffLabel && (
                    <p className="font-mono text-xs text-wire">com {visit.staffLabel}</p>
                  )}
                </div>
                <span className="font-mono text-xs text-wire">
                  {formatDate(visit.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
