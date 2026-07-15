import Link from "next/link";

export interface NextAppointmentInfo {
  serviceName: string;
  barberName: string;
  startsAt: Date;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NextAppointmentCard({ appointment }: { appointment: NextAppointmentInfo | null }) {
  return (
    <div className="card-blade">
      <p className="label-blade mb-1">Próximo agendamento</p>
      {appointment ? (
        <>
          <p className="font-display text-lg font-bold text-ink">{formatDateTime(appointment.startsAt)}</p>
          <p className="text-sm text-steel">
            {appointment.serviceName} · {appointment.barberName}
          </p>
        </>
      ) : (
        <>
          <p className="mb-2 text-sm text-steel">Nenhum agendamento futuro.</p>
          <Link href="/agenda" className="btn-secondary inline-flex text-sm">
            Agendar
          </Link>
        </>
      )}
    </div>
  );
}
