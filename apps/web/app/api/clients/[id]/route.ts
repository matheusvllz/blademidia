import { cancelFutureAppointmentsForClient, deleteClient, getClient, updateClient } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const client = await getClient(auth.barbershopId, id);
  if (!client) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const updated = await updateClient(auth.barbershopId, id, {
    name: body?.name,
    phone: body?.phone,
    notes: body?.notes,
  });

  if (!updated) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ client: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // LGPD (Fase 2): cancela os agendamentos futuros do cliente ANTES de anonimizar,
  // liberando os horários; os agregados de histórico seguem preservados (Fase 1).
  await cancelFutureAppointmentsForClient(auth.barbershopId, id, new Date(), "cliente excluído (LGPD)");

  const deleted = await deleteClient(auth.barbershopId, id);
  if (!deleted) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
