"use client";

import { AppointmentStatusBadge } from "./appointment-status-badge";

export interface WeekGridAppointment {
  id: string;
  clientName: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  startsAt: string;
  status: string;
}

interface Props {
  appointments: WeekGridAppointment[];
  showBarberName: boolean;
  onSelectAppointment: (id: string) => void;
  onCreateAt: () => void;
}

/** Célula da grade semanal: 1+ cards (modo consolidado) ou vazia e clicável. */
export function AgendaWeekGridCell({ appointments, showBarberName, onSelectAppointment, onCreateAt }: Props) {
  if (appointments.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreateAt}
        className="flex h-full min-h-[3rem] w-full items-center justify-center rounded border border-dashed border-steel/15 text-wire transition hover:border-gold hover:text-gold"
        aria-label="Criar agendamento neste horário"
      >
        +
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {appointments.map((appt) => (
        <button
          key={appt.id}
          type="button"
          onClick={() => onSelectAppointment(appt.id)}
          className="card-blade block w-full p-2 text-left hover:border-gold"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-xs font-medium text-ink">{appt.clientName}</span>
            <AppointmentStatusBadge status={appt.status} />
          </div>
          <p className="truncate text-[11px] text-steel">
            {appt.serviceName}
            {showBarberName && ` · ${appt.barberName}`}
          </p>
        </button>
      ))}
    </div>
  );
}
