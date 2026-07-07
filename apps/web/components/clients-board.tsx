"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface ClientSummary {
  id: string;
  name: string | null;
  phone: string | null;
}

function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 4 ? `***${digits}` : `***${digits.slice(-4)}`;
}

export function ClientsBoard({ initialClients }: { initialClients: ClientSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialClients;
    return initialClients.filter((c) => c.name?.toLowerCase().includes(q));
  }, [initialClients, query]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível cadastrar o cliente");
      return;
    }

    setName("");
    setPhone("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Buscar cliente pelo nome..."
          className="input-blade sm:max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn-gold" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "+ Novo cliente"}
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
          <div>
            <label className="label-blade mb-1 block" htmlFor="phone">
              Telefone (com DDD)
            </label>
            <input
              id="phone"
              className="input-blade"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="61999990000"
              required
            />
          </div>
          {error && <p className="text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? "Salvando..." : "Salvar cliente"}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="text-steel">
          {initialClients.length === 0
            ? "Nenhum cliente cadastrado ainda."
            : "Nenhum cliente encontrado com esse nome."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clientes/${client.id}`}
                className="card-blade flex items-center justify-between hover:border-gold"
              >
                <span className="font-body font-medium text-ink">
                  {client.name ?? "(sem nome)"}
                </span>
                <span className="font-mono text-xs text-wire">{maskPhone(client.phone)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
