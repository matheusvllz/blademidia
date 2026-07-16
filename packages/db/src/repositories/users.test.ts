/**
 * Testes de integração de gestão de login (Fase 4, auth-tenancy) contra
 * Postgres real (`DATABASE_URL`). Pulados sem banco.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createBarber } from "./barbers";
import { createBarbershop } from "./barbershops";
import {
  createEmployeeLogin,
  deactivateLogin,
  getEmployeeLoginForBarber,
  resetPassword,
  verifyLogin,
} from "./users";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const uniqueLogin = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@teste.dev`;

describe.skipIf(!hasDatabase)("gestão de login de funcionário", () => {
  let shopA: { id: string };
  let shopB: { id: string };

  beforeAll(async () => {
    shopA = await createBarbershop(`users-a-${randomUUID()}`, "Barbearia A");
    shopB = await createBarbershop(`users-b-${randomUUID()}`, "Barbearia B");
  });

  it("cria login de funcionário vinculado a um barbeiro e ele consegue logar", async () => {
    const barber = await createBarber(shopA.id, { name: "Rafael" });
    const login = uniqueLogin("rafael");
    const result = await createEmployeeLogin(shopA.id, barber.barber!.id, login, "senha123");
    expect(result.error).toBeNull();
    expect(result.user?.role).toBe("funcionario");
    expect(result.user?.barberId).toBe(barber.barber!.id);

    const verified = await verifyLogin(login, "senha123");
    expect(verified?.id).toBe(result.user?.id);
  });

  it("recusa criar login para barbeiro de outra barbearia (não encontrado)", async () => {
    const barberOfA = await createBarber(shopA.id, { name: "Barbeiro A" });
    const result = await createEmployeeLogin(shopB.id, barberOfA.barber!.id, uniqueLogin("cross"), "senha123");
    expect(result).toEqual({ error: "barber_not_found", user: null });
  });

  it("recusa criar um segundo login para o mesmo barbeiro (já tem login)", async () => {
    const barber = await createBarber(shopA.id, { name: "João" });
    const first = await createEmployeeLogin(shopA.id, barber.barber!.id, uniqueLogin("joao1"), "senha123");
    expect(first.error).toBeNull();

    const second = await createEmployeeLogin(shopA.id, barber.barber!.id, uniqueLogin("joao2"), "senha123");
    expect(second).toEqual({ error: "already_has_login", user: null });
  });

  it("getEmployeeLoginForBarber retorna o login vinculado", async () => {
    const barber = await createBarber(shopA.id, { name: "Marcos" });
    const login = uniqueLogin("marcos");
    await createEmployeeLogin(shopA.id, barber.barber!.id, login, "senha123");

    const found = await getEmployeeLoginForBarber(shopA.id, barber.barber!.id);
    expect(found?.emailOrPhone).toBe(login);
  });

  it("redefinir senha invalida a senha antiga", async () => {
    const barber = await createBarber(shopA.id, { name: "Pedro" });
    const login = uniqueLogin("pedro");
    const created = await createEmployeeLogin(shopA.id, barber.barber!.id, login, "senhaAntiga");
    expect(created.error).toBeNull();

    await resetPassword(shopA.id, created.user!.id, "senhaNova");

    expect(await verifyLogin(login, "senhaAntiga")).toBeNull();
    expect((await verifyLogin(login, "senhaNova"))?.id).toBe(created.user!.id);
  });

  it("desativar login impede novas sessões, sem apagar o registro", async () => {
    const barber = await createBarber(shopA.id, { name: "Lucas" });
    const login = uniqueLogin("lucas");
    const created = await createEmployeeLogin(shopA.id, barber.barber!.id, login, "senha123");
    expect(created.error).toBeNull();

    await deactivateLogin(shopA.id, created.user!.id);

    expect(await verifyLogin(login, "senha123")).toBeNull();
    const stillThere = await getEmployeeLoginForBarber(shopA.id, barber.barber!.id);
    expect(stillThere?.id).toBe(created.user!.id);
    expect(stillThere?.active).toBe(false);
  });
});
