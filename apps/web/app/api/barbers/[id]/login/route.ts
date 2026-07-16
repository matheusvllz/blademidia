import {
  createEmployeeLogin,
  deactivateLogin,
  getEmployeeLoginForBarber,
  resetPassword,
  type UserRecord,
} from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(6),
});

const CREATE_ERROR_MAP: Record<string, { status: number; message: string }> = {
  barber_not_found: { status: 404, message: "barbeiro não encontrado" },
  already_has_login: { status: 409, message: "este barbeiro já tem um login" },
  duplicate_login: { status: 409, message: "já existe um login com esse email/telefone" },
};

/** Nunca serializar `authSecretHash` na resposta. */
function toSafeLogin(user: UserRecord) {
  return { id: user.id, emailOrPhone: user.emailOrPhone, active: user.active };
}

/** Gestão de login de funcionário — dono-only (matriz de autorização do design.md). */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const login = await getEmployeeLoginForBarber(auth.barbershopId, id);
  return NextResponse.json({ login: login ? toSafeLogin(login) : null });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { data, response } = await parseBody(request, createSchema);
  if (response) return response;

  const result = await createEmployeeLogin(auth.barbershopId, id, data.emailOrPhone, data.password);
  if (result.error) {
    const { status, message } = CREATE_ERROR_MAP[result.error]!;
    return NextResponse.json({ error: message, reason: result.error }, { status });
  }
  return NextResponse.json({ login: toSafeLogin(result.user) }, { status: 201 });
}

const resetSchema = z.object({ userId: z.string().min(1), password: z.string().min(6) });

export async function PATCH(request: Request) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { data, response } = await parseBody(request, resetSchema);
  if (response) return response;

  const login = await resetPassword(auth.barbershopId, data.userId, data.password);
  if (!login) {
    return NextResponse.json({ error: "login não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ login: toSafeLogin(login) });
}

const deactivateSchema = z.object({ userId: z.string().min(1) });

export async function DELETE(request: Request) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { data, response } = await parseBody(request, deactivateSchema);
  if (response) return response;

  const login = await deactivateLogin(auth.barbershopId, data.userId);
  if (!login) {
    return NextResponse.json({ error: "login não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ login: toSafeLogin(login) });
}
