"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BarberSummary {
  id: string;
  name: string;
}

export function BarbersBoard({ initialBarbers }: { initialBarbers: BarberSummary[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível cadastrar o barbeiro");
      return;
    }

    setName("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-steel">Barbeiros da equipe, com grade de horário e folgas próprias.</p>
        <button type="button" className="btn-gold" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Novo barbeiro"}
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
          {error && <p className="text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? "Salvando..." : "Salvar barbeiro"}
          </button>
        </form>
      )}

      {initialBarbers.length === 0 ? (
        <p className="text-steel">Nenhum barbeiro cadastrado ainda.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {initialBarbers.map((barber) => (
            <li key={barber.id}>
              <Link
                href={`/configuracoes/barbeiros/${barber.id}`}
                className="card-blade flex items-center justify-between hover:border-gold"
              >
                <span className="font-body font-medium text-ink">{barber.name}</span>
                <span className="font-mono text-xs text-wire">horários e folgas →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
