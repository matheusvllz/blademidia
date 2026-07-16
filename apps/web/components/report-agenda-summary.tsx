import type { ReportData } from "@blademidia/core";

interface ReportAgendaSummaryProps {
  data: ReportData;
}

/** Ocupação, faltas e cancelamentos do período (spec "Indicadores da agenda no período"). */
export function ReportAgendaSummary({ data }: ReportAgendaSummaryProps) {
  const hasCapacity = data.capacity > 0;
  const occupancyPct = hasCapacity ? Math.round((data.occupied / data.capacity) * 1000) / 10 : null;
  const comparisonRate =
    data.visitsCount + data.noShowCount > 0
      ? Math.round((data.noShowCount / (data.visitsCount + data.noShowCount)) * 1000) / 10
      : null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">Agenda</h2>
      {!hasCapacity ? (
        <p className="card-blade text-steel">
          Sem grade de trabalho configurada neste período — ocupação indisponível.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-blade">
            <p className="label-blade mb-1">Ocupação</p>
            <p className="font-display text-3xl font-black text-ink">
              {data.occupied}/{data.capacity}
            </p>
            <p className="mt-1 font-mono text-xs text-wire">{occupancyPct}% cheia</p>
          </div>
          <div className="card-blade">
            <p className="label-blade mb-1">Faltas</p>
            <p className="font-display text-3xl font-black text-alert-red">{data.noShowCount}</p>
          </div>
          <div className="card-blade">
            <p className="label-blade mb-1">Cancelamentos</p>
            <p className="font-display text-3xl font-black text-wire">{data.canceledCount}</p>
          </div>
          <div className="card-blade">
            <p className="label-blade mb-1">Taxa de falta</p>
            <p className="font-display text-3xl font-black text-ink">
              {comparisonRate == null ? "—" : `${comparisonRate}%`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
