"use client";

import { useEffect, useState } from "react";

export default function ConfiguracoesPage() {
  const [days, setDays] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setDays(data.inactivityDaysThreshold);
        setLoading(false);
      });
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inactivityDaysThreshold: days }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível salvar");
      return;
    }

    setSaved(true);
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Configurações</h1>

      {loading ? (
        <p className="text-steel">Carregando...</p>
      ) : (
        <form onSubmit={handleSave} className="card-blade max-w-md space-y-3">
          <label className="label-blade mb-1 block" htmlFor="days">
            Dias sem visita para considerar o cliente inativo
          </label>
          <input
            id="days"
            type="number"
            min={1}
            className="input-blade"
            value={days ?? ""}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <p className="text-xs text-wire">
            Hoje o cliente aparece em &quot;para reativar&quot; no dashboard quando passa desse
            número de dias sem nenhum atendimento registrado.
          </p>
          {error && <p className="text-sm text-alert-red">{error}</p>}
          {saved && <p className="text-sm text-alert-green">Salvo.</p>}
          <button type="submit" className="btn-gold">
            Salvar
          </button>
        </form>
      )}
    </div>
  );
}
