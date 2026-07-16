import { getAvailability } from "@blademidia/core";
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse } from "@/lib/api";
import { scopeReadBarberId } from "@/lib/agenda-scope";

export async function GET(request: Request) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const serviceId = url.searchParams.get("serviceId");
  const barberId = scopeReadBarberId(auth, url.searchParams.get("barberId") ?? undefined);

  if (!date || !serviceId) {
    return NextResponse.json({ error: "date e serviceId são obrigatórios" }, { status: 400 });
  }

  const result = await getAvailability(auth.barbershopId, { date, serviceId, barberId });
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json(result.value);
}
