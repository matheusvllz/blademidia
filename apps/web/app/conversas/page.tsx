import { listClients, listConversations } from "@blademidia/db";
import Link from "next/link";
import { requireSessionPage } from "@/lib/auth";

/**
 * Leitura do histórico de conversas de WhatsApp (Fase 5, `add-whatsapp-canal`) — NÃO é caixa
 * de entrada: o barbeiro responde pelo próprio WhatsApp Business App (coexistência, ver
 * design.md § 3.3 do plano). Esta tela existe para dar contexto/auditoria ao dono e ao
 * funcionário autorizado.
 */
export default async function ConversasPage() {
  const session = await requireSessionPage();
  const [conversations, clients] = await Promise.all([
    listConversations(session.barbershopId),
    listClients(session.barbershopId),
  ]);

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  const sorted = [...conversations].sort((a, b) => {
    const aTime = a.lastInboundAt?.getTime() ?? 0;
    const bTime = b.lastInboundAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-black uppercase text-ink">Conversas</h1>
      <p className="mb-6 font-body text-sm text-steel">
        Histórico do que o zap da barbearia trocou com os clientes. Responder continua sendo
        pelo próprio WhatsApp — aqui é só para acompanhar.
      </p>

      {sorted.length === 0 ? (
        <p className="font-body text-steel">Ainda não chegou nenhuma mensagem por aqui.</p>
      ) : (
        <ul className="divide-y divide-steel/10 border border-steel/10">
          {sorted.map((conversation) => {
            const label = conversation.clientId
              ? (clientNameById.get(conversation.clientId) ?? "Cliente sem nome")
              : conversation.phone
                ? "Cliente não cadastrado"
                : "Cliente removido (LGPD)";
            return (
              <li key={conversation.id}>
                <Link
                  href={`/conversas/${conversation.id}`}
                  className="flex items-center justify-between px-4 py-3 font-body transition hover:bg-ink/5"
                >
                  <span className="text-ink">{label}</span>
                  <span className="flex items-center gap-3 font-mono text-xs uppercase text-wire">
                    {conversation.handover === "humano" && (
                      <span className="rounded bg-gold/20 px-2 py-0.5 text-gold">com o barbeiro</span>
                    )}
                    {conversation.optedOutAt && (
                      <span className="rounded bg-steel/20 px-2 py-0.5">parou de receber</span>
                    )}
                    {conversation.lastInboundAt
                      ? conversation.lastInboundAt.toLocaleString("pt-BR")
                      : "sem mensagem do cliente ainda"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
