"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ServiceSummary {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number | null;
  active: boolean;
}

function formatMoney(cents: number | null): string {
  if (cents == null) return "sem preço de tabela";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServicesBoard({ initialServices }: { initialServices: ServiceSummary[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState("30");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const priceCents = price.trim() ? Math.round(Number(price.replace(",", ".")) * 100) : null;
    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, durationMin: Number(durationMin), priceCents }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível cadastrar o serviço");
      return;
    }

    setName("");
    setDurationMin("30");
    setPrice("");
    setShowForm(false);
    router.refresh();
  }

  async function handleDeactivate(service: ServiceSummary) {
    if (!window.confirm(`Desativar "${service.name}"? Agendamentos futuros já criados são preservados.`)) {
      return;
    }
    await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-steel">Serviços oferecidos pela barbearia, com duração e preço de tabela.</p>
        <button type="button" className="btn-gold" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Novo serviço"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card-blade mb-6 space-y-3">
          <div>
            <label className="label-blade mb-1 block" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="input-blade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-blade mb-1 block" htmlFor="duration">
                Duração (minutos)
              </label>
              <input
                id="duration"
                type="number"
                min={1}
                className="input-blade"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label-blade mb-1 block" htmlFor="price">
                Preço de tabela (R$, opcional)
              </label>
              <input
                id="price"
                className="input-blade"
                placeholder="40,00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? "Salvando..." : "Salvar serviço"}
          </button>
        </form>
      )}

      {initialServices.length === 0 ? (
        <p className="text-steel">Nenhum serviço cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {initialServices.map((service) => (
            <li key={service.id} className="card-blade flex items-center justify-between">
              <div>
                <p className="font-body font-medium text-ink">{service.name}</p>
                <p className="font-mono text-xs text-wire">
                  {service.durationMin} min · {formatMoney(service.priceCents)}
                </p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => handleDeactivate(service)}>
                Desativar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
