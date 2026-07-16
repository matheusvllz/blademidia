import { bookAppointment } from "@blademidia/core";
import { listAppointments } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse, parseBody } from "@/lib/api";
import { assertWriteBarberId, scopeReadBarberId } from "@/lib/agenda-scope";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from e to (ISO) são obrigatórios" }, { status: 400 });
  }
  const barberId = scopeReadBarberId(auth, url.searchParams.get("barberId") ?? undefined);
  const appointments = await listAppointments(auth.barbershopId, {
    from: new Date(from),
    to: new Date(to),
    barberId,
  });
  return NextResponse.json({ appointments });
}

const createSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().nullish(),
});

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const { data, response } = await parseBody(request, createSchema);
  if (response) return response;

  const writeCheck = assertWriteBarberId(auth, data.barberId);
  if (!writeCheck.ok) {
    return NextResponse.json(
      { error: "funcionário só pode criar agendamento para o próprio barbeiro" },
      { status: 403 },
    );
  }

  const result = await bookAppointment(auth.barbershopId, {
    clientId: data.clientId,
    serviceId: data.serviceId,
    barberId: data.barberId,
    startsAt: new Date(data.startsAt),
    notes: data.notes ?? null,
    source: "painel",
  });
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json({ appointment: result.value }, { status: 201 });
}
