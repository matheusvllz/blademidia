import type { ReportData } from "@blademidia/core";

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatChange(pct: number | null): { text: string; className: string } {
  if (pct == null) return { text: "—", className: "text-wire" };
  const sign = pct > 0 ? "+" : "";
  const className = pct > 0 ? "text-alert-green" : pct < 0 ? "text-alert-red" : "text-wire";
  return { text: `${sign}${pct}%`, className };
}

interface ReportSummaryProps {
  data: ReportData;
}

/** Indicadores operacionais + comparação com o período anterior (spec "Indicadores operacionais"). */
export function ReportSummary({ data }: ReportSummaryProps) {
  const isEmpty = data.visitsCount === 0 && data.newClientsCount === 0;
  const revenueChange = formatChange(data.comparison.revenueChangePct);
  const visitsChange = formatChange(data.comparison.visitsChangePct);

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">Indicadores</h2>

      {isEmpty ? (
        <p className="card-blade text-steel">Nenhum atendimento ou pagamento registrado neste período.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-blade">
              <p className="label-blade mb-1">Faturamento</p>
              <p className="font-display text-3xl font-black text-ink">{formatMoney(data.revenueCents)}</p>
              {data.comparison.available && (
                <p className={`mt-1 font-mono text-xs ${revenueChange.className}`}>
                  {revenueChange.text} vs. período anterior
                </p>
              )}
            </div>
            <div className="card-blade">
              <p className="label-blade mb-1">Atendimentos</p>
              <p className="font-display text-3xl font-black text-ink">{data.visitsCount}</p>
              {data.comparison.available && (
                <p className={`mt-1 font-mono text-xs ${visitsChange.className}`}>
                  {visitsChange.text} vs. período anterior
                </p>
              )}
            </div>
            <div className="card-blade">
              <p className="label-blade mb-1">Ticket médio</p>
              <p className="font-display text-3xl font-black text-ink">
                {formatMoney(data.avgTicketCents)}
              </p>
            </div>
            <div className="card-blade">
              <p className="label-blade mb-1">Clientes novos / atendidos</p>
              <p className="font-display text-3xl font-black text-ink">
                {data.newClientsCount} / {data.servedClientsCount}
              </p>
            </div>
          </div>

          {!data.comparison.available && (
            <p className="mt-2 text-xs text-wire">
              Sem dado no período anterior para comparar.
            </p>
          )}

          {data.unpricedVisitsCount > 0 && (
            <p className="mt-3 text-sm text-wire">
              {data.unpricedVisitsCount} atendimento(s) sem valor informado — não entram no
              ticket médio nem no faturamento acima.
            </p>
          )}
        </>
      )}
    </section>
  );
}
