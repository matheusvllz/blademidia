import { deleteService, getService, updateService } from "@blademidia/db";
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
  const service = await getService(auth.barbershopId, id);
  if (!service) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ service });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  durationMin: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { data, response } = await parseBody(request, patchSchema);
  if (response) return response;
  const updated = await updateService(auth.barbershopId, id, data);
  if (!updated) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ service: updated });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireSessionApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const deleted = await deleteService(auth.barbershopId, id);
  if (!deleted) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json({ service: deleted });
}
