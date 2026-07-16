"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface LoyaltyStatusInfo {
  count: number;
  threshold: number;
  goalReached: boolean;
}

interface Props {
  clientId: string;
  status: LoyaltyStatusInfo;
}

/** Progresso de fidelização + ação de resgate (spec "Sinalização de meta atingida"/"Registro de resgate"). */
export function LoyaltyCard({ clientId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem() {
    const confirmed = window.confirm(
      `Marcar resgate de fidelização? A contagem reinicia a partir de agora (0/${status.threshold}).`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const response = await fetch(`/api/clients/${clientId}/loyalty/redeem`, { method: "POST" });
    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "não foi possível registrar o resgate");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card-blade">
      <p className="label-blade mb-1">Fidelização</p>
      <p className="font-display text-xl font-bold text-ink">
        {status.count}/{status.threshold}
      </p>
      {status.goalReached ? (
        <>
          <p className="mt-1 text-sm text-alert-green">🎉 meta atingida</p>
          {error && <p className="mt-1 text-xs text-alert-red">{error}</p>}
          <button type="button" disabled={loading} onClick={handleRedeem} className="btn-gold mt-2 text-sm">
            {loading ? "Salvando..." : "Marcar resgate"}
          </button>
        </>
      ) : (
        <p className="mt-1 text-xs text-wire">faltam {status.threshold - status.count} visita(s)</p>
      )}
    </div>
  );
}
