import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/session";

/**
 * `/api/webhooks/whatsapp` (Fase 5, `add-whatsapp-canal`) é chamado pela Meta/BSP, não por um
 * usuário logado — a autenticação dela é a assinatura HMAC do provedor (verificada dentro da
 * própria rota), não a sessão de cookie. Precisa ficar fora do gate deste middleware.
 */
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/webhooks/whatsapp"];

/**
 * Gate leve: só checa a PRESENÇA do cookie de sessão — não valida a assinatura
 * (isso exigiria SESSION_SECRET, indisponível no Edge runtime). A validação
 * real (assinatura HMAC + expiração) acontece server-side em cada página/rota
 * via getSession()/requireSession*. Um cookie forjado passa por aqui, mas é
 * rejeitado ao tentar acessar qualquer dado (401/redirect) — a segurança não
 * depende deste middleware.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!hasCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "não autenticado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
