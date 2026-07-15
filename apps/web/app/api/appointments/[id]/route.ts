import { cancelAppointment, confirmAppointment, rescheduleAppointment } from "@blademidia/core";
import { getAppointment } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { agendaErrorResponse, parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const appointment = await getAppointment(auth.barbershopId, id);
  if (!appointment) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ appointment });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reschedule"), startsAt: z.string().datetime({ offset: true }) }),
]);

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const { data, response } = await parseBody(request, patchSchema);
  if (response) return response;

  const result =
    data.action === "confirm"
      ? await confirmAppointment(auth.barbershopId, id)
      : await rescheduleAppointment(auth.barbershopId, id, new Date(data.startsAt));

  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json({ appointment: result.value });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const reason = new URL(request.url).searchParams.get("reason");
  const result = await cancelAppointment(auth.barbershopId, id, reason);
  if (!result.ok) return agendaErrorResponse(result.reason);
  return NextResponse.json({ appointment: result.value });
}
