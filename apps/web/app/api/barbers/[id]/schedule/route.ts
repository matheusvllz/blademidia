import { getBarber, listWorkSchedules, setWorkSchedules } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const schedules = await listWorkSchedules(auth.barbershopId, id);
  return NextResponse.json({ schedules });
}

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "horário deve ser HH:MM");
const putSchema = z.object({
  windows: z.array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        startTime: time,
        endTime: time,
      })
      .refine((w) => w.startTime < w.endTime, { message: "início deve ser antes do fim" }),
  ),
});

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const barber = await getBarber(auth.barbershopId, id);
  if (!barber) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const { data, response } = await parseBody(request, putSchema);
  if (response) return response;

  await setWorkSchedules(auth.barbershopId, id, data.windows);
  return NextResponse.json({ ok: true });
}
