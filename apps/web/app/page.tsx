import { getDashboard } from "@blademidia/db";
import Link from "next/link";
import { requireSessionPage } from "@/lib/auth";

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date | null): string {
  if (!date) return "nunca veio";
  return new Date(date).toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const session = await requireSessionPage();
  const dashboard = await getDashboard(session.barbershopId);

  const isEmpty = dashboard.totalClients === 0;

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-black uppercase text-ink">Dashboard</h1>

      {isEmpty ? (
        <div className="card-blade text-center">
          <p className="mb-4 text-steel">
            Nenhum cliente cadastrado ainda. Comece cadastrando o primeiro.
          </p>
          <Link href="/clientes" className="btn-gold inline-flex">
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card-blade">
              <p className="label-blade mb-1">Clientes ativos</p>
              <p className="font-display text-4xl font-black text-alert-green">
                {dashboard.activeClients}
              </p>
            </div>
            <div className="card-blade">
              <p className="label-blade mb-1">Clientes inativos</p>
              <p className="font-display text-4xl font-black text-alert-red">
                {dashboard.inactiveClients}
              </p>
            </div>
            <div className="card-blade">
              <p className="label-blade mb-1">Ticket médio</p>
              <p className="font-display text-4xl font-black text-ink">
                {formatMoney(dashboard.averageTicketCents)}
              </p>
            </div>
          </div>

          <section>
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-ink">
              Clientes para reativar
            </h2>
            {dashboard.clientsToReactivate.length === 0 ? (
              <p className="text-steel">Nenhum cliente precisando de reativação agora.</p>
            ) : (
              <ul className="space-y-2">
                {dashboard.clientsToReactivate.slice(0, 10).map((client) => (
                  <li key={client.id}>
                    <Link
                      href={`/clientes/${client.id}`}
                      className="card-blade flex items-center justify-between hover:border-gold"
                    >
                      <span className="font-body font-medium text-ink">
                        {client.name ?? "(sem nome)"}
                      </span>
                      <span className="font-mono text-xs text-wire">
                        última visita: {formatDate(client.lastVisitAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
