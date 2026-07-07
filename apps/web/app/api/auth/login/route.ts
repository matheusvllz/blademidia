import { verifyLogin } from "@blademidia/db";
import { NextResponse } from "next/server";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const emailOrPhone = body?.emailOrPhone;
  const password = body?.password;

  if (!emailOrPhone || !password) {
    return NextResponse.json({ error: "informe usuário e senha" }, { status: 400 });
  }

  const user = await verifyLogin(emailOrPhone, password);
  if (!user) {
    return NextResponse.json({ error: "usuário ou senha inválidos" }, { status: 401 });
  }

  const cookieValue = await createSessionCookieValue({
    userId: user.id,
    barbershopId: user.barbershopId,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
