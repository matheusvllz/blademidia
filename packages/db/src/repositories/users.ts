import { and, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { db } from "../client";
import { crmUsers } from "../schema/crm-users";
import { getBarber } from "./barbers";

export type UserRecord = typeof crmUsers.$inferSelect;

const UNIQUE_VIOLATION = "23505";

function uniqueViolationConstraint(error: unknown): string | null {
  if (typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION) {
    return (error as { constraint?: string }).constraint ?? null;
  }
  return null;
}

export async function createUser(
  barbershopId: string,
  emailOrPhone: string,
  password: string,
): Promise<UserRecord> {
  const authSecretHash = hashPassword(password);
  const [user] = await db
    .insert(crmUsers)
    .values({ barbershopId, emailOrPhone, authSecretHash })
    .returning();
  if (!user) throw new Error("Falha inesperada ao criar usuário");
  return user;
}

export async function verifyLogin(
  emailOrPhone: string,
  password: string,
): Promise<UserRecord | null> {
  const rows = await db.select().from(crmUsers).where(eq(crmUsers.emailOrPhone, emailOrPhone));
  const user = rows[0];
  if (!user || !user.active) return null;
  return verifyPassword(password, user.authSecretHash) ? user : null;
}

// --- Fase 4 (auth-tenancy): gestão de login de funcionário ---

export type CreateEmployeeLoginResult =
  | { error: null; user: UserRecord }
  | { error: "barber_not_found" | "already_has_login" | "duplicate_login"; user: null };

/**
 * Cria um login vinculado a um barbeiro do catálogo (ADR/design de
 * `add-fidelizacao-e-funcionarios`, Decision 1). `barberId` obrigatório;
 * `getBarber` já escopa por tenant — barbeiro de outra barbearia vira
 * `barber_not_found` (mesmo tratamento de "não encontrado" cross-tenant).
 */
export async function createEmployeeLogin(
  barbershopId: string,
  barberId: string,
  emailOrPhone: string,
  password: string,
): Promise<CreateEmployeeLoginResult> {
  const barber = await getBarber(barbershopId, barberId);
  if (!barber) return { error: "barber_not_found", user: null };

  const authSecretHash = hashPassword(password);
  try {
    const [user] = await db
      .insert(crmUsers)
      .values({ barbershopId, emailOrPhone, authSecretHash, role: "funcionario", barberId })
      .returning();
    if (!user) throw new Error("Falha inesperada ao criar login de funcionário");
    return { error: null, user };
  } catch (error) {
    const constraint = uniqueViolationConstraint(error);
    if (constraint === "crm_users_barber_id_idx") return { error: "already_has_login", user: null };
    if (constraint === "crm_users_login_idx") return { error: "duplicate_login", user: null };
    throw error;
  }
}

export async function getEmployeeLoginForBarber(
  barbershopId: string,
  barberId: string,
): Promise<UserRecord | null> {
  const rows = await db
    .select()
    .from(crmUsers)
    .where(and(eq(crmUsers.barbershopId, barbershopId), eq(crmUsers.barberId, barberId)));
  return rows[0] ?? null;
}

export async function resetPassword(
  barbershopId: string,
  userId: string,
  password: string,
): Promise<UserRecord | null> {
  const authSecretHash = hashPassword(password);
  const [user] = await db
    .update(crmUsers)
    .set({ authSecretHash })
    .where(and(eq(crmUsers.barbershopId, barbershopId), eq(crmUsers.id, userId), eq(crmUsers.role, "funcionario")))
    .returning();
  return user ?? null;
}

export async function deactivateLogin(barbershopId: string, userId: string): Promise<UserRecord | null> {
  const [user] = await db
    .update(crmUsers)
    .set({ active: false })
    .where(and(eq(crmUsers.barbershopId, barbershopId), eq(crmUsers.id, userId), eq(crmUsers.role, "funcionario")))
    .returning();
  return user ?? null;
}
