"use client";

import { useMemo, useState } from "react";

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

interface Slot {
  startsAt: string;
  endsAt: string;
  barberId: string;
}

interface Props {
  date: string;
  clients: ClientOption[];
  services: ServiceOption[];
  barbers: BarberOption[];
  onCreated: () => void;
  onCancel: () => void;
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function AppointmentForm({ date, clients, services, barbers, onCreated, onCancel }: Props) {
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(""); // vazio = qualquer barbeiro
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients.filter((c) => c.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [clients, clientQuery]);

  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "";

  async function handleSearchSlots() {
    setError(null);
    setSlots(null);
    if (!serviceId) return;
    setLoadingSlots(true);
    const params = new URLSearchParams({ date, serviceId });
    if (barberId) params.set("barberId", barberId);
    const response = await fetch(`/api/availability?${params.toString()}`);
    setLoadingSlots(false);
    if (!response.ok) {
      setError("não foi possível consultar a disponibilidade");
      return;
    }
    const data = await response.json();
    setSlots(data.slots);
  }

  async function handlePickSlot(slot: Slot) {
    if (!clientId) {
      setError("selecione o cliente");
      return;
    }
    setCreating(true);
    setError(null);
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        serviceId,
        barberId: slot.barberId,
        startsAt: slot.startsAt,
      }),
    });
    setCreating(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível criar o agendamento");
      // horário pode ter acabado de ser ocupado — recarrega a disponibilidade
      handleSearchSlots();
      return;
    }
    onCreated();
  }

  return (
    <div className="card-blade mb-6 space-y-4">
      <div>
        <label className="label-blade mb-1 block" htmlFor="client-search">
          Cliente
        </label>
        <input
          id="client-search"
          className="input-blade"
          placeholder="Buscar cliente pelo nome..."
          value={clientQuery}
          onChange={(e) => {
            setClientQuery(e.target.value);
            setClientId("");
          }}
        />
        {clientQuery && !clientId && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-steel/10 bg-white">
            {filteredClients.length === 0 ? (
              <li className="px-3 py-2 text-sm text-wire">Nenhum cliente encontrado.</li>
            ) : (
              filteredClients.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-chalk"
                    onClick={() => {
                      setClientId(c.id);
                      setClientQuery(c.name ?? "");
                    }}
                  >
                    {c.name ?? "(sem nome)"}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label-blade mb-1 block" htmlFor="service">
            Serviço
          </label>
          <select
            id="service"
            className="input-blade"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSlots(null);
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMin} min)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-blade mb-1 block" htmlFor="barber">
            Barbeiro
          </label>
          <select
            id="barber"
            className="input-blade"
            value={barberId}
            onChange={(e) => {
              setBarberId(e.target.value);
              setSlots(null);
            }}
          >
            <option value="">Qualquer barbeiro</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" className="btn-secondary" onClick={handleSearchSlots} disabled={loadingSlots}>
        {loadingSlots ? "Buscando..." : "Ver horários livres"}
      </button>

      {error && <p className="text-sm text-alert-red">{error}</p>}

      {slots && (
        <div>
          {slots.length === 0 ? (
            <p className="text-steel">Nenhum horário livre para esse dia.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={creating}
                  className="btn-secondary text-sm"
                  onClick={() => handlePickSlot(slot)}
                >
                  {formatHour(slot.startsAt)}
                  {!barberId && ` · ${barberName(slot.barberId)}`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button type="button" className="font-mono text-xs text-wire" onClick={onCancel}>
        cancelar
      </button>
    </div>
  );
}
