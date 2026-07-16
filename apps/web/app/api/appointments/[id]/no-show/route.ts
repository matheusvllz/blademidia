import { markNoShow } from "@blademidia/core";
import { getAppointment } from "@blademidia/db";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse } from "@/lib/api";
import { isOwnAppointment } from "@/lib/agenda-scope";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const existing = await getAppointment(auth.barbershopId, id);
  if (!existing || !isOwnAppointment(auth, existing)) {
    return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  }

  const result = await markNoShow(auth.barbershopId, id);
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json({ appointment: result.value });
}
