"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppointmentBlock, type AppointmentSummary } from "./appointment-block";
import { AppointmentDetailPanel, type AppointmentDetail } from "./appointment-detail-panel";
import { AppointmentForm } from "./appointment-form";

interface BarberColumn {
  id: string;
  name: string;
  appointments: AppointmentSummary[];
}

interface Props {
  date: string;
  barberColumns: BarberColumn[];
  clients: { id: string; name: string | null; phone: string | null }[];
  services: { id: string; name: string; durationMin: number }[];
  barbers: { id: string; name: string }[];
  detailsById: Record<string, AppointmentDetail>;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatHeader(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

export function AgendaBoard({ date, barberColumns, clients, services, barbers, detailsById }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function goToDate(newDate: string) {
    router.push(`/agenda?date=${newDate}`);
  }

  const selected = selectedId ? detailsById[selectedId] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => goToDate(shiftDate(date, -1))}>
            ← Dia anterior
          </button>
          <button type="button" className="btn-secondary" onClick={() => goToDate(new Date().toISOString().slice(0, 10))}>
            Hoje
          </button>
          <button type="button" className="btn-secondary" onClick={() => goToDate(shiftDate(date, 1))}>
            Próximo dia →
          </button>
        </div>
        <button type="button" className="btn-gold" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Novo agendamento"}
        </button>
      </div>

      <p className="mb-4 font-display text-xl font-bold capitalize text-ink">{formatHeader(date)}</p>

      {showForm && (
        <AppointmentForm
          date={date}
          clients={clients}
          services={services}
          barbers={barbers}
          onCreated={() => {
            setShowForm(false);
            router.refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {selected && (
        <div className="mb-6">
          <AppointmentDetailPanel
            appointment={selected}
            onChanged={() => {
              setSelectedId(null);
              router.refresh();
            }}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {barberColumns.length === 0 ? (
        <p className="card-blade text-center text-steel">
          Nenhum barbeiro cadastrado ainda. Cadastre em Configurações → Barbeiros & Horários.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barberColumns.map((col) => (
            <div key={col.id}>
              <h2 className="mb-2 font-display text-lg font-bold uppercase text-ink">{col.name}</h2>
              {col.appointments.length === 0 ? (
                <p className="text-sm text-steel">Sem agendamentos neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {col.appointments.map((appt) => (
                    <AppointmentBlock key={appt.id} appointment={appt} onSelect={() => setSelectedId(appt.id)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
