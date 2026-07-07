import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../auth/password";
import { db } from "../client";
import { crmUsers } from "../schema/crm-users";

export type UserRecord = typeof crmUsers.$inferSelect;

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
  if (!user) return null;
  return verifyPassword(password, user.authSecretHash) ? user : null;
}
