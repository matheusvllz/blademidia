"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Window {
  startTime: string;
  endTime: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface ExceptionItem {
  id: string;
  date: string;
  kind: "folga" | "bloqueio" | "extra";
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

interface Props {
  barberId: string;
  initialSchedule: { weekday: number; startTime: string; endTime: string }[];
  services: ServiceOption[];
  initialServiceIds: string[];
  initialExceptions: ExceptionItem[];
}

function groupByWeekday(
  schedule: { weekday: number; startTime: string; endTime: string }[],
): Window[][] {
  const grouped: Window[][] = Array.from({ length: 7 }, () => []);
  for (const s of schedule) {
    grouped[s.weekday]?.push({ startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) });
  }
  return grouped;
}

export function BarberDetail({
  barberId,
  initialSchedule,
  services,
  initialServiceIds,
  initialExceptions,
}: Props) {
  const router = useRouter();
  const [byWeekday, setByWeekday] = useState<Window[][]>(() => groupByWeekday(initialSchedule));
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set(initialServiceIds));
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [servicesSaved, setServicesSaved] = useState(false);

  const [exDate, setExDate] = useState("");
  const [exKind, setExKind] = useState<"folga" | "bloqueio" | "extra">("folga");
  const [exStart, setExStart] = useState("");
  const [exEnd, setExEnd] = useState("");
  const [exError, setExError] = useState<string | null>(null);

  function addWindow(weekday: number) {
    setByWeekday((prev) => {
      const next = prev.map((w) => [...w]);
      next[weekday]!.push({ startTime: "09:00", endTime: "18:00" });
      return next;
    });
  }

  function removeWindow(weekday: number, index: number) {
    setByWeekday((prev) => {
      const next = prev.map((w) => [...w]);
      next[weekday]!.splice(index, 1);
      return next;
    });
  }

  function updateWindow(weekday: number, index: number, field: keyof Window, value: string) {
    setByWeekday((prev) => {
      const next = prev.map((w) => [...w]);
      next[weekday]![index] = { ...next[weekday]![index]!, [field]: value };
      return next;
    });
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    setScheduleSaved(false);
    const windows = byWeekday.flatMap((windows, weekday) =>
      windows.map((w) => ({ weekday, startTime: w.startTime, endTime: w.endTime })),
    );
    const response = await fetch(`/api/barbers/${barberId}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windows }),
    });
    setSavingSchedule(false);
    if (response.ok) {
      setScheduleSaved(true);
      router.refresh();
    }
  }

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveServices() {
    setSavingServices(true);
    setServicesSaved(false);
    const response = await fetch(`/api/barbers/${barberId}/services`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: Array.from(serviceIds) }),
    });
    setSavingServices(false);
    if (response.ok) {
      setServicesSaved(true);
      router.refresh();
    }
  }

  async function handleCreateException(event: React.FormEvent) {
    event.preventDefault();
    setExError(null);
    const response = await fetch(`/api/barbers/${barberId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: exDate,
        kind: exKind,
        startTime: exKind === "folga" ? null : exStart,
        endTime: exKind === "folga" ? null : exEnd,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setExError(data.error ?? "não foi possível salvar");
      return;
    }
    setExDate("");
    setExStart("");
    setExEnd("");
    router.refresh();
  }

  async function handleDeleteException(exId: string) {
    await fetch(`/api/barbers/${barberId}/exceptions/${exId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">Grade semanal</h2>
        <div className="space-y-3">
          {WEEKDAY_LABELS.map((label, weekday) => (
            <div key={weekday} className="card-blade">
              <div className="mb-2 flex items-center justify-between">
                <span className="label-blade">{label}</span>
                <button type="button" className="btn-secondary text-xs" onClick={() => addWindow(weekday)}>
                  + Janela
                </button>
              </div>
              {byWeekday[weekday]!.length === 0 ? (
                <p className="text-xs text-wire">Sem expediente neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {byWeekday[weekday]!.map((w, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        className="input-blade"
                        value={w.startTime}
                        onChange={(e) => updateWindow(weekday, index, "startTime", e.target.value)}
                      />
                      <span className="text-wire">até</span>
                      <input
                        type="time"
                        className="input-blade"
                        value={w.endTime}
                        onChange={(e) => updateWindow(weekday, index, "endTime", e.target.value)}
                      />
                      <button
                        type="button"
                        className="font-mono text-xs text-alert-red"
                        onClick={() => removeWindow(weekday, index)}
                      >
                        remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" disabled={savingSchedule} className="btn-gold" onClick={handleSaveSchedule}>
            {savingSchedule ? "Salvando..." : "Salvar grade"}
          </button>
          {scheduleSaved && <span className="text-sm text-alert-green">Salvo.</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">Serviços que faz</h2>
        <p className="mb-2 text-xs text-wire">
          Sem nenhuma marcação, o barbeiro é considerado apto a todos os serviços ativos.
        </p>
        <div className="card-blade space-y-2">
          {services.length === 0 ? (
            <p className="text-steel">Cadastre serviços primeiro.</p>
          ) : (
            services.map((service) => (
              <label key={service.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={serviceIds.has(service.id)}
                  onChange={() => toggleService(service.id)}
                />
                <span className="font-body text-ink">{service.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" disabled={savingServices} className="btn-gold" onClick={handleSaveServices}>
            {savingServices ? "Salvando..." : "Salvar serviços"}
          </button>
          {servicesSaved && <span className="text-sm text-alert-green">Salvo.</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">
          Folgas e bloqueios
        </h2>
        <form onSubmit={handleCreateException} className="card-blade mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label-blade mb-1 block" htmlFor="ex-date">
                Data
              </label>
              <input
                id="ex-date"
                type="date"
                className="input-blade"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label-blade mb-1 block" htmlFor="ex-kind">
                Tipo
              </label>
              <select
                id="ex-kind"
                className="input-blade"
                value={exKind}
                onChange={(e) => setExKind(e.target.value as "folga" | "bloqueio" | "extra")}
              >
                <option value="folga">Folga (dia inteiro)</option>
                <option value="bloqueio">Bloqueio (intervalo)</option>
                <option value="extra">Disponibilidade extra</option>
              </select>
            </div>
            {exKind !== "folga" && (
              <>
                <div>
                  <label className="label-blade mb-1 block" htmlFor="ex-start">
                    Início
                  </label>
                  <input
                    id="ex-start"
                    type="time"
                    className="input-blade"
                    value={exStart}
                    onChange={(e) => setExStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label-blade mb-1 block" htmlFor="ex-end">
                    Fim
                  </label>
                  <input
                    id="ex-end"
                    type="time"
                    className="input-blade"
                    value={exEnd}
                    onChange={(e) => setExEnd(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          {exError && <p className="text-sm text-alert-red">{exError}</p>}
          <button type="submit" className="btn-gold">
            Adicionar
          </button>
        </form>

        {initialExceptions.length === 0 ? (
          <p className="text-steel">Nenhuma folga ou bloqueio registrado.</p>
        ) : (
          <ul className="space-y-2">
            {initialExceptions.map((ex) => (
              <li key={ex.id} className="card-blade flex items-center justify-between">
                <div>
                  <p className="font-body font-medium text-ink">
                    {ex.date} — {ex.kind}
                    {ex.startTime && ex.endTime ? ` (${ex.startTime.slice(0, 5)}–${ex.endTime.slice(0, 5)})` : ""}
                  </p>
                  {ex.reason && <p className="text-xs text-wire">{ex.reason}</p>}
                </div>
                <button
                  type="button"
                  className="font-mono text-xs text-alert-red"
                  onClick={() => handleDeleteException(ex.id)}
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
