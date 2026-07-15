"use client";

import { useState } from "react";
import { AppointmentStatusBadge } from "./appointment-status-badge";

export interface AppointmentDetail {
  id: string;
  serviceId: string;
  barberId: string;
  clientName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

interface Slot {
  startsAt: string;
  endsAt: string;
  barberId: string;
}

interface Props {
  appointment: AppointmentDetail;
  onChanged: () => void;
  onClose: () => void;
}

const ACTIVE = ["agendado", "confirmado"];

function formatRange(startsAt: string, endsAt: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${new Date(startsAt).toLocaleTimeString("pt-BR", opts)}–${new Date(endsAt).toLocaleTimeString("pt-BR", opts)}`;
}

export function AppointmentDetailPanel({ appointment, onChanged, onClose }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"dinheiro" | "cartao" | "pix" | "outro">("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => appointment.startsAt.slice(0, 10));
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[] | null>(null);

  const isActive = ACTIVE.includes(appointment.status);
  const isPast = new Date(appointment.startsAt) < new Date();

  async function searchRescheduleSlots() {
    setError(null);
    setRescheduleSlots(null);
    const params = new URLSearchParams({
      date: rescheduleDate,
      serviceId: appointment.serviceId,
      barberId: appointment.barberId,
    });
    const response = await fetch(`/api/availability?${params.toString()}`);
    if (!response.ok) {
      setError("não foi possível consultar a disponibilidade");
      return;
    }
    const data = await response.json();
    setRescheduleSlots(data.slots);
  }

  async function run(action: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    const response = await action();
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível completar a ação");
      return;
    }
    onChanged();
  }

  return (
    <div className="card-blade space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-xl font-bold text-ink">{appointment.clientName}</p>
          <p className="text-sm text-steel">
            {appointment.serviceName} · {appointment.barberName}
          </p>
          <p className="font-mono text-xs text-wire">{formatRange(appointment.startsAt, appointment.endsAt)}</p>
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      {error && <p className="text-sm text-alert-red">{error}</p>}

      {appointment.status === "agendado" && (
        <button
          type="button"
          disabled={busy}
          className="btn-secondary"
          onClick={() =>
            run(() =>
              fetch(`/api/appointments/${appointment.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "confirm" }),
              }),
            )
          }
        >
          Confirmar
        </button>
      )}

      {isActive && (
        <div className="space-y-2 border-t border-steel/10 pt-3">
          <p className="label-blade">Concluir atendimento</p>
          <div className="flex gap-2">
            <input
              className="input-blade"
              placeholder="Valor pago (R$, opcional)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className="input-blade"
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
            >
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            className="btn-gold"
            onClick={() =>
              run(() =>
                fetch(`/api/appointments/${appointment.id}/complete`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    amountCents: amount.trim() ? Math.round(Number(amount.replace(",", ".")) * 100) : null,
                    method,
                  }),
                }),
              )
            }
          >
            Concluir
          </button>
        </div>
      )}

      {isActive && (
        <div className="space-y-2 border-t border-steel/10 pt-3">
          <button type="button" className="btn-secondary" onClick={() => setRescheduling((v) => !v)}>
            {rescheduling ? "Cancelar remarcação" : "Remarcar"}
          </button>
          {rescheduling && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="input-blade"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlots(null);
                  }}
                />
                <button type="button" className="btn-secondary text-sm" onClick={searchRescheduleSlots}>
                  Ver horários
                </button>
              </div>
              {rescheduleSlots && (
                <div className="flex flex-wrap gap-2">
                  {rescheduleSlots.length === 0 ? (
                    <p className="text-sm text-steel">Nenhum horário livre nesse dia.</p>
                  ) : (
                    rescheduleSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={busy}
                        className="btn-secondary text-sm"
                        onClick={() =>
                          run(() =>
                            fetch(`/api/appointments/${appointment.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "reschedule", startsAt: slot.startsAt }),
                            }),
                          )
                        }
                      >
                        {formatRange(slot.startsAt, slot.endsAt)}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="flex flex-wrap gap-2 border-t border-steel/10 pt-3">
          {isPast && (
            <button
              type="button"
              disabled={busy}
              className="btn-secondary"
              onClick={() => run(() => fetch(`/api/appointments/${appointment.id}/no-show`, { method: "POST" }))}
            >
              Marcar falta
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            className="font-mono text-xs text-alert-red"
            onClick={() =>
              run(() => fetch(`/api/appointments/${appointment.id}?reason=cancelado+pelo+painel`, { method: "DELETE" }))
            }
          >
            Cancelar agendamento
          </button>
        </div>
      )}

      <button type="button" className="font-mono text-xs text-wire" onClick={onClose}>
        fechar
      </button>
    </div>
  );
}
