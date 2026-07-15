"use client";

import { useEffect, useState } from "react";

interface Settings {
  slotStepMin: number;
  minAdvanceMin: number;
  noShowAfterMin: number;
  confirmationLeadHours: number;
}

export default function AgendaConfigPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agenda-settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings);
        setLoading(false);
      });
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError(null);
    setSaved(false);

    const response = await fetch("/api/agenda-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível salvar");
      return;
    }
    setSaved(true);
  }

  function update(field: keyof Settings, value: string) {
    setSettings((prev) => (prev ? { ...prev, [field]: Number(value) } : prev));
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Agenda</h1>

      {loading || !settings ? (
        <p className="text-steel">Carregando...</p>
      ) : (
        <form onSubmit={handleSave} className="card-blade max-w-md space-y-4">
          <div>
            <label className="label-blade mb-1 block" htmlFor="slotStepMin">
              Passo de horário (minutos)
            </label>
            <input
              id="slotStepMin"
              type="number"
              min={5}
              className="input-blade"
              value={settings.slotStepMin}
              onChange={(e) => update("slotStepMin", e.target.value)}
            />
            <p className="mt-1 text-xs text-wire">Intervalo entre os horários oferecidos na agenda.</p>
          </div>

          <div>
            <label className="label-blade mb-1 block" htmlFor="minAdvanceMin">
              Antecedência mínima (minutos)
            </label>
            <input
              id="minAdvanceMin"
              type="number"
              min={0}
              className="input-blade"
              value={settings.minAdvanceMin}
              onChange={(e) => update("minAdvanceMin", e.target.value)}
            />
            <p className="mt-1 text-xs text-wire">Tempo mínimo de antecedência para um novo agendamento.</p>
          </div>

          <div>
            <label className="label-blade mb-1 block" htmlFor="noShowAfterMin">
              Marcar falta após (minutos)
            </label>
            <input
              id="noShowAfterMin"
              type="number"
              min={0}
              className="input-blade"
              value={settings.noShowAfterMin}
              onChange={(e) => update("noShowAfterMin", e.target.value)}
            />
            <p className="mt-1 text-xs text-wire">
              Minutos após o horário marcado para considerar falta automaticamente.
            </p>
          </div>

          <div>
            <label className="label-blade mb-1 block" htmlFor="confirmationLeadHours">
              Confirmação antecipada (horas)
            </label>
            <input
              id="confirmationLeadHours"
              type="number"
              min={0}
              className="input-blade"
              value={settings.confirmationLeadHours}
              onChange={(e) => update("confirmationLeadHours", e.target.value)}
            />
            <p className="mt-1 text-xs text-wire">
              Horas antes do horário marcado em que a confirmação seria enviada (Fase 5).
            </p>
          </div>

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
