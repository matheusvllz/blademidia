import { and, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { clients } from "../schema/clients";
import { whatsappConversations } from "../schema/whatsapp-conversations";

/**
 * Regra de ouro (ADR-0007): toda função exportada aqui exige `barbershopId`
 * explícito como primeiro argumento — não existe caminho de leitura/escrita
 * de cliente sem escopo de tenant.
 */

export type ClientRecord = typeof clients.$inferSelect;

export async function listClients(barbershopId: string): Promise<ClientRecord[]> {
  return db
    .select()
    .from(clients)
    .where(and(eq(clients.barbershopId, barbershopId), isNull(clients.deletedAt)));
}

export async function getClient(
  barbershopId: string,
  clientId: string,
): Promise<ClientRecord | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.barbershopId, barbershopId),
        eq(clients.id, clientId),
        isNull(clients.deletedAt),
      ),
    );
  return rows[0] ?? null;
}

export async function findClientByPhone(
  barbershopId: string,
  phone: string,
): Promise<ClientRecord | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.barbershopId, barbershopId),
        eq(clients.phone, phone),
        isNull(clients.deletedAt),
      ),
    );
  return rows[0] ?? null;
}

export interface CreateClientInput {
  name: string;
  phone: string;
  notes?: string;
}

export type CreateClientResult =
  | { error: null; client: ClientRecord }
  | { error: "missing_fields"; client: null }
  | { error: "phone_duplicate"; client: ClientRecord };

export async function createClient(
  barbershopId: string,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  if (!input.name?.trim() || !input.phone?.trim()) {
    return { error: "missing_fields", client: null };
  }

  const existing = await findClientByPhone(barbershopId, input.phone);
  if (existing) {
    return { error: "phone_duplicate", client: existing };
  }

  const [created] = await db
    .insert(clients)
    .values({ barbershopId, name: input.name, phone: input.phone, notes: input.notes })
    .returning();

  if (!created) {
    throw new Error("Falha inesperada ao criar cliente");
  }

  return { error: null, client: created };
}

export async function updateClient(
  barbershopId: string,
  clientId: string,
  input: Partial<CreateClientInput>,
): Promise<ClientRecord | null> {
  const [updated] = await db
    .update(clients)
    .set(input)
    .where(and(eq(clients.barbershopId, barbershopId), eq(clients.id, clientId)))
    .returning();
  return updated ?? null;
}

/**
 * LGPD: anonimiza (nome/telefone) em vez de apagar, preservando histórico agregado.
 * Fase 5 (`add-whatsapp-canal`, delta nesta spec): na mesma transação, desvincula e
 * anonimiza (telefone → NULL) as conversas de WhatsApp associadas ao cliente, preservando o
 * conteúdo das mensagens já trocadas — mesmo padrão já usado para `clients.phone`.
 */
export async function deleteClient(
  barbershopId: string,
  clientId: string,
): Promise<ClientRecord | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(clients)
      .set({ name: null, phone: null, deletedAt: new Date() })
      .where(and(eq(clients.barbershopId, barbershopId), eq(clients.id, clientId)))
      .returning();
    if (!updated) return null;

    await tx
      .update(whatsappConversations)
      .set({ clientId: null, phone: null })
      .where(
        and(
          eq(whatsappConversations.barbershopId, barbershopId),
          eq(whatsappConversations.clientId, clientId),
        ),
      );

    return updated;
  });
}
