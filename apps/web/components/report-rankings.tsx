import type { ReportData } from "@blademidia/core";

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ReportRankingsProps {
  data: ReportData;
}

/** Ranking de serviços e produção por barbeiro (spec "Rankings do período"). */
export function ReportRankings({ data }: ReportRankingsProps) {
  return (
    <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">
          Serviços mais realizados
        </h2>
        {data.topServices.length === 0 ? (
          <p className="card-blade text-steel">Nenhum atendimento no período.</p>
        ) : (
          <ul className="space-y-2">
            {data.topServices.map((service) => (
              <li
                key={`${service.serviceId ?? "sem-catalogo"}-${service.name}`}
                className="card-blade flex items-center justify-between"
              >
                <span className="font-body font-medium text-ink">{service.name}</span>
                <span className="font-mono text-xs text-wire">
                  {service.visitsCount} atendimento(s) · {formatMoney(service.revenueCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">
          Produção por barbeiro
        </h2>
        {data.topBarbers.length === 0 ? (
          <p className="card-blade text-steel">Nenhum atendimento no período.</p>
        ) : (
          <ul className="space-y-2">
            {data.topBarbers.map((barber) => (
              <li
                key={`${barber.barberId ?? "sem-barbeiro"}-${barber.name}`}
                className="card-blade flex items-center justify-between"
              >
                <span className="font-body font-medium text-ink">{barber.name}</span>
                <span className="font-mono text-xs text-wire">
                  {barber.visitsCount} atendimento(s) · {formatMoney(barber.revenueCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
