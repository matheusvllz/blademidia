"use client";

import { AppointmentStatusBadge } from "./appointment-status-badge";

export interface AppointmentSummary {
  id: string;
  clientName: string;
  serviceName: string;
  barberId: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export function AppointmentBlock({
  appointment,
  onSelect,
}: {
  appointment: AppointmentSummary;
  onSelect: () => void;
}) {
  const time = new Date(appointment.startsAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <button
      type="button"
      onClick={onSelect}
      className="card-blade block w-full text-left hover:border-gold"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-wire">{time}</span>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
      <p className="mt-1 font-body font-medium text-ink">{appointment.clientName}</p>
      <p className="text-xs text-steel">{appointment.serviceName}</p>
    </button>
  );
}
