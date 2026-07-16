"use client";

import { useEffect, useMemo, useState } from "react";
import { computeGridRange, type WorkWindow } from "@/lib/agenda-grid-range";
import { AgendaOccupancyBadge } from "./agenda-occupancy-badge";
import { AgendaWeekGridCell, type WeekGridAppointment } from "./agenda-week-grid-cell";
import { AppointmentDetailPanel, type AppointmentDetail } from "./appointment-detail-panel";
import { AppointmentForm } from "./appointment-form";

interface ClientOption {
  id: string;
  name: string | null;
  phone: string | null;
}
interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
}
interface BarberOption {
  id: string;
  name: string;
}

interface RawAppointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface Props {
  /** Qualquer data dentro da semana inicial exibida ("YYYY-MM-DD"). */
  initialWeekStart: string;
  barbers: BarberOption[];
  clients: ClientOption[];
  services: ServiceOption[];
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = dt.getUTCDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  return dt.toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function weekdayOfDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function localDateISO(iso: string): string {
  const dt = new Date(iso);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function localHour(iso: string): number {
  return new Date(iso).getHours();
}

function formatDayHeader(date: string): string {
  const [, , d] = date.split("-");
  return `${WEEKDAY_LABELS[weekdayOfDate(date)]} ${d}`;
}

export function AgendaWeekGrid({ initialWeekStart, barbers, clients, services }: Props) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(initialWeekStart));
  const [mode, setMode] = useState<"all" | "one">("all");
  const [selectedBarberId, setSelectedBarberId] = useState(barbers[0]?.id ?? "");
  const [rawAppointments, setRawAppointments] = useState<RawAppointment[]>([]);
  const [schedules, setSchedules] = useState<WorkWindow[]>([]);
  const [occupancy, setOccupancy] = useState({ occupied: 0, capacity: 0 });
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [createAt, setCreateAt] = useState<{ date: string; time: string; barberId?: string } | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const relevantBarberIds = useMemo(
    () => (mode === "one" && selectedBarberId ? [selectedBarberId] : barbers.map((b) => b.id)),
    [mode, selectedBarberId, barbers],
  );

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    const weekEndExclusive = shiftDate(weekStart, 7);
    const weekEndInclusive = shiftDate(weekStart, 6);
    const barberIdParam = mode === "one" && selectedBarberId ? `&barberId=${selectedBarberId}` : "";

    Promise.all([
      Promise.all(
        relevantBarberIds.map((id) =>
          fetch(`/api/barbers/${id}/schedule`)
            .then((r) => r.json())
            .then((d) => (d.schedules ?? []) as WorkWindow[]),
        ),
      ),
      fetch(
        `/api/appointments?from=${weekStart}T00:00:00.000Z&to=${weekEndExclusive}T00:00:00.000Z${barberIdParam}`,
      )
        .then((r) => r.json())
        .then((d) => (d.appointments ?? []) as RawAppointment[]),
      fetch(`/api/agenda/occupancy?from=${weekStart}&to=${weekEndInclusive}${barberIdParam}`).then((r) => r.json()),
    ]).then(([schedulesLists, appointments, occupancyData]) => {
      if (canceled) return;
      setSchedules(schedulesLists.flat());
      setRawAppointments(appointments);
      setOccupancy({ occupied: occupancyData.occupied ?? 0, capacity: occupancyData.capacity ?? 0 });
      setLoading(false);
    });

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, mode, selectedBarberId, reloadToken]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const barberById = useMemo(() => new Map(barbers.map((b) => [b.id, b])), [barbers]);

  const gridRange = useMemo(() => computeGridRange(schedules), [schedules]);

  const days = useMemo(() => {
    if (!gridRange) return [];
    return gridRange.weekdays.map((weekday) => {
      const offset = weekday === 0 ? 6 : weekday - 1; // grade começa na segunda
      return shiftDate(weekStart, offset);
    });
  }, [gridRange, weekStart]);

  const hours = useMemo(() => {
    if (!gridRange) return [];
    const list: number[] = [];
    for (let h = gridRange.startHour; h < gridRange.endHour; h += 1) list.push(h);
    return list;
  }, [gridRange]);

  const appointmentsByCell = useMemo(() => {
    const map = new Map<string, WeekGridAppointment[]>();
    for (const appt of rawAppointments) {
      const key = `${localDateISO(appt.startsAt)}-${localHour(appt.startsAt)}`;
      const entry: WeekGridAppointment = {
        id: appt.id,
        clientName: clientById.get(appt.clientId)?.name ?? "(sem nome)",
        serviceName: serviceById.get(appt.serviceId)?.name ?? "(serviço removido)",
        barberId: appt.barberId,
        barberName: barberById.get(appt.barberId)?.name ?? "(barbeiro removido)",
        startsAt: appt.startsAt,
        status: appt.status,
      };
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [rawAppointments, clientById, serviceById, barberById]);

  function detailFor(id: string): AppointmentDetail | null {
    const appt = rawAppointments.find((a) => a.id === id);
    if (!appt) return null;
    return {
      id: appt.id,
      serviceId: appt.serviceId,
      barberId: appt.barberId,
      clientName: clientById.get(appt.clientId)?.name ?? "(sem nome)",
      serviceName: serviceById.get(appt.serviceId)?.name ?? "(serviço removido)",
      barberName: barberById.get(appt.barberId)?.name ?? "(barbeiro removido)",
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      status: appt.status,
    };
  }

  const selectedDetail = selectedAppointmentId ? detailFor(selectedAppointmentId) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => setWeekStart((w) => shiftDate(w, -7))}>
            ‹ Semana anterior
          </button>
          <span className="font-mono text-xs text-wire">
            {weekStart} a {shiftDate(weekStart, 6)}
          </span>
          <button type="button" className="btn-secondary" onClick={() => setWeekStart((w) => shiftDate(w, 7))}>
            Próxima semana ›
          </button>
        </div>

        {barbers.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={mode === "all" ? "btn-gold" : "btn-secondary"}
              onClick={() => setMode("all")}
            >
              Todos os barbeiros
            </button>
            <button
              type="button"
              className={mode === "one" ? "btn-gold" : "btn-secondary"}
              onClick={() => setMode("one")}
            >
              Um barbeiro
            </button>
            {mode === "one" && (
              <select
                className="input-blade"
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {createAt && (
        <div className="mb-4">
          <AppointmentForm
            date={createAt.date}
            clients={clients}
            services={services}
            barbers={barbers}
            initialBarberId={createAt.barberId}
            initialTime={createAt.time}
            onCreated={() => {
              setCreateAt(null);
              setReloadToken((t) => t + 1);
            }}
            onCancel={() => setCreateAt(null)}
          />
        </div>
      )}

      {selectedDetail && (
        <div className="mb-4">
          <AppointmentDetailPanel
            appointment={selectedDetail}
            onChanged={() => {
              setSelectedAppointmentId(null);
              setReloadToken((t) => t + 1);
            }}
            onClose={() => setSelectedAppointmentId(null)}
          />
        </div>
      )}

      <div className="mb-3">
        <AgendaOccupancyBadge occupied={occupancy.occupied} capacity={occupancy.capacity} />
      </div>

      {loading ? (
        <p className="text-steel">Carregando...</p>
      ) : !gridRange || days.length === 0 || hours.length === 0 ? (
        <p className="card-blade text-center text-steel">
          Nenhuma grade de trabalho configurada para {mode === "one" ? "este barbeiro" : "a barbearia"} —
          cadastre em Configurações → Barbeiros &amp; Horários.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-16 border-b border-steel/10 p-2 text-left font-mono text-xs text-wire" />
                {days.map((day) => (
                  <th
                    key={day}
                    className="min-w-[9rem] border-b border-steel/10 p-2 text-left font-display text-sm font-bold uppercase text-ink"
                  >
                    {formatDayHeader(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour}>
                  <td className="border-b border-steel/5 p-2 align-top font-mono text-xs text-wire">
                    {String(hour).padStart(2, "0")}:00
                  </td>
                  {days.map((day) => {
                    const key = `${day}-${hour}`;
                    const cellAppointments = appointmentsByCell.get(key) ?? [];
                    return (
                      <td key={key} className="border-b border-steel/5 p-1 align-top">
                        <AgendaWeekGridCell
                          appointments={cellAppointments}
                          showBarberName={mode === "all"}
                          onSelectAppointment={setSelectedAppointmentId}
                          onCreateAt={() =>
                            setCreateAt({
                              date: day,
                              time: `${String(hour).padStart(2, "0")}:00`,
                              barberId: mode === "one" ? selectedBarberId : undefined,
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
