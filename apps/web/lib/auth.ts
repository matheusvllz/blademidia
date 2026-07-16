import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { parseSessionCookieValue, SESSION_COOKIE_NAME, type SessionData } from "./session";

/** Lê e valida a sessão (assinatura HMAC + expiração). Retorna null se ausente/inválida. */
export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return parseSessionCookieValue(store.get(SESSION_COOKIE_NAME)?.value);
}

/** Para Server Components (páginas): redireciona para /login se não houver sessão válida. */
export async function requireSessionPage(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Para Route Handlers: retorna a sessão ou uma resposta 401 pronta. Uso:
 *   const auth = await requireSessionApi();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth é SessionData daqui pra frente
 */
export async function requireSessionApi(): Promise<SessionData | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  return session;
}

/**
 * Fase 4 (`auth-tenancy`, Decision 3 do design.md de
 * `add-fidelizacao-e-funcionarios`): para rotas restritas ao papel `dono`
 * (relatórios, configurações, gestão de funcionário, exclusão LGPD). 401 sem
 * sessão, 403 se `role !== "dono"`.
 */
export async function requireOwnerSessionApi(): Promise<SessionData | NextResponse> {
  const session = await requireSessionApi();
  if (session instanceof NextResponse) return session;
  if (session.role !== "dono") {
    return NextResponse.json({ error: "acesso restrito ao dono da barbearia" }, { status: 403 });
  }
  return session;
}

/** Equivalente de `requireOwnerSessionApi` para Server Components (páginas). */
export async function requireOwnerSessionPage(): Promise<SessionData> {
  const session = await requireSessionPage();
  if (session.role !== "dono") {
    redirect("/");
  }
  return session;
}
