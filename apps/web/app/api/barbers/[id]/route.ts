import { deleteBarber, getBarber, updateBarber } from "@blademidia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerSessionApi, requireSessionApi } from "@/lib/auth";
import { parseBody } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const barber = await getBarber(auth.barbershopId, id);
  if (!barber) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ barber });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

/** Mutações: dono-only (matriz de autorização do design.md). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { data, response } = await parseBody(request, patchSchema);
  if (response) return response;
  const updated = await updateBarber(auth.barbershopId, id, data);
  if (!updated) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ barber: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireOwnerSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const deleted = await deleteBarber(auth.barbershopId, id);
  if (!deleted) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ barber: deleted });
}
