"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "pix", label: "Pix" },
  { value: "outro", label: "Outro" },
] as const;

export function ClientProfileActions({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [serviceLabel, setServiceLabel] = useState("");
  const [staffLabel, setStaffLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("dinheiro");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegisterVisit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const amountCents = amount.trim() ? Math.round(Number(amount.replace(",", ".")) * 100) : undefined;

    const response = await fetch(`/api/clients/${clientId}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceLabel, staffLabel: staffLabel || undefined, amountCents, method }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível registrar o atendimento");
      return;
    }

    setServiceLabel("");
    setStaffLabel("");
    setAmount("");
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Excluir este cliente? O nome e telefone somem, mas os totais de histórico ficam preservados de forma anônima.",
    );
    if (!confirmed) return;

    const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (response.ok) {
      router.push("/clientes");
      router.refresh();
    }
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <button type="button" className="btn-gold" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancelar" : "Registrar atendimento"}
      </button>
      <button type="button" className="btn-secondary text-alert-red" onClick={handleDelete}>
        Excluir cliente
      </button>

      {showForm && (
        <form onSubmit={handleRegisterVisit} className="card-blade mt-3 w-full space-y-3">
          <div>
            <label className="label-blade mb-1 block" htmlFor="serviceLabel">
              Serviço
            </label>
            <input
              id="serviceLabel"
              className="input-blade"
              value={serviceLabel}
              onChange={(e) => setServiceLabel(e.target.value)}
              placeholder="Corte, barba, corte + barba..."
              required
            />
          </div>
          <div>
            <label className="label-blade mb-1 block" htmlFor="staffLabel">
              Barbeiro (opcional)
            </label>
            <input
              id="staffLabel"
              className="input-blade"
              value={staffLabel}
              onChange={(e) => setStaffLabel(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label-blade mb-1 block" htmlFor="amount">
                Valor pago (opcional)
              </label>
              <input
                id="amount"
                className="input-blade"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,00"
                inputMode="decimal"
              />
            </div>
            <div className="flex-1">
              <label className="label-blade mb-1 block" htmlFor="method">
                Forma de pagamento
              </label>
              <select
                id="method"
                className="input-blade"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? "Salvando..." : "Salvar atendimento"}
          </button>
        </form>
      )}
    </div>
  );
}
