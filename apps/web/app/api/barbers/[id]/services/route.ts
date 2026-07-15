import { getBarber, getBarberServiceIds, setBarberServices } from "@blademidia/db";
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
  const serviceIds = await getBarberServiceIds(auth.barbershopId, id);
  return NextResponse.json({ serviceIds });
}

const putSchema = z.object({ serviceIds: z.array(z.string()) });

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const barber = await getBarber(auth.barbershopId, id);
  if (!barber) return NextResponse.json({ error: "não encontrado" }, { status: 404 });

  const { data, response } = await parseBody(request, putSchema);
  if (response) return response;

  await setBarberServices(auth.barbershopId, id, data.serviceIds);
  return NextResponse.json({ serviceIds: data.serviceIds });
}
