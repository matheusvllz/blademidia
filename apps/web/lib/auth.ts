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
