import { getClient, getConversation, listMessages } from "@blademidia/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionPage } from "@/lib/auth";

export default async function ConversaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionPage();
  const { id } = await params;

  const conversation = await getConversation(session.barbershopId, id);
  if (!conversation) notFound();

  const [messages, client] = await Promise.all([
    listMessages(session.barbershopId, conversation.id),
    conversation.clientId ? getClient(session.barbershopId, conversation.clientId) : null,
  ]);

  const title = client?.name ?? (conversation.phone ? "Cliente não cadastrado" : "Cliente removido (LGPD)");

  return (
    <div>
      <Link href="/conversas" className="font-mono text-xs uppercase text-wire hover:text-ink">
        ← voltar
      </Link>
      <h1 className="mb-1 mt-2 font-display text-3xl font-black uppercase text-ink">{title}</h1>
      <p className="mb-6 font-body text-sm text-steel">
        {conversation.handover === "humano"
          ? "O barbeiro assumiu essa conversa no próprio WhatsApp."
          : "Nenhuma resposta automática ainda nesta fase — histórico só de leitura."}
        {conversation.optedOutAt && " O cliente pediu para parar de receber mensagem."}
      </p>

      {messages.length === 0 ? (
        <p className="font-body text-steel">Sem mensagens registradas ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`max-w-[75%] rounded px-4 py-2 font-body ${
                message.direction === "entrada"
                  ? "self-start bg-ink/5 text-ink"
                  : "self-end bg-gold/20 text-ink"
              }`}
            >
              <p>{message.body ?? `(mensagem do tipo ${message.type}, sem texto)`}</p>
              <p className="mt-1 font-mono text-[10px] uppercase text-wire">
                {message.occurredAt.toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
